/*
 * ÖZET:
 * Bu script, bağlı olunan veritabanında mevcut olan tüm tabloların 
 * isimlerini çekip listeleyen basit bir yardımcı araçtır.
 */

// Veritabanı modülü içeri aktarılıyor
const db = require('./db');

async function listTables() {
  try {
    // Veritabanındaki tüm tablolar sorgulanıyor
    const [tables] = await db.query('SHOW TABLES');
    
    // Tablo listesi ekrana yazdırılıyor
    console.log(tables);
    process.exit(0);
  } catch (err) {
    // Hata oluşursa konsola basılıyor
    console.error('Hata:', err);
    process.exit(1);
  }
}

// Listeleme işlemi başlatılıyor
listTables();

