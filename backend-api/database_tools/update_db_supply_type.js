const db = require('../db');

async function updateDb() {
    try {
        console.log("Veritabanına bağlanıldı.");

        const [columns] = await db.query(
            `SHOW COLUMNS FROM products LIKE 'supply_type'`
        );

        if (columns.length === 0) {
            console.log("supply_type kolonu ekleniyor...");

            await db.query(`
                ALTER TABLE products
                ADD COLUMN supply_type ENUM('KENDİ ÜRETİMİMİZ', 'SATIŞ', 'FASON')
                DEFAULT 'KENDİ ÜRETİMİMİZ'
            `);

            console.log("supply_type eklendi.");
        } else {
            console.log("supply_type kolonu zaten mevcut.");
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
