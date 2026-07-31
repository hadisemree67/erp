/**
 * ============================================================================
 * DOSYA ADI: server.js
 * MODÜL / KATMAN: Arkayüz Çekirdeği - Ana Sunucu ve Giriş Noktası (Entry Point)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Express.js HTTP sunucusunu başlatır, CORS ayarlarını yapılandırır, JSON gövde ayrıştırıcılarını (body parser) ekler, tüm API rotalarını (`/api/products`, `/api/wms` vb.) sisteme bağlar ve sunucuyu belirtilen portta dinlemeye alır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js, HTTP Sunucu Yönetimi, Middleware Yapılandırması
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Arkayüz uygulamasının başlama noktasıdır. Tüm yönlendiricileri (routes) ve genel ara katmanları (middleware) bütünleştirir.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya arkayüz (backend) uygulamasının başlangıç noktasıdır. Express.js sunucusunu başlatır, 
 * güvenlik ayarlarını yapar ve tüm API rotalarını sisteme bağlar.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const { logActivity } = require('./utils/logger');
const path = require('path');
const { checkUpcomingMaintenances } = require('./utils/machineNotifier');
const { initializeWhatsAppBot } = require('./services/whatsappBot');

// Maaş ve mesai otomasyonunu başlat
require('./utils/salaryCron');

// 1. GLOBAL CRASH GUARDS (Sunucu Çökme Kalkanı)
// Beklenmeyen / yakalanmayan hataların Node.js sürecini (process) sonlandırmasını engeller.
process.on('uncaughtException', (err) => {
    console.error(' [KRİTİK HATA] Yakalanmayan İstisna (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(' [KRİTİK HATA] Yakalanmayan Promise Reddi (Unhandled Rejection):', reason);
});

const app = express();

app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));

// JSON gövde sınırı (Denial of Service koruması) ve Syntax Error kalkanı
app.use(express.json({ limit: '20mb' }));
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Geçersiz JSON formatı (Syntax Error) gönderildi.' });
    }
    next(err);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('API Sunucusu Çalışıyor!');
});

// Yönlendirmeler
// --- GLOBAL AUTHENTICATION (KİMLİK DOĞRULAMA) DUVARI ---
const authMiddleware = require('./middleware/auth');
app.use((req, res, next) => {
    // console.log(`[AUTH] Method: ${req.method}, Path: ${req.path}`);
    
    // CORS preflight isteklerine izin ver
    if (req.method === 'OPTIONS') {
        return next();
    }
    // Login isteği, public mail linkleri veya sistem durumunu soruyorsa güvenliği atla
    if (
        req.path.includes('/login') || 
        req.path.includes('/settings/status') || 
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/api/purchasing/orders/action') ||
        req.path.startsWith('/api/supplier-approval') ||
        req.path.startsWith('/api/whatsapp-entries/') // if whatsapp uses direct API links too
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
            req.path.includes('/login') ||
            req.path.startsWith('/api/purchasing/orders/action') ||
            req.path.startsWith('/api/supplier-approval');
        if (!isExempt) {
            try {
                const [rows] = await db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'system_paused'");
                if (rows.length > 0 && rows[0].setting_value === 'true') {
                    return res.status(503).json({ 
                        success: false, 
                        message: 'Sistem şu anda depo sayımı veya bakım nedeniyle duraklatılmıştır. Veri değişikliği yapılamaz.' 
                    });
                }
            } catch (err) {
                console.error("Sistem durumu kontrol edilirken hata:", err);
            }
        }
    }
    next();
});
// ----------------------------------------------------------------

const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

const activitiesRouter = require('./routes/activities');
app.use('/api/activities', activitiesRouter);

const employeesRouter = require('./routes/employees');
app.use('/api/employees', employeesRouter);

const wmsRouter = require('./routes/wms');
app.use('/api/wms', wmsRouter);

const warehousesRouter = require('./routes/warehouses');
app.use('/api/warehouses', warehousesRouter);

const suppliersRouter = require('./routes/suppliers');
app.use('/api/suppliers', suppliersRouter);

const customersRouter = require('./routes/customers');
app.use('/api/customers', customersRouter);

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

const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

const boxesRouter = require('./routes/boxes');
app.use('/api/boxes', boxesRouter);

const whatsappRoutes = require('./routes/whatsappEntries');
const mobileRoutes = require('./routes/mobile');
app.use('/api/whatsapp-entries', whatsappRoutes);
app.use('/api/mobile', mobileRoutes);

app.get('/api/brands', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM brands ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Markalar çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Markalar getirilirken hata oluştu.' });
    }
});

app.post('/api/brands', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Marka adı gereklidir.' });
    
    try {
        const [existing] = await db.query('SELECT id FROM brands WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu marka zaten var.' });
        }
        const [result] = await db.query('INSERT INTO brands (name) VALUES (?)', [name]);
        await logActivity(req.headers['x-user-id'], 'INSERT', 'brands', result.insertId, `"${name}" markasını ekledi.`, null);
        res.status(201).json({ success: true, id: result.insertId, name });
    } catch (error) {
        console.error('Marka eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Marka eklenirken hata oluştu.' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM kategori ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Kategoriler çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Kategoriler getirilirken hata oluştu.' });
    }
});

app.post('/api/categories', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Kategori adı gereklidir.' });
    
    try {
        const [existing] = await db.query('SELECT id FROM kategori WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu kategori zaten var.' });
        }
        const [result] = await db.query('INSERT INTO kategori (name) VALUES (?)', [name]);
        await logActivity(req.headers['x-user-id'], 'INSERT', 'kategori', result.insertId, `"${name}" kategorisini ekledi.`, null);
        res.status(201).json({ success: true, id: result.insertId, name });
    } catch (error) {
        console.error('Kategori eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Kategori eklenirken hata oluştu.' });
    }
});

app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [products] = await db.query('SELECT COUNT(Id) as count FROM products');
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
            return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const user = rows[0];

        const dbRole = user.role;
        const employeeRoles = ['kullanici', 'depo', 'uretim'];

        if (role === 'admin' && employeeRoles.includes(dbRole)) {
             return res.status(403).json({ success: false, message: 'Bu hesap Yönetici girişine yetkili değildir.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Hatalı şifre.' });
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
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, permissions },
            process.env.JWT_SECRET || 'gizli_anahtar_degistir_lutfen_123!',
            { expiresIn: '24h' }
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

// 2. 404 ROTA BULUNAMADI YAKALAYICISI (Not Found Handler)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `[404] ${req.method} ${req.url} rotası bulunamadı.` });
});

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
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Sunucu işlem sırasında bir hata ile karşılaştı.'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
    
    // Arka plan otomatik bakım hatırlatması kontrolü (İlk açılışta ve her 6 saatte bir)
    setTimeout(checkUpcomingMaintenances, 5000);
    setInterval(checkUpcomingMaintenances, 1000 * 60 * 60 * 6);

    // WhatsApp Bot'u başlat
    setTimeout(() => {
        initializeWhatsAppBot();
    }, 2000);
});
