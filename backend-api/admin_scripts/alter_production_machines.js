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
        console.log('Altering production_machines table...');
        await db.query(`
            ALTER TABLE production_machines 
            ADD COLUMN machine_code VARCHAR(100),
            ADD COLUMN max_capacity DECIMAL(18,2),
            ADD COLUMN min_capacity DECIMAL(18,2),
            ADD COLUMN allowed_categories JSON,
            ADD COLUMN prep_time_minutes INT DEFAULT 0
        `);

        console.log('Migration complete.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist.');
        } else {
            console.error('Error altering table:', err);
        }
    } finally {
        db.end();
    }
}

run();
