/*
 * ÖZET:
 * Bu script, depo raflarındaki (warehouse_shelves) belirli bir rafın (A-1) fiziksel 
 * ölçülerini (genişlik, yükseklik, derinlik ve hacim) sorgulayarak veri doğruluğunu test eder.
 */

// Çevresel değişkenler ve mysql modülü içeri aktarılıyor
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    // Veritabanı bağlantısı oluşturuluyor
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'stok_erp'
    });
    
    try {
        // A-1 kodlu rafın fiziksel boyutları çekilip ekrana yazdırılıyor
        const [s] = await db.query('SELECT width, height, depth, max_volume FROM warehouse_shelves WHERE shelf_code = "A-1"');
        console.log('Raf A-1 boyutları:', s[0]);
    } catch (e) {
        // Hata oluşursa yakalanıp konsola basılıyor
        console.error(e);
    } finally {
        await db.end();
    }
}

// Kontrol işlemi başlatılıyor
run();
