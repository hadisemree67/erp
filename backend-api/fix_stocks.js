const db = require('./db');

async function fixStocks() {
    try {
        const [warehouses] = await db.query('SELECT * FROM warehouses LIMIT 1');
        if (warehouses.length === 0) {
            console.log('No warehouse found.');
            process.exit(1);
        }
        const defaultWarehouseId = warehouses[0].id;
        console.log('Default warehouse:', defaultWarehouseId);

        const [products] = await db.query('SELECT Id, ProductName, StockQuantity FROM products');
        let fixedCount = 0;
        
        for (const p of products) {
            if (p.StockQuantity > 0) {
                const [wms] = await db.query('SELECT * FROM wms_stock_balances WHERE product_id = ?', [p.Id]);
                if (wms.length === 0) {
                    // This product has no WMS stocks, but has StockQuantity > 0 in products table
                    // It was likely restored from an old log before WMS backup was implemented
                    console.log(`Fixing product ${p.ProductName} (ID: ${p.Id}), restoring ${p.StockQuantity} stock.`);
                    await db.query(
                        'INSERT INTO wms_stock_balances (product_id, warehouse_id, shelf_code, batch_number, quantity, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
                        [p.Id, defaultWarehouseId, 'KURTARILAN', 'SISTEM', p.StockQuantity, null]
                    );
                    fixedCount++;
                }
            }
        }
        console.log(`Successfully fixed ${fixedCount} products.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

fixStocks();
