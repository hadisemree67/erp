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
        console.log('Creating production_machines table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS production_machines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                last_maintenance DATE,
                status ENUM('Boş', 'Dolu', 'Bakımda', 'Arızalı') DEFAULT 'Boş',
                busy_until DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating production_orders table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS production_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                machine_id INT NOT NULL,
                assigned_user_id INT,
                planned_quantity DECIMAL(18,2) NOT NULL,
                waste_percentage DECIMAL(5,2) DEFAULT 0,
                status ENUM('Bekliyor', 'Toplanıyor', 'Üretimde', 'Tamamlandı', 'Onay Bekliyor', 'İptal') DEFAULT 'Bekliyor',
                actual_quantity DECIMAL(18,2),
                waste_reason TEXT,
                manager_explanation TEXT,
                start_time DATETIME,
                end_time DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating production_materials table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS production_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                production_order_id INT NOT NULL,
                material_product_id INT NOT NULL,
                required_quantity DECIMAL(18,2) NOT NULL,
                location_id INT,
                warehouse_id INT,
                shelf_code VARCHAR(100),
                is_picked TINYINT(1) DEFAULT 0,
                picked_at DATETIME,
                FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE
            )
        `);

        console.log('Database setup complete.');
    } catch (err) {
        console.error('Error setting up DB:', err);
    } finally {
        db.end();
    }
}

run();
