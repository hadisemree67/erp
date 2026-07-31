/*
 * ÖZET:
 * Bu script, veritabanındaki belirli bir tablonun (ör. users) kolonlarını ve yapısal 
 * kısıtlamalarını konsola dökerek şemayı incelemeye yarayan teşhis scriptidir.
 */

// Çevresel değişkenler ve mysql modülü yükleniyor
const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspect() {
  // Veritabanı bağlantısı oluşturuluyor
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  // 'users' tablosunun yapısı çekiliyor
  const [columns] = await conn.query("SHOW COLUMNS FROM users");
  
  // Yapı konsola yazdırılıp bağlantı sonlandırılıyor
  console.log(columns);
  conn.end();
}

// İnceleme işlemi başlatılıyor
inspect();
