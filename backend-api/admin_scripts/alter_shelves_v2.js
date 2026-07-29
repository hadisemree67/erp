const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'stokerp'
    });

    try {
        console.log("Altering warehouse_shelves table...");
        await db.query(`ALTER TABLE warehouse_shelves ADD COLUMN width FLOAT DEFAULT 0, ADD COLUMN height FLOAT DEFAULT 0, ADD COLUMN depth FLOAT DEFAULT 0`);
        console.log("Columns added.");
        
        await db.query(`UPDATE warehouse_shelves SET width = 100, height = 100, depth = max_volume / 10000 WHERE max_volume > 0`);
        console.log("Existing shelves updated with fallback dimensions based on max_volume.");
        
        console.log("Done.");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await db.end();
    }
}
run();
