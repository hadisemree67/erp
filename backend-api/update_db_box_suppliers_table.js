/*
 * ÖZET:
 * Bu script, kutu tedarikçileri ile yapılan anlaşmaları çoklu olarak tutabilmek için 
 * "box_suppliers" tablosunu oluşturur ve eski tekli sütunları temizler.
 */

const db = require('./db');

async function createBoxSuppliersTable() {
    try {
        console.log('Veritabanı güncelleniyor: box_suppliers tablosu...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS box_suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                box_id INT NOT NULL,
                supplier_id INT NOT NULL,
                lead_time_days INT NULL,
                unit_price DECIMAL(10,2) NULL,
                contract_start_date DATE NULL,
                contract_end_date DATE NULL,
                contract_file VARCHAR(255) NULL,
                FOREIGN KEY (box_id) REFERENCES packaging_boxes(Id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(Id) ON DELETE CASCADE
            )
        `);

        // Eski verileri taşıdığımız için packaging_boxes tablosundaki SupplierId ve ContractNo sütunlarını güvenle silebiliriz.
        try {
            await db.query(`ALTER TABLE packaging_boxes DROP COLUMN SupplierId`);
            await db.query(`ALTER TABLE packaging_boxes DROP COLUMN ContractNo`);
            console.log('Eski sütunlar silindi.');
        } catch(e) {
            if (e.errno === 1091 || e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('Eski sütunlar zaten silinmiş veya bulunamadı.');
            } else {
                console.error('Sütunlar silinirken hata oluştu:', e);
            }
        }

        console.log('İşlem tamamlandı.');
        process.exit(0);
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

createBoxSuppliersTable();
