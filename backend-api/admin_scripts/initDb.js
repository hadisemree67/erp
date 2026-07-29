/**
 * Dosya: initDb.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Sistemin ilk kurulumunda MySQL veritabanını ve tablolarını (kullanıcılar, ürünler vb.) baştan oluşturan kurulum scripti.
 */
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

    console.log('VeritabanÄ±na baÄŸlanÄ±ldÄ±.');

    // VeritabanÄ±nÄ± oluÅŸtur ve kullan
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await connection.query(`USE \`${process.env.DB_NAME}\``);

    // users tablosunu oluÅŸtur
    // ER diyagramÄ±ndaki alanlara ek olarak giriÅŸ yapabilmesi iÃ§in 'username' eklendi.
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
    console.log('users tablosu hazÄ±r.');

    // YÃ¶netici kullanÄ±cÄ±sÄ±nÄ±n ÅŸifresini hash'le
    const plainPassword = '74565404Hey.';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

    // KullanÄ±cÄ±yÄ± veritabanÄ±na ekle (EÄŸer yoksa ekle)
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['hadisemreylmz']);
    if (rows.length === 0) {
      await connection.query(
        'INSERT INTO users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        ['hadisemreylmz', 'YÃ¶netici', 'admin@dermoeczanem.com', passwordHash, 'admin']
      );
      console.log('YÃ¶netici hadisemreylmz baÅŸarÄ±yla eklendi!');
    } else {
      // Åifreyi gÃ¼ncelle (test iÃ§in kolaylÄ±k olsun diye)
      await connection.query(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [passwordHash, 'hadisemreylmz']
      );
      console.log('YÃ¶netici zaten mevcut, ÅŸifresi gÃ¼ncellendi.');
    }

    await connection.end();
    console.log('VeritabanÄ± kurulumu tamamlandÄ±!');
  } catch (error) {
    console.error('Hata:', error);
  }
}

initDb();

