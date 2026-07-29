const db = require('./db');
const fs = require('fs');

async function run() {
    try {
        const sql = fs.readFileSync('alterWarehouses.sql', 'utf8');
        // split by ; to run multiple statements if needed, but we can do one by one
        await db.query('CREATE TABLE IF NOT EXISTS warehouses (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL, location VARCHAR(200), address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);');
        await db.query('CREATE TABLE IF NOT EXISTS warehouse_shelves (id INT AUTO_INCREMENT PRIMARY KEY, warehouse_id INT NOT NULL, shelf_code VARCHAR(100) NOT NULL, FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE);');
        console.log('Tables created successfully.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
