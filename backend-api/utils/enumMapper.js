const toFrontendStatus = (status) => {
    const map = {
        'Onayland_': 'Onaylandı',
        'Haz_rlan_yor': 'Hazırlanıyor',
        'Haz_r': 'Hazır',
        'Kargoya_Verildi': 'Kargoya Verildi',
        'Teslim_Edildi': 'Teslim Edildi',
        'ptal': 'İptal',
        'ptal_Edildi': 'İptal Edildi'
    };
    return map[status] || status;
};

const toPrismaStatus = (status) => {
    const map = {
        'Onaylandı': 'Onayland_',
        'Hazırlanıyor': 'Haz_rlan_yor',
        'Hazır': 'Haz_r',
        'Kargoya Verildi': 'Kargoya_Verildi',
        'Teslim Edildi': 'Teslim_Edildi',
        'İptal': 'ptal',
        'İptal Edildi': 'ptal_Edildi'
    };
    return map[status] || status;
};

module.exports = { toFrontendStatus, toPrismaStatus };
