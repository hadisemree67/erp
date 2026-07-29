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
        console.log("Altering products table to add stacking logic...");
        await db.query(`ALTER TABLE products ADD COLUMN is_stackable TINYINT DEFAULT 0, ADD COLUMN max_stack_limit INT DEFAULT 1`);
        console.log("Columns added successfully.");
        
        // Ensure existing products default to non-stackable (1 layer max)
        await db.query(`UPDATE products SET is_stackable = 0, max_stack_limit = 1 WHERE is_stackable IS NULL`);
        console.log("Existing products updated.");
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Columns already exist, skipping.");
        } else {
            console.error("Error:", err.message);
        }
    } finally {
        await db.end();
    }
}
run();
