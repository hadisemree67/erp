const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const db = require('../db');

// Log formatı: Zaman damgası ve JSON yapısı
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Günlük rotasyon ayarları (örneğin error-2026-09-08.log)
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d', // 30 gün boyunca sakla
});

const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // 14 gün boyunca sakla
});

// Logger oluştur
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'backend-api' },
  transports: [
    fileRotateTransport,
    combinedRotateTransport
  ],
});

// Geliştirme ortamında (production değilken) konsola da renkli yazdır
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Veritabanında yapılan işlemleri loglar (kaydeder).
 * @param {number} userId - İşlemi yapan kullanıcının ID'si
 * @param {string} actionType - 'INSERT', 'UPDATE', 'DELETE', 'RESTORE'
 * @param {string} targetTable - Hangi tabloda işlem yapıldı? (örn: 'products', 'brands')
 * @param {number} targetId - İşlem yapılan satırın ID'si
 * @param {string} description - İşlem detayı
 * @param {object} oldData - Silinen/Güncellenen verinin önceki hali (JSON Object)
 */
async function logActivity(userId, actionType, targetTable, targetId, description, oldData = null) {
    if (!userId) {
        logger.warn('logActivity: userId eksik, log kaydedilmeyecek.');
        return;
    }

    try {
        const oldDataJson = oldData ? JSON.stringify(oldData) : null;
        const safeTargetId = parseInt(targetId) || 0; // null veya geçersiz string sorunlarına karşı koruma

        await db.query(
            'INSERT INTO activity_logs (user_id, action_type, target_table, target_id, description, old_data) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, actionType, targetTable, safeTargetId, description, oldDataJson]
        );
    } catch (err) {
        logger.error('logActivity Hatası:', err);
    }
}

logger.logActivity = logActivity;
module.exports = logger;
