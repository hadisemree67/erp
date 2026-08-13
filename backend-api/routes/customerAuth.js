const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const jwt = require('jsonwebtoken');

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

        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) throw new Error("JWT_SECRET is not defined!");
        
        const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });

        // CROSS-ROLE ISOLATION: Personel token'larının müşteri paneline erişimini engelle.
        if (decoded.role !== 'customer') {
            return res.status(403).json({ message: 'Bu alana erişim yetkiniz yok (Yetki Uyuşmazlığı).' });
        }
        req.user = decoded; // id, email, phone, role vs.
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş oturum.' });
    }
};

router.get('/fixdb', async (req, res) => {
    try {
        const [rows] = await db.query("DESCRIBE customers");
        res.json({ columns: rows.map(r => r.Field) });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// POST /api/customers/auth/register
// Step 1: Create unverified customer, hash password, generate OTP
router.post('/register', async (req, res) => {
    const { firstName, lastName, contact, password } = req.body;
    
    if (!firstName || !lastName || !contact || !password) {
        return res.status(400).json({ message: 'Tüm alanları doldurunuz.' });
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

        const hashedPassword = await bcrypt.hash(password, 10);
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
            console.log(`\n=========================================\n[TELEFON SİMÜLASYONU] ${contact} için SMS kodu: ${otpCode}\n=========================================\n`);
        }

        res.status(200).json({ message: 'Doğrulama kodu gönderildi.', contact });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Sunucu hatası, lütfen tekrar deneyin.' });
    }
});

// POST /api/customers/auth/verify
// Step 2: Verify OTP and activate account
router.post('/verify', async (req, res) => {
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
router.post('/login', async (req, res) => {
    const { contact, password } = req.body;

    if (!contact || !password) {
        return res.status(400).json({ message: 'Lütfen tüm alanları doldurunuz.' });
    }

    try {
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

        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET;
        
        if (!jwtSecret) {
            console.error('[KRİTİK] JWT_SECRET ortam değişkeni tanımlı değil!');
            return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
        }

        const token = jwt.sign(
            { id: user.Id, email: user.Email, phone: user.Phone, role: 'customer' },
            jwtSecret,
            { expiresIn: '7d' } // Müşteriler için token süresi 7 güne düşürüldü (Güvenlik)
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.Id,
                name: user.CustomerName,
                email: user.Email,
                phone: user.Phone
            },
            passwordHash: user.Password
        });

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

module.exports = router;
