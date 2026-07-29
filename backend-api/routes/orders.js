/**
 * ============================================================================
 * DOSYA ADI: orders.js
 * MODÜL / KATMAN: Arkayüz Rota Tanımları - Müşteri Siparişleri Yönetimi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Gelen müşteri siparişlerinin (B2B / B2C) oluşturulması, listelenmesi, kalemlerinin (orderitems) yönetimi ve durum takibi (Beklemede, Hazırlanıyor vb.) işlevlerini yürütür.
 *   
 * YENİ EKLENEN ÖZELLİKLER (WMS ENTEGRASYONU):
 *   - FEFO (İlk Biten İlk Çıkar): Sipariş oluşturulduğunda stoklar rastgele değil, Son Kullanma Tarihi (SKT) en yakın olan partiden (batch) düşülür.
 *   - Kesin İade Takibi (deducted_batches): Sipariş oluşurken hangi raftan/partiden ne kadar ürün alındığı 'deducted_batches' isimli JSON sütununa kaydedilir.
 *   - Doğru İade Mantığı: Sipariş iptal edildiğinde veya silindiğinde, stoklar Ana Depo'ya değil, BİREBİR alındıkları orijinal raflarına (ve partilerine) aynı miktarda iade edilir.
 * 
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/orders - Tüm siparişleri ve kalemlerini getir
router.get('/', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, c.CustomerName, c.Email as CustomerEmail, c.Phone as CustomerPhone
            FROM orders o
            LEFT JOIN customers c ON o.CustomerId = c.Id
            ORDER BY o.Id DESC
        `);

        for (let order of orders) {
            const [items] = await db.query(`
                SELECT oi.*, p.ProductName, p.Barcode as ProductCode, p.unit_type as Unit,
                       COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = p.Id), 0) as CurrentStock
                FROM orderitems oi
                LEFT JOIN products p ON oi.ProductId = p.Id
                WHERE oi.OrderId = ?
            `, [order.Id]);
            order.items = items;
        }

        res.json({ success: true, data: orders });
    } catch (err) {
        console.error('Siparişler çekilirken hata:', err);
        res.status(500).json({ success: false, message: 'Siparişler yüklenemedi.' });
    }
});

// POST /api/orders - Yeni manuel sipariş oluştur ve stok kontrolü / otomatik üretim talebi yap
router.post('/', async (req, res) => {
    const { customerId, shippingAddress, items, userId, paymentMethod, campaignId, campaignName, discountAmount } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Müşteri ve en az bir sipariş kalemi gereklidir.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Sipariş Numarası oluştur
        const orderNumber = `SIP-${Date.now().toString().slice(-6)}`;

        // 2. Toplam tutarı hesapla
        let totalAmount = 0;
        for (const item of items) {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            totalAmount += (qty * price);
        }
        const finalDiscount = parseFloat(discountAmount) || 0;
        totalAmount = Math.max(0, totalAmount - finalDiscount);

        // 3. Siparişi kaydet
        const [orderRes] = await connection.query(`
            INSERT INTO orders (CustomerId, OrderNumber, OrderStatus, TotalAmount, ShippingAddress, OrderDate, PaymentMethod, CampaignId, CampaignName, DiscountAmount)
            VALUES (?, ?, 'Beklemede', ?, ?, NOW(), ?, ?, ?, ?)
        `, [customerId, orderNumber, totalAmount, shippingAddress || '', paymentMethod || 'Nakit', campaignId || null, campaignName || null, discountAmount || 0]);

        const orderId = orderRes.insertId;

        // 3.5. Finans Gelir İşlemi Oluştur (Müşteri Siparişi)
        await connection.query(`
            INSERT INTO finance_transactions (bank_account_id, type, amount, category, description, transaction_date)
            VALUES (NULL, 'GELİR', ?, 'Müşteri Siparişi', ?, NOW())
        `, [totalAmount, `Sipariş Geliri (${orderNumber}) - Ödeme: ${paymentMethod || 'Nakit'}`]);

        const autoProductionRequests = [];
        let orderDeductions = [];

        // 4. Kalemleri kaydet ve stok kontrolü / otomatik üretim talebi oluştur
        for (const item of items) {
            const productId = parseInt(item.productId);
            const qty = parseInt(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;

            if (!productId || qty <= 0) continue;

            // Kalemi ekle
            await connection.query(`
                INSERT INTO orderitems (OrderId, ProductId, Quantity, UnitPrice)
                VALUES (?, ?, ?, ?)
            `, [orderId, productId, qty, price]);

            // Mevcut stoku kontrol et
            const [stockRows] = await connection.query(`
                SELECT p.ProductName, p.Barcode as ProductCode, COALESCE(SUM(b.quantity), 0) as currentStock
                FROM products p
                LEFT JOIN wms_stock_balances b ON p.Id = b.product_id
                WHERE p.Id = ?
                GROUP BY p.Id
            `, [productId]);

            if (stockRows.length > 0) {
                const pInfo = stockRows[0];
                const currentStock = parseInt(pInfo.currentStock) || 0;

                // STOK AŞILIYOR mu? (Örn: Sipariş 10 adet, stokta 4 adet var -> 6 adet eksik!)
                if (qty > currentStock) {
                    const missingQty = qty - currentStock;
                    const reason = `Müşteri Siparişi (${orderNumber}) için stok yetersizliğinden otomatik oluşturuldu. Sipariş Edilen: ${qty}, Mevcut Stok: ${currentStock}, Üretilmesi Gereken: ${missingQty} Adet.`;

                    await connection.query(`
                        INSERT INTO production_requests (product_id, requested_quantity, source, creator, reason, priority, status, created_at)
                        VALUES (?, ?, 'Müşteri Siparişi', 'Sistem Otomasyonu', ?, 'Acil', 'Bekliyor', NOW())
                    `, [productId, missingQty, reason]);

                    autoProductionRequests.push({
                        productName: pInfo.ProductName,
                        missingQty: missingQty,
                        currentStock: currentStock,
                        orderedQty: qty
                    });
                }
            }

            // Anında Stoktan Düş (Beklemede olsa bile) - FEFO'ya göre
            let remainingToDeduct = qty;
            const [batches] = await connection.query(`
                SELECT id, quantity 
                FROM wms_stock_balances 
                WHERE product_id = ? AND quantity > 0 
                ORDER BY ISNULL(expiration_date), expiration_date ASC, id ASC
            `, [productId]);

            for (const batch of batches) {
                if (remainingToDeduct <= 0) break;
                let deduct = Math.min(batch.quantity, remainingToDeduct);
                await connection.query('UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ?', [deduct, batch.id]);
                remainingToDeduct -= deduct;
                orderDeductions.push({ batchId: batch.id, quantity: deduct });
            }

            // Eğer hala düşülecek miktar varsa (stok eksiye düşüyorsa), eksi bakiye satırı ekle
            if (remainingToDeduct > 0) {
                const [negResult] = await connection.query(`
                    INSERT INTO wms_stock_balances (product_id, quantity, batch_number) 
                    VALUES (?, ?, ?)
                `, [productId, -remainingToDeduct, orderNumber]);
                orderDeductions.push({ batchId: negResult.insertId, quantity: remainingToDeduct, isNegative: true });
            }
        }

        if (orderDeductions.length > 0) {
            await connection.query('UPDATE orders SET deducted_batches = ? WHERE Id = ?', [JSON.stringify(orderDeductions), orderId]);
        }

        await connection.commit();

        let msg = `Sipariş (${orderNumber}) başarıyla oluşturuldu.`;
        if (autoProductionRequests.length > 0) {
            const names = autoProductionRequests.map(r => `${r.productName} (${r.missingQty} Adet Üretim Talebi)`).join(', ');
            msg += `\n⚠️ DİKKAT: Stok yetersizliği nedeniyle şu ürünler için otomatik ACİL Üretim Talebi açıldı:\n${names}`;
        }

        res.json({
            success: true,
            message: msg,
            orderId: orderId,
            autoProductionRequests: autoProductionRequests
        });

    } catch (err) {
        await connection.rollback();
        console.error('Sipariş oluşturma hatası:', err);
        res.status(500).json({ success: false, message: 'Sipariş oluşturulurken bir hata meydana geldi: ' + err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/orders/:id/status - Sipariş durumu güncelle
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const [currOrder] = await connection.query('SELECT OrderStatus FROM orders WHERE Id = ?', [req.params.id]);
        if (currOrder.length === 0) throw new Error('Sipariş bulunamadı.');
        const oldStatus = currOrder[0].OrderStatus;

        if (status === oldStatus) {
            await connection.rollback();
            return res.json({ success: true, message: 'Durum aynı.' });
        }

        // 1. STOK YETERLİLİK KONTROLÜ (Beklemede -> Hazırlanıyor)
        if (status === 'Hazırlanıyor' && oldStatus === 'Beklemede') {
            // Stok daha önce Beklemede aşamasında eksi olarak yansıtılmıştı.
            // Eğer wms_stock_balances toplamı 0'dan küçükse, bu ürünün fiziksel olarak eksik olduğu anlamına gelir.
            const [items] = await connection.query(`
                SELECT oi.ProductId, oi.Quantity, p.ProductName,
                       COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = p.Id), 0) as currentStock
                FROM orderitems oi
                JOIN products p ON oi.ProductId = p.Id
                WHERE oi.OrderId = ?
            `, [req.params.id]);

            let outOfStockItems = [];
            for (const item of items) {
                if (item.currentStock < 0) {
                    outOfStockItems.push(`${item.ProductName} (Eksik: ${Math.abs(item.currentStock)})`);
                }
            }

            if (outOfStockItems.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false, 
                    message: 'Siparişteki bazı ürünler stokta yeterli miktarda bulunmuyor (veya üretim aşamasında)!\nBu yüzden sipariş "Hazırlanıyor" aşamasına alınamaz.\n\nYetersiz Ürünler:\n- ' + outOfStockItems.join('\n- ')
                });
            }
            // Zaten oluşturulurken stoktan düştüğümüz için burada tekrar düşmüyoruz.
        }

        if ((status === 'İptal' || status === 'İptal Edildi') && oldStatus !== 'İptal' && oldStatus !== 'İptal Edildi') {
            const [orderRows] = await connection.query('SELECT deducted_batches FROM orders WHERE Id = ?', [req.params.id]);
            let deductedBatches = null;
            try { if (orderRows[0] && orderRows[0].deducted_batches) deductedBatches = JSON.parse(orderRows[0].deducted_batches); } catch(e){ console.warn('JSON Parse Error (deducted_batches):', e.message); }

            if (deductedBatches && Array.isArray(deductedBatches)) {
                // Yeni Sistem: Kesin İade
                for (const d of deductedBatches) {
                    await connection.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [d.quantity, d.batchId]);
                }
            } else {
                // Eski Sistem (Geriye Dönük Uyumluluk)
                const [items] = await connection.query('SELECT ProductId, Quantity FROM orderitems WHERE OrderId = ?', [req.params.id]);
                for (const item of items) {
                    const qty = parseInt(item.Quantity);
                    
                    const [negatives] = await connection.query(`
                        SELECT id, quantity 
                        FROM wms_stock_balances 
                        WHERE product_id = ? AND quantity < 0 
                        ORDER BY id ASC
                    `, [item.ProductId]);

                    let remainingToAdd = qty;

                    for (const neg of negatives) {
                        if (remainingToAdd <= 0) break;
                        let toAdd = Math.min(Math.abs(neg.quantity), remainingToAdd);
                        await connection.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [toAdd, neg.id]);
                        remainingToAdd -= toAdd;
                    }

                    if (remainingToAdd > 0) {
                        const [exist] = await connection.query('SELECT id FROM wms_stock_balances WHERE product_id = ? AND quantity >= 0 LIMIT 1', [item.ProductId]);
                        if (exist.length > 0) {
                            await connection.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [remainingToAdd, exist[0].id]);
                        } else {
                            await connection.query('INSERT INTO wms_stock_balances (product_id, quantity) VALUES (?, ?)', [item.ProductId, remainingToAdd]);
                        }
                    }
                }
            }
        }

        await connection.query('UPDATE orders SET OrderStatus = ? WHERE Id = ?', [status, req.params.id]);
        await connection.commit();
        res.json({ success: true, message: 'Sipariş durumu güncellendi.' });
    } catch (err) {
        await connection.rollback();
        console.error('Durum güncelleme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// DELETE /api/orders/:id - Siparişi ve kalemlerini sil
router.delete('/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [currOrder] = await connection.query('SELECT OrderStatus, deducted_batches FROM orders WHERE Id = ?', [req.params.id]);
        if (currOrder.length > 0) {
            const oldStatus = currOrder[0].OrderStatus;
            // Eğer sipariş daha önce İptal EDİLMEDİYSE, stoka iade işlemini yap
            if (oldStatus !== 'İptal' && oldStatus !== 'İptal Edildi') {
                const deductedBatches = currOrder[0].deducted_batches ? JSON.parse(currOrder[0].deducted_batches) : null;
                
                if (deductedBatches && Array.isArray(deductedBatches)) {
                    for (const d of deductedBatches) {
                        await connection.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [d.quantity, d.batchId]);
                    }
                } else {
                    const [items] = await connection.query('SELECT ProductId, Quantity FROM orderitems WHERE OrderId = ?', [req.params.id]);
                    for (const item of items) {
                        const qty = parseInt(item.Quantity);
                        
                        const [negatives] = await connection.query(`
                            SELECT id, quantity 
                            FROM wms_stock_balances 
                            WHERE product_id = ? AND quantity < 0 
                            ORDER BY id ASC
                        `, [item.ProductId]);

                        let remainingToAdd = qty;

                        for (const neg of negatives) {
                            if (remainingToAdd <= 0) break;
                            let toAdd = Math.min(Math.abs(neg.quantity), remainingToAdd);
                            await connection.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [toAdd, neg.id]);
                            remainingToAdd -= toAdd;
                        }

                        if (remainingToAdd > 0) {
                            const [exist] = await connection.query('SELECT id FROM wms_stock_balances WHERE product_id = ? AND quantity >= 0 LIMIT 1', [item.ProductId]);
                            if (exist.length > 0) {
                                await connection.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [remainingToAdd, exist[0].id]);
                            } else {
                                await connection.query('INSERT INTO wms_stock_balances (product_id, quantity) VALUES (?, ?)', [item.ProductId, remainingToAdd]);
                            }
                        }
                    }
                }
            }
        }

        await connection.query('DELETE FROM orderitems WHERE OrderId = ?', [req.params.id]);
        await connection.query('DELETE FROM orders WHERE Id = ?', [req.params.id]);
        await connection.commit();
        res.json({ success: true, message: 'Sipariş başarıyla silindi ve stoklar iade edildi.' });
    } catch (err) {
        await connection.rollback();
        console.error('Sipariş silme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// PUT /api/orders/:id/approve - Siparişi Onayla ve Kutu/Kargo Ata
router.put('/:id/approve', async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // 1. Fetch order items with their product dimensions
        const [items] = await db.query(`
            SELECT oi.Quantity, p.Width, p.Height, p.Depth, p.Weight
            FROM orderitems oi
            JOIN products p ON oi.ProductId = p.Id
            WHERE oi.OrderId = ?
        `, [orderId]);
        
        if (items.length === 0) return res.status(400).json({ success: false, message: 'Siparişte ürün yok.' });
        
        let totalVolume = 0;
        let totalWeight = 0;
        
        for (const item of items) {
            const w = parseFloat(item.Width) || 10; // Default 10cm if not set
            const h = parseFloat(item.Height) || 10;
            const d = parseFloat(item.Depth) || 10;
            const weight = parseFloat(item.Weight) || 0.5; // Default 0.5kg
            const qty = parseInt(item.Quantity) || 1;
            
            totalVolume += (w * h * d) * qty;
            totalWeight += weight * qty;
        }
        
        // 2. Fetch all active boxes
        const [boxes] = await db.query('SELECT * FROM packaging_boxes WHERE IsActive = 1');
        
        if (boxes.length === 0) {
            return res.status(400).json({ success: false, message: 'Sistemde aktif kutu tanımı bulunmuyor.' });
        }
        
        // Calculate max volume for each box
        const processedBoxes = boxes.map(b => ({
            ...b,
            volume: parseFloat(b.Width) * parseFloat(b.Height) * parseFloat(b.Depth),
            cost: parseFloat(b.Cost),
            maxWeight: parseFloat(b.MaxWeightCapacity),
            emptyWeight: parseFloat(b.EmptyWeight)
        }));
        
        // 3. Find optimal box combination using 3D Packing (Guillotine Split Heuristic)
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
                
                // Sort spaces by volume ascending to find tightest fit
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
            for (let i = 0; i < (parseInt(item.Quantity) || 1); i++) {
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
                // Apply padding: 2.5cm each side (total 5cm w, 5cm d), 3cm top (total 3cm h)
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
                    // Extremely large item, doesn't fit even largest box net space.
                    bestCombo.push(largestBox);
                    units.shift(); // Force skip 1 item to prevent infinite loop
                } else {
                    bestCombo.push(largestBox);
                    units = remainingUnits;
                }
            }
        }
        
        // Final calculations
        let finalBoxWeight = 0;
        let selectedBoxInfo = [];
        for(let box of bestCombo) {
            finalBoxWeight += box.emptyWeight;
            selectedBoxInfo.push({ id: box.Id, name: box.BoxName, cost: box.cost });
        }
        
        const overallTotalWeight = totalWeight + finalBoxWeight;
        
        // 4. Generate Cargo Barcode
        const cargoBarcode = 'CRG-' + orderId + '-' + Date.now().toString().slice(-4);
        
        // 5. Update Order
        await db.query(`
            UPDATE orders 
            SET OrderStatus = 'Onaylandı', CargoBarcode = ?, TotalWeight = ?, packaging_info = ?
            WHERE Id = ?
        `, [cargoBarcode, overallTotalWeight, JSON.stringify(selectedBoxInfo), orderId]);
        
        res.json({ success: true, message: 'Sipariş onaylandı ve kargo ataması yapıldı.', cargoBarcode, boxes: selectedBoxInfo });
        
    } catch (err) {
        console.error('Sipariş onay hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + err.message });
    }
});

// GET /api/orders/by-cargo/:barcode - Kargo barkoduna göre sipariş getir (Paketleme / Kurye için)
router.get('/by-cargo/:barcode', async (req, res) => {
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
        
        // Ürün kalemlerini getir
        const [items] = await db.query(`
            SELECT oi.*, p.ProductName, p.Barcode as ProductCode 
            FROM orderitems oi
            LEFT JOIN products p ON oi.ProductId = p.Id
            WHERE oi.OrderId = ?
        `, [order.Id]);
        
        order.items = items;
        
        res.json({ success: true, data: order });
    } catch (err) {
        console.error('Barkod ile arama hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// PUT /api/orders/:id/status - Siparişin statüsünü güncelle
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.query('UPDATE orders SET OrderStatus = ? WHERE Id = ?', [status, req.params.id]);
        res.json({ success: true, message: `Sipariş durumu ${status} olarak güncellendi.` });
    } catch (err) {
        console.error('Statü güncelleme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// PUT /api/orders/:id/pack - Siparişi paketle (Kutu seç ve kargoya ver)
router.put('/:id/pack', async (req, res) => {
    const { BoxId, TrackingNumber } = req.body;
    try {
        await db.query(`
            UPDATE orders 
            SET BoxId = ?, TrackingNumber = ?, OrderStatus = 'Kargoya Verildi', CargoStatus = 'Transfer Merkezine Gidiyor' 
            WHERE Id = ?
        `, [BoxId || null, TrackingNumber || null, req.params.id]);
        res.json({ success: true, message: 'Paketleme tamamlandı, sipariş kargoya verildi.' });
    } catch (err) {
        console.error('Paketleme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/orders/webhook/kargo - Kargo firmasından gelen durum güncellemelerini alır
router.post('/webhook/kargo', async (req, res) => {
    // Örnek Webhook Payload: { trackingNumber: 'CRG-123', status: 'DELIVERED', subStatus: 'Teslim Edildi' }
    const { trackingNumber, status, subStatus } = req.body;
    
    if (!trackingNumber) {
        return res.status(400).json({ success: false, message: 'TrackingNumber gerekli' });
    }
    
    try {
        if (status === 'DELIVERED' || status === 'Teslim Edildi') {
            await db.query(`
                UPDATE orders 
                SET OrderStatus = 'Teslim Edildi', CargoStatus = 'Teslim Edildi' 
                WHERE TrackingNumber = ?
            `, [trackingNumber]);
        } else {
            await db.query(`
                UPDATE orders 
                SET CargoStatus = ? 
                WHERE TrackingNumber = ?
            `, [subStatus || status, trackingNumber]);
        }
        
        res.json({ success: true, message: 'Kargo durumu güncellendi.' });
    } catch (err) {
        console.error('Webhook hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

module.exports = router;
