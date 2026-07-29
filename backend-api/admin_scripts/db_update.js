const db = require('./db');
async function run() {
    try {
        await db.query('CREATE INDEX idx_product_id ON wms_stock_balances(product_id);');
        await db.query('ALTER TABLE wms_stock_balances DROP INDEX unique_product_location;');
        await db.query('ALTER TABLE wms_stock_balances ADD COLUMN batch_number VARCHAR(100) NOT NULL DEFAULT "";');
        await db.query('ALTER TABLE wms_stock_balances ADD COLUMN expiration_date DATE NULL;');
        console.log('Database updated successfully.');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
