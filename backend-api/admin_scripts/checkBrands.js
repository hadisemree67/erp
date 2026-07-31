/*
 * ÖZET:
 * Bu script, veritabanında bulunan 'brands' (markalar) tablosunun yapısal 
 * kolonlarını (şemasını) konsola yazdırarak kontrol etmeye yarayan yardımcı bir scripttir.
 */

// Veritabanı bağlantısı modülü içeri aktarılıyor
const db = require('./db');

async function checkBrands() {
  try {
    // brands tablosunun kolon yapısı sorgulanıp ekrana yazdırılıyor
    const [columns] = await db.query('SHOW COLUMNS FROM brands');
    console.log(columns);
    process.exit(0);
  } catch (err) {
    // İşlem sırasında hata oluşursa konsola yazdırılıp çıkılıyor
    console.error('Hata:', err);
    process.exit(1);
  }
}

// Kontrol işlemi başlatılıyor
checkBrands();

