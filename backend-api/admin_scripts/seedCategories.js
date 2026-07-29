/**
 * Dosya: seedCategories.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Sistemi test edebilmek için kategori tablosuna varsayılan/örnek kategori kayıtlarını ekleyen veri besleme (seed) scripti.
 */
const db = require('./db');

const categories = [
  "Cilt BakÄ±mÄ±",
  "Makyaj",
  "SaÃ§ BakÄ±mÄ±",
  "VÃ¼cut BakÄ±mÄ±",
  "ParfÃ¼m & Deodorant",
  "Erkek BakÄ±m",
  "GÃ¼neÅŸ ÃœrÃ¼nleri",
  "AÄŸÄ±z & DiÅŸ BakÄ±mÄ±",
  "Anne & Bebek BakÄ±mÄ±",
  "Genel SaÄŸlÄ±k"
];

async function seedCategories() {
  try {
    for (const cat of categories) {
      await db.query('INSERT IGNORE INTO kategori (name) VALUES (?)', [cat]);
    }
    console.log('Kategoriler eklendi!');
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

seedCategories();

