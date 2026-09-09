/**
 * ============================================================================
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Bu modül, müşteri siparişlerinin (B2B/B2C) oluşturulması, listelenmesi ve 
 *   kargo süreçlerinin (paketleme, 3D kutu optimizasyonu, WMS stok düşümü) 
 *   yönetildiği ana rotaları içerir.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const orderController = require('../controllers/orderController');
const { toFrontendStatus, toPrismaStatus } = require('../utils/enumMapper');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');
const { checkAndNotifyLowStock } = require('../utils/stockNotifier');
const { notifyCustomerOrderStatus } = require('../utils/orderNotifier');

// ===========================
// [GET] Tüm Siparişleri Listeleme
// ===========================
router.get('/', authMiddleware, checkPermission('view_orders'), orderController.getOrders.bind(orderController));

// ===========================
// [POST] Yeni Sipariş Oluşturma
// ===========================
router.post('/', authMiddleware, checkPermission('order_create'), orderController.createOrder.bind(orderController));

// ===========================
// [PUT] Sipariş Durumunu Güncelleme
// ===========================
router.put('/:id/status', authMiddleware, checkPermission('view_orders'), async (req, res) => {
    const { status, boxId, trackingNumber } = req.body;

    // YETKİ KONTROLÜ
    if (req.user.role !== 'admin') {
        const perms = req.user.permissions || [];
        if (status === 'İptal Edildi' || status === 'İptal') {
            if (!perms.includes('order_cancel')) return res.status(403).json({ success: false, message: 'Yetkiniz bulunmamaktadır.' });
        } else if (status === 'Kargoya Verildi' || status === 'Teslim Edildi') {
            if (!perms.includes('order_ship')) return res.status(403).json({ success: false, message: 'Yetkiniz bulunmamaktadır.' });
        } else if (status === 'Onaylandı') {
            if (!perms.includes('order_approve') && !perms.includes('order_prepare')) {
                return res.status(403).json({ success: false, message: 'Yetkiniz bulunmamaktadır.' });
            }
        } else if (status === 'Toplanıyor' || status === 'Toplanacaklar' || status === 'Toplandı') {
            if (!perms.includes('order_prepare') && !perms.includes('order_approve')) return res.status(403).json({ success: false, message: 'Yetkiniz bulunmamaktadır.' });
        } else if (status === 'Paketleniyor' || status === 'Paketlendi') {
            if (!perms.includes('order_ship') && !perms.includes('order_prepare')) return res.status(403).json({ success: false, message: 'Yetkiniz bulunmamaktadır.' });
        } else {
            return res.status(403).json({ success: false, message: 'Yetkiniz bulunmamaktadır.' });
        }
    }

    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');

        const [orders] = await conn.query('SELECT * FROM orders WHERE Id = ? FOR UPDATE', [orderId]);
        const currOrder = orders[0];

        if (!currOrder) throw new Error('Sipariş bulunamadı.');
        const oldStatus = toFrontendStatus(currOrder.OrderStatus);

        if (status === oldStatus) {
            await conn.query('ROLLBACK');
            conn.release();
            return res.json({ success: true, message: 'Sipariş durumu güncellendi.' });
        }

        const allowedTransitions = {
            'Beklemede': ['Onaylandı', 'Toplanacaklar', 'Toplanıyor', 'Toplandı', 'İptal Edildi', 'İptal'],
            'Onaylandı': ['Toplanacaklar', 'Toplanıyor', 'Toplandı', 'Paketlendi', 'İptal Edildi', 'İptal', 'Beklemede'],
            'Toplanacaklar': ['Toplanıyor', 'Toplandı', 'Paketlendi', 'Onaylandı', 'İptal Edildi'],
            'Toplanıyor': ['Toplandı', 'Paketlendi', 'Kargoya Verildi', 'Onaylandı', 'İptal Edildi'],
            'Toplandı': ['Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Onaylandı', 'İptal Edildi'],
            'Paketleniyor': ['Paketlendi', 'Kargoya Verildi', 'Onaylandı', 'İptal Edildi'],
            'Paketlendi': ['Kargoya Verildi', 'Teslim Edildi', 'Onaylandı', 'İptal Edildi'],
            'Kargoya Verildi': ['Teslim Edildi', 'Toplanıyor', 'Toplandı', 'İptal Edildi'],
            'Teslim Edildi': ['Kargoya Verildi'],
            'İptal Edildi': [],
            'İptal': []
        };

        const validNextStates = allowedTransitions[oldStatus];
        if (!validNextStates || !validNextStates.includes(status)) {
            if (req.user.role !== 'admin') {
                throw new Error(`Geçersiz işlem: Sipariş "${oldStatus}" durumundan "${status}" durumuna geçirilemez.`);
            }
        }

        if (status === 'Toplanıyor' && oldStatus === 'Beklemede') {
            const [items] = await conn.query(`
                SELECT oi.*, p.ProductName 
                FROM orderitems oi 
                LEFT JOIN products p ON oi.ProductId = p.Id 
                WHERE oi.OrderId = ?
            `, [orderId]);

            let outOfStockItems = [];
            for (const item of items) {
                const [stockAgg] = await conn.query('SELECT SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ?', [item.ProductId]);
                const currentStock = Number(stockAgg[0].qty) || 0;
                if (currentStock < 0) {
                    outOfStockItems.push(`${item.ProductName} (Eksik: ${Math.abs(currentStock)})`);
                }
            }

            if (outOfStockItems.length > 0) {
                throw new Error('Siparişteki bazı ürünler stokta yeterli miktarda bulunmuyor!\nYetersiz Ürünler:\n- ' + outOfStockItems.join('\n- '));
            }
        }

        const pickedStatuses = ['Toplanıyor', 'Toplandı', 'Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi'];
        const wasPhysicallyPicked = pickedStatuses.includes(oldStatus);

        // 1. İptal durumunda stokları iade et
        if ((status === 'İptal' || status === 'İptal Edildi') && oldStatus !== 'İptal' && oldStatus !== 'İptal Edildi') {
            if (wasPhysicallyPicked) {
                let deductedBatches = null;
                try { if (currOrder.deducted_batches) deductedBatches = JSON.parse(currOrder.deducted_batches); } catch (e) { }

                if (deductedBatches && Array.isArray(deductedBatches)) {
                    for (const d of deductedBatches) {
                        await conn.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [d.quantity, d.batchId]);
                    }
                } else {
                    const [items] = await conn.query('SELECT * FROM orderitems WHERE OrderId = ?', [orderId]);

                    for (const item of items) {
                        const qty = Number(item.Quantity);

                        const [negatives] = await conn.query('SELECT * FROM wms_stock_balances WHERE product_id = ? AND quantity < 0 ORDER BY id ASC FOR UPDATE', [item.ProductId]);

                        let remainingToAdd = qty;

                        for (const neg of negatives) {
                            if (remainingToAdd <= 0) break;
                            let toAdd = Math.min(Math.abs(Number(neg.quantity)), remainingToAdd);
                            await conn.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [toAdd, neg.id]);
                            remainingToAdd -= toAdd;
                        }

                        if (remainingToAdd > 0) {
                            const [exist] = await conn.query('SELECT id FROM wms_stock_balances WHERE product_id = ? AND quantity >= 0 LIMIT 1 FOR UPDATE', [item.ProductId]);
                            if (exist.length > 0) {
                                await conn.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [remainingToAdd, exist[0].id]);
                            } else {
                                await conn.query('INSERT INTO wms_stock_balances (product_id, quantity, warehouse_id) VALUES (?, ?, 1)', [item.ProductId, remainingToAdd]);
                            }
                        }
                    }
                }
            }
        }

        // 2. İlerletme (Toplandı, Paketlendi, Kargoya Verildi, Teslim Edildi): Eğer daha önce toplanmadıysa WMS stoklarını düş
        const isTargetPicked = ['Toplandı', 'Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi'].includes(status);
        if (!wasPhysicallyPicked && isTargetPicked) {
            const [orderItems] = await conn.query('SELECT * FROM orderitems WHERE OrderId = ?', [orderId]);

            for (const item of orderItems) {
                let remainingToDeduct = Number(item.Quantity);
                const [availableBalances] = await conn.query(`
                    SELECT * FROM wms_stock_balances 
                    WHERE product_id = ? AND quantity > 0 
                    ORDER BY quantity DESC
                `, [item.ProductId]);

                for (const bal of availableBalances) {
                    if (remainingToDeduct <= 0) break;
                    let toDeduct = Math.min(bal.quantity, remainingToDeduct);
                    await conn.query('UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ?', [toDeduct, bal.id]);
                    remainingToDeduct -= toDeduct;
                }

                if (remainingToDeduct > 0) {
                    const [firstBal] = await conn.query('SELECT id FROM wms_stock_balances WHERE product_id = ? LIMIT 1', [item.ProductId]);
                    if (firstBal.length > 0) {
                        await conn.query('UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ?', [remainingToDeduct, firstBal[0].id]);
                    } else {
                        await conn.query(`
                            INSERT INTO wms_stock_balances (product_id, quantity, warehouse_id, location_id, shelf_code) 
                            VALUES (?, ?, 1, 1, 'WMS_TOPLAMA')
                        `, [item.ProductId, -remainingToDeduct]);
                    }
                }

                await conn.query(`
                    INSERT INTO stockmovements (ProductId, MovementType, Quantity, MovementDate, Description, warehouse_id) 
                    VALUES (?, 'OUT', ?, NOW(), ?, 1)
                `, [item.ProductId, item.Quantity, `Sipariş #${orderId} ERP üzerinden hızlı işlemle toplandı.`]);
            }
        }

        // 3. Duruma özel alan güncellemeleri
        const generatedBarcode = currOrder.CargoBarcode || `CRG-${orderId}-${Date.now().toString().slice(-4)}`;
        const generatedTracking = trackingNumber || currOrder.TrackingNumber || generatedBarcode;

        if (status === 'Toplandı') {
            await conn.query(`
                UPDATE orders 
                SET OrderStatus = ?, PickedDate = COALESCE(PickedDate, NOW()), PickerId = COALESCE(PickerId, ?), CargoBarcode = COALESCE(CargoBarcode, ?)
                WHERE Id = ?
            `, [toPrismaStatus(status), req.user?.id, generatedBarcode, orderId]);

        } else if (status === 'Paketlendi') {
            let assignedBoxId = boxId || currOrder.BoxId;
            if (!assignedBoxId) {
                const [boxes] = await conn.query('SELECT Id FROM packaging_boxes WHERE IsActive = 1 ORDER BY Id ASC LIMIT 1');
                if (boxes.length > 0) {
                    assignedBoxId = boxes[0].Id;
                    await conn.query('UPDATE packaging_boxes SET StockQuantity = StockQuantity - 1 WHERE Id = ?', [assignedBoxId]);
                }
            } else if (!currOrder.BoxId && assignedBoxId) {
                await conn.query('UPDATE packaging_boxes SET StockQuantity = StockQuantity - 1 WHERE Id = ?', [assignedBoxId]);
            }

            await conn.query(`
                UPDATE orders 
                SET OrderStatus = ?, PackedDate = COALESCE(PackedDate, NOW()), PackerId = COALESCE(PackerId, ?),
                    PickedDate = COALESCE(PickedDate, NOW()), PickerId = COALESCE(PickerId, ?),
                    BoxId = COALESCE(BoxId, ?), CargoBarcode = COALESCE(CargoBarcode, ?), TrackingNumber = COALESCE(TrackingNumber, ?)
                WHERE Id = ?
            `, [toPrismaStatus(status), req.user?.id, req.user?.id, assignedBoxId || null, generatedBarcode, generatedTracking, orderId]);

        } else if (status === 'Kargoya Verildi') {
            await conn.query(`
                UPDATE orders 
                SET OrderStatus = ?, ShippedDate = COALESCE(ShippedDate, NOW()), ShipUserId = COALESCE(ShipUserId, ?),
                    CargoStatus = 'Transfer Merkezine Gidiyor', CargoBarcode = COALESCE(CargoBarcode, ?), TrackingNumber = COALESCE(TrackingNumber, ?)
                WHERE Id = ?
            `, [toPrismaStatus(status), req.user?.id, generatedBarcode, generatedTracking, orderId]);

        } else if (status === 'Teslim Edildi') {
            await conn.query(`
                UPDATE orders 
                SET OrderStatus = ?, CargoStatus = 'Teslim Edildi', CargoBarcode = COALESCE(CargoBarcode, ?), TrackingNumber = COALESCE(TrackingNumber, ?)
                WHERE Id = ?
            `, [toPrismaStatus(status), generatedBarcode, generatedTracking, orderId]);

        } else if (status === 'Onaylandı' && oldStatus === 'Hazırlanıyor') {
            await conn.query('UPDATE orders SET OrderStatus = ?, PickerId = NULL WHERE Id = ?', [toPrismaStatus(status), orderId]);

        } else if (status === 'İptal' || status === 'İptal Edildi') {
            await conn.query('UPDATE orders SET OrderStatus = ?, PickerId = NULL, CartId = NULL, CartSectionIds = NULL WHERE Id = ?', [toPrismaStatus(status), orderId]);

        } else {
            await conn.query('UPDATE orders SET OrderStatus = ? WHERE Id = ?', [toPrismaStatus(status), orderId]);
        }

        // Müşteriye bildirim gönder (canlı durum güncellemesi)
        await notifyCustomerOrderStatus(orderId, status, conn);

        await conn.query('COMMIT');
        conn.release();

        await logActivity(req.user?.id, 'UPDATE', 'orders', orderId, `Sipariş durumu güncellendi: ${status}`);
        res.json({ success: true, message: 'Sipariş durumu güncellendi.' });
    } catch (err) {
        if (conn) { await conn.query('ROLLBACK'); conn.release(); }
        console.error('Durum güncelleme hatası:', err);
        if (err.message && err.message.includes('yeterli miktarda bulunmuyor')) {
            return res.status(400).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// ===========================
// [DELETE] Sipariş İptali / Silme
// ===========================
router.delete('/:id', authMiddleware, checkPermission('order_cancel'), async (req, res) => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');
        const [orders] = await conn.query('SELECT * FROM orders WHERE Id = ? FOR UPDATE', [orderId]);
        const currOrder = orders[0];

        if (currOrder) {
            const oldStatus = toFrontendStatus(currOrder.OrderStatus);
            if (oldStatus !== 'İptal' && oldStatus !== 'İptal Edildi') {
                let deductedBatches = null;
                try { if (currOrder.deducted_batches) deductedBatches = JSON.parse(currOrder.deducted_batches); } catch (e) { }

                if (deductedBatches && Array.isArray(deductedBatches)) {
                    for (const d of deductedBatches) {
                        await conn.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [d.quantity, d.batchId]);
                    }
                } else {
                    const [items] = await conn.query('SELECT * FROM orderitems WHERE OrderId = ?', [orderId]);
                    for (const item of items) {
                        const qty = Number(item.Quantity);
                        const [negatives] = await conn.query('SELECT * FROM wms_stock_balances WHERE product_id = ? AND quantity < 0 ORDER BY id ASC FOR UPDATE', [item.ProductId]);

                        let remainingToAdd = qty;

                        for (const neg of negatives) {
                            if (remainingToAdd <= 0) break;
                            let toAdd = Math.min(Math.abs(Number(neg.quantity)), remainingToAdd);
                            await conn.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [toAdd, neg.id]);
                            remainingToAdd -= toAdd;
                        }

                        if (remainingToAdd > 0) {
                            const [exist] = await conn.query('SELECT id FROM wms_stock_balances WHERE product_id = ? AND quantity >= 0 LIMIT 1 FOR UPDATE', [item.ProductId]);
                            if (exist.length > 0) {
                                await conn.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [remainingToAdd, exist[0].id]);
                            } else {
                                await conn.query('INSERT INTO wms_stock_balances (product_id, quantity, warehouse_id) VALUES (?, ?, 1)', [item.ProductId, remainingToAdd]);
                            }
                        }
                    }
                }
            }
        }

        await conn.query('DELETE FROM orderitems WHERE OrderId = ?', [orderId]);
        await conn.query('DELETE FROM orders WHERE Id = ?', [orderId]);

        await conn.query('COMMIT');
        conn.release();

        await logActivity(req.user?.id, 'DELETE', 'orders', orderId, `Sipariş silindi ve stoklar iade edildi.`);
        res.json({ success: true, message: 'Sipariş başarıyla silindi ve stoklar iade edildi.' });
    } catch (err) {
        if (conn) { await conn.query('ROLLBACK'); conn.release(); }
        console.error('Sipariş silme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// ===========================
// [PUT] Siparişi Onaylama ve Kargo Kutusu Seçme
// ===========================
router.put('/:id/approve', authMiddleware, checkPermission('order_approve'), async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });

        const [items] = await db.query(`
            SELECT oi.*, p.Width, p.Height, p.Depth, p.Weight 
            FROM orderitems oi 
            LEFT JOIN products p ON oi.ProductId = p.Id 
            WHERE oi.OrderId = ?
        `, [orderId]);

        if (items.length === 0) return res.status(400).json({ success: false, message: 'Siparişte ürün yok.' });

        let totalVolume = 0;
        let totalWeight = 0;

        for (const item of items) {
            const w = parseFloat(item.Width) || 10;
            const h = parseFloat(item.Height) || 10;
            const d = parseFloat(item.Depth) || 10;
            const weight = parseFloat(item.Weight) || 0.5;
            const qty = Number(item.Quantity) || 1;

            totalVolume += (w * h * d) * qty;
            totalWeight += weight * qty;
        }

        const [boxes] = await db.query('SELECT * FROM packaging_boxes WHERE IsActive = 1');

        if (boxes.length === 0) {
            return res.status(400).json({ success: false, message: 'Sistemde aktif kutu tanımı bulunmuyor.' });
        }

        const processedBoxes = boxes.map(b => ({
            ...b,
            volume: parseFloat(b.Width) * parseFloat(b.Height) * parseFloat(b.Depth),
            cost: parseFloat(b.Cost),
            maxWeight: parseFloat(b.MaxWeightCapacity),
            emptyWeight: parseFloat(b.EmptyWeight)
        }));

        function packSingleBox(units, boxW, boxH, boxD, maxWeight) {
            let spaces = [{ w: boxW, h: boxH, d: boxD }];
            let currentWeight = 0;
            let unpacked = [];

            for (const unit of units) {
                if (currentWeight + unit.weight > maxWeight) {
                    unpacked.push(unit);
                    continue;
                }

                let placed = false;
                const rotations = [
                    { w: unit.w, h: unit.h, d: unit.d },
                    { w: unit.w, h: unit.d, d: unit.h },
                    { w: unit.h, h: unit.w, d: unit.d },
                    { w: unit.h, h: unit.d, d: unit.w },
                    { w: unit.d, h: unit.w, d: unit.h },
                    { w: unit.d, h: unit.h, d: unit.w }
                ];

                spaces.sort((a, b) => (a.w * a.h * a.d) - (b.w * b.h * b.d));

                for (let i = 0; i < spaces.length; i++) {
                    const space = spaces[i];
                    for (const rot of rotations) {
                        if (rot.w <= space.w && rot.h <= space.h && rot.d <= space.d) {
                            placed = true;
                            spaces.splice(i, 1);

                            const s1 = { w: space.w - rot.w, h: space.h, d: space.d };
                            const s2 = { w: rot.w, h: space.h - rot.h, d: space.d };
                            const s3 = { w: rot.w, h: rot.h, d: space.d - rot.d };

                            if (s1.w > 0 && s1.h > 0 && s1.d > 0) spaces.push(s1);
                            if (s2.w > 0 && s2.h > 0 && s2.d > 0) spaces.push(s2);
                            if (s3.w > 0 && s3.h > 0 && s3.d > 0) spaces.push(s3);

                            currentWeight += unit.weight;
                            break;
                        }
                    }
                    if (placed) break;
                }
                if (!placed) unpacked.push(unit);
            }
            return unpacked;
        }

        let units = [];
        for (const item of items) {
            for (let i = 0; i < (Number(item.Quantity) || 1); i++) {
                units.push({
                    w: parseFloat(item.Width) || 10,
                    h: parseFloat(item.Height) || 10,
                    d: parseFloat(item.Depth) || 10,
                    weight: parseFloat(item.Weight) || 0.5,
                    volume: (parseFloat(item.Width) || 10) * (parseFloat(item.Height) || 10) * (parseFloat(item.Depth) || 10)
                });
            }
        }
        units.sort((a, b) => b.volume - a.volume);

        let sortedBoxes = [...processedBoxes].sort((a, b) => a.volume - b.volume);
        let bestCombo = [];

        while (units.length > 0) {
            let packedInSingleBox = false;

            for (const box of sortedBoxes) {
                const netW = box.Width - 5;
                const netD = box.Depth - 5;
                const netH = box.Height - 3;

                if (netW <= 0 || netD <= 0 || netH <= 0) continue;

                const remainingUnits = packSingleBox(units, netW, netH, netD, box.maxWeight);
                if (remainingUnits.length === 0) {
                    bestCombo.push(box);
                    units = [];
                    packedInSingleBox = true;
                    break;
                }
            }

            if (!packedInSingleBox) {
                const largestBox = sortedBoxes[sortedBoxes.length - 1];
                const netW = largestBox.Width - 5;
                const netD = largestBox.Depth - 5;
                const netH = largestBox.Height - 3;

                const remainingUnits = packSingleBox(units, netW, netH, netD, largestBox.maxWeight);
                if (remainingUnits.length === units.length) {
                    bestCombo.push(largestBox);
                    units.shift();
                } else {
                    bestCombo.push(largestBox);
                    units = remainingUnits;
                }
            }
        }

        let finalBoxWeight = 0;
        let selectedBoxInfo = [];
        for (let box of bestCombo) {
            finalBoxWeight += box.emptyWeight;
            selectedBoxInfo.push({ id: box.Id, name: box.BoxName, cost: box.cost });
        }

        const overallTotalWeight = totalWeight + finalBoxWeight;
        const cargoBarcode = 'CRG-' + orderId + '-' + Date.now().toString().slice(-4);

        await db.query(`
            UPDATE orders 
            SET OrderStatus = ?, CargoBarcode = ?, TotalWeight = ?, packaging_info = ? 
            WHERE Id = ?
        `, [toPrismaStatus('Onaylandı'), cargoBarcode, overallTotalWeight, JSON.stringify(selectedBoxInfo), orderId]);

        await notifyCustomerOrderStatus(orderId, 'Onaylandı');

        await logActivity(req.user?.id, 'UPDATE', 'orders', orderId, `Sipariş onaylandı ve kargo ataması yapıldı: ${cargoBarcode}`);
        res.json({ success: true, message: 'Sipariş onaylandı ve kargo ataması yapıldı.', cargoBarcode, boxes: selectedBoxInfo });

    } catch (err) {
        console.error('Sipariş onay hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + err.message });
    }
});

// ===========================
// [GET] Kargo Barkodu İle Sipariş Arama
// ===========================
router.get('/by-cargo/:barcode', authMiddleware, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, c.CustomerName, c.Email as CustomerEmail, c.Phone as CustomerPhone, c.Address as CustomerAddress
            FROM orders o
            LEFT JOIN customers c ON o.CustomerId = c.Id
            WHERE o.CargoBarcode = ?
        `, [req.params.barcode]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Bu barkoda ait sipariş bulunamadı.' });
        }

        const order = orders[0];
        const [items] = await db.query(`
            SELECT oi.*, p.ProductName, 
                   (SELECT JSON_ARRAYAGG(pb.barcode) FROM product_barcodes pb WHERE pb.product_id = p.Id) as ProductCode
            FROM orderitems oi
            LEFT JOIN products p ON oi.ProductId = p.Id
            WHERE oi.OrderId = ?
        `, [order.Id]);

        const formattedOrder = {
            ...order,
            items: items.map(oi => ({
                ...oi,
                ProductCode: oi.ProductCode || '[]'
            }))
        };

        res.json({ success: true, data: formattedOrder });
    } catch (err) {
        console.error('Barkod ile arama hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});


// PUT /api/orders/:id/pack - Siparişi paketle
router.put('/:id/pack', authMiddleware, checkPermission('order_ship'), async (req, res) => {
    const { BoxId, TrackingNumber } = req.body;
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    try {
        await db.query(`
            UPDATE orders SET BoxId = ?, TrackingNumber = ?, OrderStatus = ?, CargoStatus = 'Transfer Merkezine Gidiyor' 
            WHERE Id = ?
        `, [BoxId ? Number(BoxId) : null, TrackingNumber || null, toPrismaStatus('Kargoya Verildi'), orderId]);

        await logActivity(req.user?.id, 'UPDATE', 'orders', req.params.id, `Sipariş paketlendi ve kargoya verildi. Takip: ${TrackingNumber}`);
        res.json({ success: true, message: 'Paketleme tamamlandı, sipariş kargoya verildi.' });
    } catch (err) {
        console.error('Paketleme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/orders/webhook/kargo
router.post('/webhook/kargo', async (req, res) => {
    const { trackingNumber, status, subStatus } = req.body;
    if (!trackingNumber) return res.status(400).json({ success: false, message: 'TrackingNumber gerekli' });

    try {
        if (status === 'DELIVERED' || status === 'Teslim Edildi') {
            await db.query('UPDATE orders SET OrderStatus = ?, CargoStatus = ? WHERE TrackingNumber = ?', [toPrismaStatus('Teslim Edildi'), 'Teslim Edildi', trackingNumber]);
            const [oRows] = await db.query('SELECT Id FROM orders WHERE TrackingNumber = ? LIMIT 1', [trackingNumber]);
            if (oRows.length > 0) {
                await notifyCustomerOrderStatus(oRows[0].Id, 'Teslim Edildi');
            }
        } else {
            await db.query('UPDATE orders SET CargoStatus = ? WHERE TrackingNumber = ?', [subStatus || status, trackingNumber]);
        }
        res.json({ success: true, message: 'Kargo durumu güncellendi.' });
    } catch (err) {
        console.error('Webhook hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/orders/public/checkout
router.post('/public/checkout', async (req, res) => {
    const { session_id, shippingAddress, customerInfo, paymentMethod, shipperId, items, couponCode } = req.body;

    if (!session_id || !shippingAddress || !customerInfo || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Geçersiz veya eksik parametre.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');

        let totalAmount = 0;
        let validatedItems = [];

        await conn.query('DELETE FROM cart_reservations WHERE expires_at < NOW()');

        for (const item of items) {
            const [products] = await conn.query('SELECT * FROM products WHERE Id = ?', [parseInt(item.Id)]);
            const product = products[0];

            if (!product || !product.is_active) {
                await conn.query('ROLLBACK');
                conn.release();
                return res.status(400).json({ success: false, message: `"${product ? product.ProductName : 'Bilinmeyen'}" adlı ürün satışa kapalıdır.` });
            }

            const qty = Number(item.quantity);
            if (!Number.isInteger(qty) || qty < 1 || qty > 1000000) {
                await conn.query('ROLLBACK');
                conn.release();
                return res.status(400).json({ success: false, message: `Geçersiz miktar.` });
            }

            const [wmsStockRes] = await conn.query('SELECT SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ?', [parseInt(item.Id)]);
            const wmsStock = wmsStockRes.length > 0 && wmsStockRes[0].qty !== null ? Number(wmsStockRes[0].qty) : product.StockQuantity;

            const [otherReservations] = await conn.query('SELECT SUM(quantity) as sum_qty FROM cart_reservations WHERE product_id = ? AND session_id != ? AND expires_at > NOW()', [parseInt(item.Id), session_id]);
            const otherReservedAmount = otherReservations.length > 0 ? Number(otherReservations[0].sum_qty) || 0 : 0;

            const [unpickedOrders] = await conn.query(`
                SELECT SUM(oi.Quantity) as sum_qty 
                FROM orderitems oi JOIN orders o ON oi.OrderId = o.Id 
                WHERE oi.ProductId = ? AND o.OrderStatus IN ('Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Toplamada', 'İptal Bekliyor')
            `, [parseInt(item.Id)]);
            const unpickedAmount = unpickedOrders.length > 0 ? Number(unpickedOrders[0].sum_qty) || 0 : 0;

            const realAvailableStock = wmsStock - otherReservedAmount - unpickedAmount;

            if (realAvailableStock < item.quantity) {
                await conn.query('ROLLBACK');
                conn.release();
                return res.status(400).json({ success: false, message: `"${product.ProductName}" adlı üründen yeterli stok yok. Mevcut Stok: ${realAvailableStock}` });
            }

            const dbPrice = parseFloat(product.SalePrice || product.PurchasePrice) || 0;
            totalAmount += (qty * dbPrice);

            validatedItems.push({
                productId: product.Id,
                quantity: qty,
                unitPrice: dbPrice,
                productInfo: {
                    ProductName: product.ProductName,
                    supply_type: product.supply_type,
                    Category: product.Category
                }
            });
        }

        let totalDiscount = 0;
        let appliedCampaignNames = [];

        if (couponCode && typeof couponCode === 'string' && couponCode.trim().length > 0) {
            try {
                const [coupons] = await conn.query(
                    `SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (end_date IS NULL OR end_date >= CURDATE())`,
                    [couponCode.trim()]
                );
                if (coupons.length > 0) {
                    const coupon = coupons[0];
                    if (!coupon.usage_limit || coupon.used_count < coupon.usage_limit) {
                        const baseTotal = validatedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                        if (!coupon.minimum_order_amount || baseTotal >= parseFloat(coupon.minimum_order_amount)) {
                            if (coupon.discount_type === 'Percentage') {
                                totalDiscount = baseTotal * (parseFloat(coupon.discount_value) / 100);
                                if (coupon.maximum_discount_amount) {
                                    totalDiscount = Math.min(totalDiscount, parseFloat(coupon.maximum_discount_amount));
                                }
                            } else if (coupon.discount_type === 'FixedAmount') {
                                totalDiscount = parseFloat(coupon.discount_value);
                            }
                            totalDiscount = Math.min(totalDiscount, baseTotal);
                            appliedCampaignNames.push(coupon.code);
                            await conn.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
                        }
                    }
                }
            } catch (couponErr) {
                console.error('Kupon doğrulama hatası:', couponErr);
            }
        }

        const shippingCost = totalAmount >= 2000 ? 0 : 50;
        totalAmount = totalAmount + shippingCost - totalDiscount;

        let customerId = null;

        // GÜVENLİK: Eğer Authorization başlığında müşteri token'ı varsa doğrula (IDOR Koruması)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
                if (decoded && decoded.role === 'customer' && decoded.id) {
                    customerId = decoded.id;
                }
            } catch (err) {
                // Token geçersizse misafir akışına geç
                customerId = null;
            }
        }

        // Token yoksa veya misafir siparişi ise:
        // GÜVENLİK: Şifreli ve doğrulanmış gerçek müşteri hesaplarına izinsiz sipariş enjeksiyonunu engelle.
        // Yalnızca şifresiz (misafir) kayıtlar eşleştirilir; aksi halde izole yeni bir misafir müşteri kaydı açılır.
        if (!customerId) {
            const [existingCust] = await conn.query(
                'SELECT Id FROM customers WHERE CustomerName = ? AND Phone = ? AND (Password IS NULL OR Password = "") LIMIT 1', 
                [customerInfo.name, customerInfo.phone || '']
            );
            if (existingCust.length > 0) {
                customerId = existingCust[0].Id;
            } else {
                const [insertCust] = await conn.query(`
                    INSERT INTO customers (CustomerName, Email, Phone, Address, CustomerType, IsVerified) 
                    VALUES (?, ?, ?, ?, 'Bireysel', false)
                `, [customerInfo.name, customerInfo.email || '', customerInfo.phone || '', shippingAddress]);
                customerId = insertCust.insertId;
            }
        }

        const crypto = require('crypto');
        const orderNumber = `WSIP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const [insertOrder] = await conn.query(`
            INSERT INTO orders (CustomerId, OrderNumber, OrderStatus, TotalAmount, ShippingAddress, OrderDate, PaymentMethod, ShipperId, DiscountAmount, CampaignName)
            VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
        `, [customerId, orderNumber, toPrismaStatus('Beklemede'), totalAmount, shippingAddress, paymentMethod || 'Web (Kredi Kartı)', shipperId ? Number(shipperId) : null, totalDiscount, appliedCampaignNames.length > 0 ? appliedCampaignNames.join(', ') : null]);

        const orderId = insertOrder.insertId;

        await conn.query(`
            INSERT INTO finance_transactions (type, amount, category, description, transaction_date)
            VALUES ('GELİR', ?, 'Web Siparişi', ?, NOW())
        `, [totalAmount, `Sipariş Geliri (${orderNumber}) - Ödeme: ${paymentMethod || 'Kredi Kartı'}`]);

        for (const item of validatedItems) {
            await conn.query(`
                INSERT INTO orderitems (OrderId, ProductId, Quantity, UnitPrice) VALUES (?, ?, ?, ?)
            `, [orderId, item.productId, item.quantity, item.unitPrice]);

            const [currentStockAggr] = await conn.query('SELECT SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ?', [item.productId]);
            const currentStock = Number(currentStockAggr[0].qty) || 0;

            if (item.quantity > currentStock) {
                const missingQty = item.quantity - currentStock;
                const reason = `Web Siparişi (${orderNumber}) için stok yetersizliğinden oluşturuldu. Sipariş Edilen: ${item.quantity}, Mevcut: ${currentStock}, Eksik: ${missingQty}`;

                if (item.productInfo.supply_type === 'MANUFACTURE') {
                    await conn.query(`
                        INSERT INTO production_requests (product_id, requested_quantity, source, creator, reason, priority, status, created_at)
                        VALUES (?, ?, 'Web Siparişi', 'Sistem Otomasyonu', ?, 'Acil', 'Bekliyor', NOW())
                    `, [item.productId, missingQty, reason]);
                } else if (item.productInfo.supply_type === 'PURCHASE' || item.productInfo.supply_type === 'OUTSOURCED' || item.productInfo.Category === 'Hammadde') {
                    await conn.query(`
                        INSERT INTO purchase_requests (product_name, quantity, description, status)
                        VALUES (?, ?, ?, 'Bekliyor')
                    `, [item.productInfo.ProductName, missingQty, reason]);
                }
            }

            await conn.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [item.quantity, item.productId]);
        }

        await conn.query('DELETE FROM cart_reservations WHERE session_id = ?', [session_id]);

        await conn.query('COMMIT');
        conn.release();

        res.json({ success: true, message: 'Sipariş başarıyla oluşturuldu.', orderNumber: orderNumber });
    } catch (error) {
        if (conn) { await conn.query('ROLLBACK'); conn.release(); }
        console.error('Web siparişi oluşturulurken hata:', error);
        res.status(500).json({ success: false, message: 'Sipariş oluşturulamadı.' });
    }
});

// GET /api/orders/returns - İade ve talepleri getir (Admin)
router.get('/returns', authMiddleware, checkPermission('view_orders'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, 
                   c.Id as c_Id, c.CustomerName, c.Email, c.Phone,
                   o.Id as o_Id, o.OrderNumber, o.TotalAmount, o.OrderDate
            FROM order_returns r
            LEFT JOIN customers c ON r.customer_id = c.Id
            LEFT JOIN orders o ON r.order_id = o.Id
            ORDER BY r.created_at DESC
        `);

        const returns = rows.map(row => {
            const ret = { ...row };
            delete ret.c_Id; delete ret.CustomerName; delete ret.Email; delete ret.Phone;
            delete ret.o_Id; delete ret.OrderNumber; delete ret.TotalAmount; delete ret.OrderDate;

            if (row.c_Id) {
                ret.customers = { Id: row.c_Id, CustomerName: row.CustomerName, Email: row.Email, Phone: row.Phone };
            }
            if (row.o_Id) {
                ret.orders = { Id: row.o_Id, OrderNumber: row.OrderNumber, TotalAmount: row.TotalAmount, OrderDate: row.OrderDate };
            }
            return ret;
        });

        for (const ret of returns) {
            if (ret.items_json) {
                try {
                    let items = typeof ret.items_json === 'string' ? JSON.parse(ret.items_json) : ret.items_json;
                    for (const item of items) {
                        const productId = item.product_id || item.ProductId;
                        if (!item.image_path && productId) {
                            const [prod] = await db.query('SELECT ImagePath FROM products WHERE Id = ?', [productId]);
                            if (prod.length > 0) item.image_path = prod[0].ImagePath;
                        }
                    }
                    ret.items_json = JSON.stringify(items);
                } catch (e) { }
            }
        }

        res.json({ success: true, returns });
    } catch (error) {
        console.error('İade talepleri getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'İade talepleri yüklenemedi.' });
    }
});

// PUT /api/orders/returns/:id - İade talebi durumunu güncelle (Admin)
router.put('/returns/:id', authMiddleware, checkPermission('edit_orders'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz İade/Talep ID.' });
        const { status } = req.body;

        const [returnRows] = await db.query('SELECT * FROM order_returns WHERE id = ?', [id]);
        const returnRequest = returnRows.length > 0 ? returnRows[0] : null;

        if (!returnRequest) return res.status(404).json({ success: false, message: 'Talep bulunamadı.' });

        if (returnRequest.request_type === 'iptal' || returnRequest.request_type === 'iade') {
            const orderId = returnRequest.order_id;

            if (status === 'Onaylandı') {
                let cancelledItems = [];
                try {
                    cancelledItems = typeof returnRequest.items_json === 'string' ? JSON.parse(returnRequest.items_json) : (returnRequest.items_json || []);
                    if (!Array.isArray(cancelledItems)) cancelledItems = [];
                } catch (e) { }

                const [orders] = await db.query('SELECT * FROM orders WHERE Id = ?', [orderId]);
                const order = orders[0];
                const [orderitems] = await db.query('SELECT * FROM orderitems WHERE OrderId = ?', [orderId]);

                if (order && cancelledItems.length > 0) {
                    let totalCancelledAmount = 0;
                    let allItemsCancelled = true;

                    for (const oItem of orderitems) {
                        const cancelItem = cancelledItems.find(c => Number(c.product_id || c.ProductId) === Number(oItem.ProductId));
                        if (!cancelItem) {
                            allItemsCancelled = false;
                            continue;
                        }

                        const cancelQty = Number(cancelItem.quantity) || oItem.Quantity;
                        const cancelPrice = Number(cancelItem.price) || oItem.UnitPrice;

                        const unpickedStatuses = ['Beklemede', 'Onaylandı', 'Toplamada', 'Hazırlanıyor', 'İptal Bekliyor'];
                        const isPicked = !unpickedStatuses.includes(order.OrderStatus);

                        if (isPicked) {
                            await db.query(`
                                INSERT INTO stockmovements (ProductId, MovementType, Quantity, MovementDate, Description, warehouse_id)
                                VALUES (?, 'IN', ?, NOW(), ?, 1)
                            `, [oItem.ProductId, cancelQty, `Talep Onayı (#${order.OrderNumber}) için stok girişi.`]);

                            const [existingBalance] = await db.query('SELECT * FROM wms_stock_balances WHERE product_id = ? AND warehouse_id = 1 LIMIT 1', [oItem.ProductId]);

                            if (existingBalance.length > 0) {
                                await db.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [cancelQty, existingBalance[0].id]);
                            } else {
                                await db.query(`
                                    INSERT INTO wms_stock_balances (product_id, warehouse_id, quantity, batch_number)
                                    VALUES (?, 1, ?, 'IADE/IPTAL')
                                `, [oItem.ProductId, cancelQty]);
                            }
                        }

                        totalCancelledAmount += (cancelQty * cancelPrice);

                        if (cancelQty >= oItem.Quantity) {
                            await db.query('DELETE FROM orderitems WHERE Id = ?', [oItem.Id]);
                        } else {
                            allItemsCancelled = false;
                            await db.query('UPDATE orderitems SET Quantity = Quantity - ? WHERE Id = ?', [cancelQty, oItem.Id]);
                        }
                    }

                    if (allItemsCancelled || orderitems.length === 0) {
                        await db.query('UPDATE orders SET OrderStatus = ? WHERE Id = ?', [toPrismaStatus('İptal Edildi'), orderId]);
                    } else {
                        await db.query('UPDATE orders SET OrderStatus = ?, TotalAmount = TotalAmount - ? WHERE Id = ?', [toPrismaStatus('Beklemede'), totalCancelledAmount, orderId]);
                    }
                }
            } else if (status === 'Reddedildi') {
                await db.query('UPDATE orders SET OrderStatus = ? WHERE Id = ?', [toPrismaStatus('Beklemede'), orderId]);
            }
        }

        await db.query('UPDATE order_returns SET status = ? WHERE id = ?', [status, parseInt(id)]);
        logActivity(req.user.id, 'UPDATE', 'order_returns', id, `İade/Talep güncellendi. Yeni Durum: ${status}`);

        res.json({ success: true, message: 'İade talebi güncellendi.' });
    } catch (error) {
        console.error('İade talebi güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'İade talebi güncellenemedi.' });
    }
});

router.get('/test-crash', async (req, res) => { try { const response = await fetch('http://localhost:5000/api/orders'); const text = await response.text(); res.send(text); } catch (e) { res.send(e.toString()); } });

module.exports = router;
