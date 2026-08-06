const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/auth');

// Get all coupons
router.get('/', authMiddleware, async (req, res) => {
    try {
        const coupons = await prisma.coupons.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, coupons });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kuponlar alınırken hata oluştu.' });
    }
});

// Create a new coupon
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            code, discount_type, discount_value, minimum_order_amount,
            maximum_discount_amount, buy_quantity, free_quantity,
            gift_product_id, target_category, target_product_id,
            usage_limit, start_date, end_date, is_active
        } = req.body;

        const existing = await prisma.coupons.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bu kupon kodu zaten kullanımda.' });
        }

        const newCoupon = await prisma.coupons.create({
            data: {
                code,
                discount_type,
                discount_value: discount_value ? parseFloat(discount_value) : null,
                minimum_order_amount: minimum_order_amount ? parseFloat(minimum_order_amount) : null,
                maximum_discount_amount: maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
                buy_quantity: buy_quantity ? parseInt(buy_quantity) : null,
                free_quantity: free_quantity ? parseInt(free_quantity) : null,
                gift_product_id: gift_product_id ? parseInt(gift_product_id) : null,
                target_category: target_category || null,
                target_product_id: target_product_id ? parseInt(target_product_id) : null,
                usage_limit: usage_limit ? parseInt(usage_limit) : null,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
                is_active: is_active !== undefined ? is_active : true
            }
        });

        res.json({ success: true, message: 'Kupon oluşturuldu.', coupon: newCoupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kupon oluşturulurken hata oluştu.' });
    }
});

// Update coupon
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code, discount_type, discount_value, minimum_order_amount,
            maximum_discount_amount, buy_quantity, free_quantity,
            gift_product_id, target_category, target_product_id,
            usage_limit, start_date, end_date, is_active
        } = req.body;

        const updatedCoupon = await prisma.coupons.update({
            where: { id: parseInt(id) },
            data: {
                code,
                discount_type,
                discount_value: discount_value ? parseFloat(discount_value) : null,
                minimum_order_amount: minimum_order_amount ? parseFloat(minimum_order_amount) : null,
                maximum_discount_amount: maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
                buy_quantity: buy_quantity ? parseInt(buy_quantity) : null,
                free_quantity: free_quantity ? parseInt(free_quantity) : null,
                gift_product_id: gift_product_id ? parseInt(gift_product_id) : null,
                target_category: target_category || null,
                target_product_id: target_product_id ? parseInt(target_product_id) : null,
                usage_limit: usage_limit ? parseInt(usage_limit) : null,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
                is_active: is_active !== undefined ? is_active : true
            }
        });

        res.json({ success: true, message: 'Kupon güncellendi.', coupon: updatedCoupon });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kupon güncellenirken hata oluştu.' });
    }
});

// Delete coupon
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.coupons.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Kupon silindi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kupon silinirken hata oluştu.' });
    }
});

// Validate Coupon
router.post('/validate', authMiddleware, async (req, res) => {
    try {
        const { code, items } = req.body; // items: [{productId, quantity, unitPrice, Category, ProductName}]

        if (!code) {
            return res.status(400).json({ success: false, message: 'Kupon kodu eksik.' });
        }

        const coupon = await prisma.coupons.findUnique({ where: { code } });
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Kupon bulunamadı.' });
        }

        if (!coupon.is_active) {
            return res.status(400).json({ success: false, message: 'Bu kupon aktif değil.' });
        }

        const now = new Date();
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            return res.status(400).json({ success: false, message: 'Kupon kullanım süresi henüz başlamadı.' });
        }
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            return res.status(400).json({ success: false, message: 'Kupon kullanım süresi dolmuş.' });
        }
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: 'Kupon kullanım limiti dolmuş.' });
        }

        let totalAmount = 0;
        let eligibleAmount = 0; // Tutar üzerinden indirim (Yüzde veya Sabit) için uygun tutar
        let eligibleQuantity = 0; // BuyXGetY veya Gift için uygun ürün sayısı

        items.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const lineTotal = qty * price;
            totalAmount += lineTotal;

            // Kategori veya Ürün bazlı filtreleme var mı?
            let isEligible = true;
            if (coupon.target_category && item.Category !== coupon.target_category) {
                isEligible = false;
            }
            if (coupon.target_product_id && parseInt(item.productId) !== coupon.target_product_id) {
                isEligible = false;
            }

            if (isEligible) {
                eligibleAmount += lineTotal;
                eligibleQuantity += qty;
            }
        });

        if (coupon.minimum_order_amount && totalAmount < parseFloat(coupon.minimum_order_amount)) {
            return res.status(400).json({ success: false, message: `Bu kupon ${coupon.minimum_order_amount} TL ve üzeri siparişlerde geçerlidir.` });
        }

        let discountAmount = 0;
        let giftItem = null;

        switch (coupon.discount_type) {
            case 'Percentage':
                if (eligibleAmount > 0) {
                    discountAmount = eligibleAmount * (parseFloat(coupon.discount_value) / 100);
                } else {
                    return res.status(400).json({ success: false, message: 'Sepetinizde bu kupon için geçerli ürün bulunmamaktadır.' });
                }
                break;
            case 'FixedAmount':
                if (eligibleAmount > 0) {
                    discountAmount = parseFloat(coupon.discount_value);
                } else {
                    return res.status(400).json({ success: false, message: 'Sepetinizde bu kupon için geçerli ürün bulunmamaktadır.' });
                }
                break;
            case 'BuyXGetY':
                if (coupon.buy_quantity && coupon.free_quantity) {
                    if (eligibleQuantity >= coupon.buy_quantity) {
                        const eligibleItems = items.filter(item => {
                            if (coupon.target_category && item.Category !== coupon.target_category) return false;
                            if (coupon.target_product_id && parseInt(item.productId) !== coupon.target_product_id) return false;
                            return true;
                        });
                        
                        if (eligibleItems.length > 0) {
                            // Sort by unit price ascending
                            eligibleItems.sort((a, b) => parseFloat(a.unitPrice) - parseFloat(b.unitPrice));
                            let itemsToDiscount = coupon.free_quantity;
                            
                            for (const eItem of eligibleItems) {
                                const qty = parseFloat(eItem.quantity) || 0;
                                const price = parseFloat(eItem.unitPrice) || 0;
                                
                                const discountQty = Math.min(itemsToDiscount, qty);
                                discountAmount += (discountQty * price);
                                itemsToDiscount -= discountQty;
                                
                                if (itemsToDiscount <= 0) break;
                            }
                        }
                    } else {
                        return res.status(400).json({ success: false, message: `Bu kupon için geçerli ürünlerden en az ${coupon.buy_quantity} adet almalısınız.` });
                    }
                }
                break;
            case 'GiftProduct':
                // Hediye ürün
                if (coupon.gift_product_id) {
                    const product = await prisma.products.findUnique({ where: { Id: coupon.gift_product_id } });
                    if (product) {
                        giftItem = {
                            productId: product.Id,
                            productName: product.ProductName,
                            quantity: coupon.free_quantity || 1,
                            unitPrice: 0,
                            discounted: true
                        };
                    }
                }
                break;
            case 'FreeShipping':
                // Kargo bedava
                break;
            default:
                break;
        }

        if (coupon.maximum_discount_amount && discountAmount > parseFloat(coupon.maximum_discount_amount)) {
            discountAmount = parseFloat(coupon.maximum_discount_amount);
        }

        res.json({
            success: true,
            discountAmount,
            giftItem,
            coupon,
            message: 'Kupon başarıyla uygulandı.'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kupon doğrulanırken sunucu hatası oluştu.' });
    }
});

module.exports = router;
