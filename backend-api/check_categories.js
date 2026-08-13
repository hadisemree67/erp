const mysql = require('mysql2/promise');

async function checkCategories() {
    const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'e_ticaret_depo' });
    try {
        const [rows] = await pool.query('SELECT Category, COUNT(*) as count FROM products GROUP BY Category');
        console.log("Kategoriler:");
        console.log(rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
        process.exit(0);
    }
}
checkCategories();
