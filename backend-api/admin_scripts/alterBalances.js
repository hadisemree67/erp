const db = require('./db');
const fs = require('fs');
async function run() {
    try {
        await db.query('ALTER TABLE wms_stock_balances ADD COLUMN warehouse_id INT NULL;');
        await db.query('ALTER TABLE wms_stock_balances ADD COLUMN shelf_code VARCHAR(100) NULL;');
        await db.query('ALTER TABLE wms_stock_balances MODIFY COLUMN location_id INT NULL;');
        console.log('wms_stock_balances updated successfully.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
