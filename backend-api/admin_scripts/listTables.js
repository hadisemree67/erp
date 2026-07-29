/**
 * Dosya: listTables.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Veritabanında anlık olarak bulunan tüm tabloların isimlerini listeleyen yardımcı script.
 */
const db = require('./db');

async function listTables() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    console.log(tables);
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

listTables();

