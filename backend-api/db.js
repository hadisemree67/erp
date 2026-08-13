/**
 * ============================================================================
 * DOSYA ADI: db.js
 * MODÜL / KATMAN: Arkayüz Çekirdeği - Veritabanı Bağlantı ve Sorgu Havuzu
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   MySQL / MariaDB bağlantısını başlatır, bağlantı havuzunu yönetir ve rotaların veritabanı üzerinde güvenli, asenkron SQL sorguları çalıştırması için ortak bir arayüz (query metodu) sunar.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Veritabanı Sürücüsü (MySQL2 / Promise Pool), Asenkron Promise Yapısı
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Sistemin veri katmanıdır (Data Layer). Tüm API rotaları (routes) ve servisler veritabanı işlemleri için bu dosyayı import eder.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu modül, veritabanı bağlantı havuzunu (connection pool) yönetir ve tüm rotaların 
 * veritabanı ile güvenli asenkron SQL sorguları çalıştırması için ortak bir yapı sunar.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        throw new Error(`CRITICAL ERROR: ${key} environment variable is missing or empty!`);
    }
}
if (process.env.DB_PASSWORD === undefined) {
    throw new Error(`CRITICAL ERROR: DB_PASSWORD environment variable is missing! (It can be empty, but must be defined in .env)`);
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 🚨 PERFORMANS VE ZAMAN DÜZELTMELERİ
    enableKeepAlive: true,       // TCP bağlantı kopmalarını engeller
    keepAliveInitialDelay: 0,    // Boşta kalınca ping atar
    dateStrings: true            // Tarih sapmalarını (-3 / +3 saat) engellemek için doğrudan metin okur
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
