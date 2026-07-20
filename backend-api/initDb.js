const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function initDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('Veritabanına bağlanıldı.');

    // Veritabanını oluştur ve kullan
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await connection.query(`USE \`${process.env.DB_NAME}\``);

    // users tablosunu oluştur
    // ER diyagramındaki alanlara ek olarak giriş yapabilmesi için 'username' eklendi.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100),
        email VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'employee') DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('users tablosu hazır.');

    // Yönetici kullanıcısının şifresini hash'le
    const plainPassword = '74565404Hey.';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    // Kullanıcıyı veritabanına ekle (Eğer yoksa ekle)
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['hadisemreylmz']);
    if (rows.length === 0) {
      await connection.query(
        'INSERT INTO users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        ['hadisemreylmz', 'Yönetici', 'admin@dermoeczanem.com', passwordHash, 'admin']
      );
      console.log('Yönetici hadisemreylmz başarıyla eklendi!');
    } else {
      // Şifreyi güncelle (test için kolaylık olsun diye)
      await connection.query(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [passwordHash, 'hadisemreylmz']
      );
      console.log('Yönetici zaten mevcut, şifresi güncellendi.');
    }

    await connection.end();
    console.log('Veritabanı kurulumu tamamlandı!');
  } catch (error) {
    console.error('Hata:', error);
  }
}

initDb();
