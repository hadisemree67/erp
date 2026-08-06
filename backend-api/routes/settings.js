/*
 * ÖZET:
 * Bu modül, sistemin genel ayarlarını ve konfigürasyonlarını (system_settings tablosu) okuyan 
 * ve güncelleyen API uç noktalarını barındırır.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Bu ayarları sadece admin değiştirebilir.' });
};


// GET /api/settings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value, description FROM system_settings');
        const settings = {};
        rows.forEach(r => {
            settings[r.setting_key] = r.setting_value === 'true' ? true : (r.setting_value === 'false' ? false : r.setting_value);
        });
        res.json({ success: true, data: settings, raw: rows });
    } catch (error) {
        console.error('Ayarlar alınırken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: error.message });
    }
});

// POST /api/settings
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { updates } = req.body; // updates = { system_paused: true }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ success: false, message: 'Geçersiz veri formatı.' });
        }

        for (const [key, value] of Object.entries(updates)) {
            const strValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
            await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [strValue, key]);
            
            // Eğer system_paused değişiyorsa in-memory cache'i de güncelle
            if (key === 'system_paused') {
                req.app.locals.system_paused = (strValue === 'true');
                
                if (strValue === 'true') {
                    req.app.locals.paused_at = new Date().toISOString();
                } else {
                    req.app.locals.paused_at = null;
                }
            }
        }

        res.json({ success: true, message: 'Ayarlar başarıyla güncellendi.' });
    } catch (error) {
        console.error('Ayarlar güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Ayarlar güncellenirken hata oluştu.' });
    }
});

module.exports = router;
