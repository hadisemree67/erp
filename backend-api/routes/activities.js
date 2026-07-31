/**
 * ============================================================================
 * DOSYA ADI: activities.js
 * MODÜL / KATMAN: Arkayüz Rotası (API Route) - Aktivite ve Log Yönetimi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemde gerçekleştirilen kullanıcı hareketlerini, log kayıtlarını, stok değişim geçmişini ve genel denetim (audit) izlerini sorgulamak ve listelemek için API uç noktaları sağlar.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js Router, SQLite3 Veritabanı Sorguları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Önyüzdeki ActivityLog.jsx bileşeni tarafından çağrılır; sistemdeki denetim ve takip mekanizmasının temel verisini sağlar.
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
router.get('/', async (req, res) => {
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

// POST: Geri Al (Undo)
router.post('/:id/undo', async (req, res) => {
    const logId = req.params.id;
    const adminUserId = req.headers['x-user-id'];

    if (!adminUserId) return res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });

    try {
        // Logu getir
        const [logs] = await db.query('SELECT * FROM activity_logs WHERE id = ?', [logId]);
        if (logs.length === 0) return res.status(404).json({ success: false, message: 'Kayıt bulunamadı.' });

        const log = logs[0];
        if (log.is_undone) {
            return res.status(400).json({ success: false, message: 'Bu işlem zaten geri alınmış.' });
        }

        // Eğer eylem INSERT ise, target_id'yi silecek
        if (log.action_type === 'INSERT') {
            await db.query(`DELETE FROM ${log.target_table} WHERE id = ?`, [log.target_id]);
            await logActivity(adminUserId, 'RESTORE', log.target_table, log.target_id, `"${log.description}" işlemini geri aldı.`, null);
        }
        // Eğer eylem DELETE ise, old_data'yı yeniden insert edecek
        else if (log.action_type === 'DELETE') {
            if (!log.old_data) return res.status(400).json({ success: false, message: 'Geri alınacak veri yok.' });
            const data = formatDatesForMySQL(log.old_data);
            const keys = Object.keys(data);
            const values = keys.map(k => {
                if (data[k] !== null && typeof data[k] === 'object' && !(data[k] instanceof Date)) {
                    return JSON.stringify(data[k]);
                }
                return data[k];
            });
            const placeholders = keys.map(() => '?').join(', ');
            
            await db.query(`INSERT INTO ${log.target_table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
            await logActivity(adminUserId, 'RESTORE', log.target_table, log.target_id, `"${log.description}" işlemini geri aldı.`, null);
        }
        // Eğer eylem UPDATE ise, old_data ile tekrar update edecek
        else if (log.action_type === 'UPDATE') {
            if (!log.old_data) return res.status(400).json({ success: false, message: 'Geri alınacak veri yok.' });
            const data = formatDatesForMySQL(log.old_data);
            const keys = Object.keys(data).filter(k => k.toLowerCase() !== 'id');
            const values = keys.map(k => {
                if (data[k] !== null && typeof data[k] === 'object' && !(data[k] instanceof Date)) {
                    return JSON.stringify(data[k]);
                }
                return data[k];
            });
            const setClause = keys.map(k => `${k} = ?`).join(', ');

            // target_id veya data.Id
            const idValue = data.Id || data.id || log.target_id;
            
            await db.query(`UPDATE ${log.target_table} SET ${setClause} WHERE id = ?`, [...values, idValue]);
            await logActivity(adminUserId, 'RESTORE', log.target_table, log.target_id, `"${log.description}" işlemini geri aldı.`, null);
        }

        // is_undone bayrağını işaretle
        await db.query('UPDATE activity_logs SET is_undone = 1 WHERE id = ?', [logId]);

        res.json({ success: true, message: 'İşlem başarıyla geri alındı.' });

    } catch (error) {
        console.error('Geri alma işlemi hatası:', error);
        res.status(500).json({ success: false, message: 'Geri alınırken sunucu hatası oluştu.' });
    }
});

module.exports = router;
