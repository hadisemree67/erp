const db = require('./db');
const fs = require('fs');
async function run() {
    try {
        await db.query('ALTER TABLE StockMovements ADD COLUMN warehouse_id INT NULL;');
        await db.query('ALTER TABLE StockMovements ADD COLUMN shelf_code VARCHAR(100) NULL;');
        console.log('Columns added successfully.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
