const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'e_ticaret_depo'
});

async function run() {
    try {
        console.log('Creating production_order_steps table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS production_order_steps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                production_order_id INT NOT NULL,
                step_number INT NOT NULL,
                operation_name VARCHAR(255) NOT NULL,
                machine_id INT NOT NULL,
                duration_minutes INT NOT NULL,
                status ENUM('Bekliyor', 'Çalışıyor', 'Tamamlandı') DEFAULT 'Bekliyor',
                started_at DATETIME NULL,
                completed_at DATETIME NULL,
                FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (machine_id) REFERENCES production_machines(id) ON DELETE CASCADE
            )
        `);
        console.log('Table created successfully.');
        
        // Optionally update production_orders to remove machine_id if it's now handled by steps?
        // Let's keep it for compatibility or maybe alter it later.
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        db.end();
    }
}

run();
