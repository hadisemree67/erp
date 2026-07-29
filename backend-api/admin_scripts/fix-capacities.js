const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'e_ticaret_depo'
});

async function run() {
    try {
        console.log('Fetching stock balances...');
        const [rows] = await pool.query(`
            SELECT 
                b.id as balance_id,
                b.quantity,
                b.product_id,
                b.shelf_code,
                b.warehouse_id,
                ws.width as shelf_width,
                ws.height as shelf_height,
                ws.depth as shelf_depth,
                ws.max_volume,
                p.Width as product_width,
                p.Height as product_height,
                p.Depth as product_depth,
                p.Volume as product_volume,
                p.is_stackable,
                p.max_stack_limit,
                p.package_capacity
            FROM wms_stock_balances b
            JOIN products p ON b.product_id = p.Id
            JOIN warehouse_shelves ws ON ws.warehouse_id = b.warehouse_id AND ws.shelf_code = b.shelf_code
            WHERE b.quantity > 0
        `);

        let fixedCount = 0;

        for (const row of rows) {
            const sW = parseFloat(row.shelf_width) || 0;
            const sH = parseFloat(row.shelf_height) || 0;
            const sD = parseFloat(row.shelf_depth) || 0;
            const pW = parseFloat(row.product_width) || 0;
            const pH = parseFloat(row.product_height) || 0;
            const pD = parseFloat(row.product_depth) || 0;
            
            let absoluteMaxCapacity = 0;
            
            if (sW > 0 && sH > 0 && sD > 0 && pW > 0 && pH > 0 && pD > 0) {
                // Yanlardan 5+5=10 cm, üstten 5 cm, önden (derinlik) 5 cm boşluk
                const usableW = Math.max(0, sW - 10);
                const usableH = Math.max(0, sH - 5);
                const usableD = Math.max(0, sD - 5);

                const wCount = Math.floor(usableW / pW);
                const dCount = Math.floor(usableD / pD);
                const baseCount = wCount * dCount;
                
                let hCount = Math.floor(usableH / pH);
                const isStackable = row.is_stackable === 1 || row.is_stackable === true || row.is_stackable === '1';
                
                if (isStackable) {
                    const stackLimit = parseInt(row.max_stack_limit) || 1;
                    if (hCount > stackLimit) hCount = stackLimit;
                } else {
                    hCount = 1;
                }
                
                absoluteMaxCapacity = baseCount * hCount;
            } else if (parseFloat(row.product_volume) > 0) {
                const maxVol = parseFloat(row.max_volume) || 0;
                const volPerItem = parseFloat(row.product_volume) / (parseFloat(row.package_capacity) || 1);
                absoluteMaxCapacity = volPerItem > 0 ? Math.floor(maxVol / volPerItem) : 0;
            }

            if (absoluteMaxCapacity > 0 && row.quantity > absoluteMaxCapacity) {
                const excess = row.quantity - absoluteMaxCapacity;
                console.log(`Fixing balance ID ${row.balance_id} (Product ${row.product_id} in Shelf ${row.shelf_code}): Quantity ${row.quantity} -> ${absoluteMaxCapacity}. Excess: ${excess}`);
                
                await pool.query('UPDATE wms_stock_balances SET quantity = ? WHERE id = ?', [absoluteMaxCapacity, row.balance_id]);
                
                await pool.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [excess, row.product_id]);
                fixedCount++;
            }
        }
        
        console.log(`Successfully fixed ${fixedCount} balances.`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

run();
