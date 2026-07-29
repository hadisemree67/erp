const mysql = require('mysql2');
const query = 'UPDATE products SET Barcode=?, ProductName=?, Brand=?, Category=?, PurchasePrice=?, SalePrice=?, StockQuantity=?, ExpirationDate=?, BatchNumber=?, Description=?, ImagePath=?, Location=?, Formula=?, ProductionTime=? WHERE Id=?';
const values = ['[]', 'saasg', 'CeraVe', 'Anne & Bebek Bakımı', 0, 0, 0, null, null, null, '[]', '', '[]', 0, '9'];
console.log(mysql.format(query, values));
