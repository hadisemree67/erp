/**
 * ============================================================================
 * DOSYA ADI: enumMapper.js
 * MODÜL / KATMAN: Arkayüz Yardımcısı (Utility) - Veri Dönüşümü (Mapping)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Veritabanındaki durum (status) değerlerini frontend label'larına dönüştürür.
 *   Veritabanı artık düzgün Türkçe ENUM değerleri kullandığından,
 *   toPrismaStatus sadece gerekli label→DB eşlemelerini yapar.
 * 
 * DB ENUM değerleri (orders.OrderStatus):
 *   'Beklemede','Onaylandı','Hazırlanıyor','Toplamada','Hazır',
 *   'Paketleniyor','Paketlendi','Kargoya Verildi','Teslim Edildi',
 *   'İptal','İptal Edildi','İptal Bekliyor'
 * ============================================================================
 */

/**
 * Veritabanı formatından Frontend (Kullanıcı Arayüzü) label'ına dönüştürür.
 * Veritabanı düzgün Türkçe kullandığı için sadece UI label farklılıklarını eşler.
 * @param {string} status - Veritabanındaki durum metni (örn: 'Toplamada')
 * @returns {string} - UI'da gösterilecek label (örn: 'Toplanacaklar')
 */
const toFrontendStatus = (status) => {
    const map = {
        // DB değeri → UI label'ı (sadece farklı olanlar)
        'Toplamada': 'Toplanacaklar',
        'Hazırlanıyor': 'Toplanıyor',
        'Hazır': 'Toplandı',
        // Eski bozuk formatlar için geriye dönük uyumluluk
        'Onayland_': 'Onaylandı',
        'Haz_rlan_yor': 'Toplanıyor',
        'Haz_r': 'Toplandı',
        'Kargoya_Verildi': 'Kargoya Verildi',
        'Teslim_Edildi': 'Teslim Edildi',
        'ptal': 'İptal',
        'ptal_Edildi': 'İptal Edildi',
        'ptal_Bekliyor': 'İptal Bekliyor'
    };
    return map[status] || status;
};

/**
 * Frontend (Kullanıcı Arayüzü) label'ından Veritabanı ENUM değerine dönüştürür.
 * Veritabanı düzgün Türkçe kullandığı için sadece UI label farklılıklarını eşler.
 * @param {string} status - UI'dan gelen label (örn: 'Toplanıyor')
 * @returns {string} - Veritabanına yazılacak ENUM değeri (örn: 'Hazırlanıyor')
 */
const toDbStatus = (status) => {
    const map = {
        // UI label → DB ENUM değeri (sadece farklı olanlar)
        'Toplanacaklar': 'Toplamada',
        'Toplanıyor': 'Hazırlanıyor',
        'Toplandı': 'Hazır'
    };
    return map[status] || status;
};

// Geriye dönük tam uyumluluk için alias
const toPrismaStatus = toDbStatus;

module.exports = { toFrontendStatus, toPrismaStatus, toDbStatus };
