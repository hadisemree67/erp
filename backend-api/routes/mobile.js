/*
 * ÖZET:
 * Bu modül, depo personelinin el terminalleri (mobil cihazlar) üzerinden sipariş 
 * toplama (picking), barkod okutma, sipariş atama ve kutu/kargo süreçlerini 
 * yönettiği API uç noktalarını barındırır.
 * (Prisma ORM ile yeniden yazılmıştır)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const db = require('../db');
const { toFrontendStatus, toPrismaStatus } = require('../utils/enumMapper');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');

function sortLocation(a, b) {
    const locA = a.Location ? String(a.Location) : '';
    const locB = b.Location ? String(b.Location) : '';
    if (!locA && !locB) return 0;
    if (!locA) return 1;
    if (!locB) return -1;
    return locA.localeCompare(locB, undefined, { numeric: true, sensitivity: 'base' });
}

async function getOrderItemsWithRoute(orderId) {
    const rawItems = await prisma.orderitems.findMany({
        where: { OrderId: orderId },
        include: { products: { include: { product_barcodes: true } } }
    });

    let routeSteps = [];

    for (const item of rawItems) {
        let remainingQty = item.Quantity;
        const product = item.products;
        if (!product) continue;

        const stocks = await prisma.wms_stock_balances.findMany({
            where: { product_id: product.Id, quantity: { gt: 0 } },
            orderBy: [{ expiration_date: 'asc' }, { id: 'asc' }]
        });

        for (const stock of stocks) {
            if (remainingQty <= 0) break;
            const takeQty = Math.min(remainingQty, Number(stock.quantity));
            remainingQty -= takeQty;

            routeSteps.push({
                OrderItemId: item.Id,
                Quantity: takeQty,
                ProductId: product.Id,
                ProductName: product.ProductName,
                Barcode: product.product_barcodes ? JSON.stringify(product.product_barcodes.map(pb => pb.barcode)) : '[]',
                Weight: product.Weight,
                ImagePath: product.ImagePath,
                DefaultLocation: product.Location,
                Location: stock.shelf_code,
                StockBalanceId: stock.id
            });
        }

        if (remainingQty > 0) {
            routeSteps.push({
                OrderItemId: item.Id,
                Quantity: remainingQty,
                ProductId: product.Id,
                ProductName: product.ProductName,
                Barcode: product.product_barcodes ? JSON.stringify(product.product_barcodes.map(pb => pb.barcode)) : '[]',
                Weight: product.Weight,
                ImagePath: product.ImagePath,
                DefaultLocation: product.Location,
                Location: product.Location || 'Raf Belirsiz'
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
        
        const orders = await prisma.orders.findMany({
            where: {
                OR: [
                    { OrderStatus: 'Onayland_', PickerId: null },
                    { OrderStatus: 'Haz_rlan_yor', PickerId: userId }
                ]
            },
            include: { shippers: true },
        });
        
        // IsMyOngoing sorting logic
        const formattedOrders = orders.map(o => ({
            Id: o.Id,
            OrderNumber: o.OrderNumber,
            CargoCompanyName: o.shippers?.CompanyName || null,
            IsMyOngoing: toFrontendStatus(o.OrderStatus) === 'Hazırlanıyor' ? 1 : 0
        })).sort((a, b) => b.IsMyOngoing - a.IsMyOngoing || a.Id - b.Id);
        
        res.json({ success: true, data: formattedOrders });
    } catch (error) {
        console.error('Bekleyen siparişleri alma hatası:', error);
        try { require('fs').appendFileSync('error.log', new Date().toISOString() + ' [MOBILE API HATASI] ' + (error.stack || error) + '\n'); } catch(e) {}
        res.status(500).json({ success: false, message: 'Siparişler getirilemedi.' });
    }
});

// POST: Belirli bir siparişi al (atama)
router.post('/orders/assign/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    
    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });

    try {
        const orderToUpdate = await prisma.orders.findFirst({
            where: {
                Id: id,
                OR: [
                    { OrderStatus: 'Onayland_', PickerId: null },
                    { OrderStatus: 'Haz_rlan_yor', PickerId: userId }
                ]
            }
        });

        if (!orderToUpdate) {
            return res.json({ success: false, message: 'Bu sipariş zaten alınmış veya bulunamıyor.' });
        }

        const { cart_barcode, section_barcodes } = req.body;
        let cartId = null;
        let cartSectionIds = null;

        if (section_barcodes && Array.isArray(section_barcodes) && section_barcodes.length > 0) {
            if (section_barcodes.length === 1 && section_barcodes[0] === 'ELDEN_TESLIM') {
                // Arabasız toplama durumu: CartId ve CartSectionIds null olarak kalacak
            } else {
                // Find sections first
                const sections = await prisma.picking_cart_sections.findMany({
                where: {
                    barcode: { in: section_barcodes }
                },
                include: { cart: true } // Need to get cart info
            });

            if (sections.length !== section_barcodes.length) {
                return res.status(400).json({ success: false, message: 'Bazı bölüm barkodları bulunamadı veya geçersiz.' });
            }

            // Verify all sections belong to the same active cart
            const firstCartId = sections[0].cart_id;
            const allSameCart = sections.every(s => s.cart_id === firstCartId);
            
            if (!allSameCart) {
                return res.status(400).json({ success: false, message: 'Seçilen bölümler aynı taşıma arabasına ait olmalıdır.' });
            }

            const cart = sections[0].cart;
            if (!cart.is_active) {
                return res.status(400).json({ success: false, message: 'Bu taşıma arabası aktif değil.' });
            }

            // Verify cart_barcode matches if it was provided (for backward compatibility)
            if (cart_barcode && cart.barcode !== cart_barcode) {
                 return res.status(400).json({ success: false, message: 'Bölümler belirtilen taşıma arabasına ait değil.' });
            }

            cartId = cart.id;
            cartSectionIds = sections.map(s => s.id);

            // GÜVENLİK: Bölüm (Section) Müsaitlik Kontrolü (Race condition / Çakışma önleme)
            const activeOrdersInCart = await prisma.orders.findMany({
                where: {
                    CartId: cart.id,
                    OrderStatus: {
                        in: ['Haz_rlan_yor', 'Toplamada', 'Haz_r']
                    }
                }
            });

            for (const activeOrder of activeOrdersInCart) {
                if (activeOrder.Id === id) continue; // Mevcut siparişi yoksay
                if (activeOrder.CartSectionIds && Array.isArray(activeOrder.CartSectionIds)) {
                    for (const section of sections) {
                        if (activeOrder.CartSectionIds.includes(section.id)) {
                             return res.status(400).json({ 
                                 success: false, 
                                 message: `Bu bölüm zaten Sipariş #${activeOrder.OrderNumber || activeOrder.Id} için kullanılıyor. Lütfen başka bir bölüm seçin.` 
                             });
                        }
                    }
                }
            }

            // Update cart status to PICKING if it's IDLE
            if (cart.status === 'IDLE') {
                await prisma.picking_carts.update({
                    where: { id: cart.id },
                    data: { status: 'PICKING' }
                });
                }
            }
        }

        await prisma.orders.update({
            where: { Id: id },
            data: { 
                OrderStatus: 'Haz_rlan_yor', 
                PickerId: userId,
                CartId: cartId !== undefined ? cartId : undefined,
                CartSectionIds: cartSectionIds !== undefined ? cartSectionIds : undefined
            }
        });

        await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişi toplamaya başladı.`, null);

        const order = await prisma.orders.findUnique({
            where: { Id: id },
            include: { customers: true }
        });

        const formattedOrder = {
            ...order,
            CustomerName: order.customers?.CustomerName
        };

        const items = await getOrderItemsWithRoute(order.Id);

        res.json({
            success: true,
            message: 'Sipariş başarıyla atandı.',
            order: formattedOrder,
            items: items
        });

    } catch (error) {
        console.error('Sipariş atama hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş atanamadı.' });
    }
});

// POST: Siparişe yeni bölüm (raf) ekle
router.post('/orders/:id/add-section', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    const { section_barcode } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });
    if (!section_barcode) return res.status(400).json({ success: false, message: 'Bölüm barkodu gerekli.' });

    try {
        const order = await prisma.orders.findUnique({
            where: { Id: id }
        });

        if (!order || order.PickerId !== userId || order.OrderStatus !== 'Haz_rlan_yor') {
            // GÜVENLİK: Şüpheli İşlem - Başkasının siparişine müdahale girişimi
            if (order && order.PickerId && order.PickerId !== userId) {
                await prisma.users.update({ where: { id: userId }, data: { is_active: false } });
                const authMiddleware = require('../middleware/auth');
                authMiddleware.clearAuthCache(userId);
                console.error(`[SECURITY ALERT] User ${userId} tried to access order ${id} belonging to user ${order.PickerId}. Account suspended.`);
                return res.status(403).json({ success: false, message: 'Şüpheli işlem tespit edildi. Güvenlik ihlali nedeniyle hesabınız askıya alındı.' });
            }
            return res.json({ success: false, message: 'Sipariş size atanmamış veya durumu uygun değil.' });
        }
        if (!order.CartId) {
            return res.json({ success: false, message: 'Bu sipariş henüz bir taşıma arabasına atanmamış.' });
        }

        // Find the section by barcode and cart_id
        const section = await prisma.picking_cart_sections.findFirst({
            where: {
                cart_id: order.CartId,
                barcode: section_barcode
            }
        });

        if (!section) {
            return res.json({ success: false, message: 'Bu bölüm, bulunduğunuz arabaya ait değil veya bulunamadı.' });
        }

        // GÜVENLİK: Bölüm (Section) Müsaitlik Kontrolü
        const activeOrdersInCart = await prisma.orders.findMany({
            where: {
                CartId: order.CartId,
                OrderStatus: {
                    in: ['Haz_rlan_yor', 'Toplamada', 'Haz_r']
                }
            }
        });

        for (const activeOrder of activeOrdersInCart) {
            if (activeOrder.Id === id) continue; // Kendi siparişimizi atla
            if (activeOrder.CartSectionIds && Array.isArray(activeOrder.CartSectionIds)) {
                if (activeOrder.CartSectionIds.includes(section.id)) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Bu bölüm zaten Sipariş #${activeOrder.OrderNumber || activeOrder.Id} için kullanılıyor.` 
                    });
                }
            }
        }

        // Append to CartSectionIds
        let currentSections = Array.isArray(order.CartSectionIds) ? order.CartSectionIds : [];
        if (!currentSections.includes(section.id)) {
            currentSections.push(section.id);
            await prisma.orders.update({
                where: { Id: id },
                data: { CartSectionIds: currentSections }
            });
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
        let order = await prisma.orders.findFirst({
            where: { OrderStatus: 'Haz_rlan_yor', PickerId: userId },
            include: { customers: true }
        });

        if (!order) {
            let assignedOrder = null;
            let attempts = 0;
            const MAX_ATTEMPTS = 5; // En fazla 5 kere sıradaki siparişi kapmaya çalış

            while (!assignedOrder && attempts < MAX_ATTEMPTS) {
                attempts++;
                
                const availableOrder = await prisma.orders.findFirst({
                    where: { OrderStatus: 'Onayland_', PickerId: null },
                    orderBy: { Id: 'asc' }
                });

                if (!availableOrder) {
                    return res.json({ success: false, message: 'Şu an toplanacak boşta sipariş bulunmuyor.' });
                }

                const updated = await prisma.orders.updateMany({
                    where: { Id: availableOrder.Id, OrderStatus: 'Onayland_', PickerId: null },
                    data: { OrderStatus: 'Haz_rlan_yor', PickerId: userId }
                });

                if (updated.count > 0) {
                    assignedOrder = availableOrder; // Başarıyla kilitlendi!
                }
                // Eğer count === 0 ise (başkası bizden 1 salise önce aldıysa), döngü devam eder ve bir sonraki siparişi dener.
            }

            if (!assignedOrder) {
                 return res.json({ success: false, message: 'Sistem şu an çok yoğun, tüm siparişler kapışılıyor. Lütfen tekrar deneyin.' });
            }

            order = await prisma.orders.findUnique({
                where: { Id: assignedOrder.Id },
                include: { customers: true }
            });

            await logActivity(userId, 'UPDATE', 'orders', order.Id, `Mobil uygulama "Sıradakini Al" butonu ile #${order.Id} numaralı siparişi toplamaya başladı.`, null);
        }

        const formattedOrder = {
            ...order,
            CustomerName: order.customers?.CustomerName
        };

        const items = await getOrderItemsWithRoute(order.Id);

        res.json({
            success: true,
            order: formattedOrder,
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

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });

    try {
        const updated = await prisma.orders.updateMany({
            where: { Id: id, PickerId: userId, OrderStatus: 'Haz_rlan_yor' },
            data: { OrderStatus: 'Onayland_', PickerId: null }
        });

        if (updated.count === 0) {
            return res.status(400).json({ success: false, message: 'İptal edilemedi. Bu sipariş size atanmamış veya zaten iptal edilmiş olabilir.' });
        }

        await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişin toplama işlemini iptal etti.`, null);

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

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });

    try {
        const updated = await prisma.orders.updateMany({
            where: { Id: id, PickerId: userId, OrderStatus: 'Haz_rlan_yor' },
            data: { OrderStatus: 'Haz_r', PickedDate: new Date() }
        });

        if (updated.count === 0) {
            // Check if it's already completed by this user
            const existing = await prisma.orders.findFirst({
                where: { Id: id, PickerId: userId, OrderStatus: 'Haz_r' }
            });
            if (existing) {
                return res.json({
                    success: true,
                    message: 'Sipariş zaten başarıyla toplanmış.'
                });
            }
            return res.status(400).json({ success: false, message: 'Sipariş tamamlanamadı. Size atanmamış olabilir veya durumu uygun değil.' });
        }

        await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişi topladı.`, null);

        res.json({
            success: true,
            message: 'Sipariş başarıyla toplandı.'
        });

    } catch (error) {
        console.error('Mobil sipariş tamamlama hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş tamamlanamadı.' });
    }
});

// POST: Siparişi paketle (Kargo etiketini oluştur ve doğrula)
router.post('/orders/package/complete/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const { scannedBarcode, boxBarcode } = req.body; // Yeni üretilen kargo barkodu ve kutu barkodu
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });
    if (!scannedBarcode) return res.status(400).json({ success: false, message: 'Barkod bilgisi eksik.' });
    try {
        const order = await prisma.orders.findUnique({ where: { Id: id } });
        if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });

        let boxId = null;
        if (boxBarcode) {
            // Kutu barkodunu doğrula ve ilgili kutuyu bul
            const [barcodes] = await db.query('SELECT box_id FROM box_barcodes WHERE barcode = ?', [boxBarcode]);
            if (barcodes.length === 0) {
                return res.status(400).json({ success: false, message: 'Geçersiz kutu barkodu okutuldu.' });
            }
            boxId = barcodes[0].box_id;
        }

        const isEldenTeslim = order.ShippingAddress === 'Elden Teslim';
        
        const updated = await prisma.orders.updateMany({
            where: { Id: id, PackerId: userId, OrderStatus: 'Paketleniyor' },
            data: { 
                OrderStatus: isEldenTeslim ? 'Teslim_Edildi' : 'Paketlendi', 
                CargoBarcode: scannedBarcode,
                PackedDate: new Date() 
            }
        });

        if (updated.count === 0) {
            return res.status(400).json({ success: false, message: 'Paketleme tamamlanamadı. Sipariş size atanmamış veya yanlış durumda olabilir.' });
        }

        if (boxId) {
            // Kutu stoğunu düş
            await db.query('UPDATE packaging_boxes SET StockQuantity = StockQuantity - 1 WHERE Id = ?', [boxId]);
            await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişi paketledi, ${scannedBarcode} kargo barkodunu oluşturdu ve ${boxBarcode} barkodlu kutuyu kullandı.`, null);
            await logActivity(userId, 'UPDATE', 'packaging_boxes', boxId, `Sipariş #${id} için ${boxBarcode} barkodu okutularak 1 adet kutu stoktan düşüldü.`, null);
        } else {
            await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişi kutusuz (Elden Teslim) olarak paketledi ve ${scannedBarcode} kargo barkodunu oluşturdu.`, null);
        }

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

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });
    if (!cargoBarcode) return res.status(400).json({ success: false, message: 'Barkod okutulmadı.' });

    try {
        const order = await prisma.orders.findFirst({
            where: { CargoBarcode: cargoBarcode }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Bu barkoda ait sipariş bulunamadı.' });
        }

        if (order.OrderStatus === 'Kargoya_Verildi') {
            return res.status(400).json({ success: false, message: 'Bu sipariş zaten kargoya verilmiş.' });
        }

        if (order.OrderStatus !== 'Paketlendi') {
            return res.status(400).json({ success: false, message: 'Bu sipariş henüz paketlenmemiş. Şu anki durumu: ' + order.OrderStatus });
        }

        await prisma.orders.update({
            where: { Id: order.Id },
            data: { 
                OrderStatus: 'Kargoya_Verildi', 
                ShipUserId: userId,
                ShippedDate: new Date()
            }
        });

        await logActivity(userId, 'UPDATE', 'orders', order.Id, `Mobil uygulama üzerinden kargo barkodu (${cargoBarcode}) okutularak kargoya verildi.`, null);

        res.json({ success: true, message: 'Sipariş başarıyla kargoya verildi.', orderId: order.Id, orderNumber: order.OrderNumber });

    } catch (error) {
        console.error('Kargoya verme hatası:', error);
        res.status(500).json({ success: false, message: 'Kargoya verme işlemi başarısız oldu.' });
    }
});

// GET: İstatistikler (Liderlik Tablosu) - Filtreli
router.get('/stats', authMiddleware, checkPermission('view_wms'), async (req, res) => {
    const range = req.query.range || 'daily';
    try {
        let stats;
        
        if (range === 'weekly') {
            stats = await prisma.$queryRaw`
                SELECT u.id as UserId, u.name as UserName, COUNT(DISTINCT o.Id) as TotalOrdersPicked, COALESCE(SUM(oi.Quantity), 0) as TotalProductsPicked
                FROM users u JOIN orders o ON u.id = o.PickerId JOIN orderitems oi ON o.Id = oi.OrderId
                WHERE YEARWEEK(o.PickedDate, 1) = YEARWEEK(CURDATE(), 1) AND o.OrderStatus IN ('Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi')
                GROUP BY u.id, u.name ORDER BY TotalProductsPicked DESC
            `;
        } else if (range === 'monthly') {
            stats = await prisma.$queryRaw`
                SELECT u.id as UserId, u.name as UserName, COUNT(DISTINCT o.Id) as TotalOrdersPicked, COALESCE(SUM(oi.Quantity), 0) as TotalProductsPicked
                FROM users u JOIN orders o ON u.id = o.PickerId JOIN orderitems oi ON o.Id = oi.OrderId
                WHERE YEAR(o.PickedDate) = YEAR(CURDATE()) AND MONTH(o.PickedDate) = MONTH(CURDATE()) AND o.OrderStatus IN ('Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi')
                GROUP BY u.id, u.name ORDER BY TotalProductsPicked DESC
            `;
        } else if (range === 'yearly') {
            stats = await prisma.$queryRaw`
                SELECT u.id as UserId, u.name as UserName, COUNT(DISTINCT o.Id) as TotalOrdersPicked, COALESCE(SUM(oi.Quantity), 0) as TotalProductsPicked
                FROM users u JOIN orders o ON u.id = o.PickerId JOIN orderitems oi ON o.Id = oi.OrderId
                WHERE YEAR(o.PickedDate) = YEAR(CURDATE()) AND o.OrderStatus IN ('Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi')
                GROUP BY u.id, u.name ORDER BY TotalProductsPicked DESC
            `;
        } else {
            // daily
            stats = await prisma.$queryRaw`
                SELECT u.id as UserId, u.name as UserName, COUNT(DISTINCT o.Id) as TotalOrdersPicked, COALESCE(SUM(oi.Quantity), 0) as TotalProductsPicked
                FROM users u JOIN orders o ON u.id = o.PickerId JOIN orderitems oi ON o.Id = oi.OrderId
                WHERE DATE(o.PickedDate) = CURDATE() AND o.OrderStatus IN ('Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi')
                GROUP BY u.id, u.name ORDER BY TotalProductsPicked DESC
            `;
        }

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

        let whereClause = {};

        if (searchQuery && searchQuery.trim().length > 0) {
            whereClause = {
                OrderNumber: { contains: searchQuery.trim() },
                OR: [
                    { OrderStatus: 'Haz_r' },
                    { OrderStatus: 'Paketleniyor', PackerId: userId },
                    { ShippingAddress: { contains: 'Elden Teslim' } }
                ]
            };
        } else {
            // Arama yoksa sadece paketlemeye hazır olanları VEYA elden teslimleri (durumdan bağımsız) getir
            whereClause = {
                OR: [
                    { OrderStatus: 'Haz_r' },
                    { OrderStatus: 'Paketleniyor', PackerId: userId },
                    { 
                        ShippingAddress: { contains: 'Elden Teslim' },
                        OrderStatus: { in: ['Bekliyor', 'Haz_r', 'Paketleniyor'] } // Elden teslimler toplanmaya girmez
                    }
                ]
            };
        }

        const orders = await prisma.orders.findMany({
            where: whereClause,
            include: { customers: true },
            orderBy: { PickedDate: 'asc' }
        });
        
        const formattedOrders = orders.map(o => ({
            ...o,
            CustomerName: o.customers?.CustomerName
        }));

        res.json({ success: true, data: formattedOrders });
    } catch (error) {
        console.error('Paketlenecek siparişleri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Siparişler getirilemedi.' });
    }
});

// POST: Paketleme görevini al (Assign)
router.post('/orders/package/assign/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Oturum verisi bulunamadı.' });

    try {
        const updated = await prisma.orders.updateMany({
            where: {
                Id: id,
                OR: [
                    { OrderStatus: 'Haz_r', PackerId: null },
                    { OrderStatus: 'Paketleniyor', PackerId: userId }
                ]
            },
            data: { OrderStatus: 'Paketleniyor', PackerId: userId }
        });

        if (updated.count === 0) {
            return res.json({ success: false, message: 'Bu sipariş zaten başkası tarafından paketleniyor veya bulunamadı.' });
        }

        await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişi paketlemeye başladı.`, null);

        const order = await prisma.orders.findUnique({
            where: { Id: id },
            include: { customers: true }
        });
        
        const items = await getOrderItemsWithRoute(id);
        
        res.json({ success: true, message: 'Paketleme görevi alındı.', order: { ...order, CustomerName: order.customers?.CustomerName }, items: items });
    } catch (error) {
        console.error('Paketleme atama hatası:', error);
        res.status(500).json({ success: false, message: 'Atama işlemi başarısız.' });
    }
});

// POST: Paketlemeyi iptal et (Geri bırak)
router.post('/orders/package/cancel/:id', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user?.id;
    try {
        const updated = await prisma.orders.updateMany({
            where: { Id: id, PackerId: userId, OrderStatus: 'Paketleniyor' },
            data: { OrderStatus: 'Haz_r', PackerId: null }
        });
        
        if (updated.count > 0) {
            await logActivity(userId, 'UPDATE', 'orders', id, `Mobil uygulama üzerinden #${id} numaralı siparişi paketlemeyi iptal etti.`, null);
        }
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
        const cart = await prisma.picking_carts.findFirst({
            where: { barcode: cart_barcode, is_active: true }
        });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Araba bulunamadı.' });
        }

        await prisma.picking_carts.update({
            where: { id: cart.id },
            data: { status: 'READY_FOR_PACKAGING' }
        });

        res.json({ success: true, message: 'Taşıma arabası paketlemeye gönderildi.' });
    } catch (error) {
        console.error('Araba bitirme hatası:', error);
        res.status(500).json({ success: false, message: 'İşlem başarısız.' });
    }
});



// POST: Arabanın tüm siparişleri paketlendi, arabayı boşa çıkar
router.post('/picking_carts/empty-cart', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    const { cart_id } = req.body;
    if (!cart_id) return res.status(400).json({ success: false, message: 'Araba kimliği gerekli.' });

    try {
        const cart = await prisma.picking_carts.findUnique({
            where: { id: parseInt(cart_id) }
        });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Araba bulunamadı.' });
        }

        await prisma.picking_carts.update({
            where: { id: parseInt(cart_id) },
            data: { status: 'IDLE' }
        });

        res.json({ success: true, message: 'Araba başarıyla boşaltıldı.' });
    } catch (error) {
        console.error('Araba boşaltma hatası:', error);
        res.status(500).json({ success: false, message: 'Araba boşaltılamadı.' });
    }
});

// GET: Paketleme için arabayı okut ve bölümleri/siparişleri getir
router.get('/picking_carts/scan-for-packaging', authMiddleware, checkPermission('view_wms'), async (req, res) => {
    const { cart_barcode } = req.query;
    if (!cart_barcode) return res.status(400).json({ success: false, message: 'Araba barkodu gerekli.' });

    try {
        // Try finding by cart barcode first
        let cart = await prisma.picking_carts.findFirst({
            where: { barcode: cart_barcode, is_active: true },
            include: {
                sections: true,
                orders: {
                    where: { OrderStatus: 'Haz_r' }, // Picked and ready to pack
                    include: { customers: true }
                }
            }
        });

        // If not found, try finding by section barcode
        if (!cart) {
            const section = await prisma.picking_cart_sections.findFirst({
                where: { barcode: cart_barcode }
            });
            if (section) {
                cart = await prisma.picking_carts.findFirst({
                    where: { id: section.cart_id, is_active: true },
                    include: {
                        sections: true,
                        orders: {
                            where: { OrderStatus: 'Haz_r' }, // Picked and ready to pack
                            include: { customers: true }
                        }
                    }
                });
            }
        }

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Geçerli bir araba veya bölüm barkodu bulunamadı.' });
        }

        // Group orders by their exact CartSectionIds combination
        const orderGroups = {};
        
        cart.orders.forEach(order => {
            if (!order.CartSectionIds || !Array.isArray(order.CartSectionIds) || order.CartSectionIds.length === 0) return;
            
            // Sort to ensure same combination yields same key
            const sortedIds = [...order.CartSectionIds].sort();
            const groupKey = sortedIds.join('_');
            
            if (!orderGroups[groupKey]) {
                orderGroups[groupKey] = {
                    sectionIds: sortedIds,
                    orders: []
                };
            }
            orderGroups[groupKey].orders.push(order);
        });

        const mergedSections = [];
        const usedSectionIds = new Set();

        // Create virtual sections for each order group
        Object.values(orderGroups).forEach(group => {
            const groupSections = cart.sections.filter(s => group.sectionIds.includes(s.id));
            
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

        // Add the remaining empty sections
        cart.sections.forEach(section => {
            if (!usedSectionIds.has(section.id)) {
                mergedSections.push({
                    ...section,
                    orders: []
                });
            }
        });

        res.json({ 
            success: true, 
            cart: { id: cart.id, name: cart.name, barcode: cart.barcode },
            sections: mergedSections
        });
    } catch (error) {
        console.error('Araba okutma hatası:', error);
        res.status(500).json({ success: false, message: 'Araba bilgileri alınamadı.' });
    }
});

module.exports = router;
