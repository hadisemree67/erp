const mysql = require('mysql2/promise');

async function fixWarehouse() {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'e_ticaret_depo' });
    try {
        console.log("Starting script...");
        const [wmsRecords] = await pool.query("SELECT * FROM wms_stock_balances WHERE batch_number = 'SISTEM' AND shelf_code = 'KURTARILAN'");
        
        let fixedCount = 0;
        
        for (const record of wmsRecords) {
            // Find where this product used to be based on past logs
            // (If we can't find it, we'll leave it in the default)
            const [logs] = await pool.query("SELECT old_data FROM activity_logs WHERE target_table = 'wms_stock_balances' AND action_type = 'DELETE' ORDER BY id DESC LIMIT 50");
            
            let foundOldWarehouse = null;
            let foundOldShelf = null;
            
            for (const log of logs) {
                let data = log.old_data;
                if (typeof data === 'string') {
                    try { data = JSON.parse(data); } catch(e) {}
                }
                
                if (data && data.product_id === record.product_id) {
                    foundOldWarehouse = data.warehouse_id;
                    foundOldShelf = data.shelf_code;
                    break;
                }
            }
            
            if (foundOldWarehouse && foundOldShelf) {
                console.log(`Moving product ${record.product_id} to warehouse ${foundOldWarehouse}, shelf ${foundOldShelf}`);
                await pool.query(
                    "UPDATE wms_stock_balances SET warehouse_id = ?, shelf_code = ?, batch_number = NULL WHERE id = ?",
                    [foundOldWarehouse, foundOldShelf, record.id]
                );
                fixedCount++;
            } else {
                console.log(`Could not find old location for product ${record.product_id}`);
                // Try to find ANY warehouse ID and shelf it had before
                const [movements] = await pool.query("SELECT from_warehouse_id, from_shelf, to_warehouse_id, to_shelf FROM stockmovements WHERE ProductId = ? ORDER BY Id DESC LIMIT 1", [record.product_id]);
                if (movements.length > 0) {
                    const m = movements[0];
                    const wid = m.to_warehouse_id || m.from_warehouse_id;
                    const sid = m.to_shelf || m.from_shelf || 'A-1';
                    
                    if (wid) {
                        console.log(`Fallback: Moving product ${record.product_id} to warehouse ${wid}, shelf ${sid}`);
                        await pool.query(
                            "UPDATE wms_stock_balances SET warehouse_id = ?, shelf_code = ?, batch_number = NULL WHERE id = ?",
                            [wid, sid, record.id]
                        );
                        fixedCount++;
                    }
                }
            }
        }
        console.log(`Fixed ${fixedCount} records.`);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
        process.exit(0);
    }
}
fixWarehouse();
