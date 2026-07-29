/**
 * Dosya: alterDb.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Veritabanı yapısında (tablolarda) sonradan yapılan değişiklikleri ve güncellemeleri uygulayan bakım scripti.
 */
const db = require('./db');

async function alterDb() {
  try {
    console.log('VeritabanÄ± yapÄ±sÄ± gÃ¼ncelleniyor...');
    
    // Change ImagePath to TEXT
    await db.query('ALTER TABLE products MODIFY COLUMN ImagePath TEXT');
    console.log('ImagePath kolonu TEXT olarak gÃ¼ncellendi.');

    // Drop index if exists, ignore if not
    try {
        await db.query('ALTER TABLE products DROP INDEX Barcode');
        console.log('Barcode indexi kaldÄ±rÄ±ldÄ±.');
    } catch (e) {
        console.log('Barcode indexi yoktu veya kaldÄ±rÄ±lamadÄ±:', e.message);
    }

    // Change Barcode to TEXT
    await db.query('ALTER TABLE products MODIFY COLUMN Barcode TEXT');
    console.log('Barcode kolonu TEXT olarak gÃ¼ncellendi.');

    console.log('Ä°ÅŸlem baÅŸarÄ±yla tamamlandÄ±.');
    process.exit(0);
  } catch (err) {
    console.error('VeritabanÄ± gÃ¼ncellenirken hata oluÅŸtu:', err);
    process.exit(1);
  }
}

alterDb();

