const db = require('../db');
async function check() {
    try {
        const [rows] = await db.query('SELECT id, description FROM activity_logs WHERE description LIKE "%olarak değiştirildi%" ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
