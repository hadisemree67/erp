const db = require('../db');

async function updateDb() {
    try {
        console.log("Veritabanına bağlanıldı.");

        const [columns] = await db.query(
            `SHOW COLUMNS FROM suppliers LIKE 'supplier_type'`
        );

        if (columns.length === 0) {
            console.log("supplier_type kolonu ekleniyor...");

            await db.query(`
                ALTER TABLE suppliers
                ADD COLUMN supplier_type ENUM('Tedarikçi', 'Fason') DEFAULT 'Tedarikçi'
            `);

            console.log("supplier_type eklendi.");
        } else {
            console.log("supplier_type kolonu zaten mevcut.");
        }

        console.log("Veritabanı güncellemesi tamamlandı.");
    } catch (error) {
        console.error("Hata oluştu:", error);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

updateDb();
