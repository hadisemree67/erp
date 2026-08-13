/*
 * Bu modül, gelen API isteklerindeki JSON Web Token (JWT) bilgisini kontrol ederek 
 * kimlik doğrulamasını (authentication) gerçekleştiren bir ara katmandır (middleware).
 */

// JWT (JSON Web Token) kütüphanesi içeri aktarılıyor
const jwt = require('jsonwebtoken');
const db = require('../db');



// Basit bir in-memory önbellek (cache) sistemi: DB yükünü azaltmak için
const authCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 dakika

const authMiddleware = async (req, res, next) => {
    // İstek başlığında (header) 'Authorization' (yetkilendirme) bilgisi olup olmadığı kontrol ediliyor
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    // 'Bearer ' kısmı atılarak sadece şifrelenmiş token metni alınıyor
    const token = authHeader.split(' ')[1];

    try {
        // [YENİ] Token'ın kara listede olup olmadığını kontrol et (Çıkış yapılmış mı?)
        const [blacklistRows] = await db.query('SELECT token FROM blacklisted_tokens WHERE token = ?', [token]);
        if (blacklistRows.length > 0) {
            return res.status(401).json({ success: false, message: 'Bu oturum kapatılmış (Geçersiz Token). Lütfen tekrar giriş yapın.' });
        }

        // Token'ın geçerliliği gizli anahtar (JWT_SECRET) kullanılarak doğrulanıyor
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) throw new Error("JWT_SECRET is not defined!");
        const decoded = jwt.verify(token, secretKey);

        const now = Date.now();
        const cached = authCache.get(decoded.id);

        // Eğer önbellekte geçerli bir veri varsa veritabanına HİÇ SORMADAN devam et
        if (cached && cached.expiresAt > now) {
            req.user = cached.data;
            return next();
        }

        // EK GÜVENLİK: Veritabanına gidip bu kullanıcı hala var mı ve aktif mi diye kontrol ediyoruz
        // PERFORMANS: 2 ayrı sorgu yapmak yerine tek bir LEFT JOIN sorgusu ile kullanıcıyı ve yetkilerini aynı anda çekiyoruz
        const [rows] = await db.query(`
            SELECT u.id, u.role, u.is_active, p.permission_key 
            FROM users u 
            LEFT JOIN user_permissions up ON u.id = up.user_id 
            LEFT JOIN permissions p ON up.permission_id = p.id 
            WHERE u.id = ?
        `, [decoded.id]);
        
        if (rows.length === 0 || rows[0].is_active === 0 || rows[0].is_active === '0' || rows[0].is_active === false) {
            authCache.delete(decoded.id); // Eğer hesap pasifse hemen cache'den de sil
            return res.status(401).json({ 
                success: false, 
                message: 'Güvenlik İhlali: Hesabınız sistemden silinmiş veya pasife alınmış.' 
            });
        }

        const permissions = rows.filter(r => r.permission_key).map(r => r.permission_key);

        // Doğrulanmış kullanıcı verisi, güncel rol ve yetkilerle birlikte isteğe (req.user) ekleniyor
        req.user = {
            ...decoded,
            role: rows[0].role, // DB'deki güncel rol
            permissions: permissions // DB'deki güncel yetkiler
        };

        // Veritabanından taze çektiğimiz bu bilgiyi 5 dakikalığına önbelleğe al
        authCache.set(decoded.id, {
            data: req.user,
            expiresAt: now + CACHE_TTL_MS
        });

        // Kimlik doğrulama başarılı, istek ilgili rotaya (route) iletiliyor
        next();
    } catch (error) {
        // Token hatalıysa veya süresi dolmuşsa yetki hatası döndürülüyor
        return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

// Yetkiler değiştirildiğinde cache'i temizlemek için metod
authMiddleware.clearAuthCache = (userId) => {
    authCache.delete(Number(userId));
};

// Ara katman (middleware) dışa aktarılıyor
module.exports = authMiddleware;
