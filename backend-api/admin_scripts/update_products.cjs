const fs = require('fs');
let code = fs.readFileSync('routes/products.js', 'utf8');

// Replace destructuring in POST
code = code.replace(
    /const \{ Barcode, ProductName, Brand, Category, PurchasePrice, SalePrice, StockQuantity, ExpirationDate, BatchNumber, Description, existingImages, Location, Formula, ProductionTime, Width, Height, Depth, is_stackable, max_stack_limit, unit_type, package_capacity, package_name, critical_stock_level, suppliers \} = req\.body;/g,
    'const { Barcode, ProductName, Brand, Category, shelf_life_months, lead_time_days, SalePrice, StockQuantity, BatchNumber, Description, existingImages, Location, Formula, ProductionTime, Width, Height, Depth, is_stackable, max_stack_limit, unit_type, package_capacity, package_name, critical_stock_level, suppliers } = req.body;'
);

// Replace INSERT query
code = code.replace(
    /INSERT INTO products\n\s*\(Barcode, ProductName, Brand, Category, PurchasePrice, SalePrice, StockQuantity, ExpirationDate, BatchNumber, Description, ImagePath, Location, Formula, ProductionTime, Width, Height, Depth, Volume, is_stackable, max_stack_limit, unit_type, package_capacity, package_name, critical_stock_level\)/g,
    'INSERT INTO products\\n            (Barcode, ProductName, Brand, Category, shelf_life_months, lead_time_days, SalePrice, StockQuantity, BatchNumber, Description, ImagePath, Location, Formula, ProductionTime, Width, Height, Depth, Volume, is_stackable, max_stack_limit, unit_type, package_capacity, package_name, critical_stock_level)'
);

// Replace INSERT values
code = code.replace(
    /finalBarcodeString, ProductName \|\| '', Brand \|\| '', Category \|\| '', PurchasePrice \|\| 0, SalePrice \|\| 0, StockQuantity \|\| 0, ExpirationDate \|\| null, BatchNumber \|\| '', Description \|\| '', finalImagePath, Location \|\| '', Formula \|\| '', ProductionTime \|\| 0, widthVal, heightVal, depthVal, volumeVal, isStackableVal, maxStackLimitVal, unit_type \|\| 'Adet', parseFloat\(package_capacity\) \|\| 1, package_name \|\| 'Kutu', parseInt\(critical_stock_level\) \|\| 0/g,
    "finalBarcodeString, ProductName || '', Brand || '', Category || '', parseInt(shelf_life_months) || 0, parseInt(lead_time_days) || 0, SalePrice || 0, StockQuantity || 0, BatchNumber || '', Description || '', finalImagePath, Location || '', Formula || '', ProductionTime || 0, widthVal, heightVal, depthVal, volumeVal, isStackableVal, maxStackLimitVal, unit_type || 'Adet', parseFloat(package_capacity) || 1, package_name || 'Kutu', parseInt(critical_stock_level) || 0"
);

// Replace UPDATE fallback values
code = code.replace(
    /req\.body\.PurchasePrice !== undefined \? \(req\.body\.PurchasePrice === '' \? 0 : req\.body\.PurchasePrice\) : oldData\.PurchasePrice,/g,
    "req.body.shelf_life_months !== undefined ? (req.body.shelf_life_months === '' ? 0 : parseInt(req.body.shelf_life_months)) : oldData.shelf_life_months,"
);

code = code.replace(
    /req\.body\.ExpirationDate !== undefined \? \(req\.body\.ExpirationDate === '' \? null : req\.body\.ExpirationDate\) : oldData\.ExpirationDate,/g,
    "req.body.lead_time_days !== undefined ? (req.body.lead_time_days === '' ? 0 : parseInt(req.body.lead_time_days)) : oldData.lead_time_days,"
);

// Replace UPDATE query
code = code.replace(
    /SET Barcode=\?, ProductName=\?, Brand=\?, Category=\?, PurchasePrice=\?, SalePrice=\?, StockQuantity=\?, ExpirationDate=\?, BatchNumber=\?, Description=\?, ImagePath=\?, Location=\?, Formula=\?, ProductionTime=\?, Width=\?, Height=\?, Depth=\?, Volume=\?, is_stackable=\?, max_stack_limit=\?, unit_type=\?, package_capacity=\?, package_name=\?, critical_stock_level=\?/g,
    "SET Barcode=?, ProductName=?, Brand=?, Category=?, shelf_life_months=?, lead_time_days=?, SalePrice=?, StockQuantity=?, BatchNumber=?, Description=?, ImagePath=?, Location=?, Formula=?, ProductionTime=?, Width=?, Height=?, Depth=?, Volume=?, is_stackable=?, max_stack_limit=?, unit_type=?, package_capacity=?, package_name=?, critical_stock_level=?"
);

fs.writeFileSync('routes/products.js', code);
console.log('Update successful');
