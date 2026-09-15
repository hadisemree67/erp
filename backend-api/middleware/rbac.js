/**
 * ============================================================================
 * BİLEŞEN ADI: rbac
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Bu ara katman, JWT'den çözülen req.user objesindeki role ve permissions
 * bilgilerini kontrol ederek rotalara erişimi kısıtlar.
 */

const isAdmin = (role) => {
    if (!role) return false;
    const r = role.toString().trim().toLowerCase();
    return r === 'admin' || r === 'yönetici' || r === 'yonetici';
};

/**
 * Belirli rollere sahip kullanıcıların erişimine izin verir.
 * 'admin' ve 'Yönetici' rolüne sahip kullanıcılar her zaman erişebilir.
 * @param {string[]} allowedRoles - İzin verilen roller dizisi (örn: ['Depo', 'Üretim'])
 */
const checkRole = (allowedRoles = [], fallbackPermission = null) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Oturum bilgisi bulunamadı.' });
        }

        const userRole = req.user.role;

        // Admin ve Yönetici her şeye tam yetkilidir
        if (isAdmin(userRole)) {
            return next();
        }

        // Kullanıcının rolü izin verilen roller arasında mı? (Büyük/küçük harf duyarsız)
        const lowerUserRole = (userRole || '').toString().toLowerCase();
        const isAllowed = allowedRoles.some(r => r.toString().toLowerCase() === lowerUserRole);
        if (isAllowed) {
            return next();
        }

        // Rol tutmuyorsa, ancak özel izin belirtilmişse ve kullanıcı bu izne sahipse izin ver
        const userPermissions = req.user.permissions || [];
        if (fallbackPermission && userPermissions.includes(fallbackPermission)) {
            return next();
        }

        // EĞER ÜÇÜ DE TUTMAZSA 403 DÖNER:
        return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
    };
};

/**
 * Belirli bir özel yetkiye sahip kullanıcıların erişimine izin verir.
 * 'admin' ve 'Yönetici' rolüne sahip kullanıcılar her zaman erişebilir.
 * @param {string} requiredPermission - Gerekli yetki anahtarı (örn: 'staff_manage')
 */
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Oturum bilgisi bulunamadı.' });
        }

        if (isAdmin(req.user.role)) {
            return next();
        }

        const userPermissions = req.user.permissions || [];

        if (userPermissions.includes(requiredPermission)) {
            return next();
        }

        return res.status(403).json({ success: false, message: 'Bu işlem için özel yetkiniz bulunmamaktadır.' });
    };
};

module.exports = {
    checkRole,
    checkPermission
};

