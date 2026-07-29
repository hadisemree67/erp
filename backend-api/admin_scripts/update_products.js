const fs = require('fs');
let code = fs.readFileSync('routes/products.js', 'utf8');

// Update multer configuration to accept any files (so we can have multiple contract files with different field names)
code = code.replace(/upload\.fields\(\[\{ name: 'images', maxCount: 5 \}, \{ name: 'contractFile', maxCount: 1 \}\]\)/g, "upload.any()");

// Add product_suppliers logic to GET /
const getReplace = `        const [rows] = await db.query('SELECT p.*, COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = p.Id), 0) AS StockQuantity FROM products p ORDER BY p.Id DESC');
        
        // Fetch all product suppliers
        const [suppliers] = await db.query('SELECT * FROM product_suppliers');
        
        // Map suppliers to products
        const productsWithSuppliers = rows.map(product => {
            product.suppliers = suppliers.filter(s => s.product_id === product.Id);
            return product;
        });

        res.json(productsWithSuppliers);`;

code = code.replace(/        const \[rows\] = await db.query\('SELECT p\.\*, COALESCE\(\(SELECT SUM\(quantity\) FROM wms_stock_balances WHERE product_id = p\.Id\), 0\) AS StockQuantity FROM products p ORDER BY p\.Id DESC'\);\s*res\.json\(rows\);/g, getReplace);

fs.writeFileSync('routes/products.js', code);
console.log('GET / replaced and upload.any() applied.');
