/**
 * ============================================================================
 * BİLEŞEN ADI: coupons
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const customerAuthMiddleware = require('../middleware/customerAuth');
const { checkPermission } = require('../middleware/rbac');

// Get all coupons
router.get('/', authMiddleware, checkPermission('view_campaigns'), async (req, res) => {
    try {
        const [coupons] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json({ success: true, coupons });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kuponlar alınırken hata oluştu.' });
    }
});

// Create a new coupon
router.post('/', authMiddleware, checkPermission('campaign_manage'), async (req, res) => {
    try {
        const {
            code, discount_type, discount_value, minimum_order_amount,
            maximum_discount_amount, buy_quantity, free_quantity,
            gift_product_id, target_category, target_product_id,
            usage_limit, start_date, end_date, is_active,
            target_audience, target_customer_ids
        } = req.body;

        const [existing] = await db.query('SELECT * FROM coupons WHERE code = ?', [code]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu kupon kodu zaten kullanımda.' });
        }

        const data = [
            code,
            discount_type,
            discount_value ? parseFloat(discount_value) : null,
            minimum_order_amount ? parseFloat(minimum_order_amount) : null,
            maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
            buy_quantity ? parseInt(buy_quantity) : null,
            free_quantity ? parseInt(free_quantity) : null,
            gift_product_id ? parseInt(gift_product_id) : null,
            target_category || null,
            target_product_id ? parseInt(target_product_id) : null,
            usage_limit ? parseInt(usage_limit) : null,
            start_date ? new Date(start_date) : null,
            end_date ? new Date(end_date) : null,
            is_active !== undefined ? is_active : true,
            target_audience || 'all',
            target_customer_ids ? JSON.stringify(target_customer_ids) : null
        ];

        const [result] = await db.query(`
            INSERT INTO coupons (
                code, discount_type, discount_value, minimum_order_amount,
                maximum_discount_amount, buy_quantity, free_quantity,
                gift_product_id, target_category, target_product_id,
                usage_limit, start_date, end_date, is_active,
                target_audience, target_customer_ids
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, data);

        const [newCoupon] = await db.query('SELECT * FROM coupons WHERE id = ?', [result.insertId]);

        res.json({ success: true, message: 'Kupon oluşturuldu.', coupon: newCoupon[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kupon oluşturulurken hata oluştu.' });
    }
});

// Update coupon
router.put('/:id', authMiddleware, checkPermission('campaign_manage'), async (req, res) => {
    try {
        const idInt = parseInt(req.params.id, 10);
        if (isNaN(idInt)) return res.status(400).json({ success: false, message: 'Geçersiz Kupon ID.' });
        
        const {
            code, discount_type, discount_value, minimum_order_amount,
            maximum_discount_amount, buy_quantity, free_quantity,
            gift_product_id, target_category, target_product_id,
            usage_limit, start_date, end_date, is_active,
            target_audience, target_customer_ids
        } = req.body;

        const data = [
            code,
            discount_type,
            discount_value ? parseFloat(discount_value) : null,
            minimum_order_amount ? parseFloat(minimum_order_amount) : null,
            maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
            buy_quantity ? parseInt(buy_quantity) : null,
            free_quantity ? parseInt(free_quantity) : null,
            gift_product_id ? parseInt(gift_product_id) : null,
            target_category || null,
            target_product_id ? parseInt(target_product_id) : null,
            usage_limit ? parseInt(usage_limit) : null,
            start_date ? new Date(start_date) : null,
            end_date ? new Date(end_date) : null,
            is_active !== undefined ? is_active : true,
            target_audience || 'all',
            target_customer_ids ? JSON.stringify(target_customer_ids) : null,
            idInt
        ];

        await db.query(`
            UPDATE coupons SET 
                code = ?, discount_type = ?, discount_value = ?, minimum_order_amount = ?,
                maximum_discount_amount = ?, buy_quantity = ?, free_quantity = ?,
                gift_product_id = ?, target_category = ?, target_product_id = ?,
                usage_limit = ?, start_date = ?, end_date = ?, is_active = ?,
                target_audience = ?, target_customer_ids = ?
            WHERE id = ?
        `, data);

        const [updatedCoupon] = await db.query('SELECT * FROM coupons WHERE id = ?', [idInt]);

        res.json({ success: true, message: 'Kupon güncellendi.', coupon: updatedCoupon[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kupon güncellenirken hata oluştu.' });
    }
});

// Delete coupon
router.delete('/:id', authMiddleware, checkPermission('campaign_manage'), async (req, res) => {
    try {
        const idInt = parseInt(req.params.id, 10);
        if (isNaN(idInt)) return res.status(400).json({ success: false, message: 'Geçersiz Kupon ID.' });

        await db.query('DELETE FROM coupons WHERE id = ?', [idInt]);
        res.json({ success: true, message: 'Kupon silindi.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Kupon silinirken hata oluştu.' });
    }
});

// Validate Coupon
router.post('/validate', authMiddleware, checkPermission('campaign_manage'), async (req, res) => {
    try {
        const { code, items } = req.body; // items: [{productId, quantity, unitPrice, Category, ProductName}]

        if (!code) {
            return res.status(400).json({ success: false, message: 'Kupon kodu eksik.' });
        }

        const validItems = Array.isArray(items) ? items : [];

        const [coupons] = await db.query('SELECT * FROM coupons WHERE code = ?', [code]);
        if (coupons.length === 0) {
            return res.status(404).json({ success: false, message: 'Kupon bulunamadı.' });
        }
        const coupon = coupons[0];

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
        let eligibleAmount = 0; 
        let eligibleQuantity = 0; 

        validItems.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            const lineTotal = qty * price;
            totalAmount += lineTotal;

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
                        const eligibleItems = validItems.filter(item => {
                            if (coupon.target_category && item.Category !== coupon.target_category) return false;
                            if (coupon.target_product_id && parseInt(item.productId) !== coupon.target_product_id) return false;
                            return true;
                        });
                        
                        if (eligibleItems.length > 0) {
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
                if (coupon.gift_product_id) {
                    const [products] = await db.query('SELECT * FROM products WHERE Id = ?', [coupon.gift_product_id]);
                    if (products.length > 0) {
                        const product = products[0];
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

// [MÜŞTERİ] GET /api/coupons/my-coupons
router.get('/my-coupons', customerAuthMiddleware, async (req, res) => {
    try {
        const customerId = req.user.id;
        const [coupons] = await db.query(`
            SELECT * FROM coupons 
            WHERE is_active = 1 
            AND (end_date IS NULL OR end_date >= CURDATE())
            AND (
                target_audience = 'all' 
                OR (target_audience = 'specific' AND JSON_CONTAINS(target_customer_ids, CAST(? AS JSON), '$'))
            )
        `, [customerId]);
        
        res.json({ success: true, coupons });
    } catch (error) {
        console.error('Kuponları çekerken hata:', error);
        res.status(500).json({ success: false, message: 'Kuponlar alınamadı.' });
    }
});

// [MÜŞTERİ] POST /api/coupons/apply
router.post('/apply', customerAuthMiddleware, async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const customerId = req.user.id;
        
        if (!code) return res.status(400).json({ success: false, message: 'Kupon kodu gereklidir.' });
        
        const [coupons] = await db.query(`
            SELECT * FROM coupons 
            WHERE code = ? AND is_active = 1 
            AND (end_date IS NULL OR end_date >= CURDATE())
        `, [code]);
        
        if (coupons.length === 0) return res.status(404).json({ success: false, message: 'Geçersiz veya süresi dolmuş kupon kodu.' });
        
        const coupon = coupons[0];
        
        if (coupon.target_audience === 'specific') {
            let allowedIds = [];
            try {
                allowedIds = typeof coupon.target_customer_ids === 'string' ? JSON.parse(coupon.target_customer_ids) : coupon.target_customer_ids;
            } catch (e) {}
            if (!allowedIds || !allowedIds.includes(customerId)) {
                return res.status(403).json({ success: false, message: 'Bu kupon hesabınız için geçerli değildir.' });
            }
        }
        
        if (coupon.minimum_order_amount && cartTotal < coupon.minimum_order_amount) {
            return res.status(400).json({ success: false, message: `Bu kuponu kullanmak için sepet tutarınız en az ${coupon.minimum_order_amount} TL olmalıdır.` });
        }
        
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: 'Kupon kullanım limitine ulaşmış.' });
        }
        
        let discountAmount = 0;
        if (coupon.discount_type === 'Percentage') {
            discountAmount = (cartTotal * coupon.discount_value) / 100;
            if (coupon.maximum_discount_amount && discountAmount > coupon.maximum_discount_amount) {
                discountAmount = coupon.maximum_discount_amount;
            }
        } else if (coupon.discount_type === 'FixedAmount') {
            discountAmount = coupon.discount_value;
        }
        
        if (discountAmount > cartTotal) discountAmount = cartTotal;
        
        res.json({ success: true, discountAmount, coupon });
    } catch (error) {
        console.error('Kupon uygulama hatası:', error);
        res.status(500).json({ success: false, message: 'Kupon uygulanamadı.' });
    }
});

module.exports = router;
