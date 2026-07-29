const db = require('./db');

async function run() {
    try {
        const [products] = await db.query('DESCRIBE products');
        const [warehouses] = await db.query('DESCRIBE warehouses');
        let shelves;
        try {
            [shelves] = await db.query('DESCRIBE warehouse_shelves');
        } catch (e) {
            console.log('No warehouse_shelves table, maybe shelves are stored differently?');
        }
        
        console.log('--- PRODUCTS ---');
        console.table(products);
        console.log('--- WAREHOUSES ---');
        console.table(warehouses);
        if (shelves) {
            console.log('--- SHELVES ---');
            console.table(shelves);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
