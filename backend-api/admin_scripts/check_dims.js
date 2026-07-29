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
        const [s] = await db.query('SELECT width, height, depth, max_volume FROM warehouse_shelves WHERE shelf_code = "A-1"');
        console.log('Shelf A-1:', s[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
run();
