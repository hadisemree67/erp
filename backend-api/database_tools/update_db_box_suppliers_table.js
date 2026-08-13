/*
 * Kutular ve tedarikçiler arasındaki ilişkiyi tutmak için `box_suppliers` (kutu tedarikçileri)
 * adında yeni bir bağlantı tablosu oluşturur.
 */

const db = require('../db');

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

        console.log('İşlem başarıyla tamamlandı!');
    } catch (err) {
        console.error('Hata:', err);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

createBoxSuppliersTable();
