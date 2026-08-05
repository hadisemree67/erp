/*
 * ÖZET:
 * Bu modül, fiziksel depoların oluşturulması, depo içindeki raf, koridor ve hücre yapılandırmalarının 
 * tanımlanması ve depo yerleşim düzeninin yönetildiği API uç noktalarını sağlar.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// GET: Tüm depoları ve onlara bağlı rafları getir
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [warehouses] = await db.query('SELECT * FROM warehouses ORDER BY created_at DESC');
        const [shelves] = await db.query('SELECT * FROM warehouse_shelves');

        // Rafları depolara bağla
        const warehousesWithShelves = warehouses.map(w => {
            const whShelves = shelves.filter(s => s.warehouse_id === w.id);
            return {
                ...w,
                Shelves: whShelves.map(s => s.shelf_code),
                Shelves_Details: whShelves.map(s => ({ shelfCode: s.shelf_code, maxVolume: s.max_volume, width: s.width, height: s.height, depth: s.depth, barcode: s.barcode }))
            };
        });

        res.json(warehousesWithShelves);
    } catch (error) {
        console.error('Depolar getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// GET: Raf kapasitelerini hesapla
router.get('/shelf-capacities', authMiddleware, async (req, res) => {
    const { productId } = req.query;
    try {
        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId gerekli.' });
        }

        // 1. Ürün bilgisini çek
        const [productRows] = await db.query('SELECT Id, Volume FROM products WHERE Id = ?', [productId]);
        if (productRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });
        }

        const productVolume = parseFloat(productRows[0].Volume) || 0;

        // 2. Rafları çek
        const [shelves] = await db.query('SELECT id, warehouse_id, shelf_code, max_volume FROM warehouse_shelves');

        // 3. Mevcut stok bakiyelerini ve o ürünlerin hacimlerini çek
        // Raf bazında dolu hacmi hesapla
        const [stockRows] = await db.query(`
            SELECT sb.warehouse_id, sb.shelf_code, sb.quantity, p.Volume, p.package_capacity
            FROM wms_stock_balances sb
            JOIN products p ON sb.product_id = p.Id
            WHERE sb.quantity > 0 AND sb.shelf_code IS NOT NULL AND sb.shelf_code != ''
        `);

        // Raf doluluklarını grupla
        const shelfUsage = {};
        for (let row of stockRows) {
            const key = `${row.warehouse_id}_${row.shelf_code}`;
            if (!shelfUsage[key]) shelfUsage[key] = 0;
            const qty = parseFloat(row.quantity) || 0;
            const vol = parseFloat(row.Volume) || 0;
            const pCap = parseFloat(row.package_capacity) || 0;
            const packagesCount = pCap > 0 ? (qty / pCap) : qty;
            shelfUsage[key] += packagesCount * vol;
        }

        // 4. Her raf için kalan hacmi ve sığabilecek ürün sayısını hesapla
        const capacities = {};
        let bestShelf = null;
        let maxFit = -1;

        for (let shelf of shelves) {
            const key = `${shelf.warehouse_id}_${shelf.shelf_code}`;
            const maxVol = parseFloat(shelf.max_volume) || 0;
            const usedVol = shelfUsage[key] || 0;

            let fitCount = null; // null = sınırsız

            if (maxVol > 0 && productVolume > 0) {
                const remainingVol = Math.max(0, maxVol - usedVol);
                fitCount = Math.floor(remainingVol / productVolume);
            }

            if (!capacities[shelf.warehouse_id]) {
                capacities[shelf.warehouse_id] = {};
            }

            capacities[shelf.warehouse_id][shelf.shelf_code] = fitCount;

            // En iyi rafı bul (En az 1 tane sığabilenler arasından)
            if (fitCount !== null && fitCount > maxFit && fitCount > 0) {
                maxFit = fitCount;
                bestShelf = { warehouseId: shelf.warehouse_id, shelfCode: shelf.shelf_code, fitCount };
            }
        }

        res.json({ success: true, capacities, bestShelf });

    } catch (error) {
        console.error('Raf kapasiteleri hesaplanırken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST: Yeni depo ekle
router.post('/', authMiddleware, async (req, res) => {
    const { name, location, address, shelves, max_capacity, warehouse_type } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Depo adı zorunludur.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Depoyu Ekle
        const [insertResult] = await connection.query(
            'INSERT INTO warehouses (name, location, warehouse_type, address, max_capacity) VALUES (?, ?, ?, ?, ?)',
            [name, location || '', warehouse_type || 'STOK', address || '', max_capacity || null]
        );
        const warehouseId = insertResult.insertId;

        // 2. Rafları Ekle
        if (shelves && Array.isArray(shelves) && shelves.length > 0) {
            for (let shelf of shelves) {
                // Eğer string ise (eski yapı), varsayılan hacmi 0 yap. Obje ise shelf_code ve max_volume kullan
                const shelf_code = typeof shelf === 'string' ? shelf : shelf.shelfCode;
                const width = typeof shelf === 'object' && shelf.width ? parseFloat(shelf.width) || 0 : 0;
                const height = typeof shelf === 'object' && shelf.height ? parseFloat(shelf.height) || 0 : 0;
                const depth = typeof shelf === 'object' && shelf.depth ? parseFloat(shelf.depth) || 0 : 0;
                const barcode = typeof shelf === 'object' && shelf.barcode ? shelf.barcode.trim() : null;
                // Eski maxVolume'dan geldiyse ama genişlik yoksa (nadir ama mümkün), koru, aksi takdirde hesapla.
                const legacyVol = typeof shelf === 'object' && shelf.maxVolume ? parseFloat(shelf.maxVolume) || 0 : 0;
                const max_volume = (width > 0 && height > 0 && depth > 0) ? (width * height * depth) : legacyVol;

                if (shelf_code && shelf_code.trim() !== '') {
                    await connection.query(
                        'INSERT INTO warehouse_shelves (warehouse_id, shelf_code, max_volume, width, height, depth, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [warehouseId, shelf_code.trim(), max_volume, width, height, depth, barcode]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        await logActivity(req.user?.id, 'INSERT', 'warehouses', warehouseId, `Yeni depo eklendi: ${name}`);
        res.status(201).json({ success: true, message: 'Depo başarıyla eklendi.', id: warehouseId });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Depo eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// PUT: Depo güncelle
router.put('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { name, location, address, shelves, max_capacity, warehouse_type } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Depo adı zorunludur.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Depoyu Güncelle
        const [result] = await connection.query(
            'UPDATE warehouses SET name = ?, location = ?, warehouse_type = ?, address = ?, max_capacity = ? WHERE id = ?',
            [name, location || '', warehouse_type || 'STOK', address || '', max_capacity || null, id]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ success: false, message: 'Depo bulunamadı.' });
        }

        // 2. Mevcut rafları sil (Sıfırdan yazıyoruz)
        await connection.query('DELETE FROM warehouse_shelves WHERE warehouse_id = ?', [id]);

        // 3. Yeni rafları ekle
        if (shelves && Array.isArray(shelves) && shelves.length > 0) {
            for (let shelf of shelves) {
                const shelf_code = typeof shelf === 'string' ? shelf : shelf.shelfCode;
                const width = typeof shelf === 'object' && shelf.width ? parseFloat(shelf.width) || 0 : 0;
                const height = typeof shelf === 'object' && shelf.height ? parseFloat(shelf.height) || 0 : 0;
                const depth = typeof shelf === 'object' && shelf.depth ? parseFloat(shelf.depth) || 0 : 0;
                const barcode = typeof shelf === 'object' && shelf.barcode ? shelf.barcode.trim() : null;
                const legacyVol = typeof shelf === 'object' && shelf.maxVolume ? parseFloat(shelf.maxVolume) || 0 : 0;
                const max_volume = (width > 0 && height > 0 && depth > 0) ? (width * height * depth) : legacyVol;

                if (shelf_code && shelf_code.trim() !== '') {
                    await connection.query(
                        'INSERT INTO warehouse_shelves (warehouse_id, shelf_code, max_volume, width, height, depth, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [id, shelf_code.trim(), max_volume, width, height, depth, barcode]
                    );
                }
            }
        }

        await connection.commit();
        connection.release();

        await logActivity(req.user?.id, 'UPDATE', 'warehouses', id, `Depo güncellendi: ${name}`);
        res.json({ success: true, message: 'Depo başarıyla güncellendi.' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Depo güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// DELETE: Depo sil
router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // ON DELETE CASCADE olduğu için warehouse_shelves otomatik silinecek
        const [result] = await db.query('DELETE FROM warehouses WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Depo bulunamadı.' });
        await logActivity(req.user?.id, 'DELETE', 'warehouses', id, 'Depo silindi.');
        res.json({ success: true, message: 'Depo başarıyla silindi.' });
    } catch (error) {
        console.error('Depo silinirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

module.exports = router;
