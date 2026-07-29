require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'stok_erp'
    });
    try {
        await db.query(`ALTER TABLE production_orders MODIFY COLUMN status VARCHAR(50) DEFAULT 'Bekliyor'`);
        console.log('Status column updated successfully');
    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
run();
