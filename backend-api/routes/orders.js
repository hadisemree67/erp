/*
 * ÖZET:
 * Bu modül, müşteri siparişlerinin (B2B/B2C) oluşturulması, listelenmesi ve kargo süreçlerinin 
 * (paketleme, 3D kutu seçimi, WMS entegrasyonu ile stok düşümü) yönetildiği rotaları içerir.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { toFrontendStatus, toPrismaStatus } = require('../utils/enumMapper');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');
const { checkAndNotifyLowStock } = require('../utils/stockNotifier');

// GET /api/orders - Tüm siparişleri ve kalemlerini getir
router.get('/', async (req, res) => {
    try {
        const orders = await prisma.orders.findMany({
            include: {
                customers: true,
                shippers: true,
                users_orders_PickerIdTousers: true,
                users_orders_PackerIdTousers: true,
                users_orders_ShipUserIdTousers: true,
                picking_carts: {
                    include: { sections: true }
                },
                orderitems: {
                    include: {
                        products: { include: { product_barcodes: true } }
                    }
                }
            },
            orderBy: { Id: 'desc' }
        });
        
        const productIds = new Set();
        orders.forEach(o => o.orderitems.forEach(oi => productIds.add(oi.ProductId)));
        
        const stockBalances = await prisma.wms_stock_balances.groupBy({
            by: ['product_id'],
            _sum: { quantity: true },
            where: { product_id: { in: Array.from(productIds) } }
        });
        
        const stockMap = {};
        stockBalances.forEach(sb => {
            stockMap[sb.product_id] = sb._sum.quantity || 0;
        });

        const formattedOrders = orders.map(o => {
            let cartInfo = null;
            if (o.picking_carts) {
                const sectionNames = [];
                if (Array.isArray(o.CartSectionIds)) {
                    o.CartSectionIds.forEach(id => {
                        const sec = o.picking_carts.sections.find(s => s.id === id);
                        if (sec) sectionNames.push(sec.section_name);
                    });
                }
                if (sectionNames.length > 0) {
                    cartInfo = `${o.picking_carts.name} (${sectionNames.join(', ')})`;
                } else {
                    cartInfo = o.picking_carts.name;
                }
            }

            return {
                ...o,
                OrderStatus: toFrontendStatus(o.OrderStatus),
                CustomerName: o.customers?.CustomerName,
                CustomerEmail: o.customers?.Email,
                CustomerPhone: o.customers?.Phone,
                CargoCompanyName: o.shippers?.CompanyName,
                PickerName: o.users_orders_PickerIdTousers?.name,
                PackerName: o.users_orders_PackerIdTousers?.name,
                ShipUserName: o.users_orders_ShipUserIdTousers?.name,
                CartInfo: cartInfo,
                items: o.orderitems.map(oi => ({
                    ...oi,
                    ProductName: oi.products?.ProductName,
                    ProductCode: oi.products?.product_barcodes ? JSON.stringify(oi.products.product_barcodes.map(pb => pb.barcode)) : '[]',
                    Unit: oi.products?.unit_type,
                    CurrentStock: stockMap[oi.ProductId] || 0
                }))
            };
        });

        res.json({ success: true, data: formattedOrders });
    } catch (err) {
        console.error('Siparişler çekilirken hata:', err);
        res.status(500).json({ success: false, message: 'Siparişler yüklenemedi.' });
    }
});

// POST /api/orders - Yeni manuel sipariş oluştur ve stok kontrolü / otomatik üretim talebi yap
router.post('/', authMiddleware, checkPermission('order_create'), async (req, res) => {
    const { customerId, shippingAddress, items, userId, paymentMethod, campaignId, campaignName, discountAmount, shipperId, couponId, couponCode, description } = req.body;


    if (!customerId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Müşteri ve en az bir sipariş kalemi gereklidir.' });
    }

    try {
        // GÜVENLİK: Timestamp tabanlı numara yerine crypto random kullanılıyor (çakışma riski önlendi)
        const crypto = require('crypto');
        const orderNumber = `SIP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
        let totalAmount = 0;
        for (const item of items) {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            totalAmount += (qty * price);
        }
        const finalDiscount = parseFloat(discountAmount) || 0;
        totalAmount = Math.max(0, totalAmount - finalDiscount);

        const autoProductionRequests = [];
        let orderDeductions = [];

        const orderResult = await prisma.$transaction(async (tx) => {
            const order = await tx.orders.create({
                data: {
                    CustomerId: Number(customerId),
                    OrderNumber: orderNumber,
                    OrderStatus: toPrismaStatus('Beklemede'),
                    TotalAmount: totalAmount,
                    ShippingAddress: shippingAddress || '',
                    OrderDate: new Date(),
                    PaymentMethod: paymentMethod || 'Nakit',
                    CampaignId: campaignId ? Number(campaignId) : null,
                    CampaignName: campaignName || null,
                    DiscountAmount: finalDiscount,
                    ShipperId: shipperId ? Number(shipperId) : null
                }
            });

            await tx.finance_transactions.create({
                data: {
                    type: 'GEL_R',
                    amount: totalAmount,
                    category: 'Müşteri Siparişi',
                    description: `Sipariş Geliri (${orderNumber}) - Ödeme: ${paymentMethod || 'Nakit'}`,
                    transaction_date: new Date()
                }
            });

            // Kupon kullanımı geçici olarak devre dışı
            // if (couponId) {
            //     await tx.coupons.update({
            //         where: { id: Number(couponId) },
            //         data: { used_count: { increment: 1 } }
            //     });
            // }

            for (const item of items) {
                const productId = Number(item.productId);
                const qty = Number(item.quantity) || 0;
                const price = parseFloat(item.unitPrice) || 0;

                if (!productId || qty <= 0) continue;

                const product = await tx.products.findUnique({ where: { Id: productId } });
                if (product && (product.is_active === 0 || product.is_active === false)) {
                    throw new Error(`"${product.ProductName}" adlı ürün pasif durumda (satışa kapalı) olduğu için sipariş edilemez.`);
                }

                await tx.orderitems.create({
                    data: {
                        OrderId: order.Id,
                        ProductId: productId,
                        Quantity: qty,
                        UnitPrice: price
                    }
                });

                const productInfo = await tx.products.findUnique({
                    where: { Id: productId }
                });

                if (productInfo) {
                    const currentStockAggr = await tx.wms_stock_balances.aggregate({
                        _sum: { quantity: true },
                        where: { product_id: productId }
                    });
                    const currentStock = Number(currentStockAggr._sum.quantity) || 0;

                    if (qty > currentStock) {
                        const missingQty = qty - currentStock;
                        const reason = `Müşteri Siparişi (${orderNumber}) için stok yetersizliğinden otomatik oluşturuldu. Sipariş Edilen: ${qty}, Mevcut Stok: ${currentStock}, Eksik: ${missingQty} Adet.`;

                        if (productInfo.supply_type === 'MANUFACTURE') {
                            await tx.production_requests.create({
                                data: {
                                    product_id: productId,
                                    requested_quantity: missingQty,
                                    source: 'Müşteri Siparişi',
                                    creator: 'Sistem Otomasyonu',
                                    reason: reason,
                                    priority: 'Acil',
                                    status: 'Bekliyor',
                                    created_at: new Date()
                                }
                            });
                        } else if (productInfo.supply_type === 'PURCHASE' || productInfo.supply_type === 'OUTSOURCED' || productInfo.Category === 'Hammadde') {
                            await tx.purchase_requests.create({
                                data: {
                                    product_name: productInfo.ProductName,
                                    quantity: missingQty,
                                    description: reason,
                                    status: 'Bekliyor'
                                }
                            });
                        }

                        autoProductionRequests.push({
                            productName: productInfo.ProductName,
                            missingQty: missingQty,
                            currentStock: currentStock,
                            orderedQty: qty,
                            reqType: productInfo.supply_type === 'MANUFACTURE' ? 'Üretim' : 'Satın Alma'
                        });
                    }
                }

                let remainingToDeduct = qty;
                const batches = await tx.wms_stock_balances.findMany({
                    where: { product_id: productId, quantity: { gt: 0 } },
                    orderBy: [
                        { expiration_date: { sort: 'asc', nulls: 'last' } },
                        { id: 'asc' }
                    ]
                });

                for (const batch of batches) {
                    if (remainingToDeduct <= 0) break;
                    let deduct = Math.min(Number(batch.quantity), remainingToDeduct);
                    
                    await tx.wms_stock_balances.update({
                        where: { id: batch.id },
                        data: { quantity: { decrement: deduct } }
                    });
                    
                    remainingToDeduct -= deduct;
                    orderDeductions.push({ batchId: batch.id, quantity: deduct });
                }

                if (remainingToDeduct > 0) {
                    const negResult = await tx.wms_stock_balances.create({
                        data: {
                            product_id: productId,
                            quantity: -remainingToDeduct,
                            batch_number: orderNumber
                        }
                    });
                    orderDeductions.push({ batchId: negResult.id, quantity: remainingToDeduct, isNegative: true });
                }
            }

            if (orderDeductions.length > 0) {
                await tx.orders.update({
                    where: { Id: order.Id },
                    data: { deducted_batches: JSON.stringify(orderDeductions) }
                });
            }

            return order.Id;
        });

        const logMsg = description && description.trim() 
            ? `Yeni sipariş oluşturuldu: ${orderNumber} - Açıklama: ${description.trim()}`
            : `Yeni sipariş oluşturuldu: ${orderNumber}`;
            
        await logActivity(req.user?.id, 'INSERT', 'orders', orderResult, logMsg);

        for (const item of items) {
            if (item.productId) {
                checkAndNotifyLowStock(item.productId).catch(err => console.error('Kritik stok kontrol hatası (orders):', err));
            }
        }

        let msg = `Sipariş (${orderNumber}) başarıyla oluşturuldu.`;
        if (autoProductionRequests.length > 0) {
            const names = autoProductionRequests.map(r => `${r.productName} (${r.missingQty} Adet ${r.reqType} Talebi)`).join(', ');
            msg += `\n⚠️ DİKKAT: Stok yetersizliği nedeniyle otomatik talepler açıldı:\n${names}`;
        }

        res.json({
            success: true,
            message: msg,
            orderId: orderResult,
            autoProductionRequests: autoProductionRequests
        });

    } catch (err) {
        console.error('Sipariş oluşturma hatası:', err);
        res.status(500).json({ success: false, message: 'Sipariş oluşturulurken bir hata meydana geldi. Lütfen tekrar deneyin. Error: ' + err.message });
    }
});

// PUT /api/orders/:id/status - Sipariş durumu güncelle
router.put('/:id/status', authMiddleware, async (req, res) => {
    const { status } = req.body;
    
    // YETKİ KONTROLÜ
    if (req.user.role !== 'admin' && !['Depo'].includes(req.user.role)) {
        const perms = req.user.permissions || [];
        if (status === 'İptal Edildi' || status === 'İptal') {
            if (!perms.includes('order_cancel')) return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
        } else if (status === 'Kargoya Verildi' || status === 'Teslim Edildi') {
            if (!perms.includes('order_ship')) return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
        } else if (status === 'Onaylandı') { 
            // "Onaylandı" durumu hem "Beklemede -> Onaylandı" (order_approve) 
            // hem de "Hazırlanıyor -> Onaylandı" iptali (order_prepare) için kullanılıyor.
            // Bu nedenle ikisinden birine sahip olması yeterli (veya burada order_approve'a izin verelim).
            if (!perms.includes('order_approve') && !perms.includes('order_prepare')) {
                return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
            }
        } else if (status === 'Hazırlanıyor') {
            if (!perms.includes('order_prepare')) return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
        } else {
             return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
        }
    }

    const orderId = Number(req.params.id);
    
    try {
        await prisma.$transaction(async (tx) => {
            const currOrder = await tx.orders.findUnique({
                where: { Id: orderId }
            });
            
            if (!currOrder) throw new Error('Sipariş bulunamadı.');
            const oldStatus = toFrontendStatus(currOrder.OrderStatus);

            if (status === oldStatus) {
                return; // Nothing to do
            }

            if (status === 'Hazırlanıyor' && oldStatus === 'Beklemede') {
                const items = await tx.orderitems.findMany({
                    where: { OrderId: orderId },
                    include: { products: { include: { product_barcodes: true } } }
                });

                let outOfStockItems = [];
                for (const item of items) {
                    const currentStockAggr = await tx.wms_stock_balances.aggregate({
                        _sum: { quantity: true },
                        where: { product_id: item.ProductId }
                    });
                    const currentStock = Number(currentStockAggr._sum.quantity) || 0;
                    if (currentStock < 0) {
                        outOfStockItems.push(`${item.products?.ProductName} (Eksik: ${Math.abs(currentStock)})`);
                    }
                }

                if (outOfStockItems.length > 0) {
                    throw new Error('Siparişteki bazı ürünler stokta yeterli miktarda bulunmuyor (veya üretim aşamasında)!\nBu yüzden sipariş "Hazırlanıyor" aşamasına alınamaz.\n\nYetersiz Ürünler:\n- ' + outOfStockItems.join('\n- '));
                }
            }

            if ((status === 'İptal' || status === 'İptal Edildi') && oldStatus !== 'İptal' && oldStatus !== 'İptal Edildi') {
                let deductedBatches = null;
                try { if (currOrder.deducted_batches) deductedBatches = JSON.parse(currOrder.deducted_batches); } catch(e){ console.warn('JSON Parse Error:', e.message); }

                if (deductedBatches && Array.isArray(deductedBatches)) {
                    for (const d of deductedBatches) {
                        await tx.wms_stock_balances.updateMany({
                            where: { id: d.batchId },
                            data: { quantity: { increment: d.quantity } }
                        });
                    }
                } else {
                    const items = await tx.orderitems.findMany({
                        where: { OrderId: orderId }
                    });
                    
                    for (const item of items) {
                        const qty = Number(item.Quantity);
                        
                        const negatives = await tx.wms_stock_balances.findMany({
                            where: { product_id: item.ProductId, quantity: { lt: 0 } },
                            orderBy: { id: 'asc' }
                        });

                        let remainingToAdd = qty;

                        for (const neg of negatives) {
                            if (remainingToAdd <= 0) break;
                            let toAdd = Math.min(Math.abs(Number(neg.quantity)), remainingToAdd);
                            await tx.wms_stock_balances.update({
                                where: { id: neg.id },
                                data: { quantity: { increment: toAdd } }
                            });
                            remainingToAdd -= toAdd;
                        }

                        if (remainingToAdd > 0) {
                            const exist = await tx.wms_stock_balances.findFirst({
                                where: { product_id: item.ProductId, quantity: { gte: 0 } }
                            });
                            if (exist) {
                                await tx.wms_stock_balances.update({
                                    where: { id: exist.id },
                                    data: { quantity: { increment: remainingToAdd } }
                                });
                            } else {
                                await tx.wms_stock_balances.create({
                                    data: { product_id: item.ProductId, quantity: remainingToAdd }
                                });
                            }
                        }
                    }
                }
            }

            if (status === 'Onaylandı' && oldStatus === 'Hazırlanıyor') {
                await tx.orders.update({
                    where: { Id: orderId },
                    data: { OrderStatus: toPrismaStatus(status), PickerId: null }
                });
            } else if (status === 'İptal' || status === 'İptal Edildi') {
                await tx.orders.update({
                    where: { Id: orderId },
                    data: { OrderStatus: toPrismaStatus(status), PickerId: null, CartId: null, CartSectionIds: null }
                });
            } else {
                await tx.orders.update({
                    where: { Id: orderId },
                    data: { OrderStatus: toPrismaStatus(status) }
                });
            }
        });

        await logActivity(req.user?.id, 'UPDATE', 'orders', orderId, `Sipariş durumu güncellendi: ${status}`);
        res.json({ success: true, message: 'Sipariş durumu güncellendi.' });
    } catch (err) {
        console.error('Durum güncelleme hatası:', err);
        if (err.message && err.message.includes('yeterli miktarda bulunmuyor')) {
             return res.status(400).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// DELETE /api/orders/:id - Siparişi ve kalemlerini sil
router.delete('/:id', authMiddleware, checkPermission('order_cancel'), async (req, res) => {
    const orderId = Number(req.params.id);
    
    try {
        await prisma.$transaction(async (tx) => {
            const currOrder = await tx.orders.findUnique({
                where: { Id: orderId }
            });
            
            if (currOrder) {
                const oldStatus = toFrontendStatus(currOrder.OrderStatus);
                if (oldStatus !== 'İptal' && oldStatus !== 'İptal Edildi') {
                    let deductedBatches = null;
                    try { if (currOrder.deducted_batches) deductedBatches = JSON.parse(currOrder.deducted_batches); } catch(e){}

                    if (deductedBatches && Array.isArray(deductedBatches)) {
                        for (const d of deductedBatches) {
                            await tx.wms_stock_balances.update({
                                where: { id: d.batchId },
                                data: { quantity: { increment: d.quantity } }
                            });
                        }
                    } else {
                        const items = await tx.orderitems.findMany({
                            where: { OrderId: orderId }
                        });
                        for (const item of items) {
                            const qty = Number(item.Quantity);
                            const negatives = await tx.wms_stock_balances.findMany({
                                where: { product_id: item.ProductId, quantity: { lt: 0 } },
                                orderBy: { id: 'asc' }
                            });

                            let remainingToAdd = qty;

                            for (const neg of negatives) {
                                if (remainingToAdd <= 0) break;
                                let toAdd = Math.min(Math.abs(Number(neg.quantity)), remainingToAdd);
                                await tx.wms_stock_balances.update({
                                    where: { id: neg.id },
                                    data: { quantity: { increment: toAdd } }
                                });
                                remainingToAdd -= toAdd;
                            }

                            if (remainingToAdd > 0) {
                                const exist = await tx.wms_stock_balances.findFirst({
                                    where: { product_id: item.ProductId, quantity: { gte: 0 } }
                                });
                                if (exist) {
                                    await tx.wms_stock_balances.update({
                                        where: { id: exist.id },
                                        data: { quantity: { increment: remainingToAdd } }
                                    });
                                } else {
                                    await tx.wms_stock_balances.create({
                                        data: { product_id: item.ProductId, quantity: remainingToAdd }
                                    });
                                }
                            }
                        }
                    }
                }
            }

            await tx.orderitems.deleteMany({ where: { OrderId: orderId } });
            await tx.orders.delete({ where: { Id: orderId } });
        });

        await logActivity(req.user?.id, 'DELETE', 'orders', orderId, `Sipariş silindi ve stoklar iade edildi.`);
        res.json({ success: true, message: 'Sipariş başarıyla silindi ve stoklar iade edildi.' });
    } catch (err) {
        console.error('Sipariş silme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// PUT /api/orders/:id/approve - Siparişi Onayla ve Kutu/Kargo Ata
router.put('/:id/approve', authMiddleware, checkPermission('order_approve'), async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        
        const items = await prisma.orderitems.findMany({
            where: { OrderId: orderId },
            include: { products: { include: { product_barcodes: true } } }
        });
        
        if (items.length === 0) return res.status(400).json({ success: false, message: 'Siparişte ürün yok.' });
        
        let totalVolume = 0;
        let totalWeight = 0;
        
        for (const item of items) {
            const w = parseFloat(item.products?.Width) || 10;
            const h = parseFloat(item.products?.Height) || 10;
            const d = parseFloat(item.products?.Depth) || 10;
            const weight = parseFloat(item.products?.Weight) || 0.5;
            const qty = Number(item.Quantity) || 1;
            
            totalVolume += (w * h * d) * qty;
            totalWeight += weight * qty;
        }
        
        const boxes = await prisma.packaging_boxes.findMany({
            where: { IsActive: true }
        });
        
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
                    w: parseFloat(item.products?.Width) || 10,
                    h: parseFloat(item.products?.Height) || 10,
                    d: parseFloat(item.products?.Depth) || 10,
                    weight: parseFloat(item.products?.Weight) || 0.5,
                    volume: (parseFloat(item.products?.Width) || 10) * (parseFloat(item.products?.Height) || 10) * (parseFloat(item.products?.Depth) || 10)
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
        for(let box of bestCombo) {
            finalBoxWeight += box.emptyWeight;
            selectedBoxInfo.push({ id: box.Id, name: box.BoxName, cost: box.cost });
        }
        
        const overallTotalWeight = totalWeight + finalBoxWeight;
        const cargoBarcode = 'CRG-' + orderId + '-' + Date.now().toString().slice(-4);
        
        await prisma.orders.update({
            where: { Id: orderId },
            data: {
                OrderStatus: toPrismaStatus('Onaylandı'),
                CargoBarcode: cargoBarcode,
                TotalWeight: overallTotalWeight,
                packaging_info: JSON.stringify(selectedBoxInfo)
            }
        });
        
        await logActivity(req.user?.id, 'UPDATE', 'orders', orderId, `Sipariş onaylandı ve kargo ataması yapıldı: ${cargoBarcode}`);
        res.json({ success: true, message: 'Sipariş onaylandı ve kargo ataması yapıldı.', cargoBarcode, boxes: selectedBoxInfo });
        
    } catch (err) {
        console.error('Sipariş onay hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + err.message });
    }
});

// GET /api/orders/by-cargo/:barcode - Kargo barkoduna göre sipariş getir
router.get('/by-cargo/:barcode', authMiddleware, async (req, res) => {
    try {
        const order = await prisma.orders.findFirst({
            where: { CargoBarcode: req.params.barcode },
            include: {
                customers: true,
                orderitems: {
                    include: { products: { include: { product_barcodes: true } } }
                }
            }
        });
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Bu barkoda ait sipariş bulunamadı.' });
        }
        
        const formattedOrder = {
            ...order,
            CustomerName: order.customers?.CustomerName,
            CustomerEmail: order.customers?.Email,
            CustomerPhone: order.customers?.Phone,
            CustomerAddress: order.customers?.Address,
            items: order.orderitems.map(oi => ({
                ...oi,
                ProductName: oi.products?.ProductName,
                ProductCode: oi.products?.product_barcodes ? JSON.stringify(oi.products.product_barcodes.map(pb => pb.barcode)) : '[]'
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
    try {
        await prisma.orders.update({
            where: { Id: Number(req.params.id) },
            data: {
                BoxId: BoxId ? Number(BoxId) : null,
                TrackingNumber: TrackingNumber || null,
                OrderStatus: toPrismaStatus('Kargoya Verildi'),
                CargoStatus: 'Transfer Merkezine Gidiyor'
            }
        });
        await logActivity(req.user?.id, 'UPDATE', 'orders', req.params.id, `Sipariş paketlendi ve kargoya verildi. Takip: ${TrackingNumber}`);
        res.json({ success: true, message: 'Paketleme tamamlandı, sipariş kargoya verildi.' });
    } catch (err) {
        console.error('Paketleme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/orders/webhook/kargo - Kargo firmasından gelen durum güncellemelerini alır
router.post('/webhook/kargo', async (req, res) => {
    const { trackingNumber, status, subStatus } = req.body;
    
    if (!trackingNumber) {
        return res.status(400).json({ success: false, message: 'TrackingNumber gerekli' });
    }
    
    try {
        if (status === 'DELIVERED' || status === 'Teslim Edildi') {
            await prisma.orders.updateMany({
                where: { TrackingNumber: trackingNumber },
                data: { OrderStatus: toPrismaStatus('Teslim Edildi'), CargoStatus: 'Teslim Edildi' }
            });
        } else {
            await prisma.orders.updateMany({
                where: { TrackingNumber: trackingNumber },
                data: { CargoStatus: subStatus || status }
            });
        }
        
        res.json({ success: true, message: 'Kargo durumu güncellendi.' });
    } catch (err) {
        console.error('Webhook hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

module.exports = router;
