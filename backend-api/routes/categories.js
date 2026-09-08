/**
 * ============================================================================
 * DOSYA ADI: routes/categories.js
 * MODÜL / KATMAN: Kategori Yönetimi Rotaları
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Ana kategori CRUD işlemlerini (listeleme, ekleme, görsel güncelleme) yönetir.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');

// brands.js'den ortak dosya yükleme ve magic bytes doğrulama fonksiyonlarını al
const brandsRouter = require('./brands');
const { checkMagicBytes, brandUpload } = brandsRouter;

// [GET] Tüm ana kategorileri listeleme işlemi
// Sisteme kayıtlı olan üst (ana) kategorileri alfabetik sıraya göre veritabanından çeker ve listeler.
router.get('/', authMiddleware, checkRole(['Depo', 'Üretim'], 'view_products'), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, image_url FROM kategori ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Kategoriler çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Kategoriler getirilirken hata oluştu.' });
    }
});

// [POST] Yeni bir kategori ekleme işlemi
// Kullanıcının gönderdiği kategori adının daha önce eklenip eklenmediğine bakar, benzersiz ise kaydeder ve aktivite geçmişine yazar.
router.post('/', authMiddleware, checkRole(['Depo', 'Üretim'], 'category_manage'), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Kategori adı gereklidir.' });

    try {
        const [existing] = await db.query('SELECT id FROM kategori WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu kategori zaten var.' });
        }
        const [result] = await db.query('INSERT INTO kategori (name) VALUES (?)', [name]);
        await logActivity(req.user?.id, 'INSERT', 'kategori', result.insertId, `"${name}" kategorisini ekledi.`, null);
        res.status(201).json({ success: true, id: result.insertId, name });
    } catch (error) {
        console.error('Kategori eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Kategori eklenirken hata oluştu.' });
    }
});

// [PUT] Kategori resmi güncelleme işlemi
// İlgili kategoriye ait görseli (image) alır, dosya türünün gerçekten resim olup olmadığını (magic bytes) kontrol eder ve kaydeder.
router.put('/:id/image', authMiddleware, checkRole(['Depo', 'Üretim'], 'category_manage'), brandUpload.single('image'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Kategori ID.' });
    
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Resim dosyası bulunamadı.' });
        }

        const isValidFile = await checkMagicBytes(req.file.path, req.file.mimetype);
        if (!isValidFile) {
            const fs = require('fs');
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ success: false, message: 'Dosya içeriği geçersiz. Gerçek bir resim dosyası yükleyin.' });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        await db.query('UPDATE kategori SET image_url = ? WHERE id = ?', [imageUrl, id]);
        await logActivity(req.user?.id, 'UPDATE', 'kategori', id, `Kategori (ID: ${id}) resmi güncellendi.`, null);
        
        res.json({ success: true, image_url: imageUrl });
    } catch (error) {
        console.error('Kategori resmi güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Resim yüklenirken hata oluştu.' });
    }
});

module.exports = router;
