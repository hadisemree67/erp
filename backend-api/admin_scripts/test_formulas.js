require('dotenv').config();
const mysql = require('mysql2/promise');
async function test() {
    const c = await mysql.createConnection({host:process.env.DB_HOST||'localhost', user:process.env.DB_USER||'root', password:process.env.DB_PASSWORD||'', database:process.env.DB_NAME||'stok_erp'});
    const [r] = await c.query("SELECT ProductName, Formula, unit_type FROM products WHERE Formula IS NOT NULL AND Formula != '' LIMIT 5");
    console.log(JSON.stringify(r, null, 2));
    await c.end();
}
test();
