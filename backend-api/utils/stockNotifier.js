/**
 * ============================================================================
 * DOSYA ADI: stockNotifier.js
 * MODÜL / KATMAN: Arkayüz Yardımcısı (Utility) - Kritik Stok Uyarıcısı
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Stok miktarı kritik seviyenin (minimum stok eşiğinin) altına düşen ürünleri periyodik olarak veya işlem anında tespit ederek yöneticilere bildirim/uyarı oluşturan arka plan yardımcısıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Veritabanı Analiz Sorguları, Zamanlanmış/Tetiklenmiş Kontroller
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - WMS stok hareket rotaları işlem yaptığında veya periyodik görevlerde tetiklenerek emailService ile haberleşir.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu modül, stok seviyesi kritik sınırın altına düşen ürünleri tespit edip 
 * otomatik satın alma talebi açan veya e-posta gönderen stok uyarı sistemidir.
 */

const db = require('../db');
const { sendLowStockEmail } = require('../services/emailService');

// Kritik stok seviyesinin altına düşen ürünleri yakalayıp sipariş oluşturur
const checkAndNotifyLowStock = async (productId) => {
    try {
        // Ürünün depodaki güncel toplam miktarını çekiyoruz
        const [productRows] = await db.query(`
            SELECT p.*, 
                   COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = p.Id), 0) AS currentStock
            FROM products p
            WHERE p.Id = ?
        `, [productId]);

        if (productRows.length === 0) return;
        const product = productRows[0];

        // Kritik stok girilmemişse veya stok hala yeterliyse pas geç
        if (!product.critical_stock_level || product.critical_stock_level <= 0) return;
        if (product.currentStock > product.critical_stock_level) return;

        // Son 6 ayın satış verisine bakarak ne kadar sipariş edeceğimizi bulalım
        let orderQty = 0;
        const [salesData] = await db.query(`
            SELECT COALESCE(SUM(oi.Quantity), 0) as total_sold
            FROM orderitems oi
            JOIN orders o ON oi.OrderId = o.Id
            WHERE oi.ProductId = ? AND o.OrderDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        `, [productId]);

        const totalSold = parseInt(salesData[0]?.total_sold) || 0;
        
        // Eğer satışı varsa, bi 6 ay daha idare edecek kadar sipariş açıyoruz
        if (totalSold > 0) {
            orderQty = totalSold - product.currentStock;
        }
        
        // Eğer ürün yeni eklendiyse (hiç satışı yoksa), saçma sapan rakamlar çıkmasın diye kritik stok * 3 sipariş veriyoruz
        if (orderQty <= 0) {
            let fallbackQty = (product.critical_stock_level || 50) * 3;
            orderQty = fallbackQty;
        }

        // Ürünün minimum üretim miktarı varsa onu eziyoruz (bant boşuna çalışmasın diye)
        const minProduction = parseFloat(product.minimum_production_quantity) || 0;
        if (minProduction > 0 && orderQty < minProduction) {
            orderQty = minProduction;
        }

        // Üretilen (Fason/Dahili) ürünse makine kapasitelerine bakmamız lazım
        if (product.supply_type === 'MANUFACTURE') {
            try {
                const formula = JSON.parse(product.Formula || '[]');
                let totalPerProductVolume = 0;
                let usedMachineIds = new Set();
                
                // Reçeteyi gezip 1 ürün için toplam ne kadar harcıyoruz hesaplıyoruz
                for (const step of formula) {
                    if (step.machine_id) usedMachineIds.add(step.machine_id);
                    
                    for (const mat of (step.materials || [])) {
                        let mQty = parseFloat(mat.quantity) || 0;
                        let mUnit = (mat.unit || '').toLowerCase();
                        // Hepsini KG / Litre bazına çeviriyoruz ki hesap kolay olsun
                        if (mUnit === 'gr' || mUnit === 'ml') {
                            totalPerProductVolume += (mQty / 1000);
                        } else if (mUnit === 'kg' || mUnit === 'l' || mUnit === 'litre') {
                            totalPerProductVolume += mQty;
                        } else if (mUnit === 'tank') {
                            totalPerProductVolume += (mQty * 1000); 
                        }
                    }
                }
                
                // Kullanılan makinelerden min kapasitesi en yüksek olanı (en nazlısını) buluyoruz
                if (usedMachineIds.size > 0 && totalPerProductVolume > 0) {
                    const [machines] = await db.query('SELECT min_capacity FROM production_machines WHERE id IN (?)', [Array.from(usedMachineIds)]);
                    
                    let highestMinCapacity = 0;
                    for (const m of machines) {
                        const mMin = parseFloat(m.min_capacity) || 0;
                        if (mMin > highestMinCapacity) highestMinCapacity = mMin;
                    }
                    
                    if (highestMinCapacity > 0) {
                        // Makineyi çalıştırmaya değecek kadar sipariş adedini buluyoruz
                        const requiredPieces = Math.ceil(highestMinCapacity / totalPerProductVolume);
                        if (orderQty < requiredPieces) {
                            orderQty = requiredPieces;
                        }
                    }
                }
            } catch (err) {
                console.warn('Makine kapasite hesabında sorun çıktı:', err.message);
            }

            // Zaten bekleyen bir üretim talebi varsa yenisini açıp ortalığı karıştırmayalım
            const [activeProdRequests] = await db.query(`
                SELECT id FROM production_requests 
                WHERE product_id = ? AND status IN ('Bekleyen', 'Üretimde')
                LIMIT 1
            `, [productId]);

            if (activeProdRequests.length > 0) return; 

            // Üretim talebini sisteme atıyoruz
            await db.query(`
                INSERT INTO production_requests (product_id, requested_quantity, source, reason, status, priority)
                VALUES (?, ?, 'Sistem', 'Otomatik Kritik Stok Uyarıcısı', 'Bekleyen', 'Yüksek')
            `, [productId, orderQty]);
            return; 
        }

        // Satın alma veya Fason değilse işlem yapma (örn. Hammadde ise)
        if (product.supply_type !== 'PURCHASE' && product.supply_type !== 'OUTSOURCED' && product.Category !== 'Hammadde') {
            return; 
        }

        // Aynı üründen bekleyen satın alma varsa es geçiyoruz (çift sipariş olmasın)
        const [activeRequests] = await db.query(`
            SELECT id FROM purchase_requests 
            WHERE product_name = ? AND status IN ('Bekliyor', 'Fiyat Bekleniyor')
            LIMIT 1
        `, [product.ProductName]);

        if (activeRequests.length > 0) return;

        // Tedarikçileri çekiyoruz
        const [suppliers] = await db.query(`
            SELECT ps.*, s.SupplierName, s.Email 
            FROM product_suppliers ps
            JOIN suppliers s ON ps.supplier_id = s.Id
            WHERE ps.product_id = ?
            ORDER BY ps.id ASC
        `, [productId]);

        // Tedarikçisi yoksa boş bir kayıt açıyoruz sonradan bakarız diye
        if (suppliers.length === 0) {
            await db.query(`
                INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                VALUES (?, ?, ?, 'Bekliyor', NULL)
            `, [product.ProductName, orderQty, `Otomatik Kritik Stok (Tedarikçi Atanmamış)`]);
            return;
        }

        // %80 - %20 PAYLAŞIM KURALI (Riski dağıtmak için)
        if (suppliers.length === 1) {
            // Tek tedarikçi varsa mecbur hepsini ona veriyoruz
            await db.query(`
                INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                VALUES (?, ?, ?, 'Bekliyor', ?)
            `, [product.ProductName, orderQty, `Otomatik Kritik Stok (%100)`, suppliers[0].supplier_id]);
        } else {
            // Ana tedarikçiye %80, yedeğe %20 paslıyoruz
            const qty80 = Math.round(orderQty * 0.8) || 1;
            const qty20 = orderQty - qty80;

            // Ana tedarikçi
            await db.query(`
                INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                VALUES (?, ?, ?, 'Bekliyor', ?)
            `, [product.ProductName, qty80, `Otomatik Kritik Stok (Ana Tedarikçi %80 Kota)`, suppliers[0].supplier_id]);

            // Yedek tedarikçi
            if (qty20 > 0) {
                await db.query(`
                    INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                    VALUES (?, ?, ?, 'Bekliyor', ?)
                    `, [product.ProductName, qty20, `Otomatik Kritik Stok (Yedek Tedarikçi %20 Kota)`, suppliers[1].supplier_id]);
            }

            // Diğer tedarikçilere de fiyat soralım ki piyasayı yoklayalım
            for (let i = 2; i < suppliers.length; i++) {
                const sup = suppliers[i];
                if (sup.Email) {
                    try {
                        await sendLowStockEmail(
                            sup.Email,
                            product.ProductName,
                            product.currentStock,
                            sup.SupplierName
                        );
                        
                        await db.query(`
                            INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                            VALUES (?, ?, ?, 'Fiyat Bekleniyor', ?)
                        `, [product.ProductName, orderQty, `Fiyat Teklifi İstendi (3+ Yedek Tedarikçi)`, sup.supplier_id]);
                    } catch(e) {
                        console.error('Yedek tedarikçiye mail atarken sorun oldu:', e);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Kritik stok kontrolünde hata:', error);
    }
};

module.exports = {
    checkAndNotifyLowStock
};
