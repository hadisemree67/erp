const db = require('./db');
async function run() {
    try {
        await db.query("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('Bekliyor', 'Onaylandı', 'Hazırlanıyor', 'Hazırlandı', 'Kargoya Verildi', 'Teslim Edildi', 'Depo Kabul Bekliyor', 'Depoya Alındı', 'İptal') DEFAULT 'Bekliyor'");
        await db.query("ALTER TABLE purchase_orders ADD COLUMN received_quantity INT DEFAULT 0");
        console.log('success');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
