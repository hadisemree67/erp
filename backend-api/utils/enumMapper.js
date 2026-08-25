/**
 * ============================================================================
 * DOSYA ADI: enumMapper.js
 * MODÜL / KATMAN: Arkayüz Yardımcısı (Utility) - Veri Dönüşümü (Mapping)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Veritabanında tutulan karmaşık veya bozuk karakterli durum (status) metinlerini,
 *   kullanıcı arayüzünde (Frontend) gösterilecek düzgün Türkçe metinlere dönüştürür.
 *   Aynı şekilde, UI'dan gelen düzgün metinleri veritabanı formatına geri çevirir.
 * ============================================================================
 */

/**
 * Veritabanı formatından (Prisma/MySQL) Frontend (Kullanıcı Arayüzü) formatına dönüştürür.
 * @param {string} status - Veritabanındaki durum metni (örn: 'Haz_rlan_yor')
 * @returns {string} - UI'da gösterilecek temiz metin (örn: 'Toplanıyor')
 */
const toFrontendStatus = (status) => {
    const map = {
        'Onayland_': 'Onaylandı',
        'Toplamada': 'Toplanacaklar',
        'Haz_rlan_yor': 'Toplanıyor',
        'Haz_r': 'Toplandı',
        'Kargoya_Verildi': 'Kargoya Verildi',
        'Teslim_Edildi': 'Teslim Edildi',
        'ptal': 'İptal',
        'ptal_Edildi': 'İptal Edildi',
        'ptal_Bekliyor': 'İptal Bekliyor',
        'İptal Bekliyor': 'İptal Bekliyor'
    };
    return map[status] || status;
};

/**
 * Frontend (Kullanıcı Arayüzü) formatından Veritabanı (Prisma/MySQL) formatına dönüştürür.
 * @param {string} status - UI'dan gelen temiz metin (örn: 'Toplanıyor')
 * @returns {string} - Veritabanına yazılacak durum metni (örn: 'Haz_rlan_yor')
 */
const toPrismaStatus = (status) => {
    const map = {
        'Onaylandı': 'Onayland_',
        'Toplanacaklar': 'Toplamada',
        'Toplanıyor': 'Haz_rlan_yor',
        'Toplandı': 'Haz_r',
        'Kargoya Verildi': 'Kargoya_Verildi',
        'Teslim Edildi': 'Teslim_Edildi',
        'İptal': 'ptal',
        'İptal Edildi': 'ptal_Edildi',
        'İptal Bekliyor': 'ptal_Bekliyor'
    };
    return map[status] || status;
};

module.exports = { toFrontendStatus, toPrismaStatus };
