/*
 * ÖZET:
 * Bu script, 'activity_logs' (sistem hareketleri) tablosunda durumu değiştirilen kayıtları 
 * ("olarak değiştirildi" anahtar kelimesi ile) filtreleyerek en son 5 aktiviteyi JSON formatında konsola basar.
 */

// Veritabanı bağlantısı modülü içeri aktarılıyor
const db = require('../db');

async function check() {
    try {
        // Durum güncellemesi barındıran son 5 aktivite logu çekilip ekrana yazdırılıyor
        const [rows] = await db.query('SELECT id, description FROM activity_logs WHERE description LIKE "%olarak değiştirildi%" ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
        
        process.exit(0);
    } catch(e) {
        // Hata durumunda işlem loglanıp sonlandırılıyor
        console.error(e);
        process.exit(1);
    }
}

// Kontrol işlemi başlatılıyor
check();
