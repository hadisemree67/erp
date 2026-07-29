const db = require('./db');

async function check() {
    try {
        const [warehouses] = await db.query('DESCRIBE warehouses');
        console.log("warehouses table:", warehouses);
        const [shelves] = await db.query('DESCRIBE warehouse_shelves');
        console.log("shelves table:", shelves);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
