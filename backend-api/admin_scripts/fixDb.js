/**
 * Dosya: fixDb.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Veritabanı kayıtlarındaki hatalı tipleri (örneğin null veya string kalmış verileri) düzeltmeye yarayan onarım scripti.
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function fixDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('VeritabanÄ±na baÄŸlanÄ±ldÄ±.');

    // Tabloya username eklemeyi dene, varsa hata fÄ±rlatabilir ama yakalarÄ±z
    try {
      await connection.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER id');
      console.log('username kolonu eklendi.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('username kolonu zaten var.');
      } else {
        console.error('Kolon eklenirken hata (veya tablo zaten bu yapÄ±da deÄŸil):', e.message);
      }
    }

    const plainPassword = '74565404Hey.';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['hadisemreylmz']);
    if (rows.length === 0) {
      await connection.query(
        'INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['hadisemreylmz', 'Hadis Emre YÄ±lmaz', 'admin@dermoeczanem.com', passwordHash, 'admin']
      );
      console.log('YÃ¶netici baÅŸarÄ±yla eklendi!');
    } else {
      await connection.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [passwordHash, 'hadisemreylmz']
      );
      console.log('YÃ¶netici ÅŸifresi gÃ¼ncellendi.');
    }

    await connection.end();
  } catch (error) {
    console.error('Hata:', error);
  }
}

fixDb();

