const express = require('express');
const router = express.Router();
const db = require('../db');

// Basit bir "AI" rota sıralama fonksiyonu
// Koridor-A-Raf-3 gibi bir metni anlamlı bir şekilde sıralar.
function sortLocation(a, b) {
    const locA = a.Location ? String(a.Location) : '';
    const locB = b.Location ? String(b.Location) : '';
    if (!locA && !locB) return 0;
    if (!locA) return 1;
    if (!locB) return -1;
    return locA.localeCompare(locB, undefined, { numeric: true, sensitivity: 'base' });
}

// Kutu hesaplama mantığı (orders.js'den uyarlandı)
async function calculateBoxes(totalWeight, totalVolume, maxWeightParam = null) {
    // Burada basitçe, hacme ve ağırlığa göre bir kutu seçimi yapılabilir
    // Şimdilik orders.js'deki mantığı taklit ediyoruz:
    const [boxes] = await db.query('SELECT * FROM packaging_boxes WHERE IsActive = 1 ORDER BY Width * Height * Depth ASC');
    if (boxes.length === 0) {
        return { boxesUsed: [], totalFinalWeight: totalWeight, error: 'Aktif kutu bulunamadı.' };
    }
    let selectedBox = boxes[boxes.length - 1]; // En büyük kutuyu varsayılan yap (hiçbirine sığmazsa)
    
    // Hacim (volume) ve Ağırlık (weight) kontrolü (Küçükten büyüğe sırayla)
    for (const box of boxes) {
        const boxVolume = parseFloat(box.Width || 0) * parseFloat(box.Height || 0) * parseFloat(box.Depth || 0);
        const maxCap = parseFloat(box.MaxWeightCapacity) || 99999;
        
        if (totalWeight <= maxCap && totalVolume <= boxVolume) {
            selectedBox = box;
            break; // Sığan ilk (en küçük) kutuyu bulduk!
        }
    }

    return {
        boxesUsed: [{ boxId: selectedBox.Id, boxName: selectedBox.BoxName }],
        totalFinalWeight: totalWeight + (parseFloat(selectedBox.EmptyWeight) || 0),
        boxDetails: selectedBox
    };
}

// GET: Onaylanmış siparişlerin listesini al
router.get('/orders/pending', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT Id, OrderNumber FROM orders 
            WHERE OrderStatus = 'Onaylandı' AND PickerId IS NULL 
            ORDER BY Id ASC
        `);
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Bekleyen siparişleri alma hatası:', error);
        res.status(500).json({ success: false, message: 'Siparişler getirilemedi.' });
    }
});

// POST: Belirli bir siparişi al (atama)
router.post('/orders/assign/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) return res.status(400).json({ success: false, message: 'Kullanıcı ID gerekli.' });

    try {
        // Atomic update ile race condition (aynı anda sipariş alınması) önlenir
        const [updateResult] = await db.query(`
            UPDATE orders SET OrderStatus = 'Hazırlanıyor', PickerId = ? 
            WHERE Id = ? AND OrderStatus = 'Onaylandı' AND PickerId IS NULL
        `, [userId, id]);

        if (updateResult.affectedRows === 0) {
            return res.json({ success: false, message: 'Bu sipariş zaten alınmış veya bulunamıyor.' });
        }

        // Sipariş başarıyla bu personele kilitlendi, şimdi bilgilerini çekelim
        const [orders] = await db.query(`
            SELECT * FROM orders WHERE Id = ?
        `, [id]);

        const order = orders[0];

        // Sipariş kalemlerini ve ürün detaylarını getir
        const [items] = await db.query(`
            SELECT oi.*, p.ProductName, p.Barcode, p.Weight, p.ImagePath,
                   COALESCE(
                       (SELECT GROUP_CONCAT(DISTINCT shelf_code SEPARATOR ', ') 
                        FROM wms_stock_balances 
                        WHERE product_id = p.Id AND quantity > 0),
                       p.Location
                   ) AS Location
            FROM orderitems oi
            JOIN products p ON oi.ProductId = p.Id
            WHERE oi.OrderId = ?
        `, [order.Id]);

        // Rota Optimizasyonu
        items.sort(sortLocation);

        res.json({
            success: true,
            order: order,
            items: items
        });

    } catch (error) {
        console.error('Sipariş atama hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş atanamadı.' });
    }
});

// GET: Sonraki rastgele siparişi al
router.get('/orders/next', async (req, res) => {
    const { userId } = req.query; // Mobile app'den giriş yapan personelin ID'si gelmeli
    
    if (!userId) return res.status(400).json({ success: false, message: 'Kullanıcı ID gerekli.' });

    try {
        // Önce kullanıcının üzerinde halihazırda 'Hazırlanıyor' olan bir sipariş var mı kontrol edelim
        const [existingOrders] = await db.query(`
            SELECT * FROM orders WHERE OrderStatus = 'Hazırlanıyor' AND PickerId = ? LIMIT 1
        `, [userId]);

        let order = existingOrders.length > 0 ? existingOrders[0] : null;

        if (!order) {
            // Yoksa en eski 'Onaylandı' siparişini atomic update ile kendine kilitle (Race condition engellemek için)
            const [updateResult] = await db.query(`
                UPDATE orders SET OrderStatus = 'Hazırlanıyor', PickerId = ? 
                WHERE OrderStatus = 'Onaylandı' AND PickerId IS NULL 
                ORDER BY Id ASC LIMIT 1
            `, [userId]);
            
            if (updateResult.affectedRows === 0) {
                return res.json({ success: false, message: 'Toplanacak sipariş bulunmuyor.' });
            }

            // Kilitlenen siparişi çek
            const [newOrders] = await db.query(`
                SELECT * FROM orders WHERE OrderStatus = 'Hazırlanıyor' AND PickerId = ? ORDER BY Id DESC LIMIT 1
            `, [userId]);
            
            order = newOrders[0];
        }

        // Sipariş kalemlerini ve ürün detaylarını (gerçek depo raf konumlarıyla) getir
        const [items] = await db.query(`
            SELECT oi.*, p.ProductName, p.Barcode, p.Weight, p.ImagePath,
                   COALESCE(
                       (SELECT GROUP_CONCAT(DISTINCT shelf_code SEPARATOR ', ') 
                        FROM wms_stock_balances 
                        WHERE product_id = p.Id AND quantity > 0),
                       p.Location
                   ) AS Location
            FROM orderitems oi
            JOIN products p ON oi.ProductId = p.Id
            WHERE oi.OrderId = ?
        `, [order.Id]);

        // "AI" Rota Optimizasyonu: Konuma göre sıralama
        items.sort(sortLocation);

        res.json({
            success: true,
            order: order,
            items: items
        });

    } catch (error) {
        console.error('Mobil sipariş alma hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş getirilemedi. Hata: ' + (error.message || error.toString()) });
    }
});

// POST: Toplama işlemini iptal et (Geri Dön)
router.post('/orders/cancel/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'Kullanıcı ID gerekli.' });

    try {
        await db.query(`
            UPDATE orders SET OrderStatus = 'Onaylandı', PickerId = NULL 
            WHERE Id = ? AND PickerId = ? AND OrderStatus = 'Hazırlanıyor'
        `, [id, userId]);

        res.json({ success: true, message: 'Sipariş başarıyla iptal edildi ve geri alındı.' });
    } catch (error) {
        console.error('İptal hatası:', error);
        res.status(500).json({ success: false, message: 'İptal işlemi başarısız.' });
    }
});

// POST: Siparişi tamamla
router.post('/orders/complete/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, totalCalculatedWeight } = req.body; // Cihazdan toplam ağırlık hesaplanıp gönderilebilir veya backend'de hesaplanabilir

    try {
        // Siparişin kalemlerini alıp toplam ağırlığını bulalım
        const [items] = await db.query(`
            SELECT oi.Quantity, p.Weight, p.Volume 
            FROM orderitems oi
            JOIN products p ON oi.ProductId = p.Id
            WHERE oi.OrderId = ?
        `, [id]);

        let totalWeight = 0;
        let totalVolume = 0;
        items.forEach(item => {
            totalWeight += (parseFloat(item.Weight) || 0.5) * item.Quantity;
            totalVolume += (parseFloat(item.Volume) || 1.0) * item.Quantity;
        });

        // Kutu hesaplama
        const boxResult = await calculateBoxes(totalWeight, totalVolume);
        const finalWeight = boxResult.totalFinalWeight;
        const cargoBarcode = 'CRG-' + id + '-' + Math.floor(Math.random() * 10000); // Basit barkod üretimi

        // Siparişi Paketlendi durumuna getir
        await db.query(`
            UPDATE orders 
            SET OrderStatus = 'Paketlendi', PickedDate = NOW(), CargoBarcode = ?, TotalWeight = ?, packaging_info = ?
            WHERE Id = ? AND PickerId = ?
        `, [cargoBarcode, finalWeight, JSON.stringify(boxResult), id, userId]);

        res.json({
            success: true,
            message: 'Sipariş başarıyla tamamlandı.',
            cargoBarcode: cargoBarcode,
            finalWeight: finalWeight,
            boxInfo: boxResult
        });

    } catch (error) {
        console.error('Mobil sipariş tamamlama hatası:', error);
        res.status(500).json({ success: false, message: 'Sipariş tamamlanamadı.' });
    }
});

// GET: Günlük istatistikler (Liderlik Tablosu)
router.get('/stats/daily', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                u.id as UserId, 
                u.name as UserName,
                COUNT(DISTINCT o.Id) as TotalOrdersPicked,
                COALESCE(SUM(oi.Quantity), 0) as TotalProductsPicked
            FROM users u
            JOIN orders o ON u.id = o.PickerId
            JOIN orderitems oi ON o.Id = oi.OrderId
            WHERE DATE(o.PickedDate) = CURDATE() AND o.OrderStatus IN ('Onaylandı', 'Kargoya Verildi', 'Teslim Edildi')
            GROUP BY u.id, u.name
            ORDER BY TotalProductsPicked DESC
        `);

        res.json({ success: true, stats: stats });
    } catch (error) {
        console.error('İstatistik getirme hatası:', error);
        res.status(500).json({ success: false, message: 'İstatistikler getirilemedi.' });
    }
});

module.exports = router;
