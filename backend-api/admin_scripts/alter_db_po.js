const db = require('./db');
async function run() {
    try {
        await db.query("ALTER TABLE purchase_orders ADD COLUMN action_token VARCHAR(64) DEFAULT NULL");
        await db.query("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('Bekliyor', 'Onaylandı', 'Hazırlanıyor', 'Hazırlandı', 'Kargoya Verildi', 'Teslim Edildi', 'İptal') DEFAULT 'Bekliyor'");
        console.log('success');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
