/*
 * ÖZET:
 * Bu script, veritabanında bulunan 'kategori' tablosunun yapısal 
 * kolonlarını (şemasını) konsola yazdırarak kontrol etmeye yarayan yardımcı bir scripttir.
 */

// Veritabanı bağlantısı modülü içeri aktarılıyor
const db = require('./db');

async function checkKategori() {
  try {
    // kategori tablosunun kolon yapısı sorgulanıp ekrana yazdırılıyor
    const [columns] = await db.query('SHOW COLUMNS FROM kategori');
    console.log(columns);
    process.exit(0);
  } catch (err) {
    // İşlem sırasında hata oluşursa konsola yazdırılıp çıkılıyor
    console.error('Hata:', err);
    process.exit(1);
  }
}

// Kontrol işlemi başlatılıyor
checkKategori();

