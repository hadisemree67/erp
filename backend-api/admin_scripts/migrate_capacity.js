const db = require('./db');

async function migrate() {
    try {
        console.log('Adding max_capacity to warehouses table...');
        
        // Add max_capacity to warehouses
        await db.query(`
            ALTER TABLE warehouses 
            ADD COLUMN max_capacity INT DEFAULT NULL
        `);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch(e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column max_capacity already exists.');
            process.exit(0);
        } else {
            console.error('Migration failed:', e);
            process.exit(1);
        }
    }
}
migrate();
