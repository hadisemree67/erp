const db = require('./db');

async function migrate() {
    try {
        console.log('Starting migration for product_suppliers...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS product_suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                supplier_id INT NOT NULL,
                contract_file VARCHAR(255),
                contract_start_date DATE,
                contract_end_date DATE,
                is_primary BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(Id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(Id) ON DELETE CASCADE,
                UNIQUE KEY unique_product_supplier (product_id, supplier_id)
            )
        `);
        console.log('product_suppliers table created.');

        const [products] = await db.query('SELECT Id, supplier_id, contract_file, contract_start_date, contract_end_date FROM products WHERE supplier_id IS NOT NULL');
        console.log(`Found ${products.length} products with existing suppliers. Migrating...`);

        for (const p of products) {
            await db.query(`
                INSERT IGNORE INTO product_suppliers 
                (product_id, supplier_id, contract_file, contract_start_date, contract_end_date, is_primary)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [p.Id, p.supplier_id, p.contract_file || null, p.contract_start_date || null, p.contract_end_date || null, true]);
        }
        
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
