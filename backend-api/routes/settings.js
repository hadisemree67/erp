const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value, description FROM system_settings');
        const settings = {};
        rows.forEach(r => {
            settings[r.setting_key] = r.setting_value === 'true' ? true : (r.setting_value === 'false' ? false : r.setting_value);
        });
        res.json({ success: true, data: settings, raw: rows });
    } catch (error) {
        console.error('Ayarlar alınırken hata:', error);
        res.status(500).json({ success: false, message: 'Ayarlar getirilirken hata oluştu.' });
    }
});

// POST /api/settings
router.post('/', async (req, res) => {
    try {
        const { updates } = req.body; // updates = { system_paused: true }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ success: false, message: 'Geçersiz veri formatı.' });
        }

        for (const [key, value] of Object.entries(updates)) {
            const strValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
            await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [strValue, key]);
        }

        res.json({ success: true, message: 'Ayarlar başarıyla güncellendi.' });
    } catch (error) {
        console.error('Ayarlar güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Ayarlar güncellenirken hata oluştu.' });
    }
});

module.exports = router;
