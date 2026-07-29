const db = require('./db');

async function run() {
    try {
        console.log('Migrating products table...');
        await db.query('ALTER TABLE products ADD COLUMN Width DECIMAL(10,2) DEFAULT 0');
        await db.query('ALTER TABLE products ADD COLUMN Height DECIMAL(10,2) DEFAULT 0');
        await db.query('ALTER TABLE products ADD COLUMN Depth DECIMAL(10,2) DEFAULT 0');
        await db.query('ALTER TABLE products ADD COLUMN Volume DECIMAL(18,2) DEFAULT 0');
        
        console.log('Migrating warehouse_shelves table...');
        await db.query('ALTER TABLE warehouse_shelves ADD COLUMN max_volume DECIMAL(18,2) DEFAULT 0');
        
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e.message);
        // Ignore duplicate column errors
    } finally {
        process.exit(0);
    }
}

run();
