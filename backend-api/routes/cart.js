/**
 * ============================================================================
 * BİLEŞEN ADI: cart
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const rateLimit = require('express-rate-limit');

// GÜVENLİK: Sepet işlemleri için rate limiter (DoS + stok manipulasyonu önleme)
const cartLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Sepet işlemlerini çok hızlı yapıyorsunuz. Lütfen bekleyin.' }
});

// GÜVENLİK: session_id format doğrulama (UUID v4 formatı)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidSessionId = (id) => typeof id === 'string' && UUID_REGEX.test(id);

router.use(cartLimiter);

// Yardımcı Fonksiyon: Süresi geçmiş rezervasyonları temizle
async function cleanupExpiredReservations() {
    try {
        await prisma.$executeRawUnsafe('DELETE FROM cart_reservations WHERE expires_at < NOW()');
    } catch (err) {
        console.error("Süresi dolmuş rezervasyonları temizleme hatası:", err);
    }
}

// POST /api/cart/reserve - Sepete ürün ekle ve stok ayır
router.post('/reserve', async (req, res) => {
    const { session_id, product_id, quantity } = req.body;
    
    const quantityInt = parseInt(quantity, 10);
    const productIdInt = parseInt(product_id, 10);

    // GÜVENLİK: session_id formatını doğrula (UUID zorunlu)
    if (!isValidSessionId(session_id) || isNaN(productIdInt) || isNaN(quantityInt) || quantityInt < 0) {
        return res.status(400).json({ success: false, message: 'Eksik veya geçersiz parametre.' });
    }

    try {
        // Önce süresi dolmuş olanları temizle
        await cleanupExpiredReservations();

        // Ürünün gerçek kullanılabilir stoğunu hesapla
        const product = await prisma.products.findUnique({
            where: { Id: productIdInt }
        });

        if (!product || !product.is_active) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı veya pasif.' });
        }

        const wmsStockRes = await prisma.$queryRawUnsafe('SELECT SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ?', productIdInt);
        const wmsStock = wmsStockRes.length > 0 && wmsStockRes[0].qty !== null ? Number(wmsStockRes[0].qty) : product.StockQuantity;

        const activeReservations = await prisma.$queryRawUnsafe('SELECT SUM(quantity) as sum_qty FROM cart_reservations WHERE product_id = ? AND session_id != ? AND expires_at > NOW()', productIdInt, session_id);
        const reservedAmount = activeReservations.length > 0 ? Number(activeReservations[0].sum_qty) || 0 : 0;

        const unpickedOrders = await prisma.$queryRawUnsafe(`
            SELECT SUM(oi.Quantity) as sum_qty 
            FROM orderitems oi 
            JOIN orders o ON oi.OrderId = o.Id 
            WHERE oi.ProductId = ? 
            AND o.OrderStatus IN ('Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Toplamada', 'İptal Bekliyor')
        `, productIdInt);
        const unpickedAmount = unpickedOrders.length > 0 ? Number(unpickedOrders[0].sum_qty) || 0 : 0;

        const availableStock = wmsStock - reservedAmount - unpickedAmount;

        // Mevcut kullanıcı için bu üründe zaten bir rezervasyon var mı?
        const existingResList = await prisma.$queryRawUnsafe('SELECT * FROM cart_reservations WHERE session_id = ? AND product_id = ? LIMIT 1', session_id, productIdInt);
        const existingReservation = existingResList.length > 0 ? existingResList[0] : null;

        const requestedAdditional = quantityInt - (existingReservation ? existingReservation.quantity : 0);

        // Eğer toplam istenen miktar, kullanıcının alabileceği maksimum stoktan fazlaysa red et
        if (quantityInt > availableStock) {
            return res.status(400).json({ 
                success: false, 
                message: 'Yetersiz stok. Üründen en fazla ' + availableStock + ' adet alabilirsiniz.',
                availableStock: availableStock
            });
        }

        if (existingReservation) {
            if (quantityInt <= 0) {
                // Miktar 0 yapıldıysa rezervasyonu sil
                await prisma.$executeRawUnsafe('DELETE FROM cart_reservations WHERE id = ?', existingReservation.id);
            } else {
                // Güncelle ve süreyi uzat
                await prisma.$executeRawUnsafe('UPDATE cart_reservations SET quantity = ?, expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?', quantityInt, existingReservation.id);
            }
        } else if (quantityInt > 0) {
            // Yeni rezervasyon oluştur
            await prisma.$executeRawUnsafe('INSERT INTO cart_reservations (session_id, product_id, quantity, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))', session_id, productIdInt, quantityInt);
        }

        res.json({ success: true, message: 'Stok ayrıldı.' });
    } catch (error) {
        console.error('Rezervasyon hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/cart/release - Ürünü sepetten çıkar ve stoku serbest bırak
router.post('/release', async (req, res) => {
    const { session_id, product_id } = req.body;

    if (!isValidSessionId(session_id) || !product_id) {
        return res.status(400).json({ success: false, message: 'Eksik parametre.' });
    }

    try {
        await prisma.$executeRawUnsafe('DELETE FROM cart_reservations WHERE session_id = ? AND product_id = ?', session_id, parseInt(product_id));
        res.json({ success: true, message: 'Stok serbest bırakıldı.' });
    } catch (error) {
        console.error('Serbest bırakma hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/cart/clear - Sepeti tamamen boşalt
router.post('/clear', async (req, res) => {
    const { session_id } = req.body;

    if (!isValidSessionId(session_id)) {
        return res.status(400).json({ success: false, message: 'Eksik parametre.' });
    }

    try {
        await prisma.$executeRawUnsafe('DELETE FROM cart_reservations WHERE session_id = ?', session_id);
        res.json({ success: true, message: 'Sepet temizlendi, stoklar serbest.' });
    } catch (error) {
        console.error('Sepet temizleme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/cart/ping - Sepet oturumunu canlı tut (Süreyi 10 dk daha uzat)
router.post('/ping', async (req, res) => {
    const { session_id } = req.body;
    if (!session_id) return res.json({ success: true });
    if (!isValidSessionId(session_id)) return res.status(400).json({ success: false, message: 'Geçersiz session_id.' });

    try {
        const expiresAt = new Date(Date.now() + 10 * 60000);
        await prisma.$executeRawUnsafe('UPDATE cart_reservations SET expires_at = ? WHERE session_id = ?', expiresAt, session_id);
        res.json({ success: true });
    } catch (err) {
        console.error('Ping hatası:', err);
        res.json({ success: false });
    }
});

// GET /api/cart/my-reservations - Oturumdaki aktif rezervasyonları getir
router.get('/my-reservations', async (req, res) => {
    const { session_id } = req.query;
    if (!isValidSessionId(session_id)) return res.status(400).json({ success: false, message: 'Eksik parametre.' });

    try {
        await cleanupExpiredReservations();
        const reservations = await prisma.$queryRawUnsafe('SELECT product_id, quantity FROM cart_reservations WHERE session_id = ? AND expires_at > NOW()', session_id);
        res.json({ success: true, data: reservations });
    } catch (error) {
        console.error('Rezervasyonları getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/cart/validate-stock - Sepetteki ürünlerin güncel stok durumunu kontrol et
router.post('/validate-stock', async (req, res) => {
    const { session_id, items } = req.body;
    if (!isValidSessionId(session_id) || !Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'Eksik parametre.' });
    }

    try {
        await cleanupExpiredReservations();
        const invalidIds = [];

        for (const item of items) {
            const itemIdInt = parseInt(item.Id, 10);
            const itemQtyInt = parseInt(item.quantity, 10);
            
            if (isNaN(itemIdInt) || isNaN(itemQtyInt) || itemQtyInt < 0) continue;

            const product = await prisma.products.findUnique({
                where: { Id: itemIdInt }
            });

            if (!product || !product.is_active) {
                invalidIds.push(item.Id);
                continue;
            }

            const wmsStockRes = await prisma.$queryRawUnsafe('SELECT SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ?', itemIdInt);
            const wmsStock = wmsStockRes.length > 0 && wmsStockRes[0].qty !== null ? Number(wmsStockRes[0].qty) : product.StockQuantity;

            // session_id hariç diğer kişilerin aktif rezervasyonlarını bul
            const otherReservations = await prisma.$queryRawUnsafe('SELECT SUM(quantity) as sum_qty FROM cart_reservations WHERE product_id = ? AND session_id != ? AND expires_at > NOW()', itemIdInt, session_id);
            const otherReservedAmount = otherReservations.length > 0 ? Number(otherReservations[0].sum_qty) || 0 : 0;
            
            const realAvailableStock = wmsStock - otherReservedAmount;

            if (realAvailableStock < itemQtyInt) {
                invalidIds.push(item.Id);
            }
        }

        res.json({ success: true, invalidIds });
    } catch (error) {
        console.error('Stok doğrulama hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

module.exports = router;

