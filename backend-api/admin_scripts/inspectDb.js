/**
 * Dosya: inspectDb.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Veritabanındaki belirli bir tablonun kolonlarını ve yapısını konsola dökerek incelemeye yarayan script.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspect() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [columns] = await conn.query("SHOW COLUMNS FROM users");
  console.log(columns);
  conn.end();
}
inspect();

