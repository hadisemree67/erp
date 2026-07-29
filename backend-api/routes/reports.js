/**
 * ============================================================================
 * DOSYA ADI: reports.js
 * MODÜL / KATMAN: Arkayüz Rotası (API Route) - Raporlar ve Analizler
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depo doluluk oranları (cm³ bazında toplam ve depoya özel), kategori bazlı stok dağılımları,
 *   kritik seviye uyarıları ve en değerli ürünler gibi genel analiz verilerini sağlar.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js Router, SQL Toplama ve Gruplama Sorguları
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: Genel Raporlar ve Depo Doluluk Oranları
router.get('/summary', async (req, res) => {
    try {
        // 1. Depolar ve Raflar
        const [warehouses] = await db.query('SELECT * FROM warehouses ORDER BY name ASC');
        const [shelves] = await db.query('SELECT id, warehouse_id, max_volume FROM warehouse_shelves');

        // 2. Stok Bakiyeleri ve Ürün Hacimleri
        const [stockRows] = await db.query(`
            SELECT sb.warehouse_id, sb.quantity, p.Volume, p.package_capacity, p.PurchasePrice, p.SalePrice, p.Category, p.ProductName, p.Brand, p.unit_type, p.critical_stock_level, p.Id as product_id
            FROM wms_stock_balances sb
            JOIN products p ON sb.product_id = p.Id
            WHERE sb.quantity > 0
        `);

        // 3. Tüm Ürünler (Stoku 0 olanlar dahil analiz için)
        const [allProducts] = await db.query('SELECT Id, ProductName, Brand, Category, StockQuantity, PurchasePrice, SalePrice, unit_type, critical_stock_level, Volume, package_capacity FROM products');

        // DEPO DOLULUK HESAPLAMASI
        let totalMaxVolAll = 0;
        let totalUsedVolAll = 0;

        const warehouseOccupancy = warehouses.map(w => {
            const whShelves = shelves.filter(s => s.warehouse_id === w.id);
            const maxVol = whShelves.reduce((sum, s) => sum + (parseFloat(s.max_volume) || 0), 0);
            
            const whStocks = stockRows.filter(r => r.warehouse_id === w.id);
            const usedVol = whStocks.reduce((sum, r) => {
                const qty = parseFloat(r.quantity) || 0;
                const vol = parseFloat(r.Volume) || 0;
                const pCap = parseFloat(r.package_capacity) || 0;
                const packagesCount = pCap > 0 ? (qty / pCap) : qty;
                return sum + (packagesCount * vol);
            }, 0);

            totalMaxVolAll += maxVol;
            totalUsedVolAll += usedVol;

            let percentage = 0;
            if (maxVol > 0) {
                percentage = (usedVol / maxVol) * 100;
            }

            return {
                id: w.id,
                name: w.name,
                type: w.warehouse_type,
                shelfCount: whShelves.length,
                maxVolume: maxVol,
                usedVolume: Math.round(usedVol),
                emptyVolume: Math.round(Math.max(0, maxVol - usedVol)),
                overflowVolume: Math.round(Math.max(0, usedVol - maxVol)),
                percentage: parseFloat(percentage.toFixed(1))
            };
        });

        let overallPercentage = 0;
        if (totalMaxVolAll > 0) {
            overallPercentage = (totalUsedVolAll / totalMaxVolAll) * 100;
        }

        const occupancySummary = {
            totalMaxVolume: totalMaxVolAll,
            totalUsedVolume: Math.round(totalUsedVolAll),
            totalEmptyVolume: Math.round(Math.max(0, totalMaxVolAll - totalUsedVolAll)),
            totalOverflowVolume: Math.round(Math.max(0, totalUsedVolAll - totalMaxVolAll)),
            overallPercentage: parseFloat(overallPercentage.toFixed(1)),
            warehouses: warehouseOccupancy
        };

        // KATEGORİ BAZLI STOK DAĞILIMI
        const categoryMap = {};
        for (let p of allProducts) {
            const cat = p.Category || 'Diğer / Kategori Yok';
            if (!categoryMap[cat]) {
                categoryMap[cat] = { category: cat, productCount: 0, totalStock: 0, totalValue: 0 };
            }
            const qty = parseFloat(p.StockQuantity) || 0;
            const price = parseFloat(p.PurchasePrice) || parseFloat(p.SalePrice) || 0;
            categoryMap[cat].productCount += 1;
            categoryMap[cat].totalStock += qty;
            categoryMap[cat].totalValue += (qty * price);
        }
        const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.totalValue - a.totalValue);

        // KRİTİK STOKLAR
        const lowStockProducts = allProducts
            .filter(p => {
                const qty = parseFloat(p.StockQuantity) || 0;
                const crit = parseFloat(p.critical_stock_level) || 0;
                return crit > 0 ? (qty <= crit) : (qty <= 10);
            })
            .map(p => ({
                id: p.Id,
                name: p.ProductName,
                brand: p.Brand,
                category: p.Category,
                quantity: parseFloat(p.StockQuantity) || 0,
                unit: p.unit_type || 'Adet',
                criticalLevel: parseFloat(p.critical_stock_level) || 0
            }))
            .slice(0, 10);

        // EN DEĞERLİ ÜRÜNLER (Stok Miktarı * Satış Fiyatı)
        const topValuationProducts = allProducts
            .map(p => {
                const qty = parseFloat(p.StockQuantity) || 0;
                const price = parseFloat(p.SalePrice) || parseFloat(p.PurchasePrice) || 0;
                return {
                    id: p.Id,
                    name: p.ProductName,
                    brand: p.Brand,
                    category: p.Category,
                    quantity: qty,
                    unit: p.unit_type || 'Adet',
                    price: price,
                    totalValue: qty * price
                };
            })
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 8);

        // ÖZET SAYILAR
        const stats = {
            totalProducts: allProducts.length,
            totalStockQuantity: allProducts.reduce((sum, p) => sum + (parseFloat(p.StockQuantity) || 0), 0),
            totalInventoryValue: allProducts.reduce((sum, p) => sum + ((parseFloat(p.StockQuantity) || 0) * (parseFloat(p.PurchasePrice) || 0)), 0),
            totalWarehouses: warehouses.length,
            totalShelves: shelves.length
        };

        res.json({
            success: true,
            stats,
            occupancy: occupancySummary,
            categoryBreakdown,
            lowStockProducts,
            topValuationProducts
        });

    } catch (error) {
        console.error('Raporlar özeti çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Rapor verileri getirilirken hata oluştu.' });
    }
});

module.exports = router;
