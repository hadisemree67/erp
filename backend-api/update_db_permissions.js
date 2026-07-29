const db = require('./db');

async function updatePermissions() {
    try {
        console.log('Veritabanı güncelleniyor: Yeni Yetki (Permission) Tanımları Ekleniyor...');

        const newPermissions = [
            { key: 'view_orders', desc: 'Siparişler Menüsünü Görme' },
            { key: 'order_create', desc: 'Manuel Sipariş Oluşturma' },
            { key: 'order_approve', desc: 'Siparişi Onaylama' },
            { key: 'order_prepare', desc: 'Siparişi Hazırlama' },
            { key: 'order_ship', desc: 'Siparişi Kargoya Verme' },
            { key: 'order_cancel', desc: 'Siparişi İptal Etme' },
            { key: 'view_campaigns', desc: 'Kampanyalar Menüsünü Görme' },
            { key: 'campaign_manage', desc: 'Kampanya Ekleme, Düzenleme, Silme' },
            { key: 'view_reports', desc: 'Raporlar ve Analiz Menüsünü Görme' },
            { key: 'category_manage', desc: 'Ürün Kategorilerini Yönetme' },
            { key: 'inventory_manage', desc: 'Envanter ve Stok Girişi Yönetimi' },
            { key: 'supplier_manage', desc: 'Tedarikçi Yönetimi' },
            { key: 'view_production', desc: 'Üretim Listesi ve Makineleri Görme' },
            { key: 'production_manage', desc: 'Üretim Talebi Açma / Yönetme' }
        ];

        for (const perm of newPermissions) {
            try {
                const [existing] = await db.query('SELECT id FROM permissions WHERE permission_key = ?', [perm.key]);
                if (existing.length === 0) {
                    await db.query('INSERT INTO permissions (permission_key, description) VALUES (?, ?)', [perm.key, perm.desc]);
                    console.log(`Eklendi: ${perm.key}`);
                } else {
                    console.log(`Zaten var: ${perm.key}`);
                }
            } catch (e) {
                console.error(`Hata (${perm.key}):`, e.message);
            }
        }

        console.log('İşlem tamamlandı.');
        process.exit(0);
    } catch (err) {
        console.error('Genel Hata:', err);
        process.exit(1);
    }
}

updatePermissions();
