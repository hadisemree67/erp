const cron = require('node-cron');
const db = require('../db');

// Stokları kontrol edip otomatik satın alma talebi oluşturan fonksiyon
const checkStockAndCreateRequests = async () => {
    try {
        console.log('[StockMonitor] Otomatik satın alma talebi kontrolü başlatılıyor...');
        
        // Sadece min_stock_level > 0 olan ve max > min olan ürünleri seç
        const [products] = await db.query(`
            SELECT Id, ProductName, min_stock_level, max_stock_level, supplier_id, supply_type, Category,
            (COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = products.Id), products.StockQuantity) - 
             COALESCE((SELECT SUM(quantity) FROM cart_reservations WHERE product_id = products.Id AND expires_at > NOW()), 0) -
             COALESCE((SELECT SUM(oi.Quantity) FROM orderitems oi JOIN orders o ON oi.OrderId = o.Id WHERE oi.ProductId = products.Id AND o.OrderStatus IN ('Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Toplamada', 'İptal Bekliyor')), 0)) AS AvailableStock
            FROM products 
            WHERE is_active = 1 
              AND min_stock_level > 0 
              AND max_stock_level > min_stock_level
        `);

        if (products.length === 0) {
            return;
        }

        let requestsCreated = 0;

        for (const product of products) {
            // Stok seviyesi min_stock_level veya daha altına düştüyse
            if (product.AvailableStock <= product.min_stock_level) {
                // Sipariş miktarı: Hedef (max_stock_level) - Mevcut Stok
                const orderQuantity = product.max_stock_level - product.AvailableStock;
                
                if (orderQuantity > 0) {
                    // Kural: Kategori 'Hammadde' ise kesinlikle Satın Alma'ya gider. Değilse ve Kendi Üretimimiz ise Üretime gider.
                    if (product.Category !== 'Hammadde' && product.supply_type === 'MANUFACTURE') {
                        const [existingProdReqs] = await db.query(`
                            SELECT id FROM production_requests 
                            WHERE product_id = ? AND status IN ('Bekleyen', 'Üretimde')
                        `, [product.Id]);

                        if (existingProdReqs.length === 0) {
                            await db.query(`
                                INSERT INTO production_requests (product_id, requested_quantity, source, reason, status, priority)
                                VALUES (?, ?, 'Sistem', 'Otomatik Stok Takip Sistemi', 'Bekleyen', 'Yüksek')
                            `, [product.Id, orderQuantity]);
                            console.log(`[StockMonitor] ${product.ProductName} için ${orderQuantity} adet otomatik ÜRETİM talebi oluşturuldu.`);
                            requestsCreated++;
                        }
                    } else {
                        // Dışarıdan Satın Alınan veya Kategori Hammadde olan ürünler Satın Alma Talebi oluşturur
                        const [existingReqs] = await db.query(`
                            SELECT id FROM purchase_requests 
                            WHERE product_name = ? AND status = 'Bekliyor'
                        `, [product.ProductName]);

                        if (existingReqs.length === 0) {
                            const description = 'Otomatik Stok Takip Sistemi Tarafından Oluşturuldu';
                            await db.query(`
                                INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                                VALUES (?, ?, ?, 'Bekliyor', ?)
                            `, [product.ProductName, orderQuantity, description, product.supplier_id || null]);
                            
                            console.log(`[StockMonitor] ${product.ProductName} için ${orderQuantity} adet otomatik SATIN ALMA talebi oluşturuldu.`);
                            requestsCreated++;
                        }
                    }
                }
            }
        }
        console.log(`[StockMonitor] Kontrol tamamlandı. ${requestsCreated} adet yeni talep oluşturuldu.`);
    } catch (error) {
        console.error('[StockMonitor] Hata oluştu:', error);
    }
};

// Uygulama başlatıldığında çağrılacak fonksiyon
const startMonitor = () => {
    // Şimdilik test amaçlı ve hızlı geri bildirim için dakikada bir çalıştırıyoruz.
    cron.schedule('* * * * *', checkStockAndCreateRequests);
    console.log('[StockMonitor] Stok takip sistemi cron job olarak başlatıldı (* * * * *).');
    
    // Sistem başlar başlamaz ilk kontrolü yap
    setTimeout(() => {
        checkStockAndCreateRequests();
    }, 5000);
};

module.exports = { startMonitor, checkStockAndCreateRequests };
