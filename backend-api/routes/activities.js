/**
 * ============================================================================
 * BİLEŞEN ADI: activities
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu modül, sistemde gerçekleştirilen kullanıcı hareketlerini, log kayıtlarını 
 * ve genel denetim (audit) izlerini sorgulamak/listelemek için API uç noktaları sağlar.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const formatDatesForMySQL = (data) => {
    const formatted = { ...data };
    for (let key in formatted) {
        if (typeof formatted[key] === 'string' && formatted[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            // Tarih bilgisini YYYY-MM-DD HH:MM:SS formatına dönüştürüyoruz
            formatted[key] = new Date(formatted[key]).toISOString().slice(0, 19).replace('T', ' ');
        }
    }
    return formatted;
};

// GET: Son 100 hareketi getir
// GÜVENLİK İYİLEŞTİRMESİ: Tekrarlayan checkPermission kaldırıldı.
router.get('/', authMiddleware, checkPermission('view_activity_log'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.id, a.user_id, a.action_type, a.target_table, a.target_id, a.description, a.created_at, a.is_undone, u.name as user_name
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.id DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (error) {
        console.error('Aktiviteler getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

const ALLOWED_TABLES = [
    'products', 'inventory', 'warehouses', 'stock_movements',
    'categories', 'brands', 'kategori', 'campaigns', 'employees',
    'employee_leaves', 'users', 'customers', 'wms_stock_balances'
];

// POST: Geri Al (Undo)
// GÜVENLİK İYİLEŞTİRMESİ: Tekrarlayan checkPermission kaldırıldı.
router.post('/:id/undo', authMiddleware, checkPermission('view_activity_log'), async (req, res) => {
    const logId = parseInt(req.params.id, 10);

    // GÜVENLİK DÜZELTMESİ: logId numerik olmalı
    if (isNaN(logId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz Log ID.' });
    }

    // GÜVENLİK DÜZELTMESİ: Header fallback'i kaldırıldı. Yalnızca doğrulanmış JWT user ID kabul edilir.
    const adminUserId = req.user?.id;

    if (!adminUserId) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erişim. Oturum verisi bulunamadı.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Log kaydını kilitleyerek oku (Race condition önleme)
        const [logs] = await connection.query('SELECT * FROM activity_logs WHERE id = ? FOR UPDATE', [logId]);
        if (logs.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Kayıt bulunamadı.' });
        }

        const log = logs[0];
        if (log.is_undone) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Bu işlem zaten geri alınmış.' });
        }

        // SQL Injection Koruması: Tablo ismi izin verilenler listesinde mi?
        if (!ALLOWED_TABLES.includes(log.target_table)) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: `"${log.target_table}" tablosunda geri alma işlemine izin verilmiyor.` });
        }

        // old_data metin (string) geldiyse parse et
        let oldData = log.old_data;
        if (typeof oldData === 'string') {
            try { oldData = JSON.parse(oldData); } catch (e) { oldData = null; }
        }

        // 1. INSERT işlemini geri alma -> DELETE
        if (log.action_type === 'INSERT') {
            await connection.query(`DELETE FROM ?? WHERE id = ?`, [log.target_table, log.target_id]);
        }
        // 2. DELETE işlemini geri alma -> INSERT
        else if (log.action_type === 'DELETE') {
            if (!oldData) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Geri alınacak eski veri bulunamadı.' });
            }
            const data = formatDatesForMySQL(oldData);
            
            const _barcodes = data._barcodes;
            const _suppliers = data._suppliers;
            const _stocks = data._stocks;
            delete data._barcodes;
            delete data._suppliers;
            delete data._stocks;

            const keys = Object.keys(data);
            const values = keys.map(k => (typeof data[k] === 'object' && data[k] !== null && !(data[k] instanceof Date) ? JSON.stringify(data[k]) : data[k]));

            await connection.query(`INSERT INTO ?? (??) VALUES (?)`, [log.target_table, keys, values]);

            if (log.target_table === 'products') {
                const insertedId = data.Id || data.id || log.target_id;
                if (_barcodes && Array.isArray(_barcodes)) {
                    for (const barcode of _barcodes) {
                         await connection.query('INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)', [insertedId, barcode]);
                    }
                }
                if (_suppliers && Array.isArray(_suppliers)) {
                    for (const supp of _suppliers) {
                         const startDate = supp.contract_start_date ? new Date(supp.contract_start_date) : null;
                         const endDate = supp.contract_end_date ? new Date(supp.contract_end_date) : null;
                         await connection.query(
                             'INSERT INTO product_suppliers (product_id, supplier_id, contract_file, contract_start_date, contract_end_date, is_primary, unit_price, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                             [insertedId, supp.supplier_id, supp.contract_file, startDate, endDate, supp.is_primary, supp.unit_price, supp.lead_time_days]
                         );
                    }
                }
                if (_stocks && Array.isArray(_stocks)) {
                    for (const stock of _stocks) {
                         const expDate = stock.expiration_date ? new Date(stock.expiration_date) : null;
                         await connection.query(
                             'INSERT INTO wms_stock_balances (product_id, warehouse_id, shelf_code, batch_number, quantity, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
                             [insertedId, stock.warehouse_id, stock.shelf_code, stock.batch_number, stock.quantity, expDate]
                         );
                    }
                }
            }
        }
        // 3. UPDATE işlemini geri alma -> UPDATE
        else if (log.action_type === 'UPDATE') {
            if (!oldData) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Geri alınacak eski veri bulunamadı.' });
            }
            const data = formatDatesForMySQL(oldData);
            const keys = Object.keys(data).filter(k => k.toLowerCase() !== 'id');
            const values = keys.map(k => (typeof data[k] === 'object' && data[k] !== null && !(data[k] instanceof Date) ? JSON.stringify(data[k]) : data[k]));

            // GÜVENLİK İYİLEŞTİRMESİ: Sütun isimlerindeki backtick'ler temizlenerek SQL Injection engellendi
            const setClause = keys.map(k => `\`${k.replace(/`/g, '')}\` = ?`).join(', ');
            const idValue = data.Id || data.id || log.target_id;

            await connection.query(`UPDATE ?? SET ${setClause} WHERE id = ?`, [log.target_table, ...values, idValue]);
        }

        // İşlem durumunu güncelleyin
        await connection.query('UPDATE activity_logs SET is_undone = 1 WHERE id = ?', [logId]);

        await connection.commit(); // Tüm veritabanı değişikliklerini onayla

        // Geri alma işleminin kendisini asenkron olarak logla
        try {
            await logActivity(adminUserId, 'RESTORE', log.target_table, log.target_id, `"${log.description}" işlemini geri aldı.`, null);
        } catch (logErr) {
            console.error('RESTORE aktivitesi loglanırken hata oluştu (işlem geri alındı):', logErr);
        }

        res.json({ success: true, message: 'İşlem başarıyla geri alındı.' });

    } catch (error) {
        await connection.rollback(); // Hata durumunda veritabanı değişikliklerini iptal et
        console.error('Geri alma işlemi hatası:', error);
        res.status(500).json({ success: false, message: 'Geri alınırken sunucu hatası oluştu.' });
    } finally {
        connection.release(); // Bağlantıyı havuza iade et
    }
});

module.exports = router;

