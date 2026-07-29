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

const db = require('../db');
const { sendLowStockEmail } = require('../services/emailService');

/**
 * Checks if stock drops below critical level and triggers email if necessary.
 * Implements 80/20 order splitting and shelf capacity calculation.
 * @param {number} productId 
 */
const checkAndNotifyLowStock = async (productId) => {
    try {
        // Fetch current total stock and product details
        const [productRows] = await db.query(`
            SELECT p.*, 
                   COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = p.Id), 0) AS currentStock
            FROM products p
            WHERE p.Id = ?
        `, [productId]);

        if (productRows.length === 0) return;
        const product = productRows[0];

        // Ensure we have critical stock level
        if (!product.critical_stock_level || product.critical_stock_level <= 0) return;

        // Ensure current stock is at or below critical level
        if (product.currentStock > product.critical_stock_level) return;

        // Prevent spamming: Check if there's already an active (Bekliyor) purchase request for this product
        const [activeRequests] = await db.query(`
            SELECT id FROM purchase_requests 
            WHERE product_name = ? AND status IN ('Bekliyor', 'Fiyat Bekleniyor')
            LIMIT 1
        `, [product.ProductName]);

        if (activeRequests.length > 0) return;

        // 1. Calculate Required Quantity based on empty volumetric space on all shelves where the product is currently stored
        let orderQty = 0;
        
        const [balances] = await db.query('SELECT warehouse_id, shelf_code, SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ? AND quantity > 0 GROUP BY warehouse_id, shelf_code', [productId]);
        
        if (balances.length === 0) {
            orderQty = product.critical_stock_level; // If not on any shelf, fallback to critical stock limit
        } else {
            for (const bal of balances) {
                const [shelfData] = await db.query('SELECT max_volume FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [bal.warehouse_id, bal.shelf_code]);
                if (!shelfData || shelfData.length === 0) continue;
                const maxVolume = parseFloat(shelfData[0]?.max_volume) || 0;
                
                // Calculate current filled volume of the entire shelf
                const [filledRows] = await db.query('SELECT b.quantity, p.Volume, p.Width, p.Height, p.Depth, p.package_capacity FROM wms_stock_balances b JOIN products p ON b.product_id = p.Id WHERE b.warehouse_id = ? AND b.shelf_code = ?', [bal.warehouse_id, bal.shelf_code]);
                
                let currentFilled = 0;
                for (const row of filledRows) {
                    let rW = parseFloat(row.Width) || 0; let rH = parseFloat(row.Height) || 0; let rD = parseFloat(row.Depth) || 0;
                    let vol = (rW > 0 && rH > 0 && rD > 0) ? (rW * rH * rD) : (parseFloat(row.Volume) || 0);
                    let pCap = parseFloat(row.package_capacity) || 1;
                    if (pCap <= 0) pCap = 1;
                    currentFilled += Math.ceil(row.quantity / pCap) * vol;
                }
                
                let emptyVolume = maxVolume - currentFilled;
                if (emptyVolume < 0) emptyVolume = 0;
                
                // Calculate how many MORE items of THIS product can fit in the emptyVolume
                let pW = parseFloat(product.Width) || 0; let pH = parseFloat(product.Height) || 0; let pD = parseFloat(product.Depth) || 0;
                let containerVolume = (pW > 0 && pH > 0 && pD > 0) ? (pW * pH * pD) : (parseFloat(product.Volume) || 0);
                
                if (containerVolume > 0 && maxVolume >= containerVolume) {
                    let maxAllowedByVolume = Math.floor(emptyVolume / containerVolume);
                    let maxItems = maxAllowedByVolume * (parseFloat(product.package_capacity) || 1);
                    orderQty += maxItems;
                }
            }
        }
        
        if (orderQty <= 0) orderQty = product.critical_stock_level; // fallback if calculations yield 0

        // 2. Fetch Suppliers for this product ordered by their addition
        const [suppliers] = await db.query(`
            SELECT ps.*, s.SupplierName, s.Email 
            FROM product_suppliers ps
            JOIN suppliers s ON ps.supplier_id = s.Id
            WHERE ps.product_id = ?
            ORDER BY ps.id ASC
        `, [productId]);

        if (suppliers.length === 0) {
            // No suppliers, just create a general purchase request
            await db.query(`
                INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                VALUES (?, ?, ?, 'Bekliyor', NULL)
            `, [product.ProductName, orderQty, `Otomatik Kritik Stok (Tedarikçi Atanmamış)`]);
            return;
        }

        // 3. Apply 80-20 Rule
        if (suppliers.length === 1) {
            // Only 1 supplier, 100% goes to them
            await db.query(`
                INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                VALUES (?, ?, ?, 'Bekliyor', ?)
            `, [product.ProductName, orderQty, `Otomatik Kritik Stok (%100)`, suppliers[0].supplier_id]);
        } else {
            // At least 2 suppliers. 80% to Supplier 1, 20% to Supplier 2
            const qty80 = Math.round(orderQty * 0.8) || 1;
            const qty20 = orderQty - qty80;

            // Primary
            await db.query(`
                INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                VALUES (?, ?, ?, 'Bekliyor', ?)
            `, [product.ProductName, qty80, `Otomatik Kritik Stok (Ana Tedarikçi %80 Kota)`, suppliers[0].supplier_id]);

            // Secondary
            if (qty20 > 0) {
                await db.query(`
                    INSERT INTO purchase_requests (product_name, quantity, description, status, supplier_id)
                    VALUES (?, ?, ?, 'Bekliyor', ?)
                `, [product.ProductName, qty20, `Otomatik Kritik Stok (Yedek Tedarikçi %20 Kota)`, suppliers[1].supplier_id]);
            }

            // 4. Fallback for 3rd+ Suppliers (Email only)
            for (let i = 2; i < suppliers.length; i++) {
                const sup = suppliers[i];
                if (sup.Email) {
                    try {
                        // Send quote request email
                        // Normally we'd use a different template, but using existing one for now
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
                        console.error('Failed to send email to 3rd+ supplier', e);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Check and Notify Low Stock Error:', error);
    }
};

module.exports = {
    checkAndNotifyLowStock
};
