/*
 * ÖZET:
 * Bu modül, depo (Warehouse Management System) işlemlerini yönetir. 
 * Mal kabul, raftan rafa transfer, hacim hesabı, stok düzenleme ve lokasyon takibi bu dosyada yapılır.
 */
const express = require('express');
const multer = require('multer');
const { checkAndNotifyLowStock } = require('../utils/stockNotifier');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');
const { calculateShelf3D } = require('../utils/wmsUtils');

// Tüm depoları getir
router.get('/warehouses', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM warehouses ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Depolar çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Depolar getirilirken hata oluştu.' });
    }
});

// Bir depo için lokasyonları getir
router.get('/warehouses/:warehouseId/locations', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, shelf_code as shelf, shelf_code as rack, "Genel" as aisle, shelf_code as barcode FROM warehouse_shelves WHERE warehouse_id = ?', [req.params.warehouseId]);
        res.json(rows);
    } catch (error) {
        console.error('Lokasyonlar çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Lokasyonlar getirilirken hata oluştu.' });
    }
});

// Depo krokisini kaydet
router.post('/warehouses/:warehouseId/layout', authMiddleware, checkRole(['Depo']), async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const layoutData = req.body; // { grid, rows, cols }

        await db.query('UPDATE warehouses SET layout_data = ? WHERE id = ?', [JSON.stringify(layoutData), warehouseId]);
        await logActivity(req.user?.id, 'UPDATE', 'warehouses', warehouseId, `Depo krokisi güncellendi.`);
        res.json({ success: true, message: 'Kroki başarıyla kaydedildi.' });
    } catch (error) {
        console.error('Kroki kaydedilirken hata:', error);
        res.status(500).json({ success: false, message: 'Kroki kaydedilirken hata oluştu.' });
    }
});

// Bir depoda belirli bir ürünü içeren rafları getir
router.get('/warehouses/:warehouseId/products/:productId/shelves', authMiddleware, async (req, res) => {
    try {
        const { warehouseId, productId } = req.params;
        const [rows] = await db.query(
            'SELECT DISTINCT shelf_code FROM wms_stock_balances WHERE warehouse_id = ? AND product_id = ? AND quantity > 0',
            [warehouseId, productId]
        );
        res.json({ success: true, data: rows.map(r => r.shelf_code) });
    } catch (err) {
        console.error('Raf arama hatası:', err);
        res.status(500).json({ success: false, message: 'Hata oluştu' });
    }
});

// Depo krokisini getir
router.get('/warehouses/:warehouseId/layout', authMiddleware, async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const [rows] = await db.query('SELECT layout_data FROM warehouses WHERE id = ?', [warehouseId]);

        if (rows.length > 0 && rows[0].layout_data) {
            let parsed = rows[0].layout_data;
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            res.json({ success: true, data: parsed });
        } else {
            res.json({ success: true, data: null });
        }
    } catch (error) {
        console.error('Kroki çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Kroki getirilirken hata oluştu.' });
    }
});

// Belirli bir raf için stoğu getir
router.get('/warehouses/:warehouseId/shelves/:shelfCode/stock', authMiddleware, async (req, res) => {
    try {
        const { warehouseId, shelfCode } = req.params;

        // 1. Get shelf details (dimensions)
        const [shelfData] = await db.query('SELECT max_volume, width, height, depth FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [warehouseId, shelfCode]);
        const maxVolume = parseFloat(shelfData[0]?.max_volume) || 0;
        const shelfDimensions = {
            width: parseFloat(shelfData[0]?.width) || 0,
            height: parseFloat(shelfData[0]?.height) || 0,
            depth: parseFloat(shelfData[0]?.depth) || 0
        };

        // 2. Get stock balances with product details
        const [stockRows] = await db.query(`
            SELECT sb.id, sb.product_id, sb.quantity, sb.batch_number, sb.expiration_date,
                   p.ProductName, (SELECT GROUP_CONCAT(barcode SEPARATOR ', ') FROM product_barcodes WHERE product_id = p.Id) as Barcode, p.Volume, p.package_capacity, p.unit_type, p.package_name,
                   p.Width, p.Height, p.Depth, p.is_stackable, p.max_stack_limit
            FROM wms_stock_balances sb
            JOIN products p ON sb.product_id = p.Id
            WHERE sb.warehouse_id = ? AND sb.shelf_code = ? AND ROUND(sb.quantity, 4) > 0
        `, [warehouseId, shelfCode]);

        // 3. Calculate used volume
        let filledVolume = 0;
        for (let row of stockRows) {
            const qty = parseFloat(row.quantity) || 0;
            const vol = parseFloat(row.Volume) || 0;
            const packageCap = parseFloat(row.package_capacity) || 1;
            filledVolume += Math.ceil(qty / packageCap) * vol;
        }

        res.json({
            success: true,
            shelfCode,
            maxVolume,
            shelfDimensions,
            filledVolume,
            emptyVolume: Math.max(0, maxVolume - filledVolume),
            products: stockRows
        });
    } catch (error) {
        console.error('Raf detayı çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Raf detayları getirilirken hata oluştu.' });
    }
});

// Belirli bir rafı boşalt
router.post('/warehouses/:warehouseId/shelves/:shelfCode/clear', authMiddleware, checkRole(['Depo']), async (req, res) => {
    const clearConn = await db.getConnection();
    try {
        const { warehouseId, shelfCode } = req.params;
        const userId = req.body.userId || 1;

        await clearConn.query('START TRANSACTION');

        // 1. Get all stock in this shelf
        const [stockRows] = await clearConn.query(`
            SELECT product_id, quantity, batch_number, expiration_date 
            FROM wms_stock_balances 
            WHERE warehouse_id = ? AND shelf_code = ? AND quantity > 0
        `, [warehouseId, shelfCode]);

        if (stockRows.length === 0) {
            await clearConn.query('ROLLBACK');
            clearConn.release();
            return res.json({ success: true, message: 'Raf zaten boş.' });
        }

        // 2. For each product, insert OUT movement, update global stock
        for (let row of stockRows) {
            // Movement
            await clearConn.query(
                'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [row.product_id, userId, 'OUT', row.quantity, warehouseId, shelfCode, row.batch_number, row.expiration_date, 'Raf Sıfırlama (Boşaltma)']
            );

            // Global stock
            await clearConn.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [row.quantity, row.product_id]);
        }

        // 3. Delete balances
        await clearConn.query('DELETE FROM wms_stock_balances WHERE warehouse_id = ? AND shelf_code = ?', [warehouseId, shelfCode]);

        await logActivity(req.user?.id || userId, 'DELETE', 'wms_stock_balances', null, `Raf tamamen boşaltıldı: Depo #${warehouseId}, Raf: ${shelfCode}`);

        await clearConn.query('COMMIT');
        clearConn.release();
        res.json({ success: true, message: 'Raf başarıyla boşaltıldı.' });
    } catch (error) {
        await clearConn.query('ROLLBACK').catch(() => {});
        clearConn.release();
        console.error('Raf boşaltma hatası:', error);
        res.status(500).json({ success: false, message: 'Raf boşaltılırken hata oluştu.' });
    }
});

// Bir stok girişi kaydet (Mal Kabul)
router.post('/stock-entry', authMiddleware, checkPermission('stock_entry'), async (req, res) => {
    const { productId, warehouseId, shelfAllocations, userId, description, batchNumber, expirationDate, supplierId, unitPrice } = req.body;

    let formattedExpDate = expirationDate || null;
    if (formattedExpDate && typeof formattedExpDate === 'string' && formattedExpDate.includes('T')) {
        formattedExpDate = formattedExpDate.split('T')[0];
    }

    if (!productId || !warehouseId || !shelfAllocations || !Array.isArray(shelfAllocations) || shelfAllocations.length === 0) {
        return res.status(400).json({ success: false, message: 'Ürün, depo, ve en az bir raf tahsisi zorunludur.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');

        // GÜVENLİK: Depo gerçekten var mı kontrolü
        const [warehouseCheck] = await conn.query('SELECT id FROM warehouses WHERE id = ?', [warehouseId]);
        if (warehouseCheck.length === 0) {
            await conn.query('ROLLBACK');
            conn.release();
            return res.status(404).json({ success: false, message: 'Belirtilen depo bulunamadı.' });
        }

        // Fetch product volume and shelf life
        const [productData] = await conn.query('SELECT Volume, package_capacity, shelf_life_months FROM products WHERE Id = ?', [productId]);
        const productVolume = parseFloat(productData[0]?.Volume) || 0;
        const packageCapacity = parseFloat(productData[0]?.package_capacity) || 1;
        const shelfLifeMonths = parseInt(productData[0]?.shelf_life_months) || 0;

        if (!formattedExpDate && shelfLifeMonths > 0) {
            const expDate = new Date();
            expDate.setMonth(expDate.getMonth() + shelfLifeMonths);
            formattedExpDate = expDate.toISOString().split('T')[0];
        }

        for (const allocation of shelfAllocations) {
            if (!allocation.shelfCode || !allocation.quantity || allocation.quantity <= 0) {
                await conn.query('ROLLBACK');
                conn.release();
                return res.status(400).json({ success: false, message: 'Raf ve geçerli bir miktar girilmelidir.' });
            }

            // GÜVENLİK: Raf gerçekten var mı kontrolü
            const [shelfCheck] = await conn.query('SELECT id FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [warehouseId, allocation.shelfCode]);
            if (shelfCheck.length === 0) {
                await conn.query('ROLLBACK');
                conn.release();
                return res.status(404).json({ success: false, message: `Hata: ${allocation.shelfCode} kodlu raf bulunamadı!` });
            }

            // Volumetric and Dimensional check
            if (productVolume > 0 || packageCapacity > 0) {
                const [shelfData] = await conn.query('SELECT max_volume, width, height, depth FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [warehouseId, allocation.shelfCode]);
                const maxVolume = parseFloat(shelfData[0]?.max_volume) || 0;
                const sW = parseFloat(shelfData[0]?.width) || 0;
                const sH = parseFloat(shelfData[0]?.height) || 0;
                const sD = parseFloat(shelfData[0]?.depth) || 0;

                const [pData] = await conn.query('SELECT Width, Height, Depth, is_stackable, max_stack_limit FROM products WHERE Id = ?', [productId]);
                const pW = parseFloat(pData[0]?.Width) || 0;
                const pH = parseFloat(pData[0]?.Height) || 0;
                const pD = parseFloat(pData[0]?.Depth) || 0;
                const isStackable = pData[0]?.is_stackable === 1 || pData[0]?.is_stackable === true || pData[0]?.is_stackable === '1';
                const maxStackLimit = parseInt(pData[0]?.max_stack_limit) || 1;

                let absoluteMaxCapacity = 0;

                if (sW > 0 && sH > 0 && sD > 0 && pW > 0 && pH > 0 && pD > 0) {
                    const [filledData] = await conn.query(
                        'SELECT quantity, p.package_capacity FROM wms_stock_balances b JOIN products p ON b.product_id = p.Id WHERE b.warehouse_id = ? AND b.shelf_code = ? FOR UPDATE',
                        [warehouseId, allocation.shelfCode]
                    );
                    let currentPackages = 0;
                    for (const f of filledData) {
                        const q = parseFloat(f.quantity) || 0;
                        const pc = parseFloat(f.package_capacity) || 1;
                        currentPackages += Math.ceil(q / pc);
                    }

                    const calc = calculateShelf3D({
                        sW, sH, sD, maxVolume, pW, pH, pD, productVolume, isStackable, maxStackLimit, pCap: packageCapacity, currentPackages
                    });

                    if (calc.maxItems !== Infinity && allocation.quantity > calc.maxItems) {
                        await conn.query('ROLLBACK');
                        conn.release();
                        return res.status(400).json({
                            success: false,
                            message: `Hata: ${allocation.shelfCode} rafının kapasitesi aşıldı! Seçilen üründen bu rafa en fazla ${calc.maxItems} adet (${calc.remainingPackages} koli/paket) daha sığabilir.`
                        });
                    }
                } else if (productVolume > 0) {
                    const volPerItem = productVolume / packageCapacity;
                    const absoluteMaxCapacity = volPerItem > 0 ? Math.floor(maxVolume / volPerItem) : 0;
                    if (absoluteMaxCapacity > 0) {
                        const [filledData] = await conn.query(
                            'SELECT COALESCE(SUM(quantity), 0) as filled FROM wms_stock_balances WHERE warehouse_id = ? AND shelf_code = ? AND product_id = ? FOR UPDATE',
                            [warehouseId, allocation.shelfCode, productId]
                        );
                        const currentFilled = parseFloat(filledData[0].filled) || 0;
                        const emptySlots = Math.max(absoluteMaxCapacity - currentFilled, 0);

                        if (allocation.quantity > emptySlots) {
                            await conn.query('ROLLBACK');
                            conn.release();
                            return res.status(400).json({
                                success: false,
                                message: `Hata: ${allocation.shelfCode} rafının kapasitesi aşıldı! Seçilen üründen bu rafa en fazla ${emptySlots} adet daha sığabilir.`
                            });
                        }
                    }
                }
            }
        }

        let totalAdded = 0;

        for (const allocation of shelfAllocations) {
            const { shelfCode, quantity } = allocation;
            totalAdded += quantity;

            // 1. Log the movement
            await conn.query(
                'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description, supplier_id, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [productId, userId, 'IN', quantity, warehouseId, shelfCode, batchNumber || null, formattedExpDate, description || 'Depo Girişi (Mal Kabul)', supplierId || null, unitPrice || null]
            );

            // 2. Update the specific location balance (considering batch_number and expiration_date)
            const safeBatch = batchNumber || '';
            const safeExp = formattedExpDate;

            const [existingBalances] = await conn.query(
                'SELECT id, quantity FROM wms_stock_balances WHERE product_id = ? AND warehouse_id = ? AND shelf_code = ? AND COALESCE(batch_number, "") = ? AND (expiration_date = ? OR (expiration_date IS NULL AND ? IS NULL)) AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL)) AND (unit_price = ? OR (unit_price IS NULL AND ? IS NULL)) FOR UPDATE',
                [productId, warehouseId, shelfCode, safeBatch, safeExp, safeExp, supplierId || null, supplierId || null, unitPrice || null, unitPrice || null]
            );

            if (existingBalances.length > 0) {
                await conn.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [quantity, existingBalances[0].id]);
            } else {
                await conn.query(
                    'INSERT INTO wms_stock_balances (product_id, warehouse_id, shelf_code, batch_number, expiration_date, quantity, supplier_id, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [productId, warehouseId, shelfCode, safeBatch, safeExp, quantity, supplierId || null, unitPrice || null]
                );
            }
        }

        // 3. Update the total global stock of the product (for backward compatibility)
        await conn.query(`
            UPDATE products 
            SET StockQuantity = StockQuantity + ? 
            WHERE Id = ?
        `, [totalAdded, productId]);

        // 4. Finans Gider Kaydı (Otomatik)
        if (supplierId && unitPrice && unitPrice > 0 && totalAdded > 0) {
            const totalCost = parseFloat(unitPrice) * totalAdded;

            const [prodRows] = await conn.query('SELECT ProductName FROM products WHERE Id = ?', [productId]);
            const [supRows] = await conn.query('SELECT SupplierName FROM suppliers WHERE Id = ?', [supplierId]);

            const prodName = prodRows.length > 0 ? prodRows[0].ProductName : 'Bilinmeyen Ürün';
            const supName = supRows.length > 0 ? supRows[0].SupplierName : 'Bilinmeyen Tedarikçi';

            const desc = `${prodName} ürünü için ${supName} adlı tedarikçiden ${totalAdded} adet manuel depo girişi (mal kabul) yapıldı.`;

            await conn.query(`
                INSERT INTO finance_transactions 
                (type, amount, category, description, transaction_date) 
                VALUES ('GİDER', ?, 'Hammadde / Ürün Alımı', ?, CURDATE())
            `, [totalCost, desc]);
        }

        await logActivity(req.user?.id || userId, 'INSERT', 'StockMovements', null, `Depoya manuel ürün girişi yapıldı. Ürün #${productId}, Toplam Miktar: ${totalAdded}`);

        await conn.query('COMMIT');
        conn.release();

        res.json({ success: true, message: 'Stok girişi başarıyla tamamlandı.' });
    } catch (error) {
        await conn.query('ROLLBACK');
        conn.release();
        console.error('Stok girişi hatası:', error);
        res.status(500).json({ success: false, message: 'Stok işlemi sırasında hata oluştu.' });
    }
});

// Detaylı stok bakiyelerini getir (Stok Listesi / Envanter)
router.get('/stock-list', authMiddleware, checkPermission('inventory_view'), async (req, res) => {
    try {
        const query = `
            SELECT 
                b.id as balance_id,
                COALESCE(b.quantity, 0) as quantity,
                b.batch_number,
                b.expiration_date,
                p.Id as product_id,
                p.ProductName as product_name,
                (SELECT GROUP_CONCAT(pb.barcode SEPARATOR ',') FROM product_barcodes pb WHERE pb.product_id = p.Id) as barcode,
                p.Brand as brand,
                p.Category as category,
                p.web_categories as web_categories,
                p.web_subcategories as web_subcategories,
                p.web_subtitles as web_subtitles,
                p.SalePrice as sale_price,
                p.PurchasePrice as PurchasePrice,
                b.shelf_code,
                w.id as warehouse_id,
                w.name as warehouse_name,
                w.max_capacity,
                (SELECT COUNT(*) FROM warehouse_shelves ws WHERE ws.warehouse_id = w.id) as total_shelves,
                b.supplier_id,
                b.unit_price,
                s.SupplierName as supplier_name,
                ws.width as shelf_width,
                ws.height as shelf_height,
                ws.depth as shelf_depth,
                ws.max_volume as shelf_max_volume,
                p.Width as product_width,
                p.Height as product_height,
                p.Depth as product_depth,
                p.Volume as product_volume,
                p.is_stackable,
                p.max_stack_limit,
                p.unit_type,
                p.package_name,
                p.package_capacity
            FROM products p
            LEFT JOIN wms_stock_balances b ON p.Id = b.product_id AND b.quantity > 0
            LEFT JOIN warehouses w ON b.warehouse_id = w.id
            LEFT JOIN warehouse_shelves ws ON ws.warehouse_id = b.warehouse_id AND ws.shelf_code = b.shelf_code
            LEFT JOIN suppliers s ON b.supplier_id = s.Id
            ORDER BY p.ProductName, w.name, b.shelf_code
        `;
        const [rows] = await db.query(query);

        const processedRows = rows.map(row => {
            const sW = parseFloat(row.shelf_width) || 0;
            const sH = parseFloat(row.shelf_height) || 0;
            const sD = parseFloat(row.shelf_depth) || 0;
            const pW = parseFloat(row.product_width) || 0;
            const pH = parseFloat(row.product_height) || 0;
            const pD = parseFloat(row.product_depth) || 0;

            let absoluteMaxCapacity = 0;

            if (sW > 0 && sH > 0 && sD > 0 && pW > 0 && pH > 0 && pD > 0) {
                // Yanlardan 5+5=10 cm, üstten 5 cm, önden (derinlik) 5 cm boşluk
                const usableW = Math.max(0, sW - 10);
                const usableH = Math.max(0, sH - 5);
                const usableD = Math.max(0, sD - 5);

                const wCount = Math.floor(usableW / pW);
                const dCount = Math.floor(usableD / pD);
                const baseCount = wCount * dCount;

                let hCount = Math.floor(usableH / pH);
                const isStackable = row.is_stackable === 1 || row.is_stackable === true || row.is_stackable === '1';

                if (isStackable) {
                    const stackLimit = parseInt(row.max_stack_limit) || 1;
                    if (hCount > stackLimit) hCount = stackLimit;
                } else {
                    hCount = 1;
                }

                absoluteMaxCapacity = baseCount * hCount;
            } else {
                let containerVolume = parseFloat(row.product_volume) || 0;
                if (pW > 0 && pH > 0 && pD > 0) {
                    containerVolume = pW * pH * pD;
                }

                const sVol = parseFloat(row.shelf_max_volume) || 0;
                if (sVol > 0 && containerVolume > 0) {
                    absoluteMaxCapacity = Math.floor(sVol / containerVolume);
                }
            }

            const packageCapacity = parseFloat(row.package_capacity) || 1;

            return {
                ...row,
                shelf_max_capacity: absoluteMaxCapacity > 0 ? absoluteMaxCapacity * packageCapacity : null
            };
        });

        res.json({ success: true, data: processedRows });
    } catch (error) {
        console.error('Stok listesi getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
    }
});

// Bir stok bakiyesi satırını güncelle (Stok Düzenle)
router.put('/stock/:id', authMiddleware, checkRole(['Depo']), async (req, res) => {
    const { id } = req.params;
    const { quantity, batch_number, expiration_date, supplier_id, unit_price } = req.body;

    if (quantity === undefined) {
        return res.status(400).json({ success: false, message: 'Miktar zorunludur.' });
    }

    try {
        await db.query('BEGIN');

        // Find old balance
        const [rows] = await db.query('SELECT * FROM wms_stock_balances WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Stok kaydı bulunamadı.' });
        }

        const oldData = rows[0];
        const diff = quantity - oldData.quantity;

        const supplier_id_val = req.body.supplier_id !== undefined ? (req.body.supplier_id === '' ? null : req.body.supplier_id) : oldData.supplier_id;
        const unit_price_val = req.body.unit_price !== undefined ? (req.body.unit_price === '' ? null : req.body.unit_price) : oldData.unit_price;
        const warehouse_id_val = req.body.warehouse_id !== undefined ? req.body.warehouse_id : oldData.warehouse_id;
        const shelf_code_val = req.body.shelf_code !== undefined ? req.body.shelf_code : oldData.shelf_code;

        let formattedExpDate = req.body.expiration_date !== undefined ? (req.body.expiration_date || null) : oldData.expiration_date;
        if (formattedExpDate && typeof formattedExpDate === 'string' && formattedExpDate.includes('T')) {
            formattedExpDate = formattedExpDate.split('T')[0];
        }

        // GÜVENLİK: Yeni depo ve raf mevcut mu kontrolü
        if (warehouse_id_val !== oldData.warehouse_id || shelf_code_val !== oldData.shelf_code) {
            const [shelfCheck] = await db.query('SELECT id FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [warehouse_id_val, shelf_code_val]);
            if (shelfCheck.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ success: false, message: `Hata: Hedef depo veya raf (${shelf_code_val}) bulunamadı!` });
            }
        }

        // Update balance
        await db.query('UPDATE wms_stock_balances SET quantity = ?, batch_number = ?, expiration_date = ?, supplier_id = ?, unit_price = ?, warehouse_id = ?, shelf_code = ? WHERE id = ?', [
            quantity,
            batch_number || '',
            formattedExpDate,
            supplier_id_val,
            unit_price_val,
            warehouse_id_val,
            shelf_code_val,
            id
        ]);

        // Update global product stock if quantity changed
        if (diff !== 0) {
            await db.query('UPDATE products SET StockQuantity = StockQuantity + ? WHERE Id = ?', [diff, oldData.product_id]);
        }

        if (oldData.warehouse_id !== warehouse_id_val || oldData.shelf_code !== shelf_code_val) {
            // Log transfer out from old location
            await db.query(
                'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    oldData.product_id,
                    req.user?.id || 1,
                    'OUT',
                    oldData.quantity,
                    oldData.warehouse_id, oldData.shelf_code,
                    oldData.batch_number || null,
                    oldData.expiration_date,
                    `Konum Değişikliği (Çıkış -> Depo: ${warehouse_id_val}, Raf: ${shelf_code_val})`
                ]
            );
            // Log transfer in to new location with new quantity
            await db.query(
                'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    oldData.product_id,
                    req.user?.id || 1,
                    'IN',
                    quantity,
                    warehouse_id_val, shelf_code_val,
                    batch_number || null,
                    formattedExpDate,
                    `Konum Değişikliği (Giriş <- Depo: ${oldData.warehouse_id}, Raf: ${oldData.shelf_code})`
                ]
            );
        } else if (diff !== 0) {
            // Log the movement difference
            await db.query(
                'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    oldData.product_id,
                    req.user?.id || 1, // fallback to 1 if not provided
                    diff > 0 ? 'IN' : 'OUT',
                    Math.abs(diff),
                    warehouse_id_val, shelf_code_val,
                    batch_number || null,
                    formattedExpDate,
                    'Manuel Stok Düzenlemesi'
                ]
            );
        }

        await db.query('COMMIT');

        await logActivity(req.user?.id, 'UPDATE', 'wms_stock_balances', id, `Stok kaydı güncellendi (Miktar: ${quantity}, Depo: ${warehouse_id_val}, Raf: ${shelf_code_val})`);

        // Check critical stock after manual edit
        if (diff !== 0) {
            await checkAndNotifyLowStock(oldData.product_id);
        }

        res.json({ success: true, message: 'Stok kaydı başarıyla güncellendi.' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Stok düzenleme hatası:', error);
        res.status(500).json({ success: false, message: 'Stok girişi sırasında sunucu hatası oluştu.' });
    }
});

// Bir stok bakiyesi satırını sil
router.delete('/stock/:id', authMiddleware, checkRole(['Depo']), async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('BEGIN');

        // Find old balance
        const [rows] = await db.query('SELECT * FROM wms_stock_balances WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Stok kaydı bulunamadı.' });
        }

        const oldData = rows[0];

        // Delete balance
        await db.query('DELETE FROM wms_stock_balances WHERE id = ?', [id]);

        // Deduct from global product stock
        await db.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [oldData.quantity, oldData.product_id]);
        await checkAndNotifyLowStock(oldData.product_id);

        // Log movement
        await db.query(
            'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [oldData.product_id, req.user?.id || 1, 'OUT', oldData.quantity, oldData.warehouse_id, oldData.shelf_code, oldData.batch_number, oldData.expiration_date, 'Manuel Stok Silme']
        );

        await db.query('COMMIT');
        await logActivity(req.user?.id || 1, 'DELETE', 'wms_stock_balances', id, `Stok kaydı silindi (Ürün #${oldData.product_id}, Miktar: ${oldData.quantity})`);
        res.json({ success: true, message: 'Stok kaydı başarıyla silindi.' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Stok silme hatası:', error);
        res.status(500).json({ success: false, message: 'Stok silinirken sunucu hatası oluştu.' });
    }
});

// Tekli transfer uç noktası
router.post('/transfer', authMiddleware, checkRole(['Depo']), async (req, res) => {
    const { balanceId, quantity, targetWarehouseId, targetShelfCode, userId, description } = req.body;

    if (!balanceId || !quantity || !targetWarehouseId || !targetShelfCode) {
        return res.status(400).json({ success: false, message: 'Lütfen tüm zorunlu alanları doldurun.' });
    }

    try {
        await db.query('BEGIN');

        const transferQty = parseInt(quantity);
        if (isNaN(transferQty) || transferQty <= 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Geçersiz transfer miktarı.' });
        }

        const [rows] = await db.query(
            'SELECT product_id, warehouse_id, shelf_code, quantity, batch_number, expiration_date FROM wms_stock_balances WHERE id = ? FOR UPDATE',
            [balanceId]
        );

        if (rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Kaynak stok kaydı bulunamadı.' });
        }

        const balance = rows[0];

        if (balance.quantity < transferQty) {
            await db.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Transfer miktarı mevcut stoktan büyük olamaz.' });
        }

        // GÜVENLİK: Hedef raf mevcut mu kontrolü
        const [targetShelfCheck] = await db.query('SELECT id FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [targetWarehouseId, targetShelfCode]);
        if (targetShelfCheck.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Hedef depo veya raf bulunamadı.' });
        }

        // Deduct from source
        await db.query('UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ?', [transferQty, balanceId]);

        // Log OUT movement from source
        await db.query(
            'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [balance.product_id, userId, 'OUT', transferQty, balance.warehouse_id, balance.shelf_code, balance.batch_number, balance.expiration_date, description || 'Depo Transferi Çıkışı']
        );

        // Add to target
        const safeBatch = balance.batch_number || '';
        const safeExp = balance.expiration_date || null;

        const [targetRows] = await db.query(
            'SELECT id FROM wms_stock_balances WHERE product_id = ? AND warehouse_id = ? AND shelf_code = ? AND batch_number = ? AND (expiration_date = ? OR (expiration_date IS NULL AND ? IS NULL)) FOR UPDATE',
            [balance.product_id, targetWarehouseId, targetShelfCode, safeBatch, safeExp, safeExp]
        );

        if (targetRows.length > 0) {
            await db.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [transferQty, targetRows[0].id]);
        } else {
            await db.query(
                'INSERT INTO wms_stock_balances (product_id, warehouse_id, shelf_code, batch_number, expiration_date, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                [balance.product_id, targetWarehouseId, targetShelfCode, safeBatch, safeExp, transferQty]
            );
        }

        // Log IN movement to target
        await db.query(
            'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [balance.product_id, userId, 'IN', transferQty, targetWarehouseId, targetShelfCode, balance.batch_number, balance.expiration_date, description || 'Depo Transferi Girişi']
        );

        await db.query('COMMIT');
        await logActivity(userId || req.user?.id, 'UPDATE', 'wms_stock_balances', balanceId, `Stok transferi yapıldı. Hedef Depo: ${targetWarehouseId}, Raf: ${targetShelfCode}, Miktar: ${transferQty}`);
        res.json({ success: true, message: 'Depo transferi başarıyla tamamlandı.' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Transfer hatası:', error);
        res.status(500).json({ success: false, message: 'Transfer işlemi sırasında sunucu hatası oluştu.' });
    }
});

// Stok bakiyeleri için toplu işlem uç noktası
router.post('/bulk-action', authMiddleware, checkRole(['Depo']), async (req, res) => {
    const { balanceIds, actionType, quantity, targetWarehouseId, targetShelfCode, userId, description } = req.body;

    if (!Array.isArray(balanceIds) || balanceIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Geçersiz stok kayıtları.' });
    }

    try {
        await db.query('BEGIN');

        for (const balanceId of balanceIds) {
            const [rows] = await db.query('SELECT product_id, warehouse_id, shelf_code, quantity, batch_number, expiration_date FROM wms_stock_balances WHERE id = ? FOR UPDATE', [balanceId]);
            if (rows.length === 0) continue;

            const balance = rows[0];

            if (actionType === 'ADD') {
                const addQty = parseInt(quantity) || 0;
                if (addQty > 0) {
                    await db.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [addQty, balanceId]);
                    await db.query('UPDATE products SET StockQuantity = StockQuantity + ? WHERE Id = ?', [addQty, balance.product_id]);
                    await db.query(
                        'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [balance.product_id, userId, 'IN', addQty, balance.warehouse_id, balance.shelf_code, balance.batch_number, balance.expiration_date, description || 'Toplu Stok Ekleme']
                    );
                }
            } else if (actionType === 'REMOVE') {
                const rmQty = parseInt(quantity) || 0;
                if (rmQty > 0 && balance.quantity >= rmQty) {
                    await db.query('UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ?', [rmQty, balanceId]);
                    await db.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [rmQty, balance.product_id]);
                    await checkAndNotifyLowStock(balance.product_id);
                    await db.query(
                        'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [balance.product_id, userId, 'OUT', rmQty, balance.warehouse_id, balance.shelf_code, balance.batch_number, balance.expiration_date, description || 'Toplu Stok Düşürme']
                    );
                }
            } else if (actionType === 'ZERO_OUT') {
                const currentQty = balance.quantity;
                if (currentQty > 0) {
                    await db.query('UPDATE wms_stock_balances SET quantity = 0 WHERE id = ?', [balanceId]);
                    await db.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [currentQty, balance.product_id]);
                    await checkAndNotifyLowStock(balance.product_id);
                    await db.query(
                        'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [balance.product_id, userId, 'OUT', currentQty, balance.warehouse_id, balance.shelf_code, balance.batch_number, balance.expiration_date, description || 'Toplu Sıfırlama (Zayi/Fire)']
                    );
                }
            } else if (actionType === 'TRANSFER') {
                if (!targetWarehouseId || !targetShelfCode) {
                    throw new Error('Hedef depo ve raf zorunludur.');
                }
                const transferQty = balance.quantity;
                if (transferQty > 0) {
                    await db.query('UPDATE wms_stock_balances SET quantity = 0 WHERE id = ?', [balanceId]);
                    await db.query(
                        'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [balance.product_id, userId, 'OUT', transferQty, balance.warehouse_id, balance.shelf_code, balance.batch_number, balance.expiration_date, 'Toplu Transfer - Çıkış']
                    );

                    const safeBatch = balance.batch_number || '';
                    const safeExp = balance.expiration_date || null;
                    const [targetRows] = await db.query(
                        'SELECT id FROM wms_stock_balances WHERE product_id = ? AND warehouse_id = ? AND shelf_code = ? AND batch_number = ? AND (expiration_date = ? OR (expiration_date IS NULL AND ? IS NULL)) FOR UPDATE',
                        [balance.product_id, targetWarehouseId, targetShelfCode, safeBatch, safeExp, safeExp]
                    );

                    if (targetRows.length > 0) {
                        await db.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [transferQty, targetRows[0].id]);
                    } else {
                        await db.query(
                            'INSERT INTO wms_stock_balances (product_id, warehouse_id, shelf_code, batch_number, expiration_date, quantity) VALUES (?, ?, ?, ?, ?, ?)',
                            [balance.product_id, targetWarehouseId, targetShelfCode, safeBatch, safeExp, transferQty]
                        );
                    }

                    await db.query(
                        'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [balance.product_id, userId, 'IN', transferQty, targetWarehouseId, targetShelfCode, balance.batch_number, balance.expiration_date, description || 'Toplu Transfer - Giriş']
                    );
                }
            }
        }

        await db.query('COMMIT');
        await logActivity(userId || req.user?.id, 'UPDATE', 'wms_stock_balances', null, `Toplu stok işlemi yapıldı (${actionType}).`);
        res.json({ success: true, message: 'Toplu işlemler başarıyla tamamlandı.' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Toplu işlem hatası:', error);
        res.status(500).json({ success: false, message: 'İşlem sırasında sunucu hatası oluştu.' });
    }
});

// GET /shelf-capacity
router.get('/shelf-capacity', authMiddleware, async (req, res) => {
    const { warehouseId, shelfCode, productId, pW: qW, pH: qH, pD: qD, pVol: qVol, pStack: qStack, pLimit: qLimit, pCap: qCap } = req.query;

    if (!warehouseId || !shelfCode) {
        return res.status(400).json({ success: false, message: 'Eksik parametre.' });
    }

    try {
        let productVolume = parseFloat(qVol) || 0;
        let packageCapacity = parseFloat(qCap) || 1;
        let pW = parseFloat(qW) || 0;
        let pH = parseFloat(qH) || 0;
        let pD = parseFloat(qD) || 0;
        let isStackable = qStack === '1';
        let maxStackLimit = parseInt(qLimit) || 1;

        if (productId) {
            const [productData] = await db.query('SELECT Volume, Width, Height, Depth, is_stackable, max_stack_limit, package_capacity FROM products WHERE Id = ?', [productId]);
            if (productData.length > 0) {
                if (!productVolume) productVolume = parseFloat(productData[0]?.Volume) || 0;
                if (!parseFloat(qCap)) packageCapacity = parseFloat(productData[0]?.package_capacity) || 1;
                if (!pW) pW = parseFloat(productData[0]?.Width) || 0;
                if (!pH) pH = parseFloat(productData[0]?.Height) || 0;
                if (!pD) pD = parseFloat(productData[0]?.Depth) || 0;
                if (!qStack) isStackable = productData[0]?.is_stackable === 1;
                if (!parseInt(qLimit)) maxStackLimit = parseInt(productData[0]?.max_stack_limit) || 1;
            }
        }

        const [shelfData] = await db.query('SELECT max_volume, width, height, depth FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [warehouseId, shelfCode]);
        const maxVolume = parseFloat(shelfData[0]?.max_volume) || 0;
        const sW = parseFloat(shelfData[0]?.width) || 0;
        const sH = parseFloat(shelfData[0]?.height) || 0;
        const sD = parseFloat(shelfData[0]?.depth) || 0;

        // 1. Kap kapladığı tekil hacim (Fiziksel Boyutlar varsa ona göre hesapla)
        let containerVolume = productVolume;
        if (pW > 0 && pH > 0 && pD > 0) {
            containerVolume = pW * pH * pD; // Kap hacmi (Örn: 1.380.000 cm3)
        }

        if (maxVolume === 0 || containerVolume === 0) {
            return res.json({ success: true, hasVolumeInfo: false });
        }

        let maxItems3D = Infinity;
        let physicallyFits = true;

        const usableVolume = maxVolume;

        const [filledRows] = await db.query(
            'SELECT b.product_id, b.quantity, p.Volume, p.package_capacity FROM wms_stock_balances b JOIN products p ON b.product_id = p.Id WHERE b.warehouse_id = ? AND b.shelf_code = ?',
            [warehouseId, shelfCode]
        );

        let currentFilledVol = 0;
        let currentPackages = 0;
        for (const row of filledRows) {
            let vol = parseFloat(row.Volume) || 0;
            if (productId && row.product_id.toString() === productId.toString() && (pW * pH * pD > 0 || productVolume > 0)) {
                vol = (pW * pH * pD > 0) ? (pW * pH * pD) : productVolume;
            }
            let pCapRow = parseFloat(row.package_capacity) || 1;
            if (pCapRow <= 0) pCapRow = 1;
            const pkgs = Math.ceil((parseFloat(row.quantity) || 0) / pCapRow);
            currentPackages += pkgs;
            currentFilledVol += pkgs * vol;
        }

        const calc = calculateShelf3D({
            sW, sH, sD, maxVolume,
            pW, pH, pD, productVolume,
            isStackable, maxStackLimit, pCap: packageCapacity,
            currentPackages, currentFilledVol
        });

        res.json({
            success: true,
            hasVolumeInfo: true,
            productVolume: (pW * pH * pD > 0) ? (pW * pH * pD) : productVolume,
            maxVolume,
            usableVolume: maxVolume,
            currentFilled: currentFilledVol,
            emptyVolume: calc.emptyVolume,
            maxItems: calc.maxItems,
            maxPackages: calc.remainingPackages,
            fillPercentage: calc.fillPercentage,
            physicallyFits: calc.physicallyFits,
            isStackable: calc.isStackable,
            maxStackLimit: calc.maxStackLimit
        });
    } catch (error) {
        console.error('Kapasite hesabı hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// GET /warehouse-capacities (bulk)
router.get('/warehouse-capacities', authMiddleware, async (req, res) => {
    const { warehouseId, productId, w, h, d, stackable, max_stack } = req.query;
    if (!warehouseId) return res.status(400).json({ success: false, message: 'Eksik parametre.' });
    try {
        let productVolume = 0, pW = 0, pH = 0, pD = 0, isStackable = false, maxStackLimit = 1;

        let pCap = 1;
        if (productId && productId !== 'new') {
            const [productData] = await db.query('SELECT Volume, Width, Height, Depth, is_stackable, max_stack_limit, package_capacity FROM products WHERE Id = ?', [productId]);
            productVolume = parseFloat(productData[0]?.Volume) || 0;
            pW = parseFloat(productData[0]?.Width) || 0;
            pH = parseFloat(productData[0]?.Height) || 0;
            pD = parseFloat(productData[0]?.Depth) || 0;
            isStackable = productData[0]?.is_stackable === 1;
            maxStackLimit = parseInt(productData[0]?.max_stack_limit) || 1;
            pCap = parseFloat(productData[0]?.package_capacity) || 1;
        } else {
            pW = parseFloat(w) || 0;
            pH = parseFloat(h) || 0;
            pD = parseFloat(d) || 0;
            productVolume = pW * pH * pD;
            isStackable = stackable === 'true' || stackable === '1';
            maxStackLimit = parseInt(max_stack) || 1;
            pCap = parseFloat(req.query.pCap) || 1;
        }

        const [shelvesData] = await db.query('SELECT shelf_code, max_volume, width, height, depth FROM warehouse_shelves WHERE warehouse_id = ?', [warehouseId]);

        const [filledData] = await db.query(
            'SELECT shelf_code, product_id, quantity, p.Volume as prodVolume, p.package_capacity FROM wms_stock_balances b JOIN products p ON b.product_id = p.Id WHERE b.warehouse_id = ?',
            [warehouseId]
        );
        const filledVolMap = {};
        const filledPkgMap = {};
        const containsSameProductMap = {};
        const containsOtherProductsMap = {};
        const existingCorridors = new Set();
        filledData.forEach(r => {
            let vol = parseFloat(r.prodVolume) || 0;
            if (productId && r.product_id.toString() === productId.toString() && productVolume > 0) {
                vol = productVolume;
            }
            let pCapRow = parseFloat(r.package_capacity) || 1;
            if (pCapRow <= 0) pCapRow = 1;
            const pkgs = Math.ceil((parseFloat(r.quantity) || 0) / pCapRow);

            filledVolMap[r.shelf_code] = (filledVolMap[r.shelf_code] || 0) + (pkgs * vol);
            filledPkgMap[r.shelf_code] = (filledPkgMap[r.shelf_code] || 0) + pkgs;

            if (r.product_id.toString() === productId.toString() && parseFloat(r.quantity) > 0) {
                containsSameProductMap[r.shelf_code] = true;
                const corridor = r.shelf_code.split('-')[0].trim();
                existingCorridors.add(corridor);
            }

            if (productId && r.product_id.toString() !== productId.toString() && parseFloat(r.quantity) > 0) {
                containsOtherProductsMap[r.shelf_code] = true;
            }
        });

        const capacities = {};
        shelvesData.forEach(shelf => {
            const maxVolume = parseFloat(shelf.max_volume) || 0;
            const sW = parseFloat(shelf.width) || 0;
            const sH = parseFloat(shelf.height) || 0;
            const sD = parseFloat(shelf.depth) || 0;

            const currentFilledVol = filledVolMap[shelf.shelf_code] || 0;
            const currentPackages = filledPkgMap[shelf.shelf_code] || 0;

            const calc = calculateShelf3D({
                sW, sH, sD, maxVolume,
                pW, pH, pD, productVolume,
                isStackable, maxStackLimit, pCap,
                currentPackages, currentFilledVol
            });

            const corridor = shelf.shelf_code.split('-')[0].trim();
            capacities[shelf.shelf_code] = {
                maxItems: calc.maxItems,
                physicallyFits: calc.physicallyFits,
                efficiency: calc.efficiency,
                hasSameProduct: containsSameProductMap[shelf.shelf_code] || false,
                hasSameCorridor: existingCorridors.has(corridor),
                hasOtherProducts: containsOtherProductsMap[shelf.shelf_code] || false
            };
        });

        res.json({ success: true, data: capacities });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});


// GET /shelf-by-barcode
router.get('/shelf-by-barcode', authMiddleware, async (req, res) => {
    const { barcode } = req.query;
    if (!barcode) {
        return res.status(400).json({ success: false, message: 'Barkod parametresi eksik.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT s.warehouse_id, s.shelf_code, w.name as warehouse_name FROM warehouse_shelves s JOIN warehouses w ON s.warehouse_id = w.id WHERE s.barcode = ? LIMIT 1',
            [barcode]
        );

        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.json({ success: false, message: 'Bu barkoda ait raf bulunamadı.' });
        }
    } catch (error) {
        console.error('Raf barkodu sorgulanırken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// FEFO tabanlı hızlı stok düşüşü (Hızlı Çıkış)
router.post('/deduct-fefo', authMiddleware, checkRole(['Depo']), async (req, res) => {
    const { barcode, quantity, warehouseId, shelfCode, description } = req.body;
    const userId = req.user?.id || 1;
    const deductQty = parseInt(quantity, 10);

    if (!barcode || !deductQty || deductQty <= 0) {
        return res.status(400).json({ success: false, message: 'Geçerli bir barkod ve düşülecek miktar giriniz.' });
    }

    try {
        await db.query('BEGIN');

        // 1. Ürünü bul
        const [products] = await db.query(`
            SELECT p.* FROM products p 
            JOIN product_barcodes pb ON p.Id = pb.product_id
            WHERE pb.barcode = ?
            LIMIT 1
        `, [barcode]);
        
        if (products.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Bu barkoda ait ürün bulunamadı.' });
        }
        const product = products[0];

        // 3. Stok bakiyelerini getir (FEFO - Son Kullanma Tarihi en yakın olanlar önce)
        let balancesQuery = 'SELECT * FROM wms_stock_balances WHERE product_id = ? AND quantity > 0';
        let queryParams = [product.Id];

        if (warehouseId && shelfCode) {
            balancesQuery += ' AND warehouse_id = ? AND shelf_code = ?';
            queryParams.push(warehouseId, shelfCode);
        }

        balancesQuery += ' ORDER BY ISNULL(expiration_date), expiration_date ASC, id ASC FOR UPDATE';
        
        const [balances] = await db.query(balancesQuery, queryParams);
        
        // Raf özelinde stok yeterlilik kontrolü
        const totalAvailable = balances.reduce((sum, b) => sum + b.quantity, 0);
        if (totalAvailable < deductQty) {
            await db.query('ROLLBACK');
            return res.status(400).json({ success: false, message: warehouseId ? `Seçilen rafta yetersiz stok! Mevcut: ${totalAvailable}` : `Yetersiz stok! Mevcut: ${totalAvailable}` });
        }

        let remainingToDeduct = deductQty;

        for (const balance of balances) {
            if (remainingToDeduct <= 0) break;

            const qtyToTake = Math.min(balance.quantity, remainingToDeduct);
            remainingToDeduct -= qtyToTake;

            // Bakiyeyi güncelle veya sil
            if (balance.quantity === qtyToTake) {
                await db.query('DELETE FROM wms_stock_balances WHERE id = ?', [balance.id]);
            } else {
                await db.query('UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ?', [qtyToTake, balance.id]);
            }

            // Hareket kaydı
            await db.query(
                'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    product.Id,
                    userId,
                    'OUT',
                    qtyToTake,
                    balance.warehouse_id,
                    balance.shelf_code,
                    balance.batch_number,
                    balance.expiration_date,
                    description ? `Acil Çıkış: ${description.trim()}` : 'Hızlı Çıkış (FEFO) ile düşüldü.'
                ]
            );
        }

        // 4. Genel ürün stokunu düş
        await db.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [deductQty, product.Id]);

        await db.query('COMMIT');

        // Kritik stok kontrolü (async, response'u bekletmez)
        checkAndNotifyLowStock(product.Id).catch(err => console.error("Stok uyarısı hatası (FEFO):", err));

        const logMsg = description && description.trim()
            ? `Hızlı Çıkış (FEFO) ile stoktan ${deductQty} adet düşüldü. Ürün: ${product.ProductName} - Açıklama: ${description.trim()}`
            : `Hızlı Çıkış (FEFO) ile stoktan ${deductQty} adet düşüldü. Ürün: ${product.ProductName}`;
            
        await logActivity(userId, 'UPDATE', 'wms_stock_balances', null, logMsg);

        res.json({ success: true, message: `${deductQty} adet stok başarıyla FEFO sırasına göre düşüldü.` });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('FEFO stok düşümü hatası:', error);
        res.status(500).json({ success: false, message: 'Stok düşülürken hata oluştu: ' + error.message });
    }
});

module.exports = router;
