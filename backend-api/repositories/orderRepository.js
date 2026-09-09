const db = require('../db');

class OrderRepository {
    async findAllOrdersWithDetails() {
        const query = `
            SELECT 
                o.*,
                c.CustomerName, c.Email as CustomerEmail, c.Phone as CustomerPhone,
                s.CompanyName as CargoCompanyName,
                u1.name as PickerName,
                u2.name as PackerName,
                u3.name as ShipUserName,
                pc.name as cart_name,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', sec.id, 'section_name', sec.section_name)) 
                 FROM picking_cart_sections sec 
                 WHERE JSON_CONTAINS(o.CartSectionIds, CAST(sec.id AS JSON), '$')) as cart_sections
            FROM orders o
            LEFT JOIN customers c ON o.CustomerId = c.Id
            LEFT JOIN shippers s ON o.ShipperId = s.Id
            LEFT JOIN users u1 ON o.PickerId = u1.id
            LEFT JOIN users u2 ON o.PackerId = u2.id
            LEFT JOIN users u3 ON o.ShipUserId = u3.id
            LEFT JOIN picking_carts pc ON o.CartId = pc.id
            ORDER BY o.Id ASC
        `;
        const [orders] = await db.query(query);

        if (orders.length === 0) return [];

        const orderIds = orders.map(o => o.Id);
        
        const [items] = await db.query(`
            SELECT 
                oi.*,
                p.ProductName,
                p.unit_type as Unit,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('barcode', barcode)) FROM product_barcodes WHERE product_id = p.Id) as product_barcodes
            FROM orderitems oi
            LEFT JOIN products p ON oi.ProductId = p.Id
            WHERE oi.OrderId IN (?)
        `, [orderIds]);

        const productIds = [...new Set(items.map(i => i.ProductId))];
        let stockMap = {};
        if (productIds.length > 0) {
            const [stocks] = await db.query(`
                SELECT product_id, SUM(quantity) as total_qty 
                FROM wms_stock_balances 
                WHERE product_id IN (?) 
                GROUP BY product_id
            `, [productIds]);
            stocks.forEach(s => { stockMap[s.product_id] = s.total_qty || 0; });
        }

        orders.forEach(o => {
            o.items = items
                .filter(i => i.OrderId === o.Id)
                .map(i => {
                    let barcodes = [];
                    try { if (i.product_barcodes) barcodes = JSON.parse(i.product_barcodes); } catch (e) {}
                    return {
                        ...i,
                        ProductCode: JSON.stringify(barcodes.map(b => b.barcode)),
                        CurrentStock: stockMap[i.ProductId] || 0
                    };
                });
            
            let cartInfo = null;
            if (o.cart_name) {
                const sectionNames = [];
                try {
                    const secs = JSON.parse(o.cart_sections);
                    if (secs && Array.isArray(secs)) {
                        secs.forEach(sec => sectionNames.push(sec.section_name));
                    }
                } catch (e) {}
                
                if (sectionNames.length > 0) {
                    cartInfo = `${o.cart_name} (${sectionNames.join(', ')})`;
                } else {
                    cartInfo = o.cart_name;
                }
            }
            o.CartInfo = cartInfo;
            o.OrderStatus = o.OrderStatus; // Needs to be mapped to Frontend in Service
        });

        return orders;
    }

    async createOrderTransaction(orderData, validatedItems, financeData) {
        const conn = await db.getConnection();
        await conn.query('START TRANSACTION');
        
        let autoProductionRequests = [];
        let orderId = null;
        
        try {
            // 1. Create Order
            const [orderRes] = await conn.query(`
                INSERT INTO orders (CustomerId, OrderNumber, OrderStatus, TotalAmount, ShippingAddress, OrderDate, PaymentMethod, CampaignId, CampaignName, DiscountAmount, ShipperId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                orderData.CustomerId, orderData.OrderNumber, orderData.OrderStatus, 
                orderData.TotalAmount, orderData.ShippingAddress, orderData.OrderDate, 
                orderData.PaymentMethod, orderData.CampaignId, orderData.CampaignName, 
                orderData.DiscountAmount, orderData.ShipperId
            ]);
            
            orderId = orderRes.insertId;

            // 2. Finance
            if (financeData) {
                await conn.query(`
                    INSERT INTO finance_transactions (type, amount, category, description, transaction_date)
                    VALUES (?, ?, ?, ?, ?)
                `, [financeData.type, financeData.amount, financeData.category, financeData.description, financeData.transaction_date]);
            }

            let orderDeductions = [];

            // 3. Items and Stock Deduction
            for (const item of validatedItems) {
                const productId = item.productId;
                const qty = item.quantity;
                const price = item.unitPrice;
                const productInfo = item.productInfo;

                await conn.query(`
                    INSERT INTO orderitems (OrderId, ProductId, Quantity, UnitPrice)
                    VALUES (?, ?, ?, ?)
                `, [orderId, productId, qty, price]);

                if (productInfo) {
                    const [stockAggr] = await conn.query('SELECT SUM(quantity) as qty FROM wms_stock_balances WHERE product_id = ?', [productId]);
                    const currentStock = Number(stockAggr[0].qty) || 0;

                    if (qty > currentStock) {
                        const missingQty = qty - currentStock;
                        const reason = `Müşteri Siparişi (${orderData.OrderNumber}) için stok yetersizliğinden otomatik oluşturuldu. Sipariş Edilen: ${qty}, Mevcut Stok: ${currentStock}, Eksik: ${missingQty} Adet.`;

                        if (productInfo.supply_type === 'MANUFACTURE') {
                            await conn.query(`
                                INSERT INTO production_requests (product_id, requested_quantity, source, creator, reason, priority, status, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `, [productId, missingQty, 'Müşteri Siparişi', 'Sistem Otomasyonu', reason, 'Acil', 'Bekliyor', new Date()]);
                        } else if (productInfo.supply_type === 'PURCHASE' || productInfo.supply_type === 'OUTSOURCED' || productInfo.Category === 'Hammadde') {
                            await conn.query(`
                                INSERT INTO purchase_requests (product_name, quantity, description, status, created_at)
                                VALUES (?, ?, ?, ?, ?)
                            `, [productInfo.ProductName, missingQty, reason, 'Bekliyor', new Date()]);
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

                // FEFO Deduction
                let remainingToDeduct = qty;
                const [batches] = await conn.query(`
                    SELECT id, quantity 
                    FROM wms_stock_balances 
                    WHERE product_id = ? AND quantity > 0
                    ORDER BY expiration_date ASC, id ASC
                `, [productId]);

                for (const batch of batches) {
                    if (remainingToDeduct <= 0) break;
                    let deduct = Math.min(Number(batch.quantity), remainingToDeduct);
                    
                    const [updateResult] = await conn.query(`
                        UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ? AND quantity >= ?
                    `, [deduct, batch.id, deduct]);
                    
                    if (updateResult.affectedRows > 0) {
                        remainingToDeduct -= deduct;
                        orderDeductions.push({ batchId: batch.id, quantity: deduct });
                    }
                }

                if (remainingToDeduct > 0) {
                    const [negResult] = await conn.query(`
                        INSERT INTO wms_stock_balances (product_id, quantity, batch_number)
                        VALUES (?, ?, ?)
                    `, [productId, -remainingToDeduct, orderData.OrderNumber]);
                    orderDeductions.push({ batchId: negResult.insertId, quantity: remainingToDeduct, isNegative: true });
                }
            }

            if (orderDeductions.length > 0) {
                await conn.query(`UPDATE orders SET deducted_batches = ? WHERE Id = ?`, [JSON.stringify(orderDeductions), orderId]);
            }

            await conn.query('COMMIT');
            conn.release();
            
            return { orderId, autoProductionRequests };
        } catch (err) {
            await conn.query('ROLLBACK');
            conn.release();
            throw err;
        }
    }
}

module.exports = new OrderRepository();
