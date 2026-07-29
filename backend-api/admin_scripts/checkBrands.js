/**
 * Dosya: checkBrands.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Veritabanında bulunan markalar tablosundaki verileri konsola yazdırarak kontrol etmeye yarayan yardımcı script.
 */
const db = require('./db');

async function checkBrands() {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM brands');
    console.log(columns);
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

checkBrands();

