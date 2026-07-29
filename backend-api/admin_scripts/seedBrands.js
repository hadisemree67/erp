/**
 * Dosya: seedBrands.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Sistemi test edebilmek için markalar tablosuna varsayılan/örnek marka kayıtlarını ekleyen veri besleme (seed) scripti.
 */
const db = require('./db');

const cosmeticBrands = [
  "L'Oreal Paris",
  "Maybelline",
  "Nivea",
  "Bioderma",
  "La Roche-Posay",
  "Vichy",
  "Garnier",
  "MAC Cosmetics",
  "Clinique",
  "Estee Lauder",
  "Neutrogena",
  "CeraVe",
  "The Ordinary",
  "Avon",
  "Flormar",
  "Golden Rose"
];

async function seedBrands() {
  try {
    for (const brand of cosmeticBrands) {
      await db.query('INSERT IGNORE INTO brands (name) VALUES (?)', [brand]);
    }
    console.log('Markalar eklendi!');
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

seedBrands();

