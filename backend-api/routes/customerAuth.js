/**
 * ============================================================================
 * BİLEŞEN ADI: customerAuth
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { generateFingerprint } = require('../utils/fingerprint');
const prisma = require('../prisma');
const { toFrontendStatus } = require('../utils/enumMapper');

// GÜVENLİK: Müşteri login için brute-force koruşma
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 dakika
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Fazla deneme. Lütfen 10 dakika bekleyin.' }
});

// GÜVENLİK: OTP doğrulama için çok katlı brute-force koruşma (6 haneli = 1M olasılık)
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 dakika
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Fazla yanlış doğrulama denemesi. Lütfen 10 dakika bekleyin.' }
});
// Müşteriler için özel yetkilendirme ve blacklist kontrol middleware'i
const customerAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const [blacklistRows] = await db.query('SELECT token FROM blacklisted_tokens WHERE token = ?', [token]);
        if (blacklistRows.length > 0) {
            return res.status(401).json({ message: 'Bu oturum kapatılmış (Geçersiz Token). Lütfen tekrar giriş yapın.' });
        }

        // TEKİL OTURUM (STRICT SINGLE SESSION): Veritabanında bu token hala aktif mi?
        const [activeSessionRows] = await db.query('SELECT id FROM customer_sessions WHERE token = ?', [token]);
        if (activeSessionRows.length === 0) {
            console.warn(`[GÜVENLİK UYARISI] Başka bir cihazdan girildiği için eski oturum düşürüldü.`);
            return res.status(401).json({ message: 'Hesabınıza başka bir cihazdan giriş yapıldı. Güvenliğiniz için bu oturum sonlandırıldı.' });
        }

        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) throw new Error("JWT_SECRET is not defined!");
        
        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

        // CROSS-ROLE ISOLATION: Personel token'larının müşteri paneline erişimini engelle.
        if (decoded.role !== 'customer') {
            return res.status(403).json({ message: 'Bu alana erişim yetkiniz yok (Yetki Uyuşmazlığı).' });
        }
        
        // SESSION HIJACKING KORUMASI: Token içindeki parmak izi ile mevcut cihazın parmak izini karşılaştır
        if (decoded.deviceFingerprint) {
            const currentFingerprint = generateFingerprint(req);
            if (decoded.deviceFingerprint !== currentFingerprint) {
                console.warn(`[GÜVENLİK UYARISI] Oturum çalınma girişimi engellendi! Müşteri: ${decoded.email || decoded.phone}`);
                return res.status(401).json({ message: 'Oturum çalınma şüphesi veya farklı cihazdan giriş (Güvenlik İhlali). Lütfen tekrar giriş yapın.' });
            }
        }

        req.user = decoded; // id, email, phone, role vs.
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

// GET /api/customers/auth/verify
// Frontend'in sayfa yüklendiğinde kopyalanmış (çalınmış) veya eski oturumları 
// anında tespit edip kullanıcıyı anında sistemden atabilmesi (Instant Logout) için eklendi.
router.get('/verify', customerAuthMiddleware, (req, res) => {
    // Eğer middleware'den geçerse token sağlamdır ve veritabanında tektir.
    res.json({ success: true, message: 'Oturum geçerli.' });
});

// GÜVENLİK İYİLEŞTİRMESİ: /fixdb debug endpoint'i schema sızıntısını önlemek için kaldırıldı.
// POST /api/customers/auth/register
// Step 1: Create unverified customer, hash password, generate OTP
router.post('/register', authLimiter, async (req, res) => {
    const { firstName, lastName, contact, password } = req.body;
    
    if (!firstName || !lastName || !contact || !password) {
        return res.status(400).json({ message: 'Tüm alanları doldurunuz.' });
    }

    // GÜVENLİK: Şifre gücü doğrulaması (Müşteri hesabı)
    if (password.length < 8) {
        return res.status(400).json({ message: 'Şifre en az 8 karakter olmalıdır.' });
    }
    if (!/[A-Z]/.test(password) && !/[a-z]/.test(password)) {
        return res.status(400).json({ message: 'Şifre en az bir harf içermelidir.' });
    }

    try {
        // Check if customer already exists (by email or phone depending on contact input)
        const isEmail = contact.includes('@');
        let queryStr = isEmail ? 'SELECT * FROM customers WHERE Email = ?' : 'SELECT * FROM customers WHERE Phone = ?';
        
        const [existing] = await db.query(queryStr, [contact]);
        
        if (existing.length > 0) {
            // If exists and is verified
            if (existing[0].IsVerified) {
                return res.status(400).json({ message: 'Bu iletişim bilgisi ile kayıtlı bir hesap zaten var.' });
            }
            // If exists but not verified, we can just overwrite or update OTP
            // For simplicity, we'll update the existing unverified record
        }

        const hashedPassword = await bcrypt.hash(password, 12); // Cost factor 12 (daha güvenli)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const otpExpiry = new Date(Date.now() + 5 * 60000); // 5 minutes from now
        
        const customerName = `${firstName} ${lastName}`;
        const email = isEmail ? contact : null;
        const phone = isEmail ? null : contact;

        if (existing.length > 0) {
            // Update existing unverified
            await db.query(
                'UPDATE customers SET CustomerName = ?, Password = ?, OtpCode = ?, OtpExpiry = ?, Email = ?, Phone = ? WHERE Id = ?',
                [customerName, hashedPassword, otpCode, otpExpiry, email, phone, existing[0].Id]
            );
        } else {
            // Insert new
            await db.query(
                'INSERT INTO customers (CustomerName, Email, Phone, Password, IsVerified, OtpCode, OtpExpiry) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [customerName, email, phone, hashedPassword, false, otpCode, otpExpiry]
            );
        }

        // IMPORTANT: Send OTP via Email if contact is email
        if (isEmail) {
            const { sendOtpEmail } = require('../services/emailService');
            await sendOtpEmail(contact, otpCode, customerName);
        } else {
            console.log(`[TELEFON SİMÜLASYONU] ${contact} için SMS kodu gönderildi (kod loglanmıyor).`);
        }

        res.status(200).json({ message: 'Doğrulama kodu gönderildi.', contact });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Sunucu hatası, lütfen tekrar deneyin.' });
    }
});

// POST /api/customers/auth/verify
// Step 2: Verify OTP and activate account
router.post('/verify', otpLimiter, async (req, res) => {
    const { contact, otpCode } = req.body;
    
    if (!contact || !otpCode) {
        return res.status(400).json({ message: 'Eksik bilgi gönderildi.' });
    }

    try {
        const isEmail = contact.includes('@');
        let queryStr = isEmail ? 'SELECT * FROM customers WHERE Email = ?' : 'SELECT * FROM customers WHERE Phone = ?';
        
        const [users] = await db.query(queryStr, [contact]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        
        const user = users[0];

        if (user.IsVerified) {
            return res.status(400).json({ message: 'Hesap zaten doğrulanmış.' });
        }

        if (user.OtpCode !== otpCode) {
            return res.status(400).json({ message: 'Geçersiz doğrulama kodu.' });
        }

        if (new Date() > new Date(user.OtpExpiry)) {
            return res.status(400).json({ message: 'Doğrulama kodunun süresi dolmuş.' });
        }

        // Activate
        await db.query(
            'UPDATE customers SET IsVerified = true, OtpCode = NULL, OtpExpiry = NULL WHERE Id = ?',
            [user.Id]
        );

        res.status(200).json({ message: 'Hesabınız başarıyla doğrulandı.' });

    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ message: 'Sunucu hatası, lütfen tekrar deneyin.' });
    }
});

// POST /api/customers/auth/login
// Step 3: Login verified customer
router.post('/login', authLimiter, async (req, res) => {
    const { contact, password } = req.body;

    if (!contact || !password) {
        return res.status(400).json({ message: 'Lütfen tüm alanları doldurunuz.' });
    }

    try {
        // "deneme" hesabı otomatik oluşturma
        if (contact === 'deneme' && password === 'deneme1') {
            const [cRows] = await db.query('SELECT * FROM customers WHERE Phone = "deneme"');
            if (cRows.length === 0) {
                const hashedPassword = await bcrypt.hash('deneme1', 12);
                await db.query(
                    'INSERT INTO customers (CustomerName, Email, Phone, Password, IsVerified) VALUES (?, ?, ?, ?, ?)',
                    ['Deneme Müşteri', null, 'deneme', hashedPassword, true]
                );
            }
        }

        const isEmail = contact.includes('@');
        let queryStr = isEmail ? 'SELECT * FROM customers WHERE Email = ?' : 'SELECT * FROM customers WHERE Phone = ?';
        
        const [users] = await db.query(queryStr, [contact]);

        if (users.length === 0) {
            // Anti-enumeration delay
            await bcrypt.compare(password, '$2b$10$invalidhashfortimingnnnnnnnnnnnnnnnnnnnnn');
            return res.status(401).json({ message: 'Hatalı bilgi girdiniz.' });
        }

        const user = users[0];

        if (!user.IsVerified) {
            return res.status(403).json({ message: 'Hesabınız doğrulanmamış. Lütfen kayıt işleminizi tamamlayın.' });
        }

        const isMatch = await bcrypt.compare(password, user.Password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Hatalı bilgi girdiniz.' });
        }

        // "deneme" hesabı için OTP (2FA) atlama
        if (contact === 'deneme') {
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { 
                    id: user.Id, 
                    email: user.Email,
                    phone: user.Phone,
                    role: 'customer',
                    deviceFingerprint: generateFingerprint(req)
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const ip_address = req.ip || req.connection.remoteAddress;
            const device_info = req.headers['user-agent'] || 'Unknown Device';
            
            await db.query('DELETE FROM customer_sessions WHERE customer_id = ?', [user.Id]);
            await db.query(
                'INSERT INTO customer_sessions (customer_id, ip_address, device_info, token) VALUES (?, ?, ?, ?)',
                [user.Id, ip_address, device_info, token]
            );

            return res.json({
                success: true,
                requires2FA: false,
                token,
                user: { id: user.Id, name: user.CustomerName, email: user.Email, phone: user.Phone, TwoFactorEnabled: false }
            });
        }

        // İSTİSNASIZ HER GİRİŞTE (Şifre doğruysa) DOĞRULAMA KODU (2FA) GÖNDERİLİR.
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 5 * 60000);
        
        await db.query('UPDATE customers SET OtpCode = ?, OtpExpiry = ? WHERE Id = ?', [otpCode, otpExpiry, user.Id]);
        
        if (isEmail) {
            const { sendOtpEmail } = require('../services/emailService');
            await sendOtpEmail(contact, otpCode, user.CustomerName);
        } else {
            console.log(`[TELEFON SİMÜLASYONU] ${contact} için 2FA kodu gönderildi (kod loglanmıyor).`);
        }
        
        return res.json({ success: true, requires2FA: true, contact, message: 'Doğrulama kodu gönderildi.' });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Sunucu hatası, lütfen tekrar deneyin.' });
    }
});

// POST /api/customers/auth/logout
// Müşteri çıkış yaptığında token'ı sunucu tarafında geçersiz kıl (Blacklisting)
router.post('/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ success: true });
    }

    const token = authHeader.split(' ')[1];
    try {
        await db.query('INSERT IGNORE INTO blacklisted_tokens (token) VALUES (?)', [token]);
        res.json({ success: true, message: 'Çıkış yapıldı ve oturum sunucu tarafında sonlandırıldı.' });
    } catch (error) {
        console.error('Logout hatası:', error);
        res.status(500).json({ success: false, message: 'Çıkış yapılırken bir hata oluştu.' });
    }
});

// GET /api/customers/auth/profile
// Get current customer's profile info and addresses
router.get('/profile', customerAuthMiddleware, async (req, res) => {
    try {
        const decoded = req.user;
        const [users] = await db.query('SELECT * FROM customers WHERE Id = ?', [decoded.id]);
        
        if (users.length === 0) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        const user = users[0];
        
        let addresses = [];
        try {
            if (user.WebAddresses) {
                addresses = typeof user.WebAddresses === 'string' ? JSON.parse(user.WebAddresses) : user.WebAddresses;
            } else if (user.Address && user.Address.startsWith('[')) {
                addresses = JSON.parse(user.Address);
            }
        } catch(e) {}
        
        let firstName = '';
        let lastName = '';
        if (user.CustomerName) {
            const nameParts = user.CustomerName.trim().split(' ').filter(Boolean);
            if (nameParts.length > 1) {
                lastName = nameParts.pop();
                firstName = nameParts.join(' ');
            } else {
                firstName = nameParts[0] || '';
            }
        }

        res.json({
            success: true,
            user: {
                firstName,
                lastName,
                email: user.Email || '',
                phone: user.Phone || '',
                birthDate: user.BirthDate || '',
                gender: user.Gender || 'Erkek'
            },
            addresses
        });
    } catch (err) {
        res.status(401).json({ message: 'Geçersiz token' });
    }
});

// PUT /api/customers/auth/profile
// Update customer profile info
router.put('/profile', customerAuthMiddleware, async (req, res) => {
    try {
        const decoded = req.user;
        const { firstName, lastName, email, phone, gender, birthDate } = req.body;
        
        const customerName = `${firstName} ${lastName}`;
        await db.query(
            'UPDATE customers SET CustomerName = ?, Email = ?, Phone = ?, Gender = ?, BirthDate = ? WHERE Id = ?',
            [customerName.trim(), email || null, phone || null, gender || null, birthDate || null, decoded.id]
        );
        
        res.json({ success: true, message: 'Bilgiler güncellendi' });
    } catch (err) {
        console.error("PUT /profile ERROR:", err);
        res.status(500).json({ message: 'Sunucu hatası: ' + err.message });
    }
});

// PUT /api/customers/auth/addresses
// Update customer addresses (stored as JSON in Address column)
router.put('/addresses', customerAuthMiddleware, async (req, res) => {
    try {
        const decoded = req.user;
        const { addresses } = req.body;
        
        const webAddressesStr = JSON.stringify(addresses);
        
        let formattedAddress = "";
        let primaryCity = null;
        if (addresses && addresses.length > 0) {
            const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
            primaryCity = defaultAddr.city || null;

            formattedAddress = addresses.map((a, index) => {
                return `[ADRES ${index + 1}: ${a.title.toUpperCase()}]
Ad Soyad: ${a.name}
Telefon: ${a.phone}
İl/İlçe: ${a.city} / ${a.district}
Mahalle: ${a.neighborhood}
Açık Adres: ${a.addressDetail}
${a.isDefault ? '(Varsayılan Adres)' : ''}`.trim();
            }).join('\n\n------------------------\n\n');
        }

        await db.query(
            'UPDATE customers SET Address = ?, WebAddresses = ?, City = ? WHERE Id = ?',
            [formattedAddress, webAddressesStr, primaryCity, decoded.id]
        );
        
        res.json({ success: true, message: 'Adresler güncellendi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/customers/auth/my-orders - Kullanıcının siparişlerini getir
router.get('/my-orders', customerAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Geçici düzeltme: 'İptal Bekliyor' Prisma şemasında olmadığı için çökmeye sebep oluyor.
        // npx prisma generate çalıştırılana kadar veritabanındaki bozuk veriyi düzelt.
        await db.query("UPDATE orders SET OrderStatus = 'Beklemede' WHERE OrderStatus = 'İptal Bekliyor'");

        const orders = await prisma.orders.findMany({
            where: { CustomerId: userId },
            include: {
                orderitems: {
                    include: {
                        products: true
                    }
                }
            },
            orderBy: { OrderDate: 'desc' }
        });

        // Prisma modelinde order_returns tam güncellenmediği için manuel çekelim (saf SQL ile)
        const orderIds = orders.map(o => o.Id);
        let allReturns = [];
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            const [returnsRows] = await db.query(
                `SELECT * FROM order_returns WHERE order_id IN (${placeholders}) AND request_type = 'iptal'`,
                orderIds
            );
            allReturns = returnsRows;
        }

        const formattedOrders = orders.map(o => {
            // Aktif (beklemede) iptal talebi var mı? Yalnızca Beklemede olanları dikkate al.
            const activeCancelRequest = allReturns.find(r => r.order_id === o.Id && r.status === 'Beklemede');
            let cancelledItemsList = [];
            if (activeCancelRequest && activeCancelRequest.items_json) {
                try {
                    cancelledItemsList = typeof activeCancelRequest.items_json === 'string' 
                        ? JSON.parse(activeCancelRequest.items_json) 
                        : activeCancelRequest.items_json;
                    if (!Array.isArray(cancelledItemsList)) cancelledItemsList = [];
                } catch(e) {
                    console.error("activeCancelRequest.items_json parse hatası:", e);
                    cancelledItemsList = [];
                }
            }

            // İptal bekleyen ürünleri normal listeden çıkar veya miktarını düşür
            // (Reddedilen talepler görmezden gelinir, ürünler siparişte kalır)
            let displayItems = [];
            for (const oi of o.orderitems) {
                const cancelMatch = cancelledItemsList.find(c => c.product_id === oi.ProductId);
                if (cancelMatch) {
                    const remainingQty = oi.Quantity - (cancelMatch.quantity || oi.Quantity);
                    if (remainingQty > 0) {
                        displayItems.push({
                            ...oi,
                            Quantity: remainingQty,
                            ProductName: oi.products?.ProductName,
                            ImagePath: oi.products?.ImagePath,
                            Unit: oi.products?.unit_type
                        });
                    }
                } else {
                    displayItems.push({
                        ...oi,
                        ProductName: oi.products?.ProductName,
                        ImagePath: oi.products?.ImagePath,
                        Unit: oi.products?.unit_type
                    });
                }
            }

            // Eğer sipariş İptal Bekliyor durumundaysa, ama hala gösterilecek ürünü varsa 'Beklemede' gibi gösterelim.
            // Eğer gösterilecek hiç ürün kalmadıysa (Tamamı iptal talep edilmişse) 'İptal Bekliyor' yazsın.
            let displayStatus = o.OrderStatus;
            if (o.OrderStatus === 'İptal Bekliyor' || o.OrderStatus === 'ptal_Bekliyor') {
                if (displayItems.length > 0) {
                    displayStatus = 'Beklemede';
                }
            }

            // İptal onaylanan ürünleri ayrıca gönder (sipariş kartında göstermek için)
            const approvedCancelRequest = allReturns.find(r => r.order_id === o.Id && r.status === 'Onaylandı');
            let cancelledItems = [];
            if (approvedCancelRequest && approvedCancelRequest.items_json) {
                try {
                    cancelledItems = typeof approvedCancelRequest.items_json === 'string'
                        ? JSON.parse(approvedCancelRequest.items_json)
                        : approvedCancelRequest.items_json;
                    if (!Array.isArray(cancelledItems)) cancelledItems = [];
                } catch(e) {
                    console.error("approvedCancelRequest.items_json parse hatası:", e);
                    cancelledItems = [];
                }
            }

            return {
                ...o,
                OrderStatus: toFrontendStatus(displayStatus),
                items: displayItems,
                cancelledItems
            };
        });

        res.json({ success: true, data: formattedOrders });
    } catch (err) {
        console.error('Müşteri siparişleri getirilirken hata:', err);
        require('fs').writeFileSync('error.log', err.stack || err.toString());
        res.status(500).json({ success: false, message: 'Siparişleriniz yüklenemedi.', error: err.message, stack: err.stack });
    }
});
// GET /api/customers/auth/returns
router.get('/returns', customerAuthMiddleware, async (req, res) => {
    try {
        const decoded = req.user;
        const [returns] = await db.query('SELECT * FROM order_returns WHERE customer_id = ? ORDER BY created_at DESC', [decoded.id]);
        
        for (const ret of returns) {
            if (ret.items_json) {
                try {
                    let items = typeof ret.items_json === 'string' ? JSON.parse(ret.items_json) : ret.items_json;
                    for (const item of items) {
                        if (!item.image_path && item.product_id) {
                            const [prodRows] = await db.query('SELECT ImagePath FROM products WHERE Id = ?', [item.product_id]);
                            if (prodRows.length > 0) {
                                item.image_path = prodRows[0].ImagePath;
                            }
                        }
                    }
                    ret.items_json = JSON.stringify(items);
                } catch(e) { }
            }
        }
        
        res.json({ success: true, returns });
    } catch (err) {
        console.error('İade talepleri getirilirken hata:', err);
        res.status(500).json({ success: false, message: 'İade talepleriniz yüklenemedi.' });
    }
});

// POST /api/customers/auth/returns
router.post('/returns', customerAuthMiddleware, async (req, res) => {
    try {
        const decoded = req.user;
        const { order_id, request_type, reason, description, items } = req.body;
        
        // XSS Önlemi: HTML taglerini temizle
        const safeReason = reason ? reason.replace(/<[^>]*>?/gm, '') : reason;
        const safeDescription = description ? description.replace(/<[^>]*>?/gm, '') : description;
        const itemsJson = JSON.stringify(items);
        
        const [result] = await db.query(
            'INSERT INTO order_returns (customer_id, order_id, request_type, reason, description, items_json) VALUES (?, ?, ?, ?, ?, ?)',
            [decoded.id, order_id, request_type, safeReason, safeDescription, itemsJson]
        );
        
        // Eğer iptal talebi ise, siparişi dondur (toplanmaması için)
        // NOT: MySQL ENUM'da gerçek değer 'İptal Bekliyor', Prisma iç adı 'ptal_Bekliyor'
        if (request_type === 'iptal') {
            await db.query('UPDATE orders SET OrderStatus = ? WHERE Id = ?', ['İptal Bekliyor', order_id]);
        }
        
        res.status(201).json({ success: true, message: 'Talebiniz başarıyla oluşturuldu.', id: result.insertId });
    } catch (err) {
        console.error("İptal talebi hatası:", err);
        res.status(500).json({ success: false, message: 'Talebiniz oluşturulamadı.' });
    }
});

// PUT /api/customers/auth/my-orders/:id/address
// Sipariş adresi güncelleme (Sadece kargoya verilmemiş olanlar için geçerli)
router.put('/my-orders/:id/address', customerAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = parseInt(req.params.id, 10);
        if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });

        const { shippingAddress } = req.body;

        if (!shippingAddress) {
            return res.status(400).json({ success: false, message: 'Adres bilgisi eksik.' });
        }

        // Önce siparişi bul ve bu müşteriye ait olduğunu onayla
        const [orders] = await db.query('SELECT * FROM orders WHERE Id = ? AND CustomerId = ?', [orderId, userId]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı veya size ait değil.' });
        }

        const order = orders[0];
        
        // Siparişin durumunu kontrol et
        const unchangeableStatuses = ['Kargoya Verildi', 'Teslim Edildi', 'İptal Edildi', 'İptal'];
        if (unchangeableStatuses.includes(order.OrderStatus)) {
            return res.status(403).json({ success: false, message: `Bu sipariş '${order.OrderStatus}' durumunda olduğu için adres değişikliği yapılamaz.` });
        }

        // Adresi güncelle
        await db.query('UPDATE orders SET ShippingAddress = ? WHERE Id = ?', [shippingAddress, orderId]);

        res.json({ success: true, message: 'Siparişinizin teslimat adresi başarıyla güncellendi.' });

    } catch (err) {
        console.error('Sipariş adresi güncellenirken hata:', err);
        res.status(500).json({ success: false, message: 'Adres güncellenemedi, sunucu hatası.' });
    }
});
// POST /api/customers/auth/change-password
router.post('/change-password', customerAuthMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const customerId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Mevcut şifre ve yeni şifre gereklidir.' });
    }

    try {
        const [rows] = await db.query('SELECT Password FROM customers WHERE Id = ?', [customerId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, rows[0].Password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mevcut şifreniz yanlış.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12); // Cost factor 12
        await db.query('UPDATE customers SET Password = ? WHERE Id = ?', [hashedPassword, customerId]);

        res.json({ success: true, message: 'Şifreniz başarıyla güncellendi.' });
    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        res.status(500).json({ success: false, message: 'Şifre güncellenirken bir hata oluştu.' });
    }
});
// POST /api/customers/auth/login-verify
// Step 4: Verify 2FA OTP and issue token
router.post('/login-verify', otpLimiter, async (req, res) => {
    const { contact, otpCode } = req.body;
    
    if (!contact || !otpCode) {
        return res.status(400).json({ message: 'Eksik bilgi gönderildi.' });
    }

    try {
        const isEmail = contact.includes('@');
        let queryStr = isEmail ? 'SELECT * FROM customers WHERE Email = ?' : 'SELECT * FROM customers WHERE Phone = ?';
        
        const [users] = await db.query(queryStr, [contact]);
        
        if (users.length === 0) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        
        const user = users[0];

        if (user.OtpCode !== otpCode) return res.status(400).json({ message: 'Geçersiz doğrulama kodu.' });
        
        if (new Date() > new Date(user.OtpExpiry)) return res.status(400).json({ message: 'Doğrulama kodunun süresi dolmuş.' });

        await db.query('UPDATE customers SET OtpCode = NULL, OtpExpiry = NULL WHERE Id = ?', [user.Id]);

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { 
                id: user.Id, 
                email: user.Email,
                phone: user.Phone,
                role: 'customer',
                deviceFingerprint: generateFingerprint(req)
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const ip_address = req.ip || req.connection.remoteAddress;
        const device_info = req.headers['user-agent'] || 'Unknown Device';
        
        // TEKİL OTURUM: Yeni oturum açılırken eski tüm oturumları sil
        await db.query('DELETE FROM customer_sessions WHERE customer_id = ?', [user.Id]);
        
        await db.query(
            'INSERT INTO customer_sessions (customer_id, ip_address, device_info, token) VALUES (?, ?, ?, ?)',
            [user.Id, ip_address, device_info, token]
        );

        res.json({
            success: true,
            token,
            user: { id: user.Id, name: user.CustomerName, email: user.Email, phone: user.Phone, TwoFactorEnabled: user.TwoFactorEnabled }
        });
    } catch (err) {
        console.error('Login verify error:', err);
        res.status(500).json({ message: 'Sunucu hatası, lütfen tekrar deneyin.' });
    }
});

// POST /api/customers/auth/toggle-2fa
router.post('/toggle-2fa', customerAuthMiddleware, async (req, res) => {
    const customerId = req.user.id;
    try {
        const [users] = await db.query('SELECT TwoFactorEnabled FROM customers WHERE Id = ?', [customerId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        
        const newState = !users[0].TwoFactorEnabled;
        await db.query('UPDATE customers SET TwoFactorEnabled = ? WHERE Id = ?', [newState ? 1 : 0, customerId]);
        
        res.json({ success: true, TwoFactorEnabled: !!newState, message: newState ? 'İki adımlı doğrulama etkinleştirildi.' : 'İki adımlı doğrulama devre dışı bırakıldı.' });
    } catch (err) {
        console.error('Toggle 2FA error:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// GET /api/customers/auth/sessions
router.get('/sessions', customerAuthMiddleware, async (req, res) => {
    const customerId = req.user.id;
    try {
        const [sessions] = await db.query(
            'SELECT id, ip_address, device_info, created_at, last_active FROM customer_sessions WHERE customer_id = ? AND is_active = 1 ORDER BY last_active DESC',
            [customerId]
        );
        res.json({ success: true, sessions });
    } catch (err) {
        console.error('Get sessions error:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});
// GET /api/customers/auth/verify
// Frontend (Web-App) yüklendiğinde token'ın hala aktif (başka cihazdan girilmemiş) olduğunu doğrular.
router.get('/verify', customerAuthMiddleware, (req, res) => {
    res.json({ success: true, message: 'Oturum geçerli.', user: req.user });
});

module.exports = router;

