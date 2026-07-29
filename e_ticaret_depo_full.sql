CREATE DATABASE IF NOT EXISTS e_ticaret_depo;
USE e_ticaret_depo;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('kullanici', 'admin', 'employee') DEFAULT 'kullanici',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_key VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INT,
    permission_id INT,
    PRIMARY KEY (user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Products (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Barcode VARCHAR(50) NOT NULL UNIQUE,
    ProductName VARCHAR(150) NOT NULL,
    Brand VARCHAR(100) NOT NULL,
    Category VARCHAR(100) NOT NULL,
    PurchasePrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    SalePrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    StockQuantity INT NOT NULL DEFAULT 0,
    ExpirationDate DATE NULL,
    BatchNumber VARCHAR(50) NULL,
    Description VARCHAR(500) NULL,
    ImagePath VARCHAR(255) NULL,
    Location VARCHAR(50) NULL -- Yeni eklenen konum/raf bilgisi sütunu (Örn: "KORIDOR-A-RAF-3")
);

CREATE TABLE IF NOT EXISTS Suppliers (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    SupplierName VARCHAR(150) NOT NULL,
    ContactPerson VARCHAR(100) NULL,
    Phone VARCHAR(20) NULL,
    Email VARCHAR(100) NULL,
    Address VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS Customers (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    CustomerName VARCHAR(150) NOT NULL,
    Phone VARCHAR(20) NULL,
    Email VARCHAR(100) NULL,
    Address VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS StockMovements (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ProductId INT NOT NULL,
    UserId INT NOT NULL,
    MovementType ENUM('IN', 'OUT') NOT NULL,
    Quantity INT NOT NULL,
    MovementDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    RelatedId INT NULL,
    Description VARCHAR(255) NULL,
    
    FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS Orders (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    CustomerId INT NOT NULL,
    OrderNumber VARCHAR(50) NOT NULL UNIQUE, -- E-ticaret sipariş numarası (Örn: SP-2026001)
    OrderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    OrderStatus ENUM('Beklemede', 'Hazırlanıyor', 'Kargoya Verildi', 'Teslim Edildi', 'İptal Edildi') DEFAULT 'Beklemede',
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    ShippingAddress VARCHAR(500) NULL,
    
    FOREIGN KEY (CustomerId) REFERENCES Customers(Id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS OrderItems (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    OrderId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL, -- Satış anındaki fiyat (Ürün fiyatı değişirse eski siparişler bozulmasın diye)
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS Shippers (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    CompanyName VARCHAR(100) NOT NULL,
    Phone VARCHAR(20) NULL
);

CREATE TABLE IF NOT EXISTS product_barcodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    barcode VARCHAR(100) NOT NULL UNIQUE, -- Aynı barkod başka üründe olmasın diye UNIQUE yaptık
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(Id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Aynı marka ismi iki kez eklenemesin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kategori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Aynı kategori ismi iki kez eklenemesin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- UNUTULAN/SİLİNEN KISIM: PERSONEL VE İZİN TABLOLARI
-- =============================================================

CREATE TABLE IF NOT EXISTS employees (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) DEFAULT NULL,
    position VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    tckn VARCHAR(11) DEFAULT NULL,
    address TEXT,
    blood_type VARCHAR(10) DEFAULT NULL,
    emergency_contact VARCHAR(100) DEFAULT NULL,
    photo_path VARCHAR(255) DEFAULT NULL,
    salary DECIMAL(10,2) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    work_status VARCHAR(50) DEFAULT 'Çalışıyor',
    hakedilen_yillik_izin INT DEFAULT 14,
    offboarding_status VARCHAR(20) DEFAULT 'NONE',
    offboarding_details JSON DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    exit_reason VARCHAR(100) DEFAULT NULL,
    severance_pay DECIMAL(10,2) DEFAULT NULL,
    exit_documents JSON DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_documents (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_leaves (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Onaylandı',
    description TEXT,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,            -- Hareketi yapan yetkilinin ID'si
    action_type VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'RESTORE'
    target_table VARCHAR(100) NOT NULL,-- Hangi tabloda işlem yapıldı? (örn: 'urunler')
    target_id INT NOT NULL,          -- İşlem yapılan satırın ID'si
    description TEXT NOT NULL,       -- Ekranda yazacak açıklama (örn: 'Ahmet Yılmaz bir stok sildi.')
    is_undone TINYINT(1) DEFAULT 0,
    old_data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) -- Yetkililer tablonuzun adı neyse ona bağlayın
);
