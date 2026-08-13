/*
 * ÖZET:
 * Bu modül, malzeme ve hizmet satın alınan dış tedarikçi firmaların iletişim bilgileri, 
 * bakiye durumları ve profillerinin yönetildiği API uç noktalarını barındırır.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');

// Tüm tedarikçileri getir
router.get('/', authMiddleware, checkPermission('supplier_manage'), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM suppliers ORDER BY SupplierName ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Tedarikçiler getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçiler getirilirken sunucu hatası oluştu.' });
    }
});

// Yeni tedarikçi ekle
router.post('/', authMiddleware, checkPermission('supplier_manage'), async (req, res) => {
    const { SupplierName, ContactPerson, Phone, Email, Address, supplier_type } = req.body;

    if (!SupplierName) {
        return res.status(400).json({ success: false, message: 'Tedarikçi adı zorunludur.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO suppliers (SupplierName, ContactPerson, Phone, Email, Address, supplier_type) VALUES (?, ?, ?, ?, ?, ?)',
            [SupplierName, ContactPerson || null, Phone || null, Email || null, Address || null, supplier_type || 'Tedarikçi']
        );
        await logActivity(req.user?.id, 'INSERT', 'suppliers', result.insertId, `Yeni tedarikçi eklendi: ${SupplierName}`);
        res.status(201).json({ success: true, message: 'Tedarikçi başarıyla eklendi.', data: { id: result.insertId } });
    } catch (error) {
        console.error('Tedarikçi eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçi eklenirken sunucu hatası oluştu.' });
    }
});

// Tedarikçi güncelle
router.put('/:id', authMiddleware, checkPermission('supplier_manage'), async (req, res) => {
    const { id } = req.params;
    const { SupplierName, ContactPerson, Phone, Email, Address, supplier_type } = req.body;

    if (!SupplierName) {
        return res.status(400).json({ success: false, message: 'Tedarikçi adı zorunludur.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE suppliers SET SupplierName = ?, ContactPerson = ?, Phone = ?, Email = ?, Address = ?, supplier_type = ? WHERE Id = ?',
            [SupplierName, ContactPerson || null, Phone || null, Email || null, Address || null, supplier_type || 'Tedarikçi', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tedarikçi bulunamadı.' });
        }
        await logActivity(req.user?.id, 'UPDATE', 'suppliers', id, `Tedarikçi güncellendi: ${SupplierName}`);

        res.json({ success: true, message: 'Tedarikçi başarıyla güncellendi.' });
    } catch (error) {
        console.error('Tedarikçi güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçi güncellenirken sunucu hatası oluştu.' });
    }
});

// Tedarikçi sil
router.delete('/:id', authMiddleware, checkPermission('supplier_manage'), async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query('DELETE FROM suppliers WHERE Id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tedarikçi bulunamadı.' });
        }
        await logActivity(req.user?.id, 'DELETE', 'suppliers', id, `Tedarikçi silindi.`);
        res.json({ success: true, message: 'Tedarikçi başarıyla silindi.' });
    } catch (error) {
        console.error('Tedarikçi silinirken hata:', error);
        res.status(500).json({ success: false, message: 'Tedarikçi silinirken sunucu hatası oluştu. (Tedarikçiye bağlı veriler olabilir)' });
    }
});

module.exports = router;
