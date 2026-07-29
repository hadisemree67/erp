const db = require('./db');
db.query("SELECT Id, ProductName, supplier_id FROM products WHERE ProductName LIKE '%Demir%'").then(([r])=> {
    console.log(r);
    process.exit(0);
});
