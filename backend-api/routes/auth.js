/**
 * ============================================================================
 * DOSYA ADI: routes/auth.js
 * MODÜL / KATMAN: Kimlik Doğrulama (Authentication) Rotaları
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Login, logout ve token doğrulama (verify) işlemlerini yönetir.
 *   JWT token oluşturma, kara listeye alma ve oturum yönetimini içerir.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateFingerprint } = require('../utils/fingerprint');
const authenticateToken = require('../middleware/auth');

// --- GİRİŞ YAP (LOGIN) ---
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    try {
        // DEV-ONLY: Demo hesabı — sadece geliştirme ortamında çalışır, production'da devre dışıdır
        if (process.env.NODE_ENV !== 'production' && username === 'deneme' && password === 'deneme1') {
            const [dRows] = await db.query('SELECT * FROM users WHERE username = "deneme"');
            if (dRows.length === 0) {
                const hashedPassword = await bcrypt.hash('deneme1', 12);
                await db.query(
                    'INSERT INTO users (username, name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                    ['deneme', 'Deneme Admin', 'admin@deneme.com', hashedPassword, 'admin', true]
                );
                
                // Demo Ürünlerini Ekle (Eğer hiç ürün yoksa)
                const [pRows] = await db.query('SELECT COUNT(*) as count FROM products');
                if (pRows[0].count === 0) {
                    await db.query(
                        'INSERT INTO products (ProductName, Brand, Category, SalePrice, StockQuantity, ImagePath) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
                        [
                            'Örnek Nemlendirici Krem', 'DemoMarka', 'Kozmetik', 299.90, 50, '',
                            'Örnek Mat Ruj', 'DemoMarka', 'Kozmetik', 149.90, 120, '',
                            'Örnek Göz Farı Paleti', 'DemoMarka', 'Kozmetik', 399.90, 30, ''
                        ]
                    );
                }
            }
        }

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

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('[KRİTİK] JWT_SECRET ortam değişkeni tanımlı değil!');
            return res.status(500).json({ success: false, message: 'Sunucu yapılandırma hatası.' });
        }
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                permissions,
                deviceFingerprint: generateFingerprint(req)
            },
            jwtSecret,
            { expiresIn: '8h' }
        );

        // TEKİL OTURUM (STRICT SINGLE SESSION): Eski oturumları sil ve yenisini ekle
        const ip_address = req.ip || req.connection.remoteAddress;
        const device_info = req.headers['user-agent'] || 'Unknown Device';
        
        await db.query('DELETE FROM user_sessions WHERE user_id = ?', [user.id]);
        await db.query(
            'INSERT INTO user_sessions (user_id, ip_address, device_info, token) VALUES (?, ?, ?, ?)',
            [user.id, ip_address, device_info, token]
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
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası oluştu. Lütfen tekrar deneyin.' });
    }
});

// --- OTURUM DOĞRULAMA (VERIFY) ---
// Frontend (ERP) yüklendiğinde token'ın hala aktif (başka cihazdan girilmemiş) olduğunu doğrular.
router.get('/auth/verify', authenticateToken, (req, res) => {
    // authenticateToken'dan geçtiyse token sağlamdır ve veritabanında (user_sessions) tekil olarak aktiftir.
    res.json({ success: true, message: 'Oturum geçerli.', user: req.user });
});

// --- ÇIKIŞ YAP (LOGOUT) ---
// Frontend'den gelen istekle mevcut token'ı veritabanındaki kara listeye ekler.
router.post('/logout', async (req, res) => {
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

// Mobil versiyon ve durum kontrolü
router.get('/mobile-version', (req, res) => {
    res.json({
        success: true,
        version: '1.0.0',
        minVersion: '1.0.0',
        forceUpdate: false,
    });
});

module.exports = router;
