/**
 * ============================================================================
 * BİLEŞEN ADI: mobile
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { toFrontendStatus, toPrismaStatus } = require('../utils/enumMapper');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');
const { notifyCustomerOrderStatus } = require('../utils/orderNotifier');

function sortLocation(a, b) {
    const locA = a.Location ? String(a.Location) : '';
    const locB = b.Location ? String(b.Location) : '';
    if (!locA && !locB) return 0;
    if (!locA) return 1;
    if (!locB) return -1;
    return locA.localeCompare(locB, undefined, { numeric: true, sensitivity: 'base' });
}

async function getOrderItemsWithRoute(orderId) {
    const [rawItems] = await db.query(`
        SELECT oi.*, p.Id as p_Id, p.ProductName, p.Weight, p.Width, p.Height, p.Depth, p.Volume, p.ImagePath, p.Location,
               (SELECT JSON_ARRAYAGG(pb.barcode) FROM product_barcodes pb WHERE pb.product_id = p.Id) as Barcode
        FROM orderitems oi
        LEFT JOIN products p ON oi.ProductId = p.Id
        WHERE oi.OrderId = ?
    `, [orderId]);

    if (!rawItems || rawItems.length === 0) return [];

    // PERFORMANS OPTİMİZASYONU: N+1 veritabanı döngüsünü engelle.
    // Siparişteki tüm ürünlerin stoklarını tek bir SQL batch sorgusunda çekip hafızada grupla.
    const productIds = [...new Set(rawItems.map(i => i.p_Id).filter(Boolean))];
    const stocksByProduct = {};

    if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        const [allStocks] = await db.query(`
            SELECT * FROM wms_stock_balances 
            WHERE product_id IN (${placeholders}) AND quantity > 0 
            ORDER BY expiration_date ASC, id ASC
        `, productIds);

        for (const stock of allStocks) {
            if (!stocksByProduct[stock.product_id]) {
                stocksByProduct[stock.product_id] = [];
            }
            stocksByProduct[stock.product_id].push({
                ...stock,
                availableQty: Number(stock.quantity)
            });
        }
    }

    let routeSteps = [];

    for (const item of rawItems) {
        let remainingQty = item.Quantity;
        if (!item.p_Id) continue;

        const stocks = stocksByProduct[item.p_Id] || [];

        for (const stock of stocks) {
            if (remainingQty <= 0) break;
            if (stock.availableQty <= 0) continue;
            const takeQty = Math.min(remainingQty, stock.availableQty);
            stock.availableQty -= takeQty;
            remainingQty -= takeQty;

            routeSteps.push({
                OrderItemId: item.Id,
                Quantity: takeQty,
                ProductId: item.p_Id,
                ProductName: item.ProductName,
                Barcode: item.Barcode || '[]',
                Weight: item.Weight,
                Width: item.Width,
                Height: item.Height,
                Depth: item.Depth,
                Volume: item.Volume,
                ImagePath: item.ImagePath,
                DefaultLocation: item.Location,
                Location: stock.shelf_code,
                StockBalanceId: stock.id
            });
        }

        if (remainingQty > 0) {
            routeSteps.push({
                OrderItemId: item.Id,
                Quantity: remainingQty,
                ProductId: item.p_Id,
                ProductName: item.ProductName,
                Barcode: item.Barcode || '[]',
                Weight: item.Weight,
                Width: item.Width,
                Height: item.Height,
                Depth: item.Depth,
                Volume: item.Volume,
                ImagePath: item.ImagePath,
                DefaultLocation: item.Location,
                Location: item.Location || 'Raf Belirsiz'
            });
        }
    }

    routeSteps.sort(sortLocation);
    return routeSteps;
}

// GET: Onaylanmış siparişlerin listesini al
router.get('/orders/pending', authMiddleware, checkPermission('view_wms'), async (req, res) => {
    try {
        const userId = req.user?.id;
        
        const [orders] = await db.query(`
            SELECT o.Id, o.OrderNumber, o.OrderStatus, s.CompanyName as CargoCompanyName
            FROM orders o
            LEFT JOIN shippers s ON o.ShipperId = s.Id
            WHERE (o.OrderStatus = 'Onaylandı' AND o.PickerId IS NULL)
               OR (o.OrderStatus = 'Hazırlanıyor' AND o.PickerId = ?)
               OR (o.OrderStatus = 'Onayland_' AND o.PickerId IS NULL)
               OR (o.OrderStatus = 'Haz_rlan_yor' AND o.PickerId = ?)
        `, [userId, userId]);
        
        const formattedOrders = orders.map(o => ({
            Id: o.Id,
            OrderNumber: o.OrderNumber,
            CargoCompanyName: o.CargoCompanyName || null,
            IsMyOngoing: toFrontendStatus(o.OrderStatus) === 'Hazırlanıyor' ? 1 : 0
        })).sort((a, b) => b.IsMyOngoing - a.IsMyOngoing || a.Id - b.Id);
        
        res.json({ success: true, data: formattedOrders });
    } catch (error) {
        console.error('Bekleyen siparişleri alma hatası:', error);
        res.status(500).json({ success: false, message: 'Siparişler getirilemedi.' });
    }
});

// POST: Belirli bir siparişi al (atama)
router.post('/orders/assign/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');

        const [orders] = await conn.query(`
            SELECT * FROM orders 
            WHERE Id = ? AND (
                (OrderStatus IN ('Onaylandı', 'Onayland_') AND PickerId IS NULL) OR 
                (OrderStatus IN ('Hazırlanıyor', 'Haz_rlan_yor') AND PickerId = ?)
            ) FOR UPDATE
        `, [id, userId]);

        if (orders.length === 0) {
            await conn.query('ROLLBACK');
            conn.release();
            return res.json({ success: false, message: 'Bu sipariş zaten alınmış veya bulunamıyor.' });
        }

        const { cart_barcode, section_barcodes } = req.body;
        let cartId = null;
        let cartSectionIds = null;

        if (section_barcodes && Array.isArray(section_barcodes) && section_barcodes.length > 0) {
            if (section_barcodes.length === 1 && section_barcodes[0] === 'ELDEN_TESLIM') {
                // Arabasız toplama durumu
            } else {
                const [sections] = await conn.query(`
                    SELECT s.*, c.is_active, c.barcode as cartBarcode, c.status as cartStatus 
                    FROM picking_cart_sections s
                    JOIN picking_carts c ON s.cart_id = c.id
                    WHERE s.barcode IN (?)
                `, [section_barcodes]);

                if (sections.length !== section_barcodes.length) {
                    await conn.query('ROLLBACK');
                    conn.release();
                    return res.status(400).json({ success: false, message: 'Bazı bölüm barkodları bulunamadı veya geçersiz.' });
                }

                const firstCartId = sections[0].cart_id;
                const allSameCart = sections.every(s => s.cart_id === firstCartId);
                
                if (!allSameCart) {
                    await conn.query('ROLLBACK');
                    conn.release();
                    return res.status(400).json({ success: false, message: 'Seçilen bölümler aynı taşıma arabasına ait olmalıdır.' });
                }

                if (!sections[0].is_active) {
                    await conn.query('ROLLBACK');
                    conn.release();
                    return res.status(400).json({ success: false, message: 'Bu taşıma arabası aktif değil.' });
                }

                if (cart_barcode && sections[0].cartBarcode !== cart_barcode) {
                    await conn.query('ROLLBACK');
                    conn.release();
                    return res.status(400).json({ success: false, message: 'Bölümler belirtilen taşıma arabasına ait değil.' });
                }

                cartId = firstCartId;
                const sectionIdsArr = sections.map(s => s.id);
                cartSectionIds = JSON.stringify(sectionIdsArr);

                const [activeOrders] = await conn.query(`
                    SELECT Id, OrderNumber, CartSectionIds FROM orders 
                    WHERE CartId = ? AND OrderStatus IN ('Hazırlanıyor', 'Haz_rlan_yor', 'Toplamada', 'Hazır', 'Haz_r')
                `, [firstCartId]);

                for (const activeOrder of activeOrders) {
                    if (activeOrder.Id === id) continue;
                    let activeSecIds = [];
                    try { activeSecIds = JSON.parse(activeOrder.CartSectionIds) || []; } catch(e){}
                    if (Array.isArray(activeSecIds)) {
                        for (const sec of sections) {
                            if (activeSecIds.includes(sec.id)) {
                                await conn.query('ROLLBACK');
                                conn.release();
                                return res.status(400).json({ 
                                    success: false, 
                                    message: `Bu bölüm zaten Sipariş #${activeOrder.OrderNumber || activeOrder.Id} için kullanılıyor. Lütfen başka bir bölüm seçin.` 
                                });
                            }
                        }
                    }
                }

                if (sections[0].cartStatus === 'IDLE') {
                    await conn.query('UPDATE picking_carts SET status = ? WHERE id = ?', ['PICKING', firstCartId]);
                }
            }
        }

        let updates = ['OrderStatus = "Hazırlanıyor"', 'PickerId = ?'];
        let params = [userId];

        if (cartId !== null) {
            updates.push('CartId = ?', 'CartSectionIds = ?');
            params.push(cartId, cartSectionIds);
        }
        params.push(id);

        await conn.query(`UPDATE orders SET ${updates.join(', ')} WHERE Id = ?`, params);
        await conn.query('COMMIT');
        conn.release();

        await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişi toplamaya başladı.`, null);

        const [finalOrderRows] = await db.query(`
            SELECT o.*, c.CustomerName 
            FROM orders o LEFT JOIN customers c ON o.CustomerId = c.Id WHERE o.Id = ?
        `, [id]);
        
        if (finalOrderRows.length > 0 && typeof finalOrderRows[0].CartSectionIds === 'string') {
            try { finalOrderRows[0].CartSectionIds = JSON.parse(finalOrderRows[0].CartSectionIds); } catch(e){}
        }

        const items = await getOrderItemsWithRoute(id);

        res.json({
            success: true,
            message: 'Sipariş başarıyla atandı.',
            order: finalOrderRows[0],
            items: items
        });

    } catch (error) {
        if(conn) { await conn.query('ROLLBACK'); conn.release(); }
        console.error('Sipariş atama hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş atanamadı.' });
    }
});

// POST: Siparişe yeni bölüm (raf) ekle
router.post('/orders/:id/add-section', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    const userId = req.user?.id;
    const { section_barcode } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });
    if (!section_barcode) return res.status(400).json({ success: false, message: 'Bölüm barkodu gerekli.' });

    try {
        const [orders] = await db.query('SELECT * FROM orders WHERE Id = ?', [id]);
        const order = orders[0];

        if (!order || order.PickerId !== userId || (order.OrderStatus !== 'Hazırlanıyor' && order.OrderStatus !== 'Haz_rlan_yor')) {
            if (order && order.PickerId && order.PickerId !== userId) {
                await db.query('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
                const authMiddlewareLocal = require('../middleware/auth');
                authMiddlewareLocal.clearAuthCache(userId);
                return res.status(403).json({ success: false, message: 'Şüpheli işlem tespit edildi. Güvenlik ihlali nedeniyle hesabınız askıya alındı.' });
            }
            return res.json({ success: false, message: 'Sipariş size atanmamış veya durumu uygun değil.' });
        }
        if (!order.CartId) {
            return res.json({ success: false, message: 'Bu sipariş henüz bir taşıma arabasına atanmamış.' });
        }

        const [sections] = await db.query('SELECT * FROM picking_cart_sections WHERE cart_id = ? AND barcode = ?', [order.CartId, section_barcode]);
        const section = sections[0];

        if (!section) {
            return res.json({ success: false, message: 'Bu bölüm, bulunduğunuz arabaya ait değil veya bulunamadı.' });
        }

        const [activeOrdersInCart] = await db.query(`
            SELECT Id, OrderNumber, CartSectionIds FROM orders 
            WHERE CartId = ? AND OrderStatus IN ('Hazırlanıyor', 'Haz_rlan_yor', 'Toplamada', 'Hazır', 'Haz_r')
        `, [order.CartId]);

        for (const activeOrder of activeOrdersInCart) {
            if (activeOrder.Id === id) continue;
            let activeSecIds = [];
            try { activeSecIds = JSON.parse(activeOrder.CartSectionIds) || []; } catch(e){}
            if (Array.isArray(activeSecIds) && activeSecIds.includes(section.id)) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Bu bölüm zaten Sipariş #${activeOrder.OrderNumber || activeOrder.Id} için kullanılıyor.` 
                });
            }
        }

        let currentSections = [];
        try { currentSections = JSON.parse(order.CartSectionIds) || []; } catch(e){}
        if (!Array.isArray(currentSections)) currentSections = [];
        
        if (!currentSections.includes(section.id)) {
            currentSections.push(section.id);
            await db.query('UPDATE orders SET CartSectionIds = ? WHERE Id = ?', [JSON.stringify(currentSections), id]);
        }

        res.json({
            success: true,
            message: 'Bölüm siparişe başarıyla eklendi.',
            section: section,
            cartSectionIds: currentSections
        });

    } catch (error) {
        console.error('Bölüm ekleme hatası:', error);
        res.status(500).json({ success: false, message: 'Bölüm eklenemedi.' });
    }
});

// GET: Sonraki rastgele siparişi al
router.get('/orders/next', authMiddleware, checkPermission('view_wms'), async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });

    try {
        const [existingOrders] = await db.query(`
            SELECT o.*, c.CustomerName 
            FROM orders o LEFT JOIN customers c ON o.CustomerId = c.Id 
            WHERE o.OrderStatus IN ('Hazırlanıyor', 'Haz_rlan_yor') AND o.PickerId = ? LIMIT 1
        `, [userId]);

        let order = existingOrders[0];

        if (!order) {
            let assignedOrder = null;
            let attempts = 0;
            
            while (!assignedOrder && attempts < 5) {
                attempts++;
                const [availableOrders] = await db.query(`
                    SELECT Id FROM orders 
                    WHERE OrderStatus IN ('Onaylandı', 'Onayland_') AND PickerId IS NULL 
                    ORDER BY Id ASC LIMIT 1
                `);
                
                if (availableOrders.length === 0) {
                    return res.json({ success: false, message: 'Şu an toplanacak boşta sipariş bulunmuyor.' });
                }
                
                const availableOrderId = availableOrders[0].Id;
                
                const [updateResult] = await db.query(`
                    UPDATE orders SET OrderStatus = 'Hazırlanıyor', PickerId = ? 
                    WHERE Id = ? AND OrderStatus IN ('Onaylandı', 'Onayland_') AND PickerId IS NULL
                `, [userId, availableOrderId]);
                
                if (updateResult.affectedRows > 0) {
                    assignedOrder = availableOrderId;
                }
            }

            if (!assignedOrder) {
                return res.json({ success: false, message: 'Sistem şu an çok yoğun, lütfen tekrar deneyin.' });
            }

            const [assignedRows] = await db.query(`
                SELECT o.*, c.CustomerName 
                FROM orders o LEFT JOIN customers c ON o.CustomerId = c.Id WHERE o.Id = ?
            `, [assignedOrder]);
            order = assignedRows[0];

            await logActivity(userId, 'UPDATE', 'orders', order.Id, `Mobil uygulama "Sıradakini Al" butonu ile #${order.Id} numaralı siparişi toplamaya başladı.`, null);
        }

        if (typeof order.CartSectionIds === 'string') {
            try { order.CartSectionIds = JSON.parse(order.CartSectionIds); } catch(e){}
        }

        const items = await getOrderItemsWithRoute(order.Id);

        res.json({
            success: true,
            order: order,
            items: items
        });
    } catch (error) {
        console.error('Mobil sipariş alma hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş getirilemedi.' });
    }
});

// POST: Toplama işlemini iptal et (Geri Dön)
router.post('/orders/cancel/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    if (isNaN(id) || !userId) return res.status(400).json({ success: false, message: 'Geçersiz veri.' });

    try {
        const [updateResult] = await db.query(`
            UPDATE orders SET OrderStatus = 'Onaylandı', PickerId = NULL 
            WHERE Id = ? AND PickerId = ? AND OrderStatus IN ('Hazırlanıyor', 'Haz_rlan_yor')
        `, [id, userId]);

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'İptal edilemedi. Bu sipariş size atanmamış.' });
        }

        await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden toplama işlemini iptal etti.`, null);
        res.json({ success: true, message: 'Sipariş başarıyla iptal edildi ve geri alındı.' });
    } catch (error) {
        console.error('İptal hatası:', error);
        res.status(500).json({ success: false, message: 'İptal işlemi başarısız.' });
    }
});

// POST: Siparişi tamamla
router.post('/orders/complete/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    if (isNaN(id) || !userId) return res.status(400).json({ success: false, message: 'Geçersiz veri.' });

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');

        const [updateResult] = await conn.query(`
            UPDATE orders SET OrderStatus = 'Hazır', PickedDate = NOW() 
            WHERE Id = ? AND PickerId = ? AND OrderStatus IN ('Hazırlanıyor', 'Haz_rlan_yor')
        `, [id, userId]);

        if (updateResult.affectedRows === 0) {
            const [existing] = await conn.query('SELECT Id FROM orders WHERE Id = ? AND PickerId = ? AND OrderStatus IN ("Hazır", "Haz_r")', [id, userId]);
            if (existing.length > 0) {
                await conn.query('ROLLBACK');
                conn.release();
                return res.json({ success: true, message: 'Sipariş zaten başarıyla toplanmış.' });
            }
            throw new Error('Sipariş tamamlanamadı. Size atanmamış olabilir.');
        }

        const [orderItems] = await conn.query('SELECT * FROM orderitems WHERE OrderId = ?', [id]);

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
            `, [item.ProductId, item.Quantity, `Sipariş #${id} toplayıcı tarafından raftan toplandı.`]);
        }

        await conn.query('COMMIT');
        conn.release();

        await notifyCustomerOrderStatus(id, 'Toplandı');

        await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden siparişi topladı ve stoklar düşüldü.`, null);
        res.json({ success: true, message: 'Sipariş başarıyla toplandı ve ürünler stoktan düşüldü.' });

    } catch (error) {
        if(conn) { await conn.query('ROLLBACK'); conn.release(); }
        console.error('Mobil sipariş tamamlama hatası:', error);
        res.status(500).json({ success: false, message: error.message || 'Sipariş tamamlanamadı.' });
    }
});

// POST: Siparişi paketle (Kargo etiketini oluştur ve doğrula)
router.post('/orders/package/complete/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    const { scannedBarcode, boxBarcode } = req.body;
    
    if (isNaN(id) || !userId || !scannedBarcode) return res.status(400).json({ success: false, message: 'Geçersiz veya eksik veri.' });

    try {
        const [orders] = await db.query('SELECT ShippingAddress FROM orders WHERE Id = ?', [id]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });

        let boxId = null;
        if (boxBarcode) {
            const [barcodes] = await db.query('SELECT box_id FROM box_barcodes WHERE barcode = ?', [boxBarcode]);
            if (barcodes.length === 0) return res.status(400).json({ success: false, message: 'Geçersiz kutu barkodu okutuldu.' });
            boxId = barcodes[0].box_id;
        }

        const isEldenTeslim = orders[0].ShippingAddress === 'Elden Teslim';
        
        const [updateResult] = await db.query(`
            UPDATE orders SET OrderStatus = ?, CargoBarcode = ?, PackedDate = NOW() 
            WHERE Id = ? AND PackerId = ? AND OrderStatus = 'Paketleniyor'
        `, [isEldenTeslim ? 'Teslim Edildi' : 'Paketlendi', scannedBarcode, id, userId]);

        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Paketleme tamamlanamadı. Sipariş size atanmamış veya yanlış durumda.' });
        }

        if (boxId) {
            await db.query('UPDATE packaging_boxes SET StockQuantity = StockQuantity - 1 WHERE Id = ?', [boxId]);
            await logActivity(userId, 'UPDATE', 'orders', id, `Kargo barkodu: ${scannedBarcode}, Kutu: ${boxBarcode}`, null);
        } else {
            await logActivity(userId, 'UPDATE', 'orders', id, `Kutusuz (Elden Teslim) paketlendi. Barkod: ${scannedBarcode}`, null);
        }

        await notifyCustomerOrderStatus(id, isEldenTeslim ? 'Teslim Edildi' : 'Paketlendi');

        res.json({ success: true, message: 'Sipariş başarıyla paketlendi.' });

    } catch (error) {
        console.error('Paketleme tamamlama hatası:', error);
        res.status(500).json({ success: false, message: 'Paketleme tamamlanamadı.' });
    }
});

// POST: Kargoya Ver (Kargo Barkodu ile)
router.post('/orders/ship', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const { cargoBarcode } = req.body;
    const userId = req.user?.id;
    if (!userId || !cargoBarcode) return res.status(400).json({ success: false, message: 'Eksik veri.' });

    try {
        const [orders] = await db.query('SELECT * FROM orders WHERE CargoBarcode = ?', [cargoBarcode]);
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Bu barkoda ait sipariş bulunamadı.' });
        
        const order = orders[0];
        if (order.OrderStatus === 'Kargoya Verildi' || order.OrderStatus === 'Kargoya_Verildi') {
            return res.status(400).json({ success: false, message: 'Bu sipariş zaten kargoya verilmiş.' });
        }
        if (order.OrderStatus !== 'Paketlendi') {
            return res.status(400).json({ success: false, message: 'Bu sipariş henüz paketlenmemiş.' });
        }

        await db.query(`
            UPDATE orders SET OrderStatus = 'Kargoya Verildi', ShipUserId = ?, ShippedDate = NOW() 
            WHERE Id = ?
        `, [userId, order.Id]);

        await notifyCustomerOrderStatus(order.Id, 'Kargoya Verildi');

        await logActivity(userId, 'UPDATE', 'orders', order.Id, `Mobil kargo teslim: ${cargoBarcode}`, null);
        res.json({ success: true, message: 'Sipariş başarıyla kargoya verildi.', orderId: order.Id, orderNumber: order.OrderNumber });

    } catch (error) {
        console.error('Kargoya verme hatası:', error);
        res.status(500).json({ success: false, message: 'Kargoya verme başarısız oldu.' });
    }
});

// GET: İstatistikler (Liderlik Tablosu) - Filtreli
router.get('/stats', authMiddleware, checkPermission('view_wms'), async (req, res) => {
    const range = req.query.range || 'daily';
    try {
        let queryStr = `
            SELECT u.id as UserId, u.name as UserName, COUNT(DISTINCT o.Id) as TotalOrdersPicked, COALESCE(SUM(oi.Quantity), 0) as TotalProductsPicked
            FROM users u JOIN orders o ON u.id = o.PickerId JOIN orderitems oi ON o.Id = oi.OrderId
            WHERE o.OrderStatus IN ('Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi', 'Kargoya_Verildi', 'Teslim_Edildi')
        `;

        if (range === 'weekly') {
            queryStr += " AND YEARWEEK(o.PickedDate, 1) = YEARWEEK(CURDATE(), 1)";
        } else if (range === 'monthly') {
            queryStr += " AND YEAR(o.PickedDate) = YEAR(CURDATE()) AND MONTH(o.PickedDate) = MONTH(CURDATE())";
        } else if (range === 'yearly') {
            queryStr += " AND YEAR(o.PickedDate) = YEAR(CURDATE())";
        } else {
            queryStr += " AND DATE(o.PickedDate) = CURDATE()";
        }
        queryStr += " GROUP BY u.id, u.name ORDER BY TotalProductsPicked DESC";

        const [stats] = await db.query(queryStr);
        const serializedStats = stats.map(s => ({
            ...s,
            TotalOrdersPicked: Number(s.TotalOrdersPicked),
            TotalProductsPicked: Number(s.TotalProductsPicked)
        }));

        res.json({ success: true, stats: serializedStats });
    } catch (error) {
        console.error('İstatistik getirme hatası:', error);
        res.status(500).json({ success: false, message: 'İstatistikler getirilemedi.' });
    }
});

// GET: Paketlenecek siparişleri (Hazır) listele veya Elden Teslim olanları getir
router.get('/orders/ready-for-packaging', authMiddleware, checkPermission('view_wms'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { searchQuery } = req.query;

        let queryStr = `
            SELECT o.*, c.CustomerName 
            FROM orders o LEFT JOIN customers c ON o.CustomerId = c.Id
            WHERE 
        `;
        let params = [];

        if (searchQuery && searchQuery.trim().length > 0) {
            queryStr += `
                (o.OrderNumber LIKE ? AND (
                    o.OrderStatus IN ('Hazır', 'Haz_r') OR 
                    (o.OrderStatus = 'Paketleniyor' AND o.PackerId = ?) OR 
                    o.ShippingAddress LIKE '%Elden Teslim%'
                ))
            `;
            params.push(`%${searchQuery.trim()}%`, userId);
        } else {
            queryStr += `
                (o.OrderStatus IN ('Hazır', 'Haz_r')) OR 
                (o.OrderStatus = 'Paketleniyor' AND o.PackerId = ?) OR 
                (o.ShippingAddress LIKE '%Elden Teslim%' AND o.OrderStatus IN ('Bekliyor', 'Beklemede', 'Hazır', 'Haz_r', 'Paketleniyor'))
            `;
            params.push(userId);
        }

        queryStr += " ORDER BY o.PickedDate ASC";
        const [orders] = await db.query(queryStr, params);

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Paketlenecek siparişleri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Siparişler getirilemedi.' });
    }
});

// POST: Paketleme görevini al (Assign)
router.post('/orders/package/assign/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    if (isNaN(id) || !userId) return res.status(400).json({ success: false, message: 'Geçersiz veri.' });

    try {
        const [updateResult] = await db.query(`
            UPDATE orders SET OrderStatus = 'Paketleniyor', PackerId = ? 
            WHERE Id = ? AND (
                (OrderStatus IN ('Hazır', 'Haz_r') AND PackerId IS NULL) OR 
                (OrderStatus = 'Paketleniyor' AND PackerId = ?)
            )
        `, [userId, id, userId]);

        if (updateResult.affectedRows === 0) {
            return res.json({ success: false, message: 'Bu sipariş başkası tarafından paketleniyor veya bulunamadı.' });
        }

        const [orders] = await db.query('SELECT o.*, c.CustomerName FROM orders o LEFT JOIN customers c ON o.CustomerId = c.Id WHERE o.Id = ?', [id]);
        const items = await getOrderItemsWithRoute(id);
        
        res.json({ success: true, message: 'Paketleme görevi alındı.', order: orders[0], items: items });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Atama işlemi başarısız.' });
    }
});

// POST: Paketlemeyi iptal et (Geri bırak)
router.post('/orders/package/cancel/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    try {
        await db.query(`
            UPDATE orders SET OrderStatus = 'Hazır', PackerId = NULL 
            WHERE Id = ? AND PackerId = ? AND OrderStatus = 'Paketleniyor'
        `, [id, userId]);
        res.json({ success: true, message: 'Paketleme iptal edildi.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İptal işlemi başarısız.' });
    }
});

// POST: Arabayı paketlemeye gönder
router.post('/picking_carts/finish-picking', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const { cart_barcode } = req.body;
    if (!cart_barcode) return res.status(400).json({ success: false, message: 'Araba barkodu gerekli.' });

    try {
        const [updateResult] = await db.query('UPDATE picking_carts SET status = "READY_FOR_PACKAGING" WHERE barcode = ? AND is_active = 1', [cart_barcode]);
        if (updateResult.affectedRows === 0) return res.status(404).json({ success: false, message: 'Araba bulunamadı.' });
        res.json({ success: true, message: 'Taşıma arabası paketlemeye gönderildi.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İşlem başarısız.' });
    }
});

// POST: Arabanın tüm siparişleri paketlendi, arabayı boşa çıkar
router.post('/picking_carts/empty-cart', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const { cart_id } = req.body;
    if (!cart_id) return res.status(400).json({ success: false, message: 'Araba kimliği gerekli.' });

    try {
        const [updateResult] = await db.query('UPDATE picking_carts SET status = "IDLE" WHERE id = ?', [parseInt(cart_id)]);
        if (updateResult.affectedRows === 0) return res.status(404).json({ success: false, message: 'Araba bulunamadı.' });
        res.json({ success: true, message: 'Araba başarıyla boşaltıldı.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Araba boşaltılamadı.' });
    }
});

// GET: Paketleme için arabayı okut ve bölümleri/siparişleri getir
router.get('/picking_carts/scan-for-packaging', authMiddleware, checkPermission('view_wms'), async (req, res) => {
    const { cart_barcode } = req.query;
    if (!cart_barcode) return res.status(400).json({ success: false, message: 'Araba barkodu gerekli.' });

    try {
        let [carts] = await db.query('SELECT * FROM picking_carts WHERE barcode = ? AND is_active = 1', [cart_barcode]);
        let cart = carts.length > 0 ? carts[0] : null;

        if (!cart) {
            const [sections] = await db.query('SELECT cart_id FROM picking_cart_sections WHERE barcode = ?', [cart_barcode]);
            if (sections.length > 0) {
                const [c] = await db.query('SELECT * FROM picking_carts WHERE id = ? AND is_active = 1', [sections[0].cart_id]);
                if (c.length > 0) cart = c[0];
            }
        }

        if (!cart) return res.status(404).json({ success: false, message: 'Araba bulunamadı.' });

        const [cartSections] = await db.query('SELECT * FROM picking_cart_sections WHERE cart_id = ?', [cart.id]);
        const [orders] = await db.query('SELECT o.*, c.CustomerName FROM orders o LEFT JOIN customers c ON o.CustomerId = c.Id WHERE o.OrderStatus IN ("Hazır", "Haz_r") AND o.CartId = ?', [cart.id]);

        const orderGroups = {};
        orders.forEach(order => {
            let sectionIds = [];
            try { sectionIds = JSON.parse(order.CartSectionIds) || []; } catch(e){}
            if (!Array.isArray(sectionIds) || sectionIds.length === 0) return;
            
            const sortedIds = [...sectionIds].sort();
            const groupKey = sortedIds.join('_');
            
            if (!orderGroups[groupKey]) {
                orderGroups[groupKey] = { sectionIds: sortedIds, orders: [] };
            }
            orderGroups[groupKey].orders.push(order);
        });

        const mergedSections = [];
        const usedSectionIds = new Set();

        Object.values(orderGroups).forEach(group => {
            const groupSections = cartSections.filter(s => group.sectionIds.includes(s.id));
            if (groupSections.length > 0) {
                mergedSections.push({
                    id: group.sectionIds.join('_'),
                    section_name: groupSections.map(s => s.section_name).join(' + '),
                    barcode: groupSections.map(s => s.barcode).join(' + '),
                    orders: group.orders
                });
                group.sectionIds.forEach(id => usedSectionIds.add(id));
            }
        });

        cartSections.forEach(section => {
            if (!usedSectionIds.has(section.id)) {
                mergedSections.push({ ...section, orders: [] });
            }
        });

        res.json({ success: true, cart: { id: cart.id, name: cart.name, barcode: cart.barcode }, sections: mergedSections });
    } catch (error) {
        console.error('Araba okutma hatası:', error);
        res.status(500).json({ success: false, message: 'Araba bilgileri alınamadı.' });
    }
});

module.exports = router;
