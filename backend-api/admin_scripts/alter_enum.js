require('dotenv').config();
const mysql = require('mysql2/promise');
async function run() {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'stok_erp'
    });
    try {
        await c.query(`ALTER TABLE production_orders MODIFY COLUMN status ENUM('Bekliyor','Toplanıyor','Üretimde','Tamamlandı','Onay Bekliyor','İptal','Depo Teslim Bekliyor','Kabul Edildi') DEFAULT 'Bekliyor'`);
        console.log('Success');
    } catch (e) {
        console.error(e.message);
    }
    await c.end();
}
run();
