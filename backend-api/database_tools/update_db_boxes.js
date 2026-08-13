/*
 * SQL veritabanına `packaging_boxes` (Kutular) adlı yeni bir tablo oluşturur.
 * Kargo ve ambalaj kutularının tanımını tutar. Ayrıca orders tablosuna gerekli kolonları ekler.
 */

const db = require('../db'); // Ortak ve güvenli db havuzunu kullanıyoruz (şifre/env kontrolleri burada yapılıyor)

async function run() {
  try {
    console.log('Veritabanı güncelleniyor: packaging_boxes tablosu ve orders güncellemeleri');

    await db.query(`
      CREATE TABLE IF NOT EXISTS packaging_boxes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        box_name VARCHAR(255) NOT NULL,
        width DECIMAL(10,2) NOT NULL,
        height DECIMAL(10,2) NOT NULL,
        depth DECIMAL(10,2) NOT NULL,
        empty_weight DECIMAL(10,2) NOT NULL,
        max_weight_capacity DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('packaging_boxes tablosu kontrol edildi / oluşturuldu.');

    // orders tablosuna eklenecek kolonların güvenli ve tek seferde (toplu) eklenmesi
    const [cols] = await db.query('SHOW COLUMNS FROM orders');
    const existing = cols.map(c => c.Field);

    const toAdd = [
        ['cargo_barcode', 'VARCHAR(255)'],
        ['total_weight', 'DECIMAL(10,2)'],
        ['packaging_info', 'JSON']
    ];

    const colsToAdd = toAdd.filter(([name]) => !existing.includes(name));

    if (colsToAdd.length > 0) {
        const addClauses = colsToAdd.map(([name, type]) => `ADD COLUMN ${name} ${type}`).join(', ');
        await db.query(`ALTER TABLE orders ${addClauses}`);
        colsToAdd.forEach(([name]) => console.log('Eklendi:', name));
        console.log('✅ orders tablosu sütunları güncellendi.');
    } else {
        console.log('✅ orders tablosu sütunları zaten güncel (Eklenecek kolon yok).');
    }

  } catch (err) {
    console.error('❌ Veritabanı Migration Hatası:', err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

run();
