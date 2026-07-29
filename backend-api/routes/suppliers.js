/**
 * ============================================================================
 * DOSYA ADI: suppliers.js
 * MODÜL / KATMAN: Arkayüz Rotası (API Route) - Tedarikçi Yönetimi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Malzeme ve hizmet satın alınan dış tedarikçi firmaların iletişim bilgileri, bakiye/alacak durumları ve firma profillerinin yönetildiği API uç noktalarıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js Router, SQL Sorgulama ve CRUD İşlemleri
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Önyüzdeki SupplierList bileşeni tarafından ve satınalma modülleri tarafından tedarikçi seçimi için kullanılır.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// Tüm tedarikçileri getir
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM suppliers ORDER BY SupplierName ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Tedarikçiler getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçiler getirilirken sunucu hatası oluştu.' });
    }
});

// Yeni tedarikçi ekle
router.post('/', async (req, res) => {
    const { SupplierName, ContactPerson, Phone, Email, Address } = req.body;

    if (!SupplierName) {
        return res.status(400).json({ success: false, message: 'Tedarikçi adı zorunludur.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO suppliers (SupplierName, ContactPerson, Phone, Email, Address) VALUES (?, ?, ?, ?, ?)',
            [SupplierName, ContactPerson || null, Phone || null, Email || null, Address || null]
        );
        res.status(201).json({ success: true, message: 'Tedarikçi başarıyla eklendi.', data: { id: result.insertId } });
    } catch (error) {
        console.error('Tedarikçi eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçi eklenirken sunucu hatası oluştu.' });
    }
});

// Tedarikçi güncelle
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { SupplierName, ContactPerson, Phone, Email, Address } = req.body;

    if (!SupplierName) {
        return res.status(400).json({ success: false, message: 'Tedarikçi adı zorunludur.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE suppliers SET SupplierName = ?, ContactPerson = ?, Phone = ?, Email = ?, Address = ? WHERE Id = ?',
            [SupplierName, ContactPerson || null, Phone || null, Email || null, Address || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tedarikçi bulunamadı.' });
        }

        res.json({ success: true, message: 'Tedarikçi başarıyla güncellendi.' });
    } catch (error) {
        console.error('Tedarikçi güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçi güncellenirken sunucu hatası oluştu.' });
    }
});

// Tedarikçi sil
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query('DELETE FROM suppliers WHERE Id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tedarikçi bulunamadı.' });
        }

        res.json({ success: true, message: 'Tedarikçi başarıyla silindi.' });
    } catch (error) {
        console.error('Tedarikçi silinirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçi silinirken sunucu hatası oluştu. (Tedarikçiye bağlı veriler olabilir)' });
    }
});

module.exports = router;
