const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3002', 'http://localhost:5173', 'file://'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Kaba kuvvet (Brute Force) saldırılarını engellemek için Login Rate Limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 10, // Her IP için 15 dakikada en fazla 10 deneme
    message: { success: false, message: 'Çok fazla başarısız giriş denemesi yaptınız. Lütfen daha sonra tekrar deneyin.' }
});

app.get('/', (req, res) => {
    res.send('API Sunucusu Çalışıyor!');
});

app.get('/api/users', async (req, res) => {
    try {
        // GÜVENLİK: Şifre (password) alanını asla API'den döndürme! (Bilgi sızıntısı açığı kapatıldı)
        const [rows] = await db.query('SELECT id, username, name, email, role, created_at FROM users');
        res.json(rows);
    } catch (error) {
        console.error('Kullanıcı listesi çekilirken hata:', error);
        res.status(500).json({ message: 'Veri çekilirken sunucu hatası oluştu.' }); // Hata detayı gizlendi
    }
});

app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const user = rows[0];

        // Gelen role ile veritabanındaki role'ü karşılaştır
        // Tabloda 'kullanici' ve 'admin' olarak tanımlanmıştı. React tarafından 'employee' ve 'admin' geliyor.
        const dbRole = user.role;
        const requestedRole = role === 'employee' ? 'kullanici' : role;

        if (dbRole !== requestedRole) {
            return res.status(403).json({ success: false, message: 'Yetkisiz rol seçimi.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Hatalı şifre.' });
        }

        // Başarılı giriş
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
