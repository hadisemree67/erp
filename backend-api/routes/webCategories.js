/**
 * ============================================================================
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   E-ticaret web sitesinin kategori ağacını (Ana kategori > Alt kategori > Alt başlık)
 *   ve bu kategorilere ait görselleri (banner, ikon vb.) yönetir. 
 *   Veritabanı işlemleri ve dosya yükleme (multer) fonksiyonlarını barındırır.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, ''));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Desteklenmeyen dosya formatı.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ===========================
// Yardımcı: Tabloları oluştur
// ===========================
async function createTablesIfNotExist() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS web_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(150) NOT NULL UNIQUE,
            icon VARCHAR(50),
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS web_subcategories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(150) NOT NULL,
            is_active TINYINT(1) DEFAULT 1,
            UNIQUE KEY uq_cat_slug (category_id, slug),
            FOREIGN KEY (category_id) REFERENCES web_categories(id) ON DELETE CASCADE
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS web_subtitles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subcategory_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(150) NOT NULL,
            url VARCHAR(255),
            is_active TINYINT(1) DEFAULT 1,
            UNIQUE KEY uq_sub_slug (subcategory_id, slug),
            FOREIGN KEY (subcategory_id) REFERENCES web_subcategories(id) ON DELETE CASCADE
        )
    `);
    // Banner tablosu: her kategoride 3 slot, her slota isteğe bağlı marka bağlanabilir
    await db.query(`
        CREATE TABLE IF NOT EXISTS category_banners (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            slot TINYINT NOT NULL DEFAULT 1,
            image_url VARCHAR(255) NULL,
            brand_id INT NULL,
            brand_name VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_category_slot (category_id, slot)
        )
    `);
}

// ===========================
// Yardımcı: slugify
// ===========================
function slugify(text) {
    const charMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
    return text.toLowerCase()
        .replace(/[çğıöşüÇĞİÖŞÜ]/g, m => charMap[m] || m)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// ===========================
// Seed: Web sitesi verilerini doldur
// ===========================
const rawData = [
    { name: 'Cilt Bakımı', slug: 'cilt', subs: [
        { name: 'Cilt Tipine Göre', titles: ['Kuru Cilt', 'Yağlı Cilt', 'Karma Cilt', 'Hassas Cilt', 'Normal Cilt', 'Akneye Eğilimli Cilt'] },
        { name: 'Temizleme', titles: ['Yüz Temizleme Jelleri', 'Temizleme Köpükleri', 'Misel Sular', 'Makyaj Temizleyiciler', 'Temizleme Yağları', 'Tonikler'] },
        { name: 'Cilt Bakım Ürünleri', titles: ['Nemlendiriciler', 'Serumlar', 'Maskeler', 'Peelingler', 'Göz Çevresi'] },
        { name: 'Cilt Sorunlarına Göre', titles: ['Akne & Sivilce', 'Leke', 'Kızarıklık', 'Gözenek', 'Kırışıklık'] }
    ]},
    { name: 'Saç Bakımı', slug: 'sac', subs: [
        { name: 'Saç Tipine Göre', titles: ['Kuru & Yıpranmış', 'Yağlı', 'İnce Telli', 'Kıvırcık & Dalgalı', 'Boyalı', 'Hassas Saç Derisi'] },
        { name: 'Şampuanlar', titles: ['Kepek Karşıtı', 'Dökülme Karşıtı', 'Hacim Veren', 'Nemlendirici', 'Boyalı Saçlar'] },
        { name: 'Saç Bakım Ürünleri', titles: ['Saç Kremleri', 'Saç Maskeleri', 'Durulanmayan Bakım', 'Saç Serumları & Yağları', 'Ampuller'] },
        { name: 'Şekillendirme & Aletler', titles: ['Saç Spreyleri', 'Köpükler', 'Wax & Jöle', 'Saç Kurutma Makineleri', 'Düzleştirici & Maşa'] }
    ]},
    { name: 'Vücut Bakımı', slug: 'vucut', subs: [
        { name: 'Duş & Banyo', titles: ['Duş Jelleri', 'Katı Sabunlar', 'Banyo Köpükleri', 'Duş Yağları'] },
        { name: 'Vücut Nemlendirme', titles: ['Vücut Kremleri', 'Vücut Losyonları', 'Vücut Yağları', 'El Kremleri'] },
        { name: 'Özel Bakım & Peeling', titles: ['Vücut Peelingleri', 'Çatlak Bakımı', 'Selülit Bakımı', 'Sıkılaştırıcılar'] },
        { name: 'El, Ayak & Deodorant', titles: ['El Bakımı', 'Ayak Kremleri', 'Topuk Bakımı', 'Deodorant & Antiperspirant'] }
    ]},
    { name: 'Makyaj', slug: 'makyaj', subs: [
        { name: 'Ten Makyajı', titles: ['Fondöten', 'BB & CC Kremler', 'Kapatıcı', 'Pudra', 'Allık', 'Bronzer', 'Highlighter'] },
        { name: 'Göz Makyajı', titles: ['Maskara', 'Eyeliner', 'Göz Kalemi', 'Far', 'Kaş Ürünleri'] },
        { name: 'Dudak Makyajı', titles: ['Ruj', 'Dudak Parlatıcısı', 'Dudak Kalemi', 'Dudak Bakımı'] },
        { name: 'Aksesuarlar & Temizleme', titles: ['Makyaj Fırçaları', 'Makyaj Süngerleri', 'Kirpik Kıvırıcı', 'Makyaj Aynaları'] }
    ]},
    { name: 'Parfüm', slug: 'parfum', subs: [
        { name: 'Kadın Parfümleri', titles: ['EDP Kadın', 'EDT Kadın', 'Roll-on Parfümler', 'Çiçeksi Notalar'] },
        { name: 'Erkek Parfümleri', titles: ['EDP Erkek', 'EDT Erkek', 'Tıraş Sonrası Losyonlar', 'Baharatlı Notalar'] },
        { name: 'Unisex & Niş Parfümler', titles: ['Unisex Parfümler', 'Niş (Niche) Parfümler', 'Seyahat Boy Parfümler'] }
    ]},
    { name: 'Anne & Bebek', slug: 'anne', subs: [
        { name: 'Bebek Cilt & Vücut', titles: ['Pişik Kremleri', 'Bebek Yağları', 'Bebek Losyonları', 'Bebek Pudraları'] },
        { name: 'Bebek Banyo & Temizlik', titles: ['Bebek Şampuanları', 'Bebek Sabunları', 'Islak Mendiller'] },
        { name: 'Bebek Beslenme', titles: ['Biberon', 'Emzik', 'Mama', 'Beslenme Aksesuarları'] },
        { name: 'Anne Bakımı & Hijyen', titles: ['Göğüs Ucu Kremleri', 'Emzirme Ürünleri', 'Anne Hijyeni', 'Bebek Bezleri'] }
    ]},
    { name: 'Ağız & Diş Bakımı', slug: 'agiz', subs: [
        { name: 'Diş Macunları', titles: ['Beyazlatıcı Macunlar', 'Hassasiyet Karşıtı', 'Florürsüz Macunlar', 'Diş Eti Koruması'] },
        { name: 'Diş Fırçaları', titles: ['Manuel Fırçalar', 'Elektrikli Fırçalar', 'Arayüz Fırçaları', 'Çocuk Fırçaları'] },
        { name: 'Ağız Suları & Spreyler', titles: ['Ağız Gargaraları', 'Ağız Spreyleri', 'Alkolsüz Gargaralar'] }
    ]},
    { name: 'Sağlık / Takviye', slug: 'saglik', subs: [
        { name: 'Vitaminler', titles: ['Multivitamin', 'C Vitamini', 'D Vitamini', 'B Vitaminleri', 'E Vitamini'] },
        { name: 'Mineraller', titles: ['Magnezyum', 'Çinko', 'Demir', 'Kalsiyum'] },
        { name: 'Özel Destekler', titles: ['Kolajen', 'Omega 3', 'Probiyotik', 'Glukozamin', 'Melatonin'] },
        { name: 'Bitkisel Takviyeler', titles: ['Bitkisel Çaylar', 'Ginseng', 'Zerdeçal', 'Propolis', 'Ekinezya'] }
    ]},
    { name: 'Kişisel Bakım', slug: 'kisisel', subs: [
        { name: 'Tıraş & Epilasyon', titles: ['Tıraş Makineleri', 'Tıraş Bıçakları', 'Tıraş Köpükleri', 'Tıraş Sonrası'] },
        { name: 'Hijyen', titles: ['El Dezenfektanı', 'Islak Mendil', 'Pamuk & Kulak Çubuğu', 'Sıvı Sabunlar'] },
        { name: 'Kadın Bakımı', titles: ['Ped', 'Tampon', 'Günlük Ped', 'İntim Bakım'] }
    ]},
    { name: 'Erkek Bakım', slug: 'erkek', subs: [
        { name: 'Erkek Cilt Bakımı', titles: ['Yüz Yıkama Jeli', 'Erkek Nemlendirici', 'Göz Çevresi Bakımı', 'Akne Karşıtı'] },
        { name: 'Sakal & Bıyık Bakımı', titles: ['Sakal Yağı', 'Sakal Şampuanı', 'Sakal Balmı', 'Sakal Tarağı'] },
        { name: 'Tıraş', titles: ['Tıraş Köpüğü', 'Tıraş Jeli', 'Tıraş Sonrası (Aftershave)'] }
    ]},
    { name: 'Medikal Ürünler', slug: 'medikal', subs: [
        { name: 'Ölçüm Cihazları', titles: ['Ateş Ölçer', 'Tansiyon Aletleri', 'Şeker Ölçüm', 'Oksimetre', 'Baskül'] },
        { name: 'Yara & İlk Yardım', titles: ['Yara Bakımı', 'Bandaj & Flaster', 'Yanık Kremi', 'Antiseptik & Baticon'] },
        { name: 'Koruyucu Ürünler', titles: ['Medikal Eldiven', 'Maske', 'Hasta Bezi', 'Ortopedik Destekler'] }
    ]},
    { name: 'Doğal & Organik', slug: 'dogal', subs: [
        { name: 'Cilt Bakımı', titles: ['Organik Cilt Bakımı', 'Doğal Yüz Temizleme', 'Saf Aromaterapi Yağları'] },
        { name: 'Saç Bakımı', titles: ['Doğal Saç Bakımı', 'Organik Şampuan', 'Katı Şampuan (Sıfır Atık)', 'Sülfatsız Şampuan'] },
        { name: 'Vücut & Kozmetik', titles: ['Doğal Vücut Bakımı', 'Organik El Yapımı Sabunlar', 'Vegan Kozmetik', 'Cruelty Free Ürünler'] }
    ]},
    { name: 'Güneş Ürünleri', slug: 'gunes', subs: [
        { name: 'Yüz Güneş Kremleri', titles: ['Kuru Cilt Güneş Kremi', 'Yağlı Cilt Güneş Kremi', 'Renkli Güneş Kremleri', 'Leke Karşıtı Güneş Kremi'] },
        { name: 'Vücut & Çocuk', titles: ['Vücut Güneş Kremleri', 'Güneş Koruyucu Spreyler', 'Çocuk Güneş Kremleri'] },
        { name: 'Güneş Sonrası', titles: ['Güneş Sonrası Losyonlar', 'Aloe Vera Jelleri', 'Yanık Rahatlatıcılar'] }
    ]},
    { name: 'Hediyelik Ürünler', slug: 'hediyelik', subs: [
        { name: 'Hediye Setleri', titles: ['Kadın Hediye Setleri', 'Erkek Hediye Setleri', 'Özel Gün Hediyeleri', 'Yılbaşı Hediye Kutuları'] },
        { name: 'Cilt Bakım Setleri', titles: ['Kırışıklık Karşıtı Setler', 'Nemlendirici Kofreler', 'Seyahat Boy (Travel Size)'] },
        { name: 'Parfüm Setleri', titles: ['Kadın Parfüm Setleri', 'Erkek Parfüm Setleri', 'Mini Parfüm Koleksiyonu'] }
    ]}
];

async function seedIfEmpty() {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as cnt FROM web_categories');
        if (rows[0].cnt > 0) {
            console.log(`Web kategorileri zaten mevcut (${rows[0].cnt} adet).`);
            return;
        }
        console.log('Web kategorileri ekleniyor...');
        for (const cat of rawData) {
            const [catResult] = await db.query(
                'INSERT INTO web_categories (name, slug) VALUES (?, ?)',
                [cat.name, cat.slug]
            );
            const catId = catResult.insertId;
            for (const sub of cat.subs) {
                const subSlug = slugify(sub.name);
                const [subResult] = await db.query(
                    'INSERT INTO web_subcategories (category_id, name, slug) VALUES (?, ?, ?)',
                    [catId, sub.name, subSlug]
                );
                const subId = subResult.insertId;
                for (const title of sub.titles) {
                    const titleSlug = slugify(title);
                    await db.query(
                        'INSERT IGNORE INTO web_subtitles (subcategory_id, name, slug) VALUES (?, ?, ?)',
                        [subId, title, titleSlug]
                    );
                }
            }
        }
        console.log('Web kategorileri başarıyla eklendi!');
    } catch (err) {
        console.error('Seed hatası:', err.message);
    }
}

// ===========================
// Başlangıçta tabloları oluştur ve doldur
// ===========================
(async () => {
    await createTablesIfNotExist();
    await seedIfEmpty();
})();

// ===========================
// [GET] Tüm Kategori Ağacını Listeleme
// Web sitesindeki açılır menüler için ana kategorileri, alt kategorileri ve başlıkları 
// iç içe geçmiş (tree) JSON yapısında istemciye sunar.
// ===========================
router.get('/tree', async (req, res) => {
    try {
        const [cats] = await db.query('SELECT * FROM web_categories WHERE is_active = 1 ORDER BY id');
        const [subs] = await db.query('SELECT * FROM web_subcategories WHERE is_active = 1 ORDER BY id');
        const [titles] = await db.query('SELECT * FROM web_subtitles WHERE is_active = 1 ORDER BY id');

        const tree = cats.map(cat => ({
            ...cat,
            subcategories: subs
                .filter(s => s.category_id === cat.id)
                .map(sub => ({
                    ...sub,
                    subtitles: titles.filter(t => t.subcategory_id === sub.id)
                }))
        }));

        res.json(tree);
    } catch (error) {
        console.error('Tree error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// [GET] Sadece Ana Kategorileri Listeleme
// Sistemdeki aktif olan en üst seviye (ana) kategorileri düz bir liste olarak getirir.
// ===========================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM web_categories WHERE is_active = 1 ORDER BY id');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// [POST] Yeni Ana Kategori Ekleme
// Gelen isimden SEO uyumlu bir bağlantı adresi (slug) türetir ve yeni bir ana kategori olarak kaydeder.
// ===========================
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'İsim zorunlu' });
        const slug = slugify(name);
        const [result] = await db.query(
            'INSERT INTO web_categories (name, slug) VALUES (?, ?)',
            [name, slug]
        );
        const [rows] = await db.query('SELECT * FROM web_categories WHERE id = ?', [result.insertId]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// [GET] Alt Kategorileri Listeleme
// Belirtilen bir ana kategoriye (category_id) ait olan tüm alt kategorileri getirir.
// ===========================
router.get('/subcategories', async (req, res) => {
    try {
        const { category_id } = req.query;
        if (!category_id) return res.status(400).json({ error: 'category_id gerekli' });
        const [rows] = await db.query(
            'SELECT * FROM web_subcategories WHERE category_id = ? AND is_active = 1 ORDER BY id',
            [parseInt(category_id)]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// [POST] Yeni Alt Kategori Ekleme
// Belirtilen ana kategoriye bağlı yeni bir alt kategori oluşturur ve veritabanına kaydeder.
// ===========================
router.post('/subcategories', async (req, res) => {
    try {
        const { category_id, name } = req.body;
        if (!category_id || !name) return res.status(400).json({ error: 'category_id ve name zorunlu' });
        const slug = slugify(name);
        const [result] = await db.query(
            'INSERT INTO web_subcategories (category_id, name, slug) VALUES (?, ?, ?)',
            [parseInt(category_id), name, slug]
        );
        const [rows] = await db.query('SELECT * FROM web_subcategories WHERE id = ?', [result.insertId]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// [GET] Alt Başlıkları Listeleme
// Belirtilen bir alt kategoriye (subcategory_id) ait olan en alt seviye başlıkları getirir.
// ===========================
router.get('/subtitles', async (req, res) => {
    try {
        const { subcategory_id } = req.query;
        if (!subcategory_id) return res.status(400).json({ error: 'subcategory_id gerekli' });
        const [rows] = await db.query(
            'SELECT * FROM web_subtitles WHERE subcategory_id = ? AND is_active = 1 ORDER BY id',
            [parseInt(subcategory_id)]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// [POST] Yeni Alt Başlık Ekleme
// Belirtilen alt kategoriye bağlı en alt seviye yeni bir başlık oluşturur.
// ===========================
router.post('/subtitles', async (req, res) => {
    try {
        const { subcategory_id, name } = req.body;
        if (!subcategory_id || !name) return res.status(400).json({ error: 'subcategory_id ve name zorunlu' });
        const slug = slugify(name);
        const [result] = await db.query(
            'INSERT INTO web_subtitles (subcategory_id, name, slug) VALUES (?, ?, ?)',
            [parseInt(subcategory_id), name, slug]
        );
        const [rows] = await db.query('SELECT * FROM web_subtitles WHERE id = ?', [result.insertId]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===========================
// [PUT] Ana Kategori Görseli Yükleme / Güncelleme
// İlgili kategori ID'sine yüklenen resmi diskte (uploads klasörü) saklar ve veritabanını günceller.
// ===========================
router.put('/main/:id/image', upload.single('image'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz ID' });
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Resim bulunamadı' });
        const imageUrl = `/uploads/${req.file.filename}`;
        await db.query('UPDATE web_categories SET image_url = ? WHERE id = ?', [imageUrl, id]);
        res.json({ success: true, image_url: imageUrl });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.put('/sub/:id/image', upload.single('image'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz ID' });
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Resim bulunamadı' });
        const imageUrl = `/uploads/${req.file.filename}`;
        await db.query('UPDATE web_subcategories SET image_url = ? WHERE id = ?', [imageUrl, id]);
        res.json({ success: true, image_url: imageUrl });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.put('/title/:id/image', upload.single('image'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz ID' });
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Resim bulunamadı' });
        const imageUrl = `/uploads/${req.file.filename}`;
        await db.query('UPDATE web_subtitles SET image_url = ? WHERE id = ?', [imageUrl, id]);
        res.json({ success: true, image_url: imageUrl });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ===========================
// BANNER ENDPOINTLERİ
// ===========================

// GET /api/web-categories/banners?category_id=X → Bir kategorinin 3 bannerını döner
router.get('/banners', async (req, res) => {
    try {
        const { category_id } = req.query;
        if (!category_id) return res.status(400).json({ error: 'category_id gerekli' });
        const [rows] = await db.query(
            'SELECT * FROM category_banners WHERE category_id = ? ORDER BY slot ASC',
            [parseInt(category_id)]
        );
        // 3 slot her zaman dönsün (boş slotlar da)
        const slots = [1, 2, 3].map(slot => {
            const found = rows.find(r => r.slot === slot);
            return found || { id: null, category_id: parseInt(category_id), slot, image_url: null, brand_id: null, brand_name: null };
        });
        res.json(slots);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===========================
// [GET] Tüm Bannerları Getirme (Admin Paneli İçin)
// Sistemdeki tüm kategorilerin (banner eklenmiş olan) banner görsellerini liste halinde döndürür.
// ===========================
router.get('/banners/all', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT cb.*, wc.name as category_name, wc.slug as category_slug
             FROM category_banners cb
             JOIN web_categories wc ON cb.category_id = wc.id
             WHERE cb.image_url IS NOT NULL
             ORDER BY cb.category_id, cb.slot ASC`
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===========================
// [PUT] Kategori Banner'ı Yükleme / Güncelleme
// İlgili kategorinin belirtilen sırasına (1, 2 veya 3. slot) yeni bir banner görseli veya marka bağlantısı ekler.
// ===========================
router.put('/banners/:category_id/:slot', upload.single('image'), async (req, res) => {
    try {
        const catIdNum = parseInt(req.params.category_id, 10);
        const slotNum = parseInt(req.params.slot, 10);
        if (isNaN(catIdNum) || isNaN(slotNum)) return res.status(400).json({ error: 'Geçersiz Kategori veya Slot ID' });
        const { brand_id, brand_name } = req.body;

        if (![1, 2, 3].includes(slotNum)) return res.status(400).json({ error: 'Geçersiz slot (1-3 arası olmalı)' });

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        } else {
            // Sadece marka güncellemesi yapılıyor olabilir
            const [existing] = await db.query(
                'SELECT image_url FROM category_banners WHERE category_id = ? AND slot = ?',
                [catIdNum, slotNum]
            );
            if (existing.length > 0) imageUrl = existing[0].image_url;
        }

        await db.query(
            `INSERT INTO category_banners (category_id, slot, image_url, brand_id, brand_name)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE image_url = COALESCE(VALUES(image_url), image_url), brand_id = VALUES(brand_id), brand_name = VALUES(brand_name)`,
            [catIdNum, slotNum, imageUrl, brand_id || null, brand_name || null]
        );

        const [updated] = await db.query(
            'SELECT * FROM category_banners WHERE category_id = ? AND slot = ?',
            [catIdNum, slotNum]
        );
        res.json({ success: true, banner: updated[0] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ===========================
// [DELETE] Banner Silme (Kaldırma) İşlemi
// İlgili kategorinin belirtilen sırasındaki (slot) banner'ını yayından kaldırır (Görseli null yapar).
// ===========================
router.delete('/banners/:category_id/:slot', async (req, res) => {
    try {
        const catIdNum = parseInt(req.params.category_id, 10);
        const slotNum = parseInt(req.params.slot, 10);
        if (isNaN(catIdNum) || isNaN(slotNum)) return res.status(400).json({ error: 'Geçersiz Kategori veya Slot ID' });
        await db.query(
            'UPDATE category_banners SET image_url = NULL WHERE category_id = ? AND slot = ?',
            [catIdNum, slotNum]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
