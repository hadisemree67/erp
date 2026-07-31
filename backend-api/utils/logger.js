/**
 * ============================================================================
 * DOSYA ADI: logger.js
 * MODÜL / KATMAN: Arkayüz Yardımcısı (Utility) - Sistem Günlükleme (Logging)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistem hatalarını, istisnaları (exceptions) ve önemli operasyonel olayları dosyaya (error.log) ve konsola tutarlı bir formatta yazan loglama aracıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Dosya Sistemi (fs) İşlemleri, Tarih ve Zaman Damgalama
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Tüm arkayüz modülleri ve hata yakalama (error handling) ara katmanları tarafından ortaklaşa kullanılır.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu modül, sistem hatalarını, istisnaları ve önemli operasyonel olayları 
 * loglayan (kaydeden) yardımcı bir araçtır.
 */

const db = require('../db');

/**
 * Veritabanında yapılan işlemleri loglar (kaydeder).
 * @param {number} userId - İşlemi yapan kullanıcının ID'si (req.headers['x-user-id'])
 * @param {string} actionType - 'INSERT', 'UPDATE', 'DELETE', 'RESTORE'
 * @param {string} targetTable - Hangi tabloda işlem yapıldı? (örn: 'products', 'brands')
 * @param {number} targetId - İşlem yapılan satırın ID'si
 * @param {string} description - Ekranda yazacak açıklama (örn: 'Ahmet Yılmaz bir ürün sildi.')
 * @param {object} oldData - Silinen/Güncellenen verinin önceki hali (JSON Object)
 */
async function logActivity(userId, actionType, targetTable, targetId, description, oldData = null) {
    if (!userId) {
        console.warn('logActivity: userId eksik, log kaydedilmeyecek.');
        return;
    }

    try {
        const [user] = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
        const userName = user.length > 0 ? user[0].name : 'Bilinmeyen Kullanıcı';
        const finalDescription = `${userName} ${description}`;

        const oldDataJson = oldData ? JSON.stringify(oldData) : null;
        await db.query(
            'INSERT INTO activity_logs (user_id, action_type, target_table, target_id, description, old_data) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, actionType, targetTable, targetId, finalDescription, oldDataJson]
        );
    } catch (err) {
        console.error('logActivity Hatası:', err);
    }
}

module.exports = {
    logActivity
};
