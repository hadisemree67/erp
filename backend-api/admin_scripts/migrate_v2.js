const db = require('./db');

async function run() {
    try {
        console.log('--- Veritabanı Genişletme Başlıyor ---');

        // 1. Yeni Yetkileri Ekle (Permissions)
        const newPermissions = [
            // CRM
            { key: 'view_crm', desc: 'Müşteri İlişkileri (CRM) Menüsünü Görme' },
            { key: 'crm_customer_add', desc: 'Yeni Müşteri Ekleme' },
            { key: 'crm_tickets', desc: 'Müşteri Şikayet/Taleplerini Yönetme' },
            // Finans
            { key: 'view_finance', desc: 'Finans ve Muhasebe Menüsünü Görme' },
            { key: 'finance_add_transaction', desc: 'Gelir/Gider ve Kasa Hareketi İşleme' },
            { key: 'finance_invoices', desc: 'Fatura/E-Fatura Oluşturma ve Yönetimi' },
            // WMS
            { key: 'view_wms', desc: 'Depo ve Sevkiyat (WMS) Menüsünü Görme' },
            { key: 'wms_transfer', desc: 'Depolar Arası Ürün Transferi Yapma' },
            { key: 'wms_location', desc: 'Depo Lokasyon/Raf Sistemi Yönetimi' },
            // Satın Alma
            { key: 'view_procurement', desc: 'Satın Alma (Procurement) Menüsünü Görme' },
            { key: 'procurement_request', desc: 'Satın Alma Talebi (PR) Açma' },
            { key: 'procurement_order', desc: 'Satın Alma Siparişi (PO) Oluşturma' }
        ];

        console.log('Yeni yetkiler ekleniyor...');
        for (const perm of newPermissions) {
            await db.query(`INSERT IGNORE INTO permissions (permission_key, description) VALUES (?, ?)`, [perm.key, perm.desc]);
        }

        // 2. Tabloların Oluşturulması

        // 2.1 CRM Tabloları
        console.log('CRM tabloları oluşturuluyor...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS crm_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                account_type ENUM('B2B', 'B2C') DEFAULT 'B2C',
                tax_office VARCHAR(100),
                tax_number VARCHAR(50),
                balance DECIMAL(18,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS crm_tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                subject VARCHAR(200) NOT NULL,
                description TEXT,
                status ENUM('Açık', 'İnceleniyor', 'Çözüldü', 'İptal') DEFAULT 'Açık',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            )
        `);

        // 2.2 Finans Tabloları
        console.log('Finans tabloları oluşturuluyor...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS finance_bank_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_name VARCHAR(100) NOT NULL,
                iban VARCHAR(50),
                currency VARCHAR(10) DEFAULT 'TRY',
                balance DECIMAL(18,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS finance_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bank_account_id INT NOT NULL,
                type ENUM('GELİR', 'GİDER') NOT NULL,
                amount DECIMAL(18,2) NOT NULL,
                category VARCHAR(100),
                description VARCHAR(255),
                transaction_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bank_account_id) REFERENCES finance_bank_accounts(id)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS finance_invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NULL,
                invoice_no VARCHAR(50) UNIQUE NOT NULL,
                amount DECIMAL(18,2) NOT NULL,
                status ENUM('Taslak', 'Kesildi', 'İptal') DEFAULT 'Taslak',
                issue_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2.3 WMS (Depo) Tabloları
        console.log('WMS (Depo) tabloları oluşturuluyor...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS wms_warehouses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert a default main warehouse if none exists
        await db.query(`INSERT IGNORE INTO wms_warehouses (id, name, location) VALUES (1, 'Ana Merkez Depo', 'Merkez')`);

        await db.query(`
            CREATE TABLE IF NOT EXISTS wms_locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                warehouse_id INT NOT NULL,
                aisle VARCHAR(20),
                rack VARCHAR(20),
                shelf VARCHAR(20),
                barcode VARCHAR(50) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (warehouse_id) REFERENCES wms_warehouses(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS wms_transfers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                from_warehouse_id INT NOT NULL,
                to_warehouse_id INT NOT NULL,
                quantity INT NOT NULL,
                status ENUM('Bekliyor', 'Yolda', 'Tamamlandı', 'İptal') DEFAULT 'Bekliyor',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_warehouse_id) REFERENCES wms_warehouses(id),
                FOREIGN KEY (to_warehouse_id) REFERENCES wms_warehouses(id)
            )
        `);

        // 2.4 Satın Alma (Procurement) Tabloları
        console.log('Satın Alma tabloları oluşturuluyor...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NULL,
                product_name VARCHAR(150) NOT NULL,
                quantity INT NOT NULL,
                description TEXT,
                status ENUM('Bekliyor', 'Onaylandı', 'Reddedildi') DEFAULT 'Bekliyor',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supplier_id INT NOT NULL,
                product_name VARCHAR(150) NOT NULL,
                quantity INT NOT NULL,
                unit_price DECIMAL(18,2) NOT NULL,
                total_price DECIMAL(18,2) NOT NULL,
                status ENUM('Taslak', 'Onaylandı', 'Sipariş Geçildi', 'Teslim Alındı', 'İptal') DEFAULT 'Taslak',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            )
        `);

        console.log('--- Veritabanı Genişletme Tamamlandı ---');
        process.exit(0);
    } catch (error) {
        console.error('HATA OLUŞTU:', error);
        process.exit(1);
    }
}

run();
