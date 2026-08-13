const db = require('./db');
async function run() {
    try {
        const [rows] = await db.query('SELECT * FROM brands');
        require('fs').writeFileSync('brands_debug.json', JSON.stringify(rows, null, 2));
        console.log('Success');
        process.exit(0);
    } catch(err) {
        require('fs').writeFileSync('brands_debug.json', JSON.stringify({error: err.message}));
        process.exit(1);
    }
}
run();
