/*
 * `suppliers` (Tedarikçiler) tablosuna `supplier_type` (Tedarikçi/Fason) adında 
 * yeni bir sütun ekler.
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function updateDb() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '1234',
            database: process.env.DB_NAME || 'e_ticaret_depo'
        });

        console.log("Veritabanına bağlanıldı.");

        const [columns] = await connection.query(`SHOW COLUMNS FROM suppliers LIKE 'supplier_type'`);
        if (columns.length === 0) {
            console.log("supplier_type kolonu ekleniyor...");
            await connection.query(`
                ALTER TABLE suppliers 
                ADD COLUMN supplier_type ENUM('Tedarikçi', 'Fason') DEFAULT 'Tedarikçi'
            `);
            console.log("supplier_type eklendi.");
        } else {
            console.log("supplier_type kolonu zaten mevcut.");
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
