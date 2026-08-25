const jwt = require('jsonwebtoken');

/**
 * Müşteriler (web-app kullanıcıları) için JWT doğrulama middleware'i
 */
const customerAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) {
            console.error("JWT_SECRET bulunamadı!");
            return res.status(500).json({ success: false, message: 'Sunucu yapılandırma hatası.' });
        }

        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

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
