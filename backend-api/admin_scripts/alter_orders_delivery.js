require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'stok_erp'
    });

    try {
        console.log('Adding delivered_to_user_id to production_orders...');
        await connection.query(`
            ALTER TABLE production_orders
            ADD COLUMN delivered_to_user_id INT NULL DEFAULT NULL
        `);
        console.log('Migration successful.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
        } else {
            console.error('Migration failed:', err);
        }
    } finally {
        await connection.end();
    }
}

migrate();
