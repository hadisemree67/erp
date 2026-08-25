/**
 * ============================================================================
 * BİLEŞEN ADI: campaigns
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
/*
 * Bu modül, sistemdeki indirim kampanyalarının (2 al 1 öde, tutar indirimi vb.), 
 * kapak resimlerinin ve geçerlilik tarihlerinin yönetildiği CRUD uç noktalarıdır.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');

// Kampanya kapak resimleri için multer (dosya yükleme) depolama ayarları
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // GÜVENLİK: Kriptografik UUID kullanımı ve uzantı sanitizasyonu
        const crypto = require('crypto');
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
        cb(null, 'campaign-' + crypto.randomUUID() + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir (jpeg, png, webp, gif).'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

const uploadMiddleware = (req, res, next) => {
    upload.single('cover_image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

// Veritabanı Tablosu Kontrolü ve Örnek Veri Ekleme
const ensureCampaignsTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                campaign_type VARCHAR(100) NOT NULL,
                discount_rate DECIMAL(10,2) NULL,
                min_amount DECIMAL(10,2) NULL,
                buy_quantity INT NULL,
                pay_quantity INT NULL,
                gift_quantity INT NULL,
                gift_product_name VARCHAR(255) NULL,
                target_barcode VARCHAR(100) NULL,
                start_date DATE NULL,
                end_date DATE NULL,
                status VARCHAR(50) DEFAULT 'Aktif',
                cover_image_path VARCHAR(255) NULL,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [rows] = await db.query('SELECT COUNT(*) as count FROM campaigns');
        if (rows[0].count === 0) {
            const sampleCampaigns = [
                [
                    '✨ Büyük Yaz Sezonu: 2 Al 1 Öde Fırsatı!',
                    'buy_x_pay_y',
                    null, null, 2, 1, null, null,
                    '2026-07-01', '2026-08-31', 'Aktif',
                    null,
                    'Tüm yazlık giyim ve plaj ürünlerinde geçerli 2 ürün alımında 1 ürün bedava! Sepette otomatik uygulanır.'
                ],
                [
                    '🔥 12.000 TL ve Üzeri Alışverişlerde Anında %10 İndirim!',
                    'min_amount_discount',
                    10.00, 12000.00, null, null, null, null,
                    '2026-07-15', '2026-09-15', 'Aktif',
                    null,
                    'Toptan veya perakende 12.000 TL üzeri tüm siparişlerinizde sepet tutarı üzerinden net %10 indirim kazanın.'
                ],
                [
                    '🎁 5 Adet Kutu Ürün Alana +1 Adet Hediye!',
                    'gift_product',
                    null, null, 5, null, 1, 'Özel Promosyon Seti',
                    '2026-07-20', '2026-10-01', 'Aktif',
                    null,
                    'Seçili paket ürünlerden 5 adet alım yapan müşterilerimize 1 adet özel hediyeli paket ücretsiz gönderilir.'
                ]
            ];

            for (const camp of sampleCampaigns) {
                await db.query(`
                    INSERT INTO campaigns (
                        title, campaign_type, discount_rate, min_amount, buy_quantity, pay_quantity, 
                        gift_quantity, gift_product_name, start_date, end_date, status, cover_image_path, description
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [camp[0], camp[1], camp[2], camp[3], camp[4], camp[5], camp[6], camp[7], camp[8], camp[9], camp[10], camp[11], camp[12]]);
            }
            console.log('✅ Örnek kampanyalar başarıyla eklendi.');
        }
    } catch (error) {
        console.error('Kampanya tablosu oluşturulurken hata:', error);
    }
};
ensureCampaignsTable();

// GET: Public aktif kampanyaları getir (Müşteriler için)
router.get('/public', async (req, res) => {
    try {
        const query = `
            SELECT * FROM campaigns 
            WHERE status = 'Aktif' 
            AND (start_date IS NULL OR start_date <= CURDATE())
            AND (end_date IS NULL OR end_date >= CURDATE())
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(query);
        
        for (let row of rows) {
            const [products] = await db.query('SELECT product_id FROM campaign_products WHERE campaign_id = ?', [row.id]);
            row.target_product_ids = products.map(p => p.product_id);

            if (row.target_barcode) {
                // target_barcode is sometimes stored as a JSON array string e.g. '["12345"]'
                // Strip all non-alphanumeric characters to be absolutely safe (removes brackets, quotes, escapes)
                let cleanBarcode = row.target_barcode.replace(/[^a-zA-Z0-9]/g, '');
                row.target_barcode = cleanBarcode; // Update for frontend

                // Fetch basic product info for the target barcode to display in the UI
                const pQuery = `
                    SELECT p.Id, p.ProductName, p.SalePrice, p.ImagePath
                    FROM products p
                    LEFT JOIN product_barcodes pb ON p.Id = pb.product_id
                    WHERE pb.barcode = ? OR p.ProductCode = ?
                    LIMIT 1
                `;
                const [targetProducts] = await db.query(pQuery, [cleanBarcode, cleanBarcode]);
                if (targetProducts.length > 0) {
                    row.target_product = targetProducts[0];
                }
            }
        }

        res.json({ success: true, data: rows });
    } catch (error) {        console.error('Public kampanyalar getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// GET: Tüm kampanyaları getir
router.get('/', authMiddleware, checkPermission('view_campaigns'), async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = 'SELECT * FROM campaigns';
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('(title LIKE ? OR description LIKE ? OR gift_product_name LIKE ?)');
            const escapedSearch = search.replace(/[%_]/g, '\\$&'); // % ve _ karakterlerini escape et
            params.push(`%${escapedSearch}%`, `%${escapedSearch}%`, `%${escapedSearch}%`);
        }

        if (status && status !== 'All') {
            conditions.push('status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY CASE WHEN status = "Aktif" THEN 1 ELSE 2 END, created_at DESC';

        const [rows] = await db.query(query, params);
        
        for (let row of rows) {
            const [products] = await db.query('SELECT product_id FROM campaign_products WHERE campaign_id = ?', [row.id]);
            row.target_product_ids = products.map(p => p.product_id);
        }

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Kampanyalar getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Kampanyalar getirilemedi.' });
    }
});

// GET: Tek kampanya detayı
router.get('/:id', authMiddleware, checkPermission('view_campaigns'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Kampanya ID.' });

        const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kampanya bulunamadı.' });
        }
        const [products] = await db.query('SELECT product_id FROM campaign_products WHERE campaign_id = ?', [id]);
        rows[0].target_product_ids = products.map(p => p.product_id);
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Kampanya bulunamadı.' });
    }
});

// POST: Yeni kampanya ekle
router.post('/', authMiddleware, checkPermission('campaign_manage'), uploadMiddleware, async (req, res) => {
    try {
        const {
            title, campaign_type, discount_rate, min_amount, buy_quantity,
            pay_quantity, gift_quantity, gift_product_name, target_product_ids, target_barcode, start_date,
            end_date, status, description
        } = req.body;

        if (!title || !campaign_type) {
            return res.status(400).json({ success: false, message: 'Kampanya başlığı ve türü zorunludur.' });
        }

        const cover_image_path = req.file ? `/uploads/${req.file.filename}` : null;

        const [result] = await db.query(`
            INSERT INTO campaigns (
                title, campaign_type, discount_rate, min_amount, buy_quantity, pay_quantity,
                gift_quantity, gift_product_name, target_barcode, start_date, end_date, status, cover_image_path, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title, campaign_type,
            discount_rate ? parseFloat(discount_rate) : null,
            min_amount ? parseFloat(min_amount) : null,
            buy_quantity ? parseInt(buy_quantity, 10) : null,
            pay_quantity ? parseInt(pay_quantity, 10) : null,
            gift_quantity ? parseInt(gift_quantity, 10) : null,
            gift_product_name || null,
            target_barcode || null,
            start_date || null,
            end_date || null,
            status || 'Aktif',
            cover_image_path,
            description || null
        ]);

        const newCampaignId = result.insertId;

        if (target_product_ids) {
            let ids = Array.isArray(target_product_ids) ? target_product_ids : [];
            if (typeof target_product_ids === 'string') {
                try { ids = JSON.parse(target_product_ids); } catch(e) {}
            }
            for (let pId of ids) {
                await db.query('INSERT IGNORE INTO campaign_products (campaign_id, product_id) VALUES (?, ?)', [newCampaignId, pId]);
            }
        }

        await logActivity(req.user?.id, 'INSERT', 'campaigns', newCampaignId, `"${title}" kampanyası oluşturuldu.`, null);

        res.json({ success: true, message: 'Kampanya başarıyla oluşturuldu.', id: newCampaignId });
    } catch (error) {
        console.error('Kampanya eklerken hata:', error);
        res.status(500).json({ success: false, message: 'Kampanya oluşturulamadı.' });
    }
});

// PUT: Kampanya güncelle
router.put('/:id', authMiddleware, checkPermission('campaign_manage'), uploadMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Kampanya ID.' });

        const {
            title, campaign_type, discount_rate, min_amount, buy_quantity,
            pay_quantity, gift_quantity, gift_product_name, target_product_ids, target_barcode, start_date,
            end_date, status, description, existing_cover_image
        } = req.body;

        const [oldRows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
        if (oldRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kampanya bulunamadı.' });
        }

        const cover_image_path = req.file ? `/uploads/${req.file.filename}` : (existing_cover_image !== undefined ? existing_cover_image : oldRows[0].cover_image_path);

        await db.query(`
            UPDATE campaigns SET 
                title = ?, campaign_type = ?, discount_rate = ?, min_amount = ?, 
                buy_quantity = ?, pay_quantity = ?, gift_quantity = ?, gift_product_name = ?, 
                target_barcode = ?, start_date = ?, end_date = ?, status = ?, cover_image_path = ?, description = ?
            WHERE id = ?
        `, [
            title, campaign_type,
            discount_rate ? parseFloat(discount_rate) : null,
            min_amount ? parseFloat(min_amount) : null,
            buy_quantity ? parseInt(buy_quantity, 10) : null,
            pay_quantity ? parseInt(pay_quantity, 10) : null,
            gift_quantity ? parseInt(gift_quantity, 10) : null,
            gift_product_name || null,
            target_barcode || null,
            start_date || null,
            end_date || null,
            status || 'Aktif',
            cover_image_path,
            description || null,
            id
        ]);

        if (target_product_ids !== undefined) {
            await db.query('DELETE FROM campaign_products WHERE campaign_id = ?', [id]);
            let ids = Array.isArray(target_product_ids) ? target_product_ids : [];
            if (typeof target_product_ids === 'string') {
                try { ids = JSON.parse(target_product_ids); } catch(e) {}
            }
            for (let pId of ids) {
                await db.query('INSERT IGNORE INTO campaign_products (campaign_id, product_id) VALUES (?, ?)', [id, pId]);
            }
        }

        await logActivity(req.user?.id, 'UPDATE', 'campaigns', id, `"${title}" kampanyası güncellendi.`, oldRows[0]);

        res.json({ success: true, message: 'Kampanya başarıyla güncellendi.' });
    } catch (error) {
        console.error('Kampanya güncellerken hata:', error);
        res.status(500).json({ success: false, message: 'Kampanya güncellenemedi.' });
    }
});

// PATCH & PUT: Durum değiştir (Aktif <-> Pasif)
const updateStatusHandler = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Kampanya ID.' });

        const { status } = req.body;

        const [oldRows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
        if (oldRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Güncellenecek kampanya bulunamadı (ID: ' + id + ').' });
        }

        await db.query('UPDATE campaigns SET status = ? WHERE id = ?', [status, id]);

        try {
            await logActivity(req.user?.id, 'UPDATE', 'campaigns', id, `"${oldRows[0].title}" kampanyasının durumu "${status}" yapıldı.`, oldRows[0]);
        } catch (logErr) {
            console.warn('Kampanya durum güncellerken loglama hatası (önemsiz):', logErr.message);
        }

        res.json({ success: true, message: 'Kampanya durumu başarıyla güncellendi.' });
    } catch (error) {
        console.error('Kampanya durumu güncellenirken sunucu hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
    }
};

router.patch('/:id/status', authMiddleware, updateStatusHandler);
router.put('/:id/status', authMiddleware, checkPermission('campaign_manage'), updateStatusHandler);

// DELETE: Kampanya sil
router.delete('/:id', authMiddleware, checkPermission('campaign_manage'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Kampanya ID.' });

        const [oldRows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
        if (oldRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kampanya bulunamadı.' });
        }

        await db.query('DELETE FROM campaigns WHERE id = ?', [id]);
        await logActivity(req.user?.id, 'DELETE', 'campaigns', id, `"${oldRows[0].title}" kampanyası silindi.`, oldRows[0]);

        res.json({ success: true, message: 'Kampanya başarıyla silindi.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Kampanya silinirken sunucu hatası oluştu.' });
    }
});

module.exports = router;

