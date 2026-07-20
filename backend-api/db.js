const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(connection => {
        console.log('MySQL veritabanına başarıyla bağlanıldı!');
        connection.release();
    })
    .catch(err => {
        console.error('Veritabanına bağlanırken hata oluştu:', err);
    });

module.exports = pool;
