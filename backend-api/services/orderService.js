const db = require('../db');
const orderRepository = require('../repositories/orderRepository');
const crypto = require('crypto');
const { toFrontendStatus, toPrismaStatus } = require('../utils/enumMapper');
const { checkAndNotifyLowStock } = require('../utils/stockNotifier');
const { logActivity } = require('../utils/logger');

class OrderService {
    constructor() {
        if (!global.orderIdempotencyCache) global.orderIdempotencyCache = new Map();
    }

    async getOrders() {
        const orders = await orderRepository.findAllOrdersWithDetails();
        return orders.map(o => ({
            ...o,
            OrderStatus: toFrontendStatus(o.OrderStatus),
            CustomerName: o.CustomerName,
            CustomerEmail: o.CustomerEmail,
            CustomerPhone: o.CustomerPhone,
            CargoCompanyName: o.CargoCompanyName,
            PickerName: o.PickerName,
            PackerName: o.PackerName,
            ShipUserName: o.ShipUserName,
            CartInfo: o.CartInfo
        }));
    }

    async createOrder(data, userId) {
        const { customerId, shippingAddress, items, paymentMethod, campaignId, campaignName, shipperId, idempotencyKey, description } = data;

        if (!customerId || !Array.isArray(items) || items.length === 0) {
            throw new Error('Müşteri ve en az bir sipariş kalemi gereklidir.');
        }

        const cacheKey = idempotencyKey || crypto.createHash('md5').update(JSON.stringify({customerId, items})).digest('hex');
        
        if (global.orderIdempotencyCache.has(cacheKey)) {
            const timeDiff = Date.now() - global.orderIdempotencyCache.get(cacheKey);
            if (timeDiff < 10000) { 
                throw new Error('Bu sipariş isteği zaten işleniyor veya çok kısa süre önce alındı.');
            }
        }
        global.orderIdempotencyCache.set(cacheKey, Date.now());

        let totalAmount = 0;
        let validatedItems = [];

        for (const item of items) {
            const productId = Number(item.productId);
            const qty = Number(item.quantity);

            if (!productId || isNaN(qty) || qty < 1 || !Number.isInteger(qty) || qty > 1000000) {
                throw new Error('Geçersiz miktar (quantity) veya ürün ID değeri.');
            }

            const [productRows] = await db.query('SELECT * FROM products WHERE Id = ?', [productId]);
            const productInfo = productRows[0];

            if (!productInfo) {
                throw new Error(`Ürün bulunamadı (ID: ${productId})`);
            }
            if (productInfo.is_active === 0) {
                throw new Error(`"${productInfo.ProductName}" adlı ürün satışa kapalıdır.`);
            }

            const dbPrice = parseFloat(productInfo.SalePrice || productInfo.PurchasePrice) || 0;
            totalAmount += (qty * dbPrice);
            
            validatedItems.push({
                productId: productId,
                quantity: qty,
                unitPrice: dbPrice,
                productInfo: productInfo
            });
        }
        
        const finalDiscount = 0; 
        totalAmount = Math.max(0, totalAmount - finalDiscount);

        const orderNumber = `SIP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        
        const orderData = {
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
        };

        const financeData = {
            type: 'GELİR',
            amount: totalAmount,
            category: 'Müşteri Siparişi',
            description: `Sipariş Geliri (${orderNumber}) - Ödeme: ${paymentMethod || 'Nakit'}`,
            transaction_date: new Date()
        };

        // Create the transaction via Repository
        const result = await orderRepository.createOrderTransaction(orderData, validatedItems, financeData);
        
        const logMsg = description && description.trim() 
            ? `Yeni sipariş oluşturuldu: ${orderNumber} - Açıklama: ${description.trim()}`
            : `Yeni sipariş oluşturuldu: ${orderNumber}`;
            
        await logActivity(userId, 'INSERT', 'orders', result.orderId, logMsg);

        for (const item of items) {
            if (item.productId) {
                checkAndNotifyLowStock(item.productId).catch(err => console.error('Kritik stok kontrol hatası (orders):', err));
            }
        }

        let msg = `Sipariş (${orderNumber}) başarıyla oluşturuldu.`;
        if (result.autoProductionRequests.length > 0) {
            const names = result.autoProductionRequests.map(r => `${r.productName} (${r.missingQty} Adet ${r.reqType} Talebi)`).join(', ');
            msg += `\n⚠️ DİKKAT: Stok yetersizliği nedeniyle otomatik talepler açıldı:\n${names}`;
        }

        return { orderId: result.orderId, msg, autoProductionRequests: result.autoProductionRequests };
    }
}

module.exports = new OrderService();
