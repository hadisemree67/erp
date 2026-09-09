/**
 * ============================================================================
 * BİLEŞEN ADI: auth
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
/*
 * Bu modül, gelen API isteklerindeki JSON Web Token (JWT) bilgisini kontrol ederek 
 * kimlik doğrulamasını (authentication) gerçekleştiren bir ara katmandır (middleware).
 */

// JWT (JSON Web Token) kütüphanesi içeri aktarılıyor
const jwt = require('jsonwebtoken');
const db = require('../db');
const { generateFingerprint } = require('../utils/fingerprint');
const redisClient = require('../services/redisService');

const CACHE_TTL_SECONDS = 5 * 60; // 5 dakika

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
        let isBlacklisted = false;
        try {
            if (redisClient.isReady) isBlacklisted = await redisClient.get(`bl_${token}`);
            else {
                const [dbBl] = await db.query('SELECT token FROM blacklisted_tokens WHERE token = ?', [token]);
                isBlacklisted = dbBl.length > 0;
            }
        } catch(e) {}
        if (isBlacklisted) {
            return res.status(401).json({ success: false, message: 'Bu oturum kapatılmış (Geçersiz Token). Lütfen tekrar giriş yapın.' });
        }

        // Token'ın geçerliliği gizli anahtar (JWT_SECRET) kullanılarak doğrulanıyor
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) throw new Error("JWT_SECRET is not defined!");
        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

        // CROSS-ROLE ISOLATION: Müşteri token'larının personel paneline erişimini engelle.
        if (!decoded.role || decoded.role === 'customer') {
            return res.status(403).json({ success: false, message: 'Bu alana erişim yetkiniz yok (Yetki Uyuşmazlığı).' });
        }
        
        // SESSION HIJACKING KORUMASI: Token içindeki parmak izi ile mevcut cihazın parmak izini karşılaştır
        if (decoded.deviceFingerprint) {
            const currentFingerprint = generateFingerprint(req);
            if (decoded.deviceFingerprint !== currentFingerprint) {
                console.warn(`[GÜVENLİK UYARISI] Personel Oturumu Çalınma Girişimi Engellendi! Personel: ${decoded.username || decoded.id}`);
                return res.status(401).json({ success: false, message: 'Oturum çalınma şüphesi veya farklı cihazdan giriş. Lütfen tekrar giriş yapın.' });
            }
        }

        let cached = null;
        try {
            if (redisClient.isReady) {
                const redisData = await redisClient.get(`authCache:${decoded.id}`);
                if (redisData) cached = JSON.parse(redisData);
            }
        } catch (redisErr) {
            console.warn('Redis okuma hatası:', redisErr);
        }

        // Eğer önbellekte geçerli bir veri varsa veritabanına HİÇ SORMADAN devam et
        if (cached) {
            req.user = cached;
            return next();
        }

        // EK GÜVENLİK: Veritabanına gidip bu kullanıcı hala var mı ve aktif mi diye kontrol ediyoruz
        // PERFORMANS: 2 ayrı sorgu yapmak yerine tek bir LEFT JOIN sorgusu ile kullanıcıyı ve yetkilerini aynı anda çekiyoruz
        const [rows] = await db.query(`
            SELECT u.id, u.role, u.name, u.is_active, p.permission_key 
            FROM users u 
            LEFT JOIN user_permissions up ON u.id = up.user_id 
            LEFT JOIN permissions p ON up.permission_id = p.id 
            WHERE u.id = ?
        `, [decoded.id]);
        
        if (rows.length === 0 || rows[0].is_active === 0 || rows[0].is_active === '0' || rows[0].is_active === false) {
            try {
                if (redisClient.isReady) await redisClient.del(`authCache:${decoded.id}`);
            } catch (e) {}
            return res.status(401).json({ 
                success: false, 
                message: 'Güvenlik İhlali: Hesabınız sistemden silinmiş veya pasife alınmış.' 
            });
        }

        const permissions = rows.filter(r => r.permission_key).map(r => r.permission_key);

        // Doğrulanmış kullanıcı verisi, güncel rol ve yetkilerle birlikte isteğe (req.user) ekleniyor
        req.user = {
            id: decoded.id,
            username: decoded.username,
            name: rows[0].name,
            role: rows[0].role, // DB'deki güncel rol
            permissions: permissions // DB'deki güncel yetkiler
        };

        // Veritabanından taze çektiğimiz bu bilgiyi 5 dakikalığına önbelleğe al
        try {
            if (redisClient.isReady) {
                await redisClient.set(`authCache:${decoded.id}`, JSON.stringify(req.user), { EX: CACHE_TTL_SECONDS });
            }
        } catch (e) {
            console.warn('Redis yazma hatası:', e);
        }

        // Kimlik doğrulama başarılı, istek ilgili rotaya (route) iletiliyor
        next();
    } catch (error) {
        // Token hatalıysa veya süresi dolmuşsa yetki hatası döndürülüyor
        return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

// Yetkiler değiştirildiğinde cache'i temizlemek için metod
authMiddleware.clearAuthCache = async (userId) => {
    try {
        if (redisClient.isReady) {
            await redisClient.del(`authCache:${userId}`);
        }
    } catch(e) {}
};

// Ara katman (middleware) dışa aktarılıyor
module.exports = authMiddleware;

