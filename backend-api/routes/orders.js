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
const prisma = require('../prisma');
const db = require('../db');
const { toFrontendStatus, toPrismaStatus } = require('../utils/enumMapper');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');
const { checkAndNotifyLowStock } = require('../utils/stockNotifier');

// ===========================
// [GET] Tüm Siparişleri Listeleme
// Sistemdeki tüm müşteri siparişlerini kalemleri, müşteri bilgileri ve kargo detaylarıyla birlikte liste halinde getirir.
// ===========================
router.get('/', authMiddleware, checkPermission('view_orders'), async (req, res) => {
    try {
        // Geçici düzeltme: 'İptal Bekliyor' Prisma şemasında olmadığı için çökmeye sebep oluyor.
        await db.query("UPDATE orders SET OrderStatus = 'Beklemede' WHERE OrderStatus = 'İptal Bekliyor'");

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
            orderBy: { Id: 'asc' }
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
        require('fs').writeFileSync('error.log', err.stack || err.toString());
        res.status(500).json({ success: false, message: 'Siparişler yüklenemedi.', error: err.message, stack: err.stack });
    }
});

// ===========================
// [POST] Yeni Sipariş Oluşturma
// Gelen siparişi kaydeder, stoğu kontrol edip düşer. Stok yetersizse otomatik üretim/satın alma talebi (Backorder) oluşturur.
// ===========================
router.post('/', authMiddleware, checkPermission('order_create'), async (req, res) => {
    const { customerId, shippingAddress, items, userId, paymentMethod, campaignId, campaignName, discountAmount, shipperId, couponId, couponCode, description, idempotencyKey } = req.body;


    if (!customerId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Müşteri ve en az bir sipariş kalemi gereklidir.' });
    }

    // Idempotency / Duplicate Request Prevention (Basit In-Memory Cache)
    if (!global.orderIdempotencyCache) global.orderIdempotencyCache = new Map();
    const cacheKey = idempotencyKey || require('crypto').createHash('md5').update(JSON.stringify({customerId, items, totalAmount: req.body.totalAmount})).digest('hex');
    
    if (global.orderIdempotencyCache.has(cacheKey)) {
        const timeDiff = Date.now() - global.orderIdempotencyCache.get(cacheKey);
        if (timeDiff < 10000) { // 10 saniye içinde aynı sipariş reddedilir
            return res.status(409).json({ success: false, message: 'Bu sipariş isteği zaten işleniyor veya çok kısa süre önce alındı.' });
        }
    }
    global.orderIdempotencyCache.set(cacheKey, Date.now());

    try {
        // Sunucu Tarafı Validation ve DB Fiyat Kontrolü (Business Logic Koruması)
        let totalAmount = 0;
        let validatedItems = [];
        
        for (const item of items) {
            const productId = Number(item.productId);
            const qty = Number(item.quantity);

            if (!productId || isNaN(qty) || qty < 1 || !Number.isInteger(qty) || qty > 1000000) {
                return res.status(400).json({ success: false, message: 'Geçersiz miktar (quantity) veya ürün ID değeri.' });
            }

            const productInfo = await prisma.products.findUnique({ where: { Id: productId } });
            if (!productInfo) {
                return res.status(404).json({ success: false, message: `Ürün bulunamadı (ID: ${productId})` });
            }
            if (productInfo.is_active === 0 || productInfo.is_active === false) {
                return res.status(400).json({ success: false, message: `"${productInfo.ProductName}" adlı ürün satışa kapalıdır.` });
            }

            const dbPrice = parseFloat(productInfo.SalePrice || productInfo.PurchasePrice) || 0; // DB'den güncel fiyatı çek
            totalAmount += (qty * dbPrice);
            
            validatedItems.push({
                productId: productId,
                quantity: qty,
                unitPrice: dbPrice,
                productInfo: productInfo
            });
        }
        
        // Şimdilik dışarıdan gelen indirimi tamamen reddet (Kupon sistemi kurulana kadar 0 al)
        const finalDiscount = 0; 
        totalAmount = Math.max(0, totalAmount - finalDiscount);

        // GÜVENLİK: Timestamp tabanlı numara yerine crypto random kullanılıyor (çakışma riski önlendi)
        const crypto = require('crypto');
        const orderNumber = `SIP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
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

            for (const item of validatedItems) {
                const productId = item.productId;
                const qty = item.quantity;
                const price = item.unitPrice;
                const productInfo = item.productInfo;

                await tx.orderitems.create({
                    data: {
                        OrderId: order.Id,
                        ProductId: productId,
                        Quantity: qty,
                        UnitPrice: price
                    }
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
                // Race condition'u engellemek için miktarı sadece yetiyorsa düşen atomik işlem (Prisma ile tam FOR UPDATE kilit mekanizması Raw SQL olmadan zor olduğundan optimistik yaklaşım):
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
                    
                    // Atomik güncelleme: Eğer stok o sırada başka bir işlem tarafından azaltılmışsa güncellemeyi yapma
                    const updateResult = await tx.wms_stock_balances.updateMany({
                        where: { id: batch.id, quantity: { gte: deduct } },
                        data: { quantity: { decrement: deduct } }
                    });
                    
                    if (updateResult.count > 0) {
                        remainingToDeduct -= deduct;
                        orderDeductions.push({ batchId: batch.id, quantity: deduct });
                    }
                }

                if (remainingToDeduct > 0) {
                    // Geriye kalan eksik miktar için negatif stok kaydı aç (Backorder takibi)
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

// ===========================
// [PUT] Sipariş Durumunu Güncelleme
// Siparişin aşamasını (Beklemede, Onaylandı, Toplanıyor, Kargoya Verildi vb.) kurallara göre değiştirir ve iptallerde stoku iade eder.
// ===========================
router.put('/:id/status', authMiddleware, checkPermission('view_orders'), async (req, res) => {
    const { status } = req.body;
    
    // YETKİ KONTROLÜ
    if (req.user.role !== 'admin') {
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
        } else if (status === 'Toplanıyor' || status === 'Toplanacaklar') {
            if (!perms.includes('order_prepare')) return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
        } else {
             return res.status(403).json({ success: false, message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmamaktadır.' });
        }
    }

    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    
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

            // GÜVENLİK: Durum Geçiş (State Machine) Kuralları
            const allowedTransitions = {
                'Beklemede': ['Onaylandı', 'İptal Edildi', 'İptal'],
                'Onaylandı': ['Toplanacaklar', 'Toplanıyor', 'İptal Edildi', 'İptal', 'Beklemede'],
                'Toplanacaklar': ['Toplanıyor', 'Onaylandı', 'İptal Edildi'],
                'Toplanıyor': ['Toplandı', 'Kargoya Verildi', 'Onaylandı'],
                'Toplandı': ['Paketleniyor', 'Kargoya Verildi', 'Onaylandı'],
                'Paketleniyor': ['Paketlendi', 'Kargoya Verildi', 'Onaylandı'],
                'Paketlendi': ['Kargoya Verildi', 'Onaylandı'],
                'Kargoya Verildi': ['Teslim Edildi', 'Toplanıyor', 'Toplandı'],
                'Teslim Edildi': [], // Terminal durum, değişemez
                'İptal Edildi': [], // Terminal durum, değişemez
                'İptal': [] // Terminal durum, değişemez
            };

            const validNextStates = allowedTransitions[oldStatus];
            if (!validNextStates || !validNextStates.includes(status)) {
                // Admin ise esneklik tanınabilir (Opsiyonel, ancak şimdilik tamamen kısıtlıyoruz)
                if (req.user.role !== 'admin') {
                    throw new Error(`Geçersiz işlem: Sipariş "${oldStatus}" durumundan "${status}" durumuna geçirilemez.`);
                }
            }

            if (status === 'Toplanıyor' && oldStatus === 'Beklemede') {
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
                // Sadece sipariş fiziksel olarak raftan alınmışsa (toplanmışsa) WMS'e stok geri ekle
                // Eğer hala Beklemede/Onaylandı aşamasındaysa raftan hiç çıkmadı, WMS'e dokunma
                const pickedStatuses = ['Toplanıyor', 'Toplandı', 'Paketleniyor', 'Paketlendi', 'Kargoya Verildi', 'Teslim Edildi'];
                const wasPhysicallyPicked = pickedStatuses.includes(oldStatus);
                
                if (wasPhysicallyPicked) {
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

// ===========================
// [DELETE] Sipariş İptali / Silme
// Siparişi ve içerisindeki sipariş kalemlerini veritabanından tamamen siler ve düşülen stokları (WMS) depoya iade eder.
// ===========================
router.delete('/:id', authMiddleware, checkPermission('order_cancel'), async (req, res) => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    
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

// ===========================
// [PUT] Siparişi Onaylama ve Kargo Kutusu Seçme
// Siparişteki ürünlerin hacim (desi) ve ağırlığını hesaplayarak en uygun paketleme kutusunu otomatik bulur ve kargo barkodu üretir.
// ===========================
router.put('/:id/approve', authMiddleware, checkPermission('order_approve'), async (req, res) => {
    try {
        const orderId = Number(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
        
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

// ===========================
// [GET] Kargo Barkodu İle Sipariş Arama
// Paket üzerindeki kargo barkodu (CRG-...) okutulduğunda o kargoya ait siparişin detaylarını döndürür.
// ===========================
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
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    try {
        await prisma.orders.update({
            where: { Id: orderId },
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

// POST /api/orders/public/checkout - Public web sipariş oluşturma
router.post('/public/checkout', async (req, res) => {
    const { session_id, shippingAddress, customerInfo, paymentMethod, shipperId, idempotencyKey, items, couponCode } = req.body;
    // GÜVENLİK: discountAmount artık frontend'den alınmıyor — kupon kodu backend'de doğrulanıyor

    if (!session_id || !shippingAddress || !customerInfo || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Geçersiz veya eksik parametre.' });
    }

    try {
        let totalAmount = 0;
        let validatedItems = [];

        // Önce süresi dolmuş rezervasyonları temizle ki stok hesaplaması doğru olsun
        await prisma.$executeRawUnsafe('DELETE FROM cart_reservations WHERE expires_at < NOW()');

        for (const item of items) {
            const product = await prisma.products.findUnique({
                where: { Id: parseInt(item.Id) }
            });

            if (!product || !product.is_active) {
                return res.status(400).json({ success: false, message: `"${product ? product.ProductName : 'Bilinmeyen'}" adlı ürün satışa kapalıdır veya bulunamadı.` });
            }

            const qty = Number(item.quantity);
            if (!Number.isInteger(qty) || qty < 1 || qty > 1000000) {
                return res.status(400).json({ success: false, message: `"${product.ProductName}" için geçersiz sipariş miktarı.` });
            }

            // Mevcut kullanılabilir stoğu hesapla
            const wmsStockRes = await prisma.$queryRawUnsafe('SELECT SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ?', parseInt(item.Id));
            const wmsStock = wmsStockRes.length > 0 && wmsStockRes[0].qty !== null ? Number(wmsStockRes[0].qty) : product.StockQuantity;

            const otherReservations = await prisma.$queryRawUnsafe('SELECT SUM(quantity) as sum_qty FROM cart_reservations WHERE product_id = ? AND session_id != ? AND expires_at > NOW()', parseInt(item.Id), session_id);
            const otherReservedAmount = otherReservations.length > 0 ? Number(otherReservations[0].sum_qty) || 0 : 0;
            
            const unpickedOrders = await prisma.$queryRawUnsafe(`
                SELECT SUM(oi.Quantity) as sum_qty 
                FROM orderitems oi 
                JOIN orders o ON oi.OrderId = o.Id 
                WHERE oi.ProductId = ? 
                AND o.OrderStatus IN ('Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Toplamada', 'İptal Bekliyor')
            `, parseInt(item.Id));
            const unpickedAmount = unpickedOrders.length > 0 ? Number(unpickedOrders[0].sum_qty) || 0 : 0;

            const realAvailableStock = wmsStock - otherReservedAmount - unpickedAmount;

            if (realAvailableStock < item.quantity) {
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

        // --- KAMPANYA / KUPON HESAPLAMASI (Backend) ---
        // GÜVENLİK: İndirim miktarı frontend'den alınmıyor; kupon kodu backend'de doğrulanıyor.
        let totalDiscount = 0;
        let appliedCampaignNames = [];

        if (couponCode && typeof couponCode === 'string' && couponCode.trim().length > 0) {
            try {
                const db = require('../db');
                const [coupons] = await db.query(
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
                            } else if (coupon.discount_type === 'FreeShipping') {
                                // Kargo üretsiz: aşağıda hesaplanır
                                totalDiscount = 0;
                            }
                            totalDiscount = Math.min(totalDiscount, baseTotal); // İndirim siparişten fazla olamaz
                            appliedCampaignNames.push(coupon.code);
                            // Kupon kullanımını artır
                            await db.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
                        }
                    }
                }
            } catch (couponErr) {
                console.error('Kupon doğrulama hatası (checkout):', couponErr);
                // Kupon hatası siparışi engellemesin, sadece indirimsiz devam et
            }
        }

        if (appliedCampaignNames.length > 0) {
            // do nothing extra, names already tracked
        }

        // Kargo kuralı: 2000 TL ve üstü ücretsiz, altı 50 TL
        const shippingCost = totalAmount >= 2000 ? 0 : 50;
        totalAmount = totalAmount + shippingCost - totalDiscount;

        // Müşteri bul veya yarat
        let customerId = customerInfo.id;
        if (!customerId) {
            // Misafir kullanıcı için isim ve telefondan müşteri ara
            const existingCust = await prisma.customers.findFirst({
                where: { CustomerName: customerInfo.name, Phone: customerInfo.phone || '' }
            });
            if (existingCust) {
                customerId = existingCust.Id;
            } else {
                const newCust = await prisma.customers.create({
                    data: {
                        CustomerName: customerInfo.name,
                        Email: customerInfo.email || '',
                        Phone: customerInfo.phone || '',
                        Address: shippingAddress,
                        CustomerType: 'Bireysel'
                    }
                });
                customerId = newCust.Id;
            }
        }

        const crypto = require('crypto');
        const orderNumber = `WSIP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        await prisma.$transaction(async (tx) => {
            const order = await tx.orders.create({
                data: {
                    CustomerId: Number(customerId),
                    OrderNumber: orderNumber,
                    OrderStatus: toPrismaStatus('Beklemede'),
                    TotalAmount: totalAmount,
                    ShippingAddress: shippingAddress,
                    OrderDate: new Date(),
                    PaymentMethod: paymentMethod || 'Web (Kredi Kartı)',
                    ShipperId: shipperId ? Number(shipperId) : null,
                    DiscountAmount: totalDiscount,
                    CampaignName: appliedCampaignNames.length > 0 ? appliedCampaignNames.join(', ') : null
                }
            });

            await tx.finance_transactions.create({
                data: {
                    type: 'GEL_R',
                    amount: totalAmount,
                    category: 'Web Siparişi',
                    description: `Sipariş Geliri (${orderNumber}) - Ödeme: ${paymentMethod || 'Kredi Kartı'}`,
                    transaction_date: new Date()
                }
            });

            for (const item of validatedItems) {
                await tx.orderitems.create({
                    data: {
                        OrderId: order.Id,
                        ProductId: item.productId,
                        Quantity: item.quantity,
                        UnitPrice: item.unitPrice
                    }
                });

                const currentStockAggr = await tx.wms_stock_balances.aggregate({
                    _sum: { quantity: true },
                    where: { product_id: item.productId }
                });
                const currentStock = Number(currentStockAggr._sum.quantity) || 0;

                if (item.quantity > currentStock) {
                    const missingQty = item.quantity - currentStock;
                    const reason = `Web Siparişi (${orderNumber}) için stok yetersizliğinden otomatik oluşturuldu. Sipariş Edilen: ${item.quantity}, Mevcut Stok: ${currentStock}, Eksik: ${missingQty} Adet.`;

                    if (item.productInfo.supply_type === 'MANUFACTURE') {
                        await tx.production_requests.create({
                            data: {
                                product_id: item.productId,
                                requested_quantity: missingQty,
                                source: 'Web Siparişi',
                                creator: 'Sistem Otomasyonu',
                                reason: reason,
                                priority: 'Acil',
                                status: 'Bekliyor',
                                created_at: new Date()
                            }
                        });
                    } else if (item.productInfo.supply_type === 'PURCHASE' || item.productInfo.supply_type === 'OUTSOURCED' || item.productInfo.Category === 'Hammadde') {
                        await tx.purchase_requests.create({
                            data: {
                                product_name: item.productInfo.ProductName,
                                quantity: missingQty,
                                description: reason,
                                status: 'Bekliyor'
                            }
                        });
                    }
                }

                // --- STOK DÜŞÜMÜ İŞLEMİ (Sadece Kullanılabilir Stok) ---
                // 1. Ana ürün tablosundaki genel kullanılabilir stoktan düş (Web'de satışa kapanması için)
                // Fiziksel WMS raf stoklarından (wms_stock_balances) ve stockmovements loglarından 
                // sipariş toplanana (picker işlemi bitirene) kadar düşülmez.
                await tx.products.update({
                    where: { Id: item.productId },
                    data: { StockQuantity: { decrement: item.quantity } }
                });
            }

            // Sipariş başarıyla oluşturulduktan sonra sepeti temizle
            await tx.$executeRawUnsafe('DELETE FROM cart_reservations WHERE session_id = ?', session_id);
        });

        res.json({ success: true, message: 'Sipariş başarıyla oluşturuldu.', orderNumber: orderNumber });
    } catch (error) {
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

        // Eski kayıtlarda resim yoksa dinamik olarak çekelim
        for (const ret of returns) {
            if (ret.items_json) {
                try {
                    let items = typeof ret.items_json === 'string' ? JSON.parse(ret.items_json) : ret.items_json;
                    for (const item of items) {
                        const productId = item.product_id || item.ProductId;
                        if (!item.image_path && productId) {
                            const prod = await prisma.products.findUnique({
                                where: { Id: productId },
                                select: { ImagePath: true }
                            });
                            if (prod) {
                                item.image_path = prod.ImagePath;
                            }
                        }
                    }
                    ret.items_json = JSON.stringify(items);
                } catch(e) { }
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

        if (!returnRequest) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı.' });
        }

        // İptal ve İade onay/red mantığı
        if (returnRequest.request_type === 'iptal' || returnRequest.request_type === 'iade') {
            const orderId = returnRequest.order_id;
            
            if (status === 'Onaylandı') {
                let cancelledItems = [];
                try {
                    cancelledItems = typeof returnRequest.items_json === 'string' ? JSON.parse(returnRequest.items_json) : (returnRequest.items_json || []);
                    if (!Array.isArray(cancelledItems)) cancelledItems = [];
                } catch(e) {
                    console.error("JSON Parse Error in returns:", e);
                }
                
                const order = await prisma.orders.findUnique({
                    where: { Id: orderId },
                    include: { orderitems: true }
                });

                if (order && cancelledItems.length > 0) {
                    let totalCancelledAmount = 0;
                    let allItemsCancelled = true;
                    
                    for (const oItem of order.orderitems) {
                        const cancelItem = cancelledItems.find(c => c.product_id === oItem.ProductId);
                        if (!cancelItem) {
                            allItemsCancelled = false;
                            continue;
                        }

                        const cancelQty = cancelItem.quantity || oItem.Quantity;
                        const cancelPrice = cancelItem.price || oItem.UnitPrice;
                        
                        // Stokları geri ekle SADECE SİPARİŞ TOPLANMIŞSA (WMS'den düşmüşse)
                        const unpickedStatuses = ['Beklemede', 'Onaylandı', 'Toplamada', 'Hazırlanıyor', 'İptal Bekliyor'];
                        const isPicked = !unpickedStatuses.includes(order.OrderStatus);

                        if (isPicked) {
                            await prisma.stockmovements.create({
                                data: {
                                    ProductId: oItem.ProductId,
                                    MovementType: 'IN',
                                    Quantity: cancelQty,
                                    MovementDate: new Date(),
                                    Description: `Talep Onayı (#${order.OrderNumber}) için stok girişi.`,
                                    warehouse_id: 1
                                }
                            });
                            
                            const existingBalance = await prisma.wms_stock_balances.findFirst({
                                where: { product_id: oItem.ProductId, warehouse_id: 1 }
                            });
                            
                            if (existingBalance) {
                                await prisma.wms_stock_balances.update({
                                    where: { id: existingBalance.id },
                                    data: { quantity: existingBalance.quantity + cancelQty }
                                });
                            } else {
                                await prisma.wms_stock_balances.create({
                                    data: {
                                        product_id: oItem.ProductId,
                                        warehouse_id: 1,
                                        quantity: cancelQty,
                                        batch_number: 'IADE/IPTAL'
                                    }
                                });
                            }
                        }

                        
                        totalCancelledAmount += (cancelQty * cancelPrice);
                        
                        if (cancelQty >= oItem.Quantity) {
                            await prisma.orderitems.delete({
                                where: { Id: oItem.Id }
                            });
                        } else {
                            allItemsCancelled = false;
                            await prisma.orderitems.update({
                                where: { Id: oItem.Id },
                                data: { Quantity: oItem.Quantity - cancelQty }
                            });
                        }
                    }

                    if (allItemsCancelled || order.orderitems.length === 0) {
                        await prisma.orders.update({
                            where: { Id: orderId },
                            data: { OrderStatus: toPrismaStatus('İptal Edildi') }
                        });
                    } else {
                        await prisma.orders.update({
                            where: { Id: orderId },
                            data: { 
                                OrderStatus: toPrismaStatus('Beklemede'), // Kalan ürünlerle devam etsin
                                TotalAmount: { decrement: totalCancelledAmount }
                            }
                        });
                    }
                }
            } else if (status === 'Reddedildi') {
                // Reddedilirse sipariş beklemeye geri döner ve devam eder.
                await prisma.orders.update({
                    where: { Id: orderId },
                    data: { OrderStatus: toPrismaStatus('Beklemede') }
                });
            }
        }
        
        await db.query('UPDATE order_returns SET status = ? WHERE id = ?', [status, parseInt(id)]);

        // Activity log
        logActivity(req.user.id, `İade/Talep güncellendi. ID: ${id}, Yeni Durum: ${status}`);

        res.json({ success: true, message: 'İade talebi güncellendi.' });
    } catch (error) {
        console.error('İade talebi güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'İade talebi güncellenemedi.' });
    }
});

module.exports = router;

router.get('/test-crash', async (req, res) => { try { const response = await fetch('http://localhost:5000/api/orders'); const text = await response.text(); res.send(text); } catch(e) { res.send(e.toString()); } });
