/*
 * `permissions` tablosuna sistemin çalışması için gereken temel 
 * (sipariş görme, onaylama, iptal vb.) yetkileri topluca ekler.
 */

const db = require('../db');

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

        let hasError = false;

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
                hasError = true;
                console.error(`Hata (${perm.key}):`, e.message);
            }
        }

        if (hasError) {
            process.exitCode = 1;
            console.log('İşlem bazı hatalarla tamamlandı.');
        } else {
            console.log('İşlem başarıyla tamamlandı!');
        }
    } catch (err) {
        console.error('Sistem Hatası:', err);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

updatePermissions();
