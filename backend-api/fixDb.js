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

    console.log('Veritabanına bağlanıldı.');

    // Tabloya username eklemeyi dene, varsa hata fırlatabilir ama yakalarız
    try {
      await connection.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER id');
      console.log('username kolonu eklendi.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('username kolonu zaten var.');
      } else {
        console.error('Kolon eklenirken hata (veya tablo zaten bu yapıda değil):', e.message);
      }
    }

    const plainPassword = '74565404Hey.';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['hadisemreylmz']);
    if (rows.length === 0) {
      await connection.query(
        'INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['hadisemreylmz', 'Hadis Emre Yılmaz', 'admin@dermoeczanem.com', passwordHash, 'admin']
      );
      console.log('Yönetici başarıyla eklendi!');
    } else {
      await connection.query(
        'UPDATE users SET password = ? WHERE username = ?',
        [passwordHash, 'hadisemreylmz']
      );
      console.log('Yönetici şifresi güncellendi.');
    }

    await connection.end();
  } catch (error) {
    console.error('Hata:', error);
  }
}

fixDb();
