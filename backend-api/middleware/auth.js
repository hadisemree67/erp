/**
 * ============================================================================
 * DOSYA ADI: auth.js
 * MODÜL / KATMAN: Arkayüz - Ara Katman (Middleware)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Kullanıcıların kimlik doğrulamasını (authentication) ve yetki denetimini (authorization) gerçekleştirir. Gelen isteklerdeki JWT (JSON Web Token) veya oturum bilgilerini kontrol ederek yetkisiz erişimleri engeller.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js Middleware, JWT / Oturum Yönetimi
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Tüm güvenli API rotalarının (routes) önünde çalışır; yetki kontrolü başarılı olursa isteği ilgili rotaya iletir.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistir_lutfen_123!');
        req.user = decoded; // Attach user payload to request
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

module.exports = authMiddleware;
