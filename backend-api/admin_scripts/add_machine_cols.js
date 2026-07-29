const db = require('../db');

async function run() {
    try {
        const [cols] = await db.query('SHOW COLUMNS FROM production_machines');
        const existing = cols.map(c => c.Field);
        const toAdd = [
            ['supplier_name', 'VARCHAR(150) NULL'],
            ['supplier_email', 'VARCHAR(150) NULL'],
            ['supplier_phone', 'VARCHAR(50) NULL'],
            ['maintenance_period_months', 'INT DEFAULT 12'],
            ['next_maintenance', 'DATE NULL'],
            ['maintenance_reminder_sent', 'TINYINT(1) DEFAULT 0']
        ];
        for (let [name, type] of toAdd) {
            if (!existing.includes(name)) {
                await db.query(`ALTER TABLE production_machines ADD COLUMN ${name} ${type}`);
                console.log('Added', name);
            } else {
                console.log('Already exists', name);
            }
        }
        console.log('All columns ready!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
