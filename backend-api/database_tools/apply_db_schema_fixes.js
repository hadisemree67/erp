require('dotenv').config({ path: '../.env' });
const db = require('../db');

async function addUniqueSafe(tableName, columnName, constraintName = null) {
    const constraint = constraintName || `${tableName}_${columnName}_unique`;
    try {
        await db.query(`ALTER TABLE ${tableName} ADD CONSTRAINT ${constraint} UNIQUE (${columnName})`);
        console.log(`✅ [UNIQUE] ${tableName}.${columnName} benzersiz (unique) yapıldı.`);
    } catch (e) {
        if (e.code === 'ER_DUP_KEY' || e.errno === 1061 || e.errno === 1062) {
            console.warn(`⚠️ [UYARI] ${tableName}.${columnName} UNIQUE yapılamadı! (Duplicate data var veya zaten unique)`);
        } else {
            console.error(`❌ [HATA] ${tableName}.${columnName} UNIQUE yapılırken hata:`, e.message);
        }
    }
}

async function addFkSafe(tableName, fkColumn, targetTable, targetColumn, constraintName) {
    try {
        // İlgili kolondaki geçersiz verileri temizle (Örn: products tablosunda olmayan product_id'leri NULL yap vb. - Şimdilik sadece uyarıyoruz)
        await db.query(`
            ALTER TABLE ${tableName} 
            ADD CONSTRAINT ${constraintName} 
            FOREIGN KEY (${fkColumn}) REFERENCES ${targetTable}(${targetColumn}) 
            ON DELETE SET NULL ON UPDATE CASCADE
        `);
        console.log(`✅ [FK] ${tableName}.${fkColumn} -> ${targetTable}.${targetColumn} ilişkisi kuruldu.`);
    } catch (e) {
        if (e.errno === 1061 || e.errno === 1826 || e.errno === 1452 || e.code === 'ER_ROW_IS_REFERENCED_2') {
            console.warn(`⚠️ [UYARI] FK Kurulamadı (${constraintName}):`, e.message);
        } else {
            console.error(`❌ [HATA] FK Kurulurken hata (${constraintName}):`, e.message);
        }
    }
}

async function run() {
    try {
        console.log("🛠️ Veritabanı yapısal düzeltmeleri başlatılıyor...");

        // 1. UNIQUE kısıtlamaları
        await addUniqueSafe('warehouse_shelves', 'barcode');
        await addUniqueSafe('warehouses', 'barcode');
        await addUniqueSafe('picking_carts', 'barcode');
        await addUniqueSafe('picking_cart_sections', 'barcode');
        
        // wms_stock_balances için karmaşık UNIQUE
        try {
            await db.query(`ALTER TABLE wms_stock_balances ADD CONSTRAINT unique_stock_location_batch UNIQUE (product_id, warehouse_id, shelf_code, batch_number)`);
            console.log(`✅ [UNIQUE] wms_stock_balances birleşik unique kısıtlaması eklendi.`);
        } catch(e) {
            console.warn(`⚠️ [UYARI] wms_stock_balances UNIQUE kısıtlaması eklenemedi (Çift eden veriler olabilir): ${e.message}`);
        }

        // 2. Eksik FK'ler
        // orders -> BoxId
        await addFkSafe('orders', 'BoxId', 'packaging_boxes', 'Id', 'fk_orders_box');
        
        // orders -> CampaignId
        await addFkSafe('orders', 'CampaignId', 'campaigns', 'id', 'fk_orders_campaign');

        // purchase_requests FK'leri
        await addFkSafe('purchase_requests', 'employee_id', 'employees', 'id', 'fk_pr_employee');
        await addFkSafe('purchase_requests', 'supplier_id', 'suppliers', 'Id', 'fk_pr_supplier');
        await addFkSafe('purchase_requests', 'product_id', 'products', 'Id', 'fk_pr_product');

        // production_orders FK'leri
        await addFkSafe('production_orders', 'product_id', 'products', 'Id', 'fk_po_product');
        await addFkSafe('production_orders', 'machine_id', 'production_machines', 'id', 'fk_po_machine');
        await addFkSafe('production_orders', 'assigned_user_id', 'users', 'id', 'fk_po_assigned_user');
        await addFkSafe('production_orders', 'delivered_to_user_id', 'users', 'id', 'fk_po_delivered_to');

        // 3. campaigns_products junction tablosu
        await db.query(`
            CREATE TABLE IF NOT EXISTS campaign_products (
                campaign_id INT NOT NULL,
                product_id INT NOT NULL,
                PRIMARY KEY (campaign_id, product_id),
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(Id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("✅ [TABLE] campaign_products ara tablosu oluşturuldu.");

        // Eski JSON verilerini yeni tabloya taşıma işlemi (Basit düzeyde)
        const [campaigns] = await db.query('SELECT id, target_product_ids FROM campaigns WHERE target_product_ids IS NOT NULL');
        for (let camp of campaigns) {
            if (camp.target_product_ids && typeof camp.target_product_ids === 'string') {
                try {
                    const ids = JSON.parse(camp.target_product_ids);
                    if (Array.isArray(ids)) {
                        for (let pId of ids) {
                            await db.query(`INSERT IGNORE INTO campaign_products (campaign_id, product_id) VALUES (?, ?)`, [camp.id, pId]);
                        }
                    }
                } catch(e) {}
            }
        }
        
        // 4. products.Barcode silinmesi
        try {
            await db.query('ALTER TABLE products DROP COLUMN Barcode');
            console.log('✅ [DROP] products tablosundaki Barcode kolonu silindi.');
        } catch(e) {
            console.warn('⚠️ [UYARI] products.Barcode zaten silinmiş veya silinemedi.');
        }

        console.log("🎉 Yapısal güncellemeler tamamlandı!");
    } catch (error) {
        console.error("❌ Kritik Hata:", error);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

run();
