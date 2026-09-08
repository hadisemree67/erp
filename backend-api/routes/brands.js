/**
 * ============================================================================
 * DOSYA ADI: routes/brands.js
 * MODÜL / KATMAN: Marka Yönetimi Rotaları
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Marka CRUD işlemlerini (listeleme, ekleme, logo güncelleme) yönetir.
 *   Dosya yükleme güvenliği (magic bytes doğrulaması) içerir.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');

// Marka logosu yükleme yapılandırması
const brandStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// GÜVENLİK: Dosya türü filtresi — sadece resimlere izin ver
const brandFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Desteklenmeyen dosya formatı. Marka görseli için sadece resim dosyaları yüklenebilir (jpeg, png, webp, gif).'), false);
    }
};

// GÜVENLİK: Magic bytes (dosya imzası) doğrulaması — MIME sahteciliğini önler
const checkMagicBytes = async (filePath, mimeType) => {
    try {
        const fs = require('fs');
        const fd = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(4);
        await fd.read(buffer, 0, 4, 0);
        await fd.close();
        const hex = buffer.toString('hex').toUpperCase();
        if (mimeType === 'image/jpeg' && !hex.startsWith('FFD8FF')) return false;
        if (mimeType === 'image/png'  && !hex.startsWith('89504E47')) return false;
        if (mimeType === 'image/gif'  && !hex.startsWith('47494638')) return false;
        if (mimeType === 'image/webp' && !hex.startsWith('52494646')) return false;
        return true;
    } catch {
        return false;
    }
};

const brandUpload = multer({
    storage: brandStorage,
    fileFilter: brandFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// [GET] Tüm markaları listeleme işlemi
// Sisteme kayıtlı olan tüm markaları isme göre alfabetik olarak sıralayıp getirir.
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, logo_url FROM brands ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Markalar çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Markalar getirilirken hata oluştu.' });
    }
});

// [POST] Yeni marka ekleme işlemi
// Gelen marka adını kontrol eder, eğer aynı isimde bir marka yoksa veritabanına ekler ve aktivite loglarına kaydeder.
router.post('/', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_add'), async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Marka adı gereklidir.' });

    try {
        const [existing] = await db.query('SELECT id FROM brands WHERE name = ?', [name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Bu marka zaten var.' });
        }
        const [result] = await db.query('INSERT INTO brands (name) VALUES (?)', [name]);
        await logActivity(req.user?.id, 'INSERT', 'brands', result.insertId, `"${name}" markasını ekledi.`, null);
        res.status(201).json({ success: true, id: result.insertId, name });
    } catch (error) {
        console.error('Marka eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Marka eklenirken hata oluştu.' });
    }
});

// [PUT] Marka logosu güncelleme işlemi
router.put('/:id', authMiddleware, checkRole(['Depo', 'Üretim'], 'product_edit'), brandUpload.single('logo'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Marka ID.' });

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Logo dosyası bulunamadı.' });
        }

        // GÜVENLİK: Magic bytes doğrulaması — MIME sahteciliğini önler
        const isValidFile = await checkMagicBytes(req.file.path, req.file.mimetype);
        if (!isValidFile) {
            const fs = require('fs');
            fs.unlink(req.file.path, () => {}); // Sahte dosyayı diskten sil
            return res.status(400).json({ success: false, message: 'Dosya içeriği geçersiz. Gerçek bir resim dosyası yükleyin.' });
        }
        
        const logoUrl = `/uploads/${req.file.filename}`;
        
        await db.query('UPDATE brands SET logo_url = ? WHERE id = ?', [logoUrl, id]);
        await logActivity(req.user?.id, 'UPDATE', 'brands', id, `Marka (ID: ${id}) logosu güncellendi.`, null);
        
        res.json({ success: true, logo_url: logoUrl });
    } catch (error) {
        console.error('Marka logosu güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Logo yüklenirken hata oluştu.' });
    }
});

// checkMagicBytes'ı dışarı da aktar (categories ve diğer modüller de kullanabilsin)
router.checkMagicBytes = checkMagicBytes;
router.brandUpload = brandUpload;

module.exports = router;
