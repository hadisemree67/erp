/* 
 * `permissions` (Yetkiler) tablosuna envanter, stok girişi ve depo yönetimi ile ilgili
 * yeni yetki tanımlarını ekler (INSERT).
 */

const db = require('../db');

async function updatePermissions() {
    try {
        const newPermissions = [
            { key: 'box_manage', desc: 'Ambalaj ve Kutu Ayarlarını Yönetme' },
            { key: 'stock_entry', desc: 'Manuel Stok Hareketi (Giriş/Çıkış) Yapma' },
            { key: 'inventory_view', desc: 'Mevcut Envanter Durumunu Görme' }
        ];

        for (const perm of newPermissions) {
            const [rows] = await db.query('SELECT id FROM permissions WHERE permission_key = ?', [perm.key]);
            if (rows.length === 0) {
                await db.query('INSERT INTO permissions (permission_key, description) VALUES (?, ?)', [perm.key, perm.desc]);
                console.log(`Yetki eklendi: ${perm.key}`);
            } else {
                console.log(`Bu yetki zaten mevcut: ${perm.key}`);
            }
        }

        console.log('Yetkiler başarıyla güncellendi.');
    } catch (error) {
        console.error('Yetkiler güncellenirken hata oluştu:', error);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

updatePermissions();
