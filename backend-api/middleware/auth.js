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

/*
 * ÖZET:
 * Bu modül, gelen API isteklerindeki JSON Web Token (JWT) bilgisini kontrol ederek 
 * kimlik doğrulamasını (authentication) gerçekleştiren bir ara katmandır (middleware).
 */

// JWT (JSON Web Token) kütüphanesi içeri aktarılıyor
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // İstek başlığında (header) 'Authorization' (yetkilendirme) bilgisi olup olmadığı kontrol ediliyor
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    // 'Bearer ' kısmı atılarak sadece şifrelenmiş token metni alınıyor
    const token = authHeader.split(' ')[1];

    try {
        // Token'ın geçerliliği gizli anahtar (JWT_SECRET) kullanılarak doğrulanıyor
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar_degistir_lutfen_123!');
        
        // Doğrulanmış kullanıcı verisi, sonraki işlemlerde kullanılmak üzere isteğe (req.user) ekleniyor
        req.user = decoded; 
        
        // Kimlik doğrulama başarılı, istek ilgili rotaya (route) iletiliyor
        next();
    } catch (error) {
        // Token hatalıysa veya süresi dolmuşsa yetki hatası döndürülüyor
        return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

// Ara katman (middleware) dışa aktarılıyor
module.exports = authMiddleware;
