/**
 * ============================================================================
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Bu dosya Node.js / Express tabanlı arka uç (backend) sunucusunun kalbidir. 
 *   İstemcilerden (Masaüstü, Web ve Mobil) gelen tüm HTTP istekleri buradan geçer.
 *   Uygulama 3000 portu üzerinden hizmet vermekte olup, veritabanı bağlantıları 
 *   bağlantı havuzu (connection pooling) stratejisi ile yönetilmektedir.
 * 
 *   Güvenlik, CORS, rate limiting ve tüm modüler route (yönlendirme) tanımları 
 *   bu dosya üzerinden sisteme dahil edilir. İleride yeni bir ana modül 
 *   eklendiğinde (örneğin routes/yeniModul.js), bu dosyada 'app.use' ile sisteme 
 *   bağlanması gerekir.
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const db = require('./db');
const helmet = require('helmet');
const path = require('path');

const { checkUpcomingMaintenances } = require('./utils/machineNotifier');

// Maaş ve mesai otomasyonunu başlat
require('./utils/salaryCron');

// Otomatik satın alma / Stok takibini başlat
const { startMonitor } = require('./utils/stockMonitor');
startMonitor();

// 1. GLOBAL CRASH GUARDS (Sunucu Çökme Kalkanı)
// Beklenmeyen / yakalanmayan hataların Node.js sürecini (process) sonlandırmasını engeller.
const logger = require('./utils/logger');
process.on('uncaughtException', (err) => {
    logger.error(`[KRİTİK HATA] Yakalanmayan İstisna: ${err.message}`, { stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[KRİTİK HATA] Yakalanmayan Promise Reddi: ${reason}`);
});

const app = express();

// GÜVENLİK: Proxy arkasında (ngrok, Cloudflare, nginx) gerçek istemci IP'sini al
// Bu olmadan rate limiter proxy IP'sini kullanır ve tüm kullanıcılar aynı limiti paylaşır
app.set('trust proxy', 1);

const morgan = require('morgan');

// GÜVENLİK: Access logger morgan & winston
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use((req, res, next) => {
    const safePath = req.path; // Sadece path — query string yok
    if (process.env.NODE_ENV !== 'production') {
        logger.debug(`[REQUEST] ${req.method} ${safePath}`);
    }
    const originalSend = res.send;
    res.send = function (data) {
        if (res.statusCode >= 400 && process.env.NODE_ENV !== 'production') {
            logger.warn(`[RESPONSE ERROR] ${req.method} ${safePath} -> Status: ${res.statusCode}`);
        }
        return originalSend.apply(res, arguments);
    };
    next();
});


app.locals.system_paused = false;
const redisClient = require('./services/redisService');
db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'system_paused'")
    .then(async ([rows]) => {
        if (rows.length > 0) {
            const isPaused = (rows[0].setting_value === 'true');
            app.locals.system_paused = isPaused;
            try {
                if (redisClient.isReady) {
                    await redisClient.set('system_paused', isPaused ? 'true' : 'false');
                }
            } catch (redisErr) {}
        }
    })
    .catch(e => console.error("system_paused fetch error:", e));

// Token Kara Listesi (Blacklist) Tablosunu Oluştur
db.query(`
    CREATE TABLE IF NOT EXISTS blacklisted_tokens (
        token VARCHAR(500) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(e => console.error("blacklisted_tokens table create error:", e));

// Personeller (Yöneticiler) İçin Tekil Oturum (Single Session) Tablosu
db.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ip_address VARCHAR(45),
        device_info VARCHAR(255),
        token VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        INDEX(token)
    )
`).catch(e => console.error("user_sessions table create error:", e));

// Ürün Yorum ve Değerlendirmeleri Tablosu
db.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        customer_id INT NOT NULL,
        order_id INT NULL,
        rating INT NOT NULL DEFAULT 5,
        comment TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Onaylandı',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(product_id),
        INDEX(customer_id),
        INDEX(order_id)
    )
`).catch(e => console.error("product_reviews table create error:", e));



// --- MİDDLEWARE (ARA KATMAN) AYARLARI ---
// 1. HELMET: HTTP başlıklarını güvenlik için güçlendirir (XSS, Clickjacking koruması).
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

const ALLOWED_ORIGINS = [
    'http://localhost:5173',  // Vite dev
    'http://127.0.0.1:5173',  // Vite dev (127.0.0.1 formatı)
    'http://localhost:4173',  // Vite preview
    'http://localhost:3001',  // Web-app
    'http://localhost:3002',  // Desktop-app dev sunucusu
    'http://127.0.0.1:3002',  // Desktop-app dev sunucusu (127.0.0.1 formatı)
    'app://',                 // Electron
    'file://',                // Electron (file protokolü)
];

app.use(cors({
    origin: (origin, callback) => {
        // Electron / desktop uygulamalar null origin gönderir, izin ver
        if (!origin) return callback(null, true);
        
        // Ngrok veya prod domain'leri için env değişkeni desteği
        const extraOrigin = process.env.ALLOWED_ORIGIN;
        
        // Geliştirme ortamında (localhost, 127.0.0.1 ve yerel ağ IP'leri) izin ver
        if (
            ALLOWED_ORIGINS.includes(origin) || 
            (extraOrigin && origin === extraOrigin) ||
            origin.startsWith('http://192.168.') || 
            origin.startsWith('http://10.') || 
            origin.startsWith('http://172.') ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:')
        ) {
            return callback(null, true);
        }
        
        console.warn(`[GÜVENLİK] CORS reddedildi: ${origin}`);
        return callback(new Error('CORS politikası: Bu kaynaktan erişim izni yok.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'ngrok-skip-browser-warning'],
    credentials: true
}));

// GÜVENLİK: Genel API Rate Limiter (Brute-Force ve DoS koruması)
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // IPv6 keyGenerator uyarısını devre dışı bırak
    message: { success: false, message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.' }
});
app.use('/api/', generalLimiter);

// GÜVENLİK: Login için Rate Limiter (Kaba kuvvet saldırılarını engeller)
const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10, // 5 dakikada en fazla 10 deneme
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // IPv6 keyGenerator uyarısını devre dışı bırak
    message: { success: false, message: 'Çok fazla başarısız giriş denemesi. Lütfen 5 dakika bekleyin.' }
});
app.use('/api/login', loginLimiter);

// JSON gövde sınırı (Denial of Service koruması) ve Syntax Error kalkanı
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Geçersiz JSON formatı (Syntax Error) gönderildi.' });
    }
    next(err);
});

// 3. Statik Klasörler: Kullanıcıların yüklediği görselleri (/uploads) tarayıcıya sunar.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path, stat) => {
        if (!path.match(/\.(jpg|jpeg|png|webp|gif|pdf)$/i)) {
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));



// --- GLOBAL AUTHENTICATION (KİMLİK DOĞRULAMA) DUVARI ---
const authMiddleware = require('./middleware/auth');
const { checkRole } = require('./middleware/rbac');
app.use((req, res, next) => {
    // CORS preflight isteklerine izin ver
    if (req.method === 'OPTIONS') {
        return next();
    }
    // Login isteği, public mail linkleri, sistem durumunu soruyorsa veya frontend dosyalarıysa güvenliği atla
    if (
        !req.path.startsWith('/api/') || 
        req.path === '/api/login' || req.path === '/api/login/' ||
        req.path === '/api/mobile-version' || req.path === '/api/mobile-version/' ||
        req.path === '/api/settings/status' || req.path === '/api/settings/status/' ||
        req.path.startsWith('/api/customers/auth') ||
        (req.path === '/api/brands' && req.method === 'GET') ||
        (req.path.startsWith('/api/web-categories') && req.method === 'GET') ||
        req.path.startsWith('/api/products/public') ||
        (req.path.startsWith('/api/shippers/public') && req.method === 'GET') ||
        (req.path.startsWith('/api/campaigns/public') && req.method === 'GET') ||
        (req.path.startsWith('/api/orders/public/checkout') && req.method === 'POST') ||
        (req.path.startsWith('/api/coupons/my-coupons') && req.method === 'GET') ||
        (req.path.startsWith('/api/coupons/apply') && req.method === 'POST') ||
        // Tedarikçi onay linkleri - sadece GET (e-posta linkleri) ve POST (form gönderimi) izni
        (req.path.startsWith('/api/purchasing/orders/action') && ['GET', 'POST'].includes(req.method)) ||
        (req.path.startsWith('/api/supplier-approval') && ['GET', 'POST'].includes(req.method)) ||
        req.path.startsWith('/api/cart')
    ) {
        return next();
    }
    // Diğer tüm istekler (GET, POST, vb.) token doğrulamasına tabi tutulsun
    return authMiddleware(req, res, next);
});

const settingsRouter = require('./routes/settings');
app.use('/api/settings', settingsRouter);

// --- GLOBAL MIDDLEWARE: SİSTEM DURAKLATMA (SAYIM/BAKIM MODU) ---
app.use(async (req, res, next) => {
    // Sadece veri değiştiren istekleri engelle (POST, PUT, DELETE, PATCH)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // İstisna yollar
        const isExempt =
            req.path.startsWith('/api/settings') ||
            req.path === '/api/login' || req.path === '/api/login/' ||
            req.path.startsWith('/api/customers/auth') ||
            req.path.startsWith('/api/orders/public/checkout') ||
            req.path.startsWith('/api/coupons/apply') ||
            req.path.startsWith('/api/purchasing/orders/action') ||
            req.path.startsWith('/api/supplier-approval') ||
            req.path.startsWith('/api/cart') ||
            req.path.includes('/questions') ||
            req.path.includes('/reviews');
            
        if (!isExempt) {
            let isPaused = req.app.locals.system_paused;
            try {
                if (redisClient.isReady) {
                    const redisVal = await redisClient.get('system_paused');
                    if (redisVal !== null) {
                        isPaused = (redisVal === 'true');
                    }
                }
            } catch (redisErr) {}

            if (isPaused) {
                return res.status(503).json({
                    success: false,
                    message: 'Sistem şu anda depo sayımı veya bakım nedeniyle duraklatılmıştır. Veri değişikliği yapılamaz.'
                });
            }
        }
    }
    next();
});
// ----------------------------------------------------------------


// ================================================================
// ROUTE (YÖNLENDİRME) BAĞLANTILARI
// Her modül kendi dosyasında tanımlıdır. Yeni modül eklemek için:
//   const yeniRouter = require('./routes/yeniModul');
//   app.use('/api/yeni-modul', yeniRouter);
// ================================================================

// Auth (Kimlik Doğrulama) — Login, Logout, Verify, Mobile Version
const authRouter = require('./routes/auth');
app.use('/api', authRouter);

// Markalar
const brandsRouter = require('./routes/brands');
app.use('/api/brands', brandsRouter);

// Kategoriler
const categoriesRouter = require('./routes/categories');
app.use('/api/categories', categoriesRouter);

// Dashboard İstatistikleri
const dashboardRouter = require('./routes/dashboard');
app.use('/api/dashboard-stats', dashboardRouter);

// Ürünler
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

// Web Kategorileri
const webCategoriesRouter = require('./routes/webCategories');
app.use('/api/web-categories', webCategoriesRouter);

// Sepet
const cartRouter = require('./routes/cart');
app.use('/api/cart', cartRouter);

// Kullanıcılar (Personel Hesapları)
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// Aktivite Logları
app.use('/api/activities', require('./routes/activities'));

// Çalışanlar (İK)
const employeesRouter = require('./routes/employees');
app.use('/api/employees', employeesRouter);

// WMS (Depo Yönetim Sistemi)
const wmsRouter = require('./routes/wms');
app.use('/api/wms', wmsRouter);

// Depolar
const warehousesRouter = require('./routes/warehouses');
app.use('/api/warehouses', warehousesRouter);

// Tedarikçiler
const suppliersRouter = require('./routes/suppliers');
app.use('/api/suppliers', suppliersRouter);

// Kargo Firmaları
const shippersRouter = require('./routes/shippers');
app.use('/api/shippers', shippersRouter);

// Müşteriler
const customersRouter = require('./routes/customers');
app.use('/api/customers', customersRouter);

// Müşteri Kimlik Doğrulama
const customerAuthRouter = require('./routes/customerAuth');
app.use('/api/customers/auth', customerAuthRouter);

// Üretim
const productionRouter = require('./routes/production');
app.use('/api/production', productionRouter);

// Satın Alma
const purchasingRouter = require('./routes/purchasing');
app.use('/api/purchasing', purchasingRouter);

// Kampanyalar
const campaignsRouter = require('./routes/campaigns');
app.use('/api/campaigns', campaignsRouter);

// Finans
const financeRouter = require('./routes/finance');
app.use('/api/finance', financeRouter);

// Raporlar
const reportsRouter = require('./routes/reports');
app.use('/api/reports', reportsRouter);

// Veri Dışa Aktarma
const dataExportRouter = require('./routes/data_export');
app.use('/api/data-export', dataExportRouter);

// Siparişler
const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

// Kutular / Ambalajlar
const boxesRouter = require('./routes/boxes');
app.use('/api/boxes', boxesRouter);

// Mobil Uygulama
const mobileRoutes = require('./routes/mobile');
app.use('/api/mobile', mobileRoutes);

// Toplama Arabaları
const pickingCartsRouter = require('./routes/picking_carts');
app.use('/api/picking_carts', pickingCartsRouter);

// Kuponlar
const couponsRoute = require('./routes/coupons');
app.use('/api/coupons', couponsRoute);

// CRM - Şikayet ve Sorular
const crmRouter = require('./routes/crm');
app.use('/api/crm', crmRouter);


// ================================================================
// FRONTEND ENTEGRASYONU VE HATA YAKALAYICILARI
// ================================================================

// FRONTEND (VITE/REACT) ENTEGRASYONU: Tüm API istekleri dışındaki istekleri frontend'e yönlendir
const frontendPath = path.join(__dirname, '../desktop-app/dist');
app.use(express.static(frontendPath));

app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        next();
    }
});

// 2. 404 ROTA BULUNAMADI YAKALAYICISI (Not Found Handler)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `[404] ${req.method} ${req.url} rotası bulunamadı.` });
});

// 3. GLOBAL API ERROR HANDLER (Merkezi Hata Yakalama Middleware'i)
// Rotalarda yakalanamayan veya next(err) ile iletilen hataların sunucuyu çökertmesini engeller
// ve istemciye (frontend) veritabanı hatalarını net Türkçeleştirerek döner.
app.use((err, req, res, next) => {
    logger.error(`[API HATASI]: ${err.message || err}`, { 
        url: req.originalUrl, 
        method: req.method, 
        ip: req.ip, 
        stack: err.stack 
    });

    // MySQL Veritabanı Özel Hata Yakalamaları
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Bu kayıt zaten mevcut (Tekrarlayan Veri Hatası).' });
    }
    if (err.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({ success: false, message: 'Girilen metin karakter sınırı aşıyor (Veri Çok Uzun).' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ success: false, message: 'İlişkili veri bulunamadı veya bu veri başka bir modülde kullanıldığı için silinemez/değiştirilemez.' });
    }
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE' || err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
        return res.status(400).json({ success: false, message: 'Geçersiz veri tipi veya tarih formatı girildi.' });
    }
    if (err.message && err.message.includes('Bind parameters must not contain undefined')) {
        return res.status(400).json({ success: false, message: 'Eksik veya tanımsız parametre gönderildi.' });
    }

    // GÜVENLİK: Production'da iç hata detaylarını (stack trace vb.) asla istemciye sızdırma
    const isProduction = process.env.NODE_ENV === 'production';
    const clientMessage = isProduction
        ? 'Sunucu tarafında bir hata oluştu.'
        : (err.message || 'Sunucu işlem sırasında bir hata ile karşılaştı.');

    res.status(err.status || 500).json({
        success: false,
        message: clientMessage
    });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu http://0.0.0.0:${PORT} portunda çalışıyor`);

    // Arka plan otomatik bakım hatırlatması kontrolü (İlk açılışta ve her 6 saatte bir)
    setTimeout(checkUpcomingMaintenances, 5000);
    setInterval(checkUpcomingMaintenances, 1000 * 60 * 60 * 6);
});

module.exports = app;
