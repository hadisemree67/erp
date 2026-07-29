const db = require('./db');

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
                console.log(`Permission added: ${perm.key}`);
            } else {
                console.log(`Permission already exists: ${perm.key}`);
            }
        }
        
        console.log('Permissions updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating permissions:', error);
        process.exit(1);
    }
}

updatePermissions();
