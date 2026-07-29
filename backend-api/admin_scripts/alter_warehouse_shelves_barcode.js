require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    let connection;
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        connection = await pool.getConnection();

        // Check if barcode column exists
        const [columns] = await connection.query('SHOW COLUMNS FROM warehouse_shelves LIKE "barcode"');
        if (columns.length === 0) {
            console.log('Adding barcode column to warehouse_shelves table...');
            await connection.query('ALTER TABLE warehouse_shelves ADD COLUMN barcode VARCHAR(150) NULL');
            console.log('Column barcode added successfully.');
        } else {
            console.log('Column barcode already exists.');
        }

        connection.release();
        pool.end();
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

runMigration();
