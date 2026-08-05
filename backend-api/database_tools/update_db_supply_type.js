/*
 * `products` (Ürünler) tablosuna `supply_type` (Kendi Üretimimiz/Satın Alma/Fason) 
 * adında yeni bir sütun ekler.
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function updateDb() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'e_ticaret_depo'
        });

        console.log("Veritabanına bağlanıldı.");

        // supply_type kolonunun var olup olmadığını kontrol et
        const [columns] = await connection.query(`SHOW COLUMNS FROM products LIKE 'supply_type'`);
        if (columns.length === 0) {
            console.log("supply_type kolonu ekleniyor...");
            await connection.query(`
                ALTER TABLE products 
                ADD COLUMN supply_type ENUM('MANUFACTURE', 'PURCHASE', 'OUTSOURCED') DEFAULT 'MANUFACTURE'
            `);
            console.log("supply_type eklendi.");
        } else {
            console.log("supply_type kolonu zaten mevcut.");
        }

        console.log("Veritabanı güncellemesi tamamlandı.");
    } catch (error) {
        console.error("Hata oluştu:", error);
    } finally {
        if (connection) {
            await connection.end();
            console.log("Bağlantı kapatıldı.");
        }
    }
}

updateDb();
