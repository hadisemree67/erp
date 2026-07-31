/*
 * ÖZET:
 * Bu script, veritabanındaki ana tabloların (ürünler, depolar, raflar) şemalarını (kolon yapılarını) 
 * çekerek ekranda düzenli bir tablo (console.table) formatında listeler.
 */

// Veritabanı bağlantısı içeri aktarılıyor
const db = require('./db');

async function run() {
    try {
        // Ürünler, depolar ve raflar tablolarının yapısı çekiliyor
        const [products] = await db.query('DESCRIBE products');
        const [warehouses] = await db.query('DESCRIBE warehouses');
        let shelves;
        try {
            [shelves] = await db.query('DESCRIBE warehouse_shelves');
        } catch (e) {
            console.log('warehouse_shelves tablosu bulunamadı, raflar farklı tutuluyor olabilir mi?');
        }
        
        // Çekilen tablo yapıları konsola tablo formatında yazdırılıyor
        console.log('--- ÜRÜNLER ---');
        console.table(products);
        console.log('--- DEPOLAR ---');
        console.table(warehouses);
        if (shelves) {
            console.log('--- RAFLAR ---');
            console.table(shelves);
        }
    } catch (e) {
        // Hata durumunda ekrana yazdırılıyor
        console.error(e);
    } finally {
        // İşlem tamamlanınca çıkış yapılıyor
        process.exit(0);
    }
}

// Şema okuma işlemi başlatılıyor
run();
