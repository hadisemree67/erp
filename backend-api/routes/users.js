/**
 * ============================================================================
 * DOSYA ADI: users.js
 * MODÜL / KATMAN: Arkayüz Rotası (API Route) - Sistem Kullanıcıları ve Yetkilendirme
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   ERP sistemine giriş yapabilen kullanıcı hesaplarının yönetimi, rol atamaları (yönetici, personel vb.), şifre işlemleri ve sistem erişim izinlerinin (permissions) yapılandırıldığı API uç noktalarıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js Router, Şifreli Veri İşleme, Rol ve İzin Kontrolü
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Önyüzdeki StaffList ve StaffForm bileşenleri ile sistem genelindeki yetkilendirme mekanizmasını destekler.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { logActivity } = require('../utils/logger');

// GET: Tüm yetkileri (permissions) getir
router.get('/permissions', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM permissions');
        res.json(rows);
    } catch (error) {
        console.error('Yetkiler çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Yetkiler getirilemedi.' });
    }
});

// GET: Tüm personelleri getir (şifreler hariç) ve atanmış yetkilerini al
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, name, email, role, created_at FROM users');
        
        // Her kullanıcı için yetkilerini çek (daha optimize bir JOIN de yazılabilir ama basitlik için loop)
        for (let user of users) {
            const [perms] = await db.query(`
                SELECT p.permission_key, p.id
                FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = ?
            `, [user.id]);
            user.permissions = perms.map(p => p.permission_key);
        }
        
        res.json(users);
    } catch (error) {
        console.error('Personel listesi çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Personeller getirilemedi.' });
    }
});

// POST: Yeni personel ekle
router.post('/', async (req, res) => {
    const { username, name, email, password, role, permissions } = req.body;
    
    if (!username || !name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Gerekli alanları doldurun.' });
    }

    try {
        // Kullanıcı adı veya email var mı kontrolü
        const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [username, name, email, hashedPassword, role || 'kullanici']
        );
        
        const newUserId = result.insertId;

        // Yetkileri ekle
        if (permissions && permissions.length > 0) {
            const [allPerms] = await db.query('SELECT id, permission_key FROM permissions');
            const permMap = {};
            allPerms.forEach(p => permMap[p.permission_key] = p.id);

            for (const pKey of permissions) {
                if (permMap[pKey]) {
                    await db.query('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [newUserId, permMap[pKey]]);
                }
            }
        }

        await logActivity(req.headers['x-user-id'], 'INSERT', 'users', newUserId, `"${name}" adlı personeli ekledi.`, null);

        res.status(201).json({ success: true, message: 'Personel başarıyla eklendi.' });
    } catch (error) {
        console.error('Personel eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// PUT: Personel güncelle
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { username, name, email, role, permissions } = req.body; // Şifreyi almadık (sadece SQLden demiştik)
    
    if (!username || !name || !email) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı, isim ve e-posta zorunludur.' });
    }

    try {
        // Kendi dışında aynı username/email var mı?
        const [existing] = await db.query('SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?', [username, email, id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu kullanıcı adı veya e-posta başkası tarafından kullanılıyor.' });
        }

        const [oldRows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        const oldData = oldRows.length > 0 ? oldRows[0] : null;

        await db.query(
            'UPDATE users SET username=?, name=?, email=?, role=? WHERE id=?',
            [username, name, email, role, id]
        );

        // Eski yetkileri sil
        await db.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);

        // Yeni yetkileri ekle
        if (permissions && permissions.length > 0) {
            const [allPerms] = await db.query('SELECT id, permission_key FROM permissions');
            const permMap = {};
            allPerms.forEach(p => permMap[p.permission_key] = p.id);

            for (const pKey of permissions) {
                if (permMap[pKey]) {
                    await db.query('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [id, permMap[pKey]]);
                }
            }
        }

        await logActivity(req.headers['x-user-id'], 'UPDATE', 'users', id, `"${name}" adlı personeli güncelledi.`, oldData);

        res.json({ success: true, message: 'Personel güncellendi.' });
    } catch (error) {
        console.error('Personel güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// DELETE: Personel sil
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [oldRows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        const oldData = oldRows.length > 0 ? oldRows[0] : null;

        await db.query('DELETE FROM user_permissions WHERE user_id = ?', [id]);
        await db.query('DELETE FROM users WHERE id = ?', [id]);

        await logActivity(req.headers['x-user-id'], 'DELETE', 'users', id, `"${oldData ? oldData.name : 'Bilinmeyen'}" adlı personeli sildi.`, oldData);

        res.json({ success: true, message: 'Personel silindi.' });
    } catch (error) {
        console.error('Personel silinirken hata:', error);
        res.status(500).json({ success: false, message: 'Personel silinemedi.' });
    }
});

module.exports = router;
