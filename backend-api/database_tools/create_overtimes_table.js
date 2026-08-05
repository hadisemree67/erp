/*
 * SQL veritabanına `employee_overtimes` (Mesailer) adlı yeni bir tablo ekler. Çalışanların mesai saatlerini tutar.
 */

const db = require('../db');
async function createTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS employee_overtimes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                overtime_date DATE NOT NULL,
                hours DECIMAL(5,2) NOT NULL,
                hourly_wage DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                month INT NOT NULL,
                year INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);
        console.log('Mesailer (employee_overtimes) tablosu başarıyla oluşturuldu.');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
createTable();
