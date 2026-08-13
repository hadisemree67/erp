/*
 * Bu dosya arkayüz (backend) uygulamasının başlangıç noktasıdır. Express.js sunucusunu başlatır, 
 * güvenlik ayarlarını yapar ve tüm API rotalarını sisteme bağlar.
 */

const express = require('express');
const seedWebCategories = require('./seedWebCategories');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const { logActivity } = require('./utils/logger');
const path = require('path');
const multer = require('multer');

const brandStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const brandUpload = multer({ storage: brandStorage });

require('./add_is_active');

const { checkUpcomingMaintenances } = require('./utils/machineNotifier');
const { initializeWhatsAppBot } = require('./services/whatsappBot');

// Maaş ve mesai otomasyonunu başlat
require('./utils/salaryCron');

// Veritabanı tablolarını güncelle
(async () => {
    try {
        await db.query('ALTER TABLE brands ADD COLUMN logo_url VARCHAR(255) NULL;');
        console.log('brands tablosuna logo_url eklendi.');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') console.error('Veritabanı güncellenirken hata (brands):', err.message);
    }
    
    try {
        await db.query('ALTER TABLE customers ADD COLUMN Password VARCHAR(255) NULL;');
        await db.query('ALTER TABLE customers ADD COLUMN IsVerified BOOLEAN DEFAULT FALSE;');
        await db.query('ALTER TABLE customers ADD COLUMN OtpCode VARCHAR(10) NULL;');
        await db.query('ALTER TABLE customers ADD COLUMN OtpExpiry DATETIME NULL;');
        
        // Auto-run DB migrations
        try {
            await db.query("ALTER TABLE customers DROP COLUMN Age");
            console.log("DROP COLUMN Age OK");
        } catch (e) {
            console.log("Age column might already be deleted.");
        }
        
        try {
            await db.query("ALTER TABLE customers ADD COLUMN BirthDate VARCHAR(20)");
            console.log("ADD COLUMN BirthDate OK");
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.log("BirthDate column might already exist.");
        }

        try {
            await db.query("ALTER TABLE customers ADD COLUMN WebAddresses JSON NULL");
            console.log("ADD COLUMN WebAddresses OK");
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.log("WebAddresses column might already exist.");
        }

        console.log('customers tablosuna auth kolonları eklendi.');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') console.error('Veritabanı güncellenirken hata (customers):', err.message);
    }
    try {
        await db.query('ALTER TABLE products ADD COLUMN web_categories JSON NULL;');
        await db.query('ALTER TABLE products ADD COLUMN web_subcategories JSON NULL;');
        await db.query('ALTER TABLE products ADD COLUMN web_subtitles JSON NULL;');
        console.log('products tablosuna web kategori kolonları eklendi.');
    } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') console.error('Veritabanı güncellenirken hata (products):', err.message);
    }
})();

// 1. GLOBAL CRASH GUARDS (Sunucu Çökme Kalkanı)
// Beklenmeyen / yakalanmayan hataların Node.js sürecini (process) sonlandırmasını engeller.
process.on('uncaughtException', (err) => {
    console.error(' [KRİTİK HATA] Yakalanmayan İstisna (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(' [KRİTİK HATA] Yakalanmayan Promise Reddi (Unhandled Rejection):', reason);
});

const app = express();

// A simple access logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    const originalSend = res.send;
    res.send = function (data) {
        if (res.statusCode >= 400) {
            console.error(`[RESPONSE ERROR] ${req.method} ${req.url} -> Status: ${res.statusCode}`);
        }
        return originalSend.apply(res, arguments);
    };
    next();
});

app.locals.system_paused = false;
db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'system_paused'")
    .then(([rows]) => { if (rows.length > 0) app.locals.system_paused = (rows[0].setting_value === 'true'); })
    .catch(e => console.error("system_paused fetch error:", e));

// Token Kara Listesi (Blacklist) Tablosunu Oluştur
db.query(`
    CREATE TABLE IF NOT EXISTS blacklisted_tokens (
        token VARCHAR(500) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(e => console.error("blacklisted_tokens table create error:", e));


app.use(helmet({
    crossOriginResourcePolicy: false,
}));
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:19006',
    'http://localhost:8081',
    'exp://localhost:8081',
    'http://192.168.10.144:3000',
    'http://192.168.10.144:8081',
    'exp://192.168.10.144:8081',
    process.env.BASE_URL,  // ngrok veya production URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Origin yoksa (aynı sunucu içi istek, curl, Electron build file:// vb.) geçir
        if (!origin || origin === 'file://' || origin === 'null') return callback(null, true);
        
        // Localhost üzerinden gelen her porttaki geliştirme sunucusuna (vite, react, expo) izin ver
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('exp://localhost:')) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        return callback(new Error(`CORS Hatası: ${origin} adresine izin verilmiyor.`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'ngrok-skip-browser-warning'],
    credentials: true
}));

// GÜVENLİK: Genel API Rate Limiter
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.' }
});
app.use('/api/', generalLimiter);

// GÜVENLİK: Login için Rate Limiter
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Çok fazla başarısız giriş denemesi. Lütfen 5 dakika bekleyin.' }
});
app.use('/api/login', loginLimiter);

// JSON gövde sınırı (Denial of Service koruması) ve Syntax Error kalkanı
app.use(express.json({ limit: '5mb' }));
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Geçersiz JSON formatı (Syntax Error) gönderildi.' });
    }
    next(err);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Yönlendirmeler
// --- GLOBAL AUTHENTICATION (KİMLİK DOĞRULAMA) DUVARI ---
const authMiddleware = require('./middleware/auth');
const { checkRole } = require('./middleware/rbac');
app.use((req, res, next) => {
    // console.log(`[AUTH] Method: ${req.method}, Path: ${req.path}`);

    // CORS preflight isteklerine izin ver
    if (req.method === 'OPTIONS') {
        return next();
    }
    // Login isteği, public mail linkleri, sistem durumunu soruyorsa veya frontend dosyalarıysa güvenliği atla
    if (
        !req.path.startsWith('/api/') || 
        req.path === '/api/login' || req.path === '/api/login/' ||
        req.path === '/api/settings/status' || req.path === '/api/settings/status/' ||
        req.path.startsWith('/api/customers/auth') ||
        (req.path === '/api/brands' && req.method === 'GET') ||
        (req.path.startsWith('/api/web-categories') && req.method === 'GET') ||
        // Tedarikçi onay linkleri - sadece GET (e-posta linkleri) ve POST (form gönderimi) izni
        (req.path.startsWith('/api/purchasing/orders/action') && ['GET', 'POST'].includes(req.method)) ||
        (req.path.startsWith('/api/supplier-approval') && ['GET', 'POST'].includes(req.method))
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
            req.path.startsWith('/api/purchasing/orders/action') ||
            req.path.startsWith('/api/supplier-approval');
            
        if (!isExempt) {
            if (req.app.locals.system_paused) {
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

const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

const webCategoriesRouter = require('./routes/webCategories');
app.use('/api/web-categories', webCategoriesRouter);

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);





app.use('/api/activities', require('./routes/activities'));



const employeesRouter = require('./routes/employees');
app.use('/api/employees', employeesRouter);

const wmsRouter = require('./routes/wms');
app.use('/api/wms', wmsRouter);

const warehousesRouter = require('./routes/warehouses');
app.use('/api/warehouses', warehousesRouter);

const suppliersRouter = require('./routes/suppliers');
app.use('/api/suppliers', suppliersRouter);

const shippersRouter = require('./routes/shippers');
app.use('/api/shippers', shippersRouter);

const customersRouter = require('./routes/customers');
app.use('/api/customers', customersRouter);

const customerAuthRouter = require('./routes/customerAuth');
app.use('/api/customers/auth', customerAuthRouter);

const productionRouter = require('./routes/production');
app.use('/api/production', productionRouter);

const purchasingRouter = require('./routes/purchasing');
app.use('/api/purchasing', purchasingRouter);

const campaignsRouter = require('./routes/campaigns');
app.use('/api/campaigns', campaignsRouter);

const financeRouter = require('./routes/finance');
app.use('/api/finance', financeRouter);

const reportsRouter = require('./routes/reports');
app.use('/api/reports', reportsRouter);

const dataExportRouter = require('./routes/data_export');
app.use('/api/data-export', dataExportRouter);

const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

const boxesRouter = require('./routes/boxes');
app.use('/api/boxes', boxesRouter);

const whatsappRoutes = require('./routes/whatsappEntries');
const mobileRoutes = require('./routes/mobile');
const pickingCartsRouter = require('./routes/picking_carts');
const couponsRoute = require('./routes/coupons');

app.use('/api/whatsapp-entries', whatsappRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/picking_carts', pickingCartsRouter);
app.use('/api/coupons', couponsRoute);

app.get('/api/brands', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, logo_url FROM brands ORDER BY name ASC');
        console.log('[DEBUG] Fetched brands:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Markalar çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Markalar getirilirken hata oluştu.' });
    }
});

app.post('/api/brands', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_add'), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Marka adı gereklidir.' });

    try {
        const [existing] = await db.query('SELECT id FROM brands WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu marka zaten var.' });
        }
        const [result] = await db.query('INSERT INTO brands (name) VALUES (?)', [name]);
        await logActivity(req.user?.id, 'INSERT', 'brands', result.insertId, `"${name}" markasını ekledi.`, null);
        res.status(201).json({ success: true, id: result.insertId, name });
    } catch (error) {
        console.error('Marka eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Marka eklenirken hata oluştu.' });
    }
});

app.put('/api/brands/:id', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_edit'), brandUpload.single('logo'), async (req, res) => {
    const { id } = req.params;
    
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Logo dosyası bulunamadı.' });
        }
        
        const logoUrl = `/uploads/${req.file.filename}`;
        
        await db.query('UPDATE brands SET logo_url = ? WHERE id = ?', [logoUrl, id]);
        await logActivity(req.user?.id, 'UPDATE', 'brands', id, `Marka (ID: ${id}) logosu güncellendi.`, null);
        
        res.json({ success: true, logo_url: logoUrl });
    } catch (error) {
        console.error('Marka logosu güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Logo yüklenirken hata oluştu.' });
    }
});

app.get('/api/categories', authMiddleware, checkRole(['Depo', 'Üretim'], 'view_products'), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM kategori ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Kategoriler çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Kategoriler getirilirken hata oluştu.' });
    }
});

app.post('/api/categories', authMiddleware, checkRole(['Depo', 'Üretim'], 'category_manage'), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Kategori adı gereklidir.' });

    try {
        const [existing] = await db.query('SELECT id FROM kategori WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu kategori zaten var.' });
        }
        const [result] = await db.query('INSERT INTO kategori (name) VALUES (?)', [name]);
        await logActivity(req.user?.id, 'INSERT', 'kategori', result.insertId, `"${name}" kategorisini ekledi.`, null);
        res.status(201).json({ success: true, id: result.insertId, name });
    } catch (error) {
        console.error('Kategori eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Kategori eklenirken hata oluştu.' });
    }
});

app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [products] = await db.query("SELECT COUNT(Id) as count FROM products WHERE Category != 'Hammadde' OR Category IS NULL");
        const [brands] = await db.query('SELECT COUNT(id) as count FROM brands');
        const [categories] = await db.query('SELECT COUNT(id) as count FROM kategori');
        const [lowStock] = await db.query('SELECT COUNT(Id) as count FROM products WHERE StockQuantity <= 10');

        res.json({
            success: true,
            totalProducts: products[0].count,
            totalBrands: brands[0].count,
            totalCategories: categories[0].count,
            lowStock: lowStock[0].count,
            todayOrders: 0,
            totalCustomers: 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            // GÜVENLİK: User Enumeration önleme — Kullanıcı yokken bile bcrypt maliyeti simüle et
            await bcrypt.compare(password, '$2b$10$invalidhashfortimingnnnnnnnnnnnnnnnnnnnnn');
            return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
        }

        const user = rows[0];

        // GÜVENLİK: Pasif veya kovulmuş kullanıcı kontrolü
        if (user.is_active === 0 || user.is_active === false || user.is_active === '0') {
            return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmış veya pasif duruma getirilmiştir.' });
        }

        const dbRole = user.role;
        // Eğer giriş tipi admin ise ve kullanıcının veritabanı rolü admin değilse giriş reddedilir
        if (role === 'admin' && dbRole !== 'admin') {
            return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
        }

        // Kullanıcının özel yetkilerini çek
        const [permRows] = await db.query(`
            SELECT p.permission_key 
            FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = ?
        `, [user.id]);
        const permissions = permRows.map(r => r.permission_key);

        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('[KRİTİK] JWT_SECRET ortam değişkeni tanımlı değil!');
            return res.status(500).json({ success: false, message: 'Sunucu yapılandırma hatası.' });
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, permissions },
            jwtSecret,
            { expiresIn: '8h' }
        );

        // Başarılı giriş
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: permissions
            }
        });

    } catch (error) {
        console.error('Login hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// --- ÇIKIŞ YAP (LOGOUT) ---
// Frontend'den gelen istekle mevcut token'ı veritabanındaki kara listeye ekler.
app.post('/api/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ success: true }); // Zaten token yoksa çıkış yapmış sayılır
    }

    const token = authHeader.split(' ')[1];
    try {
        await db.query('INSERT IGNORE INTO blacklisted_tokens (token) VALUES (?)', [token]);
        res.json({ success: true, message: 'Çıkış yapıldı ve token iptal edildi.' });
    } catch (error) {
        console.error('Logout hatası:', error);
        res.status(500).json({ success: false, message: 'Çıkış yapılırken bir hata oluştu.' });
    }
});

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
// 3. GLOBAL API ERROR HANDLER (Merkezi Hata Yakalama Middleware'i)

// Rotalarda yakalanamayan veya next(err) ile iletilen hataların sunucuyu çökertmesini engeller
// ve istemciye (frontend) veritabanı hatalarını net Türkçeleştirerek döner.
app.use((err, req, res, next) => {
    console.error(' [API HATASI]:', err.message || err);

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

    // Genel Hata Dönüşü
    try {
        require('fs').appendFileSync('error.log', new Date().toISOString() + ' [API HATASI] ' + req.url + ' : ' + (err.stack || err.message || err) + '\n');
    } catch (e) { }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Sunucu işlem sırasında bir hata ile karşılaştı.'
    });
});



const PORT = process.env.PORT || 3000;
// Otomatik seed işlemi (Eğer web_categories boşsa web uygulamasının menü verilerini doldurur)
seedWebCategories();

app.listen(PORT, '0.0.0.0', () => {
    // Nodemon tetikleyici 2
    console.log(`Sunucu http://0.0.0.0:${PORT} portunda çalışıyor`);

    // Arka plan otomatik bakım hatırlatması kontrolü (İlk açılışta ve her 6 saatte bir)
    setTimeout(checkUpcomingMaintenances, 5000);
    setInterval(checkUpcomingMaintenances, 1000 * 60 * 60 * 6);

    // WhatsApp Bot'u başlat
    try {
        // initializeWhatsAppBot(); // KULLANICI İSTEĞİ ÜZERİNE GEÇİCİ OLARAK DURDURULDU
        console.log('WhatsApp Botu kullanıcı isteği üzerine durduruldu (pasif).');
    } catch (err) { }
});

// triggered restart
 

