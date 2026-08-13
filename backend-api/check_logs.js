const db = require('./db');

async function test() {
    try {
        const [rows] = await db.query("SELECT target_table, target_id, old_data FROM activity_logs WHERE target_table = 'products' AND action_type = 'DELETE' ORDER BY id DESC LIMIT 5");
        console.log(JSON.stringify(rows.map(r => ({ ...r, old_data: typeof r.old_data === 'string' ? JSON.parse(r.old_data) : r.old_data })), null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
test();
