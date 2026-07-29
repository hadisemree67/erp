/**
 * Dosya: checkKategori.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Veritabanında bulunan kategori tablosundaki verileri konsola yazdırarak kontrol etmeye yarayan yardımcı script.
 */
const db = require('./db');

async function checkKategori() {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM kategori');
    console.log(columns);
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

checkKategori();

