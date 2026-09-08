/**
 * ============================================================================
 * DOSYA ADI: routes/dashboard.js
 * MODÜL / KATMAN: Dashboard İstatistik Rotaları
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının ana sayfa istatistik kartlarını besleyen
 *   özet verileri (ürün, marka, kategori, düşük stok sayıları) getirir.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// [GET] Dashboard ana istatistikleri
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [products] = await db.query("SELECT COUNT(Id) as count FROM products WHERE Category != 'Hammadde' OR Category IS NULL");
        const [brands] = await db.query('SELECT COUNT(id) as count FROM brands');
        const [categories] = await db.query('SELECT COUNT(id) as count FROM kategori');
        const [lowStock] = await db.query('SELECT COUNT(Id) as count FROM products WHERE StockQuantity <= 10');

        res.json({
            success: true,
            totalProducts: products[0].count,
            totalBrands: brands[0].count,
            totalCategories: categories[0].count,
            lowStock: lowStock[0].count,
            todayOrders: 0,
            totalCustomers: 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
