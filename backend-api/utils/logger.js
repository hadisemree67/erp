/**
 * ============================================================================
 * DOSYA ADI: logger.js
 * MODÜL / KATMAN: Arkayüz Yardımcısı (Utility) - Sistem Günlükleme (Logging)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistem hatalarını, istisnaları ve önemli operasyonel olayları 
 *   activity_logs tablosuna (veritabanı) kaydeden performanslı bir araçtır.
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Tüm arkayüz modülleri ve hata yakalama ara katmanları tarafından ortaklaşa kullanılır.
 *   - Kullanıcı isimleri UI veya auditRoutes tarafında JOIN ile çekildiği için 
 *     performans artışı sağlamak amacıyla burada ekstra SELECT atılmaz.
 * ============================================================================
 */

const db = require('../db');

/**
 * Veritabanında yapılan işlemleri loglar (kaydeder).
 * @param {number} userId - İşlemi yapan kullanıcının ID'si (jwt token'dan gelen req.user.id)
 * @param {string} actionType - 'INSERT', 'UPDATE', 'DELETE', 'RESTORE'
 * @param {string} targetTable - Hangi tabloda işlem yapıldı? (örn: 'products', 'brands')
 * @param {number} targetId - İşlem yapılan satırın ID'si
 * @param {string} description - İşlem detayı (Kullanıcı adı haricindeki yalın açıklama)
 * @param {object} oldData - Silinen/Güncellenen verinin önceki hali (JSON Object)
 */
async function logActivity(userId, actionType, targetTable, targetId, description, oldData = null) {
    if (!userId) {
        console.warn('logActivity: userId eksik, log kaydedilmeyecek.');
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
        console.error('logActivity Hatası:', err);
    }
}

module.exports = {
    logActivity
};
