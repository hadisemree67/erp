CREATE TABLE IF NOT EXISTS warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(200),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_shelves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    shelf_code VARCHAR(100) NOT NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);
