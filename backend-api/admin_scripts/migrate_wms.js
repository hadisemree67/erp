const db = require('./db');

async function run() {
    try {
        console.log('--- WMS Lokasyon Tabloları Güncelleniyor ---');

        // 1. Create wms_stock_balances
        await db.query(`
            CREATE TABLE IF NOT EXISTS wms_stock_balances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                location_id INT NOT NULL,
                quantity INT DEFAULT 0,
                last_counted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_product_location (product_id, location_id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (location_id) REFERENCES wms_locations(id) ON DELETE CASCADE
            )
        `);
        console.log('wms_stock_balances tablosu oluşturuldu.');

        // 2. Add location_id to StockMovements
        try {
            await db.query(`ALTER TABLE StockMovements ADD COLUMN location_id INT NULL AFTER Quantity`);
            await db.query(`ALTER TABLE StockMovements ADD FOREIGN KEY (location_id) REFERENCES wms_locations(id)`);
            console.log('StockMovements tablosuna location_id eklendi.');
        } catch (e) {
            // Ignore if column already exists
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('StockMovements.location_id zaten mevcut.');
            } else {
                throw e;
            }
        }

        // 3. Create a default location for existing warehouses if none exist
        const [warehouses] = await db.query(`SELECT id FROM wms_warehouses`);
        for (const wh of warehouses) {
            const [locs] = await db.query(`SELECT id FROM wms_locations WHERE warehouse_id = ?`, [wh.id]);
            if (locs.length === 0) {
                console.log(`Depo ID ${wh.id} için varsayılan bir lokasyon oluşturuluyor...`);
                await db.query(`INSERT INTO wms_locations (warehouse_id, aisle, rack, shelf, barcode) VALUES (?, 'Genel', 'Genel', 'Genel', ?)`, [wh.id, 'LOC-DEF-' + wh.id]);
            }
        }

        console.log('--- WMS Güncellemesi Tamamlandı ---');
        process.exit(0);
    } catch (error) {
        console.error('HATA OLUŞTU:', error);
        process.exit(1);
    }
}

run();
