/*
 * ÖZET:
 * Bu script, 'products' (ürünler) tablosunda içerisinde 'Demir' kelimesi geçen 
 * ürünleri filtreleyerek ürün adı ve tedarikçi ID bilgilerini konsola basan test/kontrol scriptidir.
 */

const db = require('./db');

// İçerisinde 'Demir' geçen ürünlerin bilgileri sorgulanıyor
db.query("SELECT Id, ProductName, supplier_id FROM products WHERE ProductName LIKE '%Demir%'").then(([r])=> {
    console.log(r);
    process.exit(0);
});
