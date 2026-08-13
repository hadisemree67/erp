const db = require('./db');

async function investigate() {
    try {
        const [products] = await db.query('SELECT Id, ProductName, StockQuantity FROM products');
        for (const p of products) {
            const [wms] = await db.query('SELECT * FROM wms_stock_balances WHERE product_id = ?', [p.Id]);
            if (wms.length === 0 && p.StockQuantity > 0) {
                console.log(`Product ${p.ProductName} (ID: ${p.Id}) has NO WMS records but products.StockQuantity is ${p.StockQuantity}`);
            } else if (wms.length > 0) {
                const totalWms = wms.reduce((sum, w) => sum + Number(w.quantity), 0);
                if (totalWms !== Number(p.StockQuantity)) {
                    console.log(`Product ${p.ProductName} (ID: ${p.Id}) mismatch: WMS=${totalWms}, products=${p.StockQuantity}`);
                }
            }
        }

        const [logs] = await db.query('SELECT * FROM activity_logs WHERE target_table = "products" AND action_type = "DELETE"');
        console.log(`Found ${logs.length} DELETE logs for products.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

investigate();
