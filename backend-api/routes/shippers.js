const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.get('/', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM shippers ORDER BY CompanyName ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Kargo firmaları çekilirken hata:', err);
        res.status(500).json({ success: false, message: 'Kargo firmaları getirilemedi.' });
    }
});

module.exports = router;
