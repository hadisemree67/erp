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

// Güvenlik Kalkanı: MySQL2 "Bind parameters must not contain undefined" hatasını engellemek için
// gelen sorgu parametrelerindeki tüm 'undefined' değerleri otomatik olarak 'null'a çevirir.
const originalQuery = pool.query.bind(pool);
const originalExecute = pool.execute.bind(pool);
const originalGetConnection = pool.getConnection.bind(pool);

function sanitizeParams(params) {
    if (Array.isArray(params)) {
        return params.map(p => p === undefined ? null : p);
    }
    if (params && typeof params === 'object') {
        const cleaned = {};
        for (const key of Object.keys(params)) {
            cleaned[key] = params[key] === undefined ? null : params[key];
        }
        return cleaned;
    }
    return params;
}

pool.query = function (sql, params) {
    return originalQuery(sql, sanitizeParams(params));
};

pool.execute = function (sql, params) {
    return originalExecute(sql, sanitizeParams(params));
};

// ⚠️ MÜSTAKİL BAĞLANTILAR (TRANSACTION) İÇİN KORUMA
// pool.getConnection ile alınan bağımsız connection nesnelerinin kendi .query ve .execute
// metotlarını da "sanitizeParams" filtresinden geçirmek için override (ezme) işlemi yapıyoruz.
pool.getConnection = async function() {
    const connection = await originalGetConnection();
    
    // Eğer bağlantı nesnesi daha önce ezilmemişse (sadece 1 kez eziyoruz)
    if (!connection.__isSanitized) {
        const connOriginalQuery = connection.query.bind(connection);
        const connOriginalExecute = connection.execute.bind(connection);

        connection.query = function(sql, params) {
            return connOriginalQuery(sql, sanitizeParams(params));
        };
        connection.execute = function(sql, params) {
            return connOriginalExecute(sql, sanitizeParams(params));
        };
        
        connection.__isSanitized = true;
    }
    
    return connection;
};

module.exports = pool;
