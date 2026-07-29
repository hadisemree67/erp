const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
    const c = await mysql.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME});
    try {
        await c.query('ALTER TABLE employees ADD COLUMN hakedilen_yillik_izin INT DEFAULT 14;');
        console.log('Column added.');
    } catch(e) {
        console.log('ALTER error:', e.message);
    }
    try {
        await c.query(`
        CREATE TABLE IF NOT EXISTS employee_leaves (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            leave_type VARCHAR(100) NOT NULL,
            payment_status VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_days INT NOT NULL,
            status VARCHAR(50) DEFAULT 'Onaylandı',
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        );`);
        console.log('Table employee_leaves created.');
    } catch(e) {
        console.log('CREATE error:', e.message);
    }
    c.end();
}
run();
