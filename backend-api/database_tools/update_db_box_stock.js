/*
 * `boxes` tablosuna `stock_quantity` (kutu stok miktarı) gibi stok takibi için gerekli yeni sütunları  ekler.
 */

const db = require('../db');

async function updateDb() {
    try {
        console.log('Veritabanı güncelleniyor: Kutu Stok Özellikleri');

        // 1. packaging_boxes tablosuna StockQuantity sütununu ekle
        console.log('packaging_boxes tablosuna StockQuantity sütunu ekleniyor...');
        try {
            await db.query(`ALTER TABLE packaging_boxes ADD COLUMN StockQuantity INT DEFAULT 0 CHECK (StockQuantity >= 0);`);
            console.log('StockQuantity başarıyla eklendi.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('StockQuantity zaten mevcut.');
            } else {
                throw e;
            }
        }

        // 2. box_stock_entries tablosunu oluştur
        console.log('box_stock_entries tablosu oluşturuluyor...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS box_stock_entries (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                BoxId INT NOT NULL,
                Quantity INT NOT NULL CHECK (Quantity >= 0),
                SupplierName VARCHAR(255) NULL,
                Price DECIMAL(10,2) NULL,
                ContractNo VARCHAR(100) NULL,
                EntryDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (BoxId) REFERENCES packaging_boxes(Id) ON DELETE CASCADE
            )
        `);
        console.log('box_stock_entries oluşturuldu.');

        console.log('Veritabanı güncellemesi tamamlandı!');
    } catch (err) {
        console.error('Hata:', err);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

updateDb();
