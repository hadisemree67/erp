const bcrypt = require('bcrypt');
const db = require('./db');

async function main() {
    try {
        const hashedPassword = await bcrypt.hash('deneme1', 12);
        
        // 1. ERP Yöneticisi (users tablosu)
        const [adminRows] = await db.query('SELECT id FROM users WHERE username = ?', ['deneme']);
        
        if (adminRows.length > 0) {
            await db.query('UPDATE users SET password = ?, role = ? WHERE username = ?', [hashedPassword, 'manager', 'deneme']);
            console.log('ERP yöneticisi güncellendi.');
        } else {
            await db.query(`
                INSERT INTO users (username, name, email, password, role)
                VALUES (?, ?, ?, ?, ?)
            `, ['deneme', 'Deneme Yönetici', 'admin@deneme.com', hashedPassword, 'manager']);
            console.log('ERP yöneticisi oluşturuldu.');
        }

        // 2. Web Sitesi Müşterisi (customers tablosu)
        const [customerRows] = await db.query('SELECT Id FROM customers WHERE Email = ?', ['deneme']);
        
        if (customerRows.length > 0) {
            await db.query('UPDATE customers SET Password = ?, IsVerified = ? WHERE Id = ?', [hashedPassword, true, customerRows[0].Id]);
            console.log('Web müşterisi güncellendi.');
        } else {
            await db.query(`
                INSERT INTO customers (CustomerName, Email, Password, IsVerified)
                VALUES (?, ?, ?, ?)
            `, ['Deneme Müşteri', 'deneme', hashedPassword, true]);
            console.log('Web müşterisi oluşturuldu.');
        }

        console.log('İşlem başarıyla tamamlandı!');
    } catch (e) {
        console.error('Veritabanı hatası:', e);
    } finally {
        process.exit(0);
    }
}

main();
