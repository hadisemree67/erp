const jwt = require('jsonwebtoken');
const db = require('../db');

/**
 * Müşteriler (web-app kullanıcıları) için JWT doğrulama middleware'i
 * GÜVENLİK: Blacklist + session + rol kontrolü dahil tam doğrulama
 */
const customerAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) {
            console.error('JWT_SECRET bulunamadı!');
            return res.status(500).json({ success: false, message: 'Sunucu yapılandırma hatası.' });
        }

        // GÜVENLİK: Token kara listede mi kontrol et
        const [blacklistRows] = await db.query('SELECT token FROM blacklisted_tokens WHERE token = ?', [token]);
        if (blacklistRows.length > 0) {
            return res.status(401).json({ success: false, message: 'Bu oturum kapatılmış (Geçersiz Token). Lütfen tekrar giriş yapın.' });
        }

        // GÜVENLİK: Token hâlâ aktif mi (customer_sessions tablosu)
        const [activeSessionRows] = await db.query('SELECT id FROM customer_sessions WHERE token = ?', [token]);
        if (activeSessionRows.length === 0) {
            return res.status(401).json({ success: false, message: 'Oturumunuz başka bir cihazdan kapatıldı. Lütfen tekrar giriş yapın.' });
        }

        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

        // GÜVENLİK: Sadece müşteri rolü bu middleware'den geçebilir
        if (decoded.role !== 'customer') {
            return res.status(403).json({ success: false, message: 'Sadece müşteriler bu işlemi yapabilir.' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

module.exports = customerAuthMiddleware;
