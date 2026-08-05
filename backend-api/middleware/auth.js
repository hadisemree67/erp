/*
 * Bu modül, gelen API isteklerindeki JSON Web Token (JWT) bilgisini kontrol ederek 
 * kimlik doğrulamasını (authentication) gerçekleştiren bir ara katmandır (middleware).
 */

// JWT (JSON Web Token) kütüphanesi içeri aktarılıyor
const jwt = require('jsonwebtoken');
const db = require('../db');

const authMiddleware = async (req, res, next) => {
    // İstek başlığında (header) 'Authorization' (yetkilendirme) bilgisi olup olmadığı kontrol ediliyor
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    // 'Bearer ' kısmı atılarak sadece şifrelenmiş token metni alınıyor
    const token = authHeader.split(' ')[1];

    try {
        // Token'ın geçerliliği gizli anahtar (JWT_SECRET) kullanılarak doğrulanıyor
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) throw new Error("JWT_SECRET is not defined!");
        const decoded = jwt.verify(token, secretKey);

        // EK GÜVENLİK: Veritabanına gidip bu kullanıcı hala var mı diye kontrol ediyoruz
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [decoded.id]);
        
        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Güvenlik İhlali: Hesabınız sistemden silinmiş veya bulunamadı.' 
            });
        }

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
