const db = require('./db');

async function addIsActiveColumn() {
    try {
        await db.query('ALTER TABLE products ADD COLUMN is_active TINYINT(1) DEFAULT 1');
        console.log('Successfully added is_active column to products table.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('is_active column already exists.');
        } else {
            console.error('Error adding is_active column:', err);
        }
    }
}

addIsActiveColumn();
