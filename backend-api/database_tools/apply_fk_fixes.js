require('dotenv').config({ path: '../.env' });
const db = require('../db');

async function run() {
    try {
        console.log("🛠️ FK Hatalarını Düzelten İkinci Aşama Başlatılıyor...");

        // 1. fk_pr_employee için olmayan employe'leri temizleyip tekrar dene
        console.log("-> purchase_requests'deki geçersiz employee_id'ler NULL yapılıyor...");
        await db.query(`UPDATE purchase_requests SET employee_id = NULL WHERE employee_id NOT IN (SELECT id FROM employees)`);
        
        await db.query(`
            ALTER TABLE purchase_requests 
            ADD CONSTRAINT fk_pr_employee 
            FOREIGN KEY (employee_id) REFERENCES employees(id) 
            ON DELETE SET NULL ON UPDATE CASCADE
        `);
        console.log("✅ [FK] fk_pr_employee başarıyla kuruldu.");

        // 2. production_orders -> products ve production_machines (NOT NULL olduğu için SET NULL yapılamıyor, RESTRICT kullanıyoruz)
        await db.query(`
            ALTER TABLE production_orders 
            ADD CONSTRAINT fk_po_product 
            FOREIGN KEY (product_id) REFERENCES products(Id) 
            ON DELETE RESTRICT ON UPDATE CASCADE
        `);
        console.log("✅ [FK] fk_po_product başarıyla kuruldu.");

        await db.query(`
            ALTER TABLE production_orders 
            ADD CONSTRAINT fk_po_machine 
            FOREIGN KEY (machine_id) REFERENCES production_machines(id) 
            ON DELETE RESTRICT ON UPDATE CASCADE
        `);
        console.log("✅ [FK] fk_po_machine başarıyla kuruldu.");

    } catch (error) {
        console.error("❌ Hata:", error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
