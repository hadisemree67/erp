/*
 * ÖZET:
 * Bu script, 'warehouses' (depolar) ve 'warehouse_shelves' (depo rafları) tablolarının 
 * yapılarını (DESCRIBE) sorgulayarak veritabanı şemasının doğru oluşup oluşmadığını kontrol eder.
 */

// Veritabanı bağlantısı modülü içeri aktarılıyor
const db = require('./db');

async function check() {
    try {
        // Depo ve raf tablolarının yapısı çekilip konsola loglanıyor
        const [warehouses] = await db.query('DESCRIBE warehouses');
        console.log("warehouses tablosu:", warehouses);
        
        const [shelves] = await db.query('DESCRIBE warehouse_shelves');
        console.log("warehouse_shelves tablosu:", shelves);
        
        process.exit(0);
    } catch(e) {
        // Hata yakalanırsa yazdırılıyor
        console.error(e);
        process.exit(1);
    }
}

// Kontrol işlemi başlatılıyor
check();
