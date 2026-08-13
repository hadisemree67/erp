const mysql = require('mysql2/promise');

async function fixWarehouse() {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'e_ticaret_depo' });
    try {
        // Let's find the logs for the deleted products to see where they came from
        const [logs] = await pool.query("SELECT id, target_table, target_id, old_data FROM activity_logs WHERE target_table = 'products' AND action_type = 'DELETE' ORDER BY id DESC LIMIT 5");
        
        let foundStockInfo = false;
        for (const log of logs) {
            let data = log.old_data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {}
            }
            
            console.log(`Product ID ${log.target_id} logs:`, data ? 'Parsed successfully' : 'Failed to parse');
            
            if (data && data._stocks) {
                console.log(`Found _stocks in log for product ${log.target_id}:`, JSON.stringify(data._stocks));
                foundStockInfo = true;
            }
        }
        
        if (!foundStockInfo) {
            console.log("No _stocks found in recent DELETE logs (meaning they were deleted before we added the stock backup code).");
            
            // Now let's try to restore them to their PROPER warehouse if we can find it in old movements
            const [wmsRecords] = await pool.query("SELECT * FROM wms_stock_balances WHERE batch_number = 'SISTEM' AND shelf_code = 'KURTARILAN'");
            
            for (const record of wmsRecords) {
                // Find last known location from movements before deletion
                const [movements] = await pool.query(
                    "SELECT from_warehouse_id, to_warehouse_id FROM stockmovements WHERE ProductId = ? ORDER BY Id DESC LIMIT 5", 
                    [record.product_id]
                );
                
                console.log(`Movements for product ${record.product_id}:`, movements);
            }
        }

    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
        process.exit(0);
    }
}
fixWarehouse();
