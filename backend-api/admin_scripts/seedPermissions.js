/**
 * Dosya: seedPermissions.js
 * Kısım: Backend Yardımcı/Bakım Scripti
 * Ne İşe Yarar: Veritabanına varsayılan personeller yetkilerini ekler.
 */
const db = require('./db');

async function seedPermissions() {
    const defaultPermissions = [
        { key: 'manage_products', desc: 'Ürün Ekleme, Düzenleme ve Silme' },
        { key: 'manage_stock', desc: 'Stok Girişi ve Sayım İşlemleri' },
        { key: 'view_orders', desc: 'Siparişleri Görüntüleme' },
        { key: 'manage_orders', desc: 'Sipariş Onaylama ve Düzenleme' },
        { key: 'manage_staff', desc: 'Personel Yönetimi (Sadece Admin)' },
        { key: 'view_reports', desc: 'Rapor ve İstatistikleri Görüntüleme' }
    ];

    try {
        console.log('Yetkiler tablosu güncelleniyor...');
        for (const p of defaultPermissions) {
            const [existing] = await db.query('SELECT id FROM permissions WHERE permission_key = ?', [p.key]);
            if (existing.length === 0) {
                await db.query('INSERT INTO permissions (permission_key, description) VALUES (?, ?)', [p.key, p.desc]);
                console.log('Eklendi: ' + p.key);
            } else {
                console.log('Zaten var: ' + p.key);
            }
        }
        console.log('İşlem tamamlandı.');
        process.exit(0);
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}
seedPermissions();
