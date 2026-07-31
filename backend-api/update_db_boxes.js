/*
 * ÖZET:
 * Bu script, kargo/ambalaj kutuları için "packaging_boxes" tablosunu oluşturur 
 * ve "orders" tablosuna sipariş paketleme (kutu, ağırlık vs.) sütunlarını ekler.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  // 1. Kritik env kontrolleri
  if (!process.env.DB_NAME) {
    console.warn('UYARI: .env dosyası bulunamadı veya DB_NAME tanımlanmadı, varsayılanlar kullanılıyor.');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stokerp'
  });

  try {
    // 2. Kolon isimleri standart snake_case yapıldı
    await connection.query(`
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
    console.log('✅ packaging_boxes tablosu kontrol edildi / oluşturuldu.');

    // 3. ALTER TABLE işlemleri için güvenli yardımcı fonksiyon
    const addColumnSafe = async (tableName, columnDef) => {
      try {
        await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`);
      } catch (e) {
        // 1060: Duplicate column name (Kolon zaten varsa hatayı yut, farklı hataysa bas)
        if (e.errno !== 1060) {
          console.warn(`Kolon eklenirken uyarı (${columnDef}):`, e.message);
        }
      }
    };

    await addColumnSafe('orders', 'cargo_barcode VARCHAR(255)');
    await addColumnSafe('orders', 'total_weight DECIMAL(10,2)');
    await addColumnSafe('orders', 'packaging_info JSON');

    console.log('✅ orders tablosu sütunları güncellendi.');

  } catch (err) {
    console.error('❌ Veritabanı Migration Hatası:', err);
  } finally {
    await connection.end();
  }
}

run();
