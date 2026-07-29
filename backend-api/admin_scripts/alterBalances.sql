ALTER TABLE wms_stock_balances ADD COLUMN warehouse_id INT NULL;
ALTER TABLE wms_stock_balances ADD COLUMN shelf_code VARCHAR(100) NULL;
ALTER TABLE wms_stock_balances MODIFY COLUMN location_id INT NULL;
