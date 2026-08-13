const express = require('express');
const router = express.Router();
const db = require('../db');

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
// GET /api/web-categories/tree  → Tüm ağaç
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
// GET /api/web-categories  → Sadece ana kategoriler
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
// POST /api/web-categories  → Yeni ana kategori ekle
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
// GET /api/web-categories/subcategories?category_id=X
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
// POST /api/web-categories/subcategories
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
// GET /api/web-categories/subtitles?subcategory_id=X
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
// POST /api/web-categories/subtitles
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

module.exports = router;
