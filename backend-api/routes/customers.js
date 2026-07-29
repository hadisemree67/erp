/**
 * ============================================================================
 * DOSYA ADI: customers.js
 * MODÜL / KATMAN: Arkayüz Rotası (API Route) - Müşteri İlişkileri ve CRM Yönetimi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki müşterilerin (B2B / B2C cari firmaların veya şahısların) listelenmesi,
 *   yeni müşteri eklenmesi, bilgilerinin güncellenmesi ve silinmesi işlemlerini yürüten API uç noktalarıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js Router, Veritabanı Sorguları (SQL), Veri Doğrulama (Validation)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../utils/logger');

// Tüm müşterileri listele
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM customers ORDER BY Id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
});

// Yeni müşteri ekle
router.post('/', async (req, res, next) => {
    const { CustomerName, Phone, Email, Address } = req.body;
    
    if (!CustomerName || !CustomerName.trim()) {
        return res.status(400).json({ success: false, message: 'Müşteri adı / ünvanı zorunludur.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO customers (CustomerName, Phone, Email, Address) VALUES (?, ?, ?, ?)',
            [CustomerName.trim(), Phone ? Phone.trim() : null, Email ? Email.trim() : null, Address ? Address.trim() : null]
        );

        await logActivity(
            req.headers['x-user-id'] || 1,
            'INSERT',
            'customers',
            result.insertId,
            `"${CustomerName}" isimli yeni müşteri eklendi.`,
            null
        );

        res.status(201).json({
            success: true,
            message: 'Müşteri başarıyla eklendi.',
            data: { Id: result.insertId, CustomerName, Phone, Email, Address }
        });
    } catch (error) {
        next(error);
    }
});

// Müşteri bilgisini güncelle
router.put('/:id', async (req, res, next) => {
    const { id } = req.params;
    const { CustomerName, Phone, Email, Address } = req.body;

    if (!CustomerName || !CustomerName.trim()) {
        return res.status(400).json({ success: false, message: 'Müşteri adı / ünvanı zorunludur.' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM customers WHERE Id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Müşteri bulunamadı.' });
        }

        await db.query(
            'UPDATE customers SET CustomerName = ?, Phone = ?, Email = ?, Address = ? WHERE Id = ?',
            [CustomerName.trim(), Phone ? Phone.trim() : null, Email ? Email.trim() : null, Address ? Address.trim() : null, id]
        );

        await logActivity(
            req.headers['x-user-id'] || 1,
            'UPDATE',
            'customers',
            id,
            `"${CustomerName}" isimli müşteri bilgileri güncellendi.`,
            null
        );

        res.json({ success: true, message: 'Müşteri bilgileri güncellendi.' });
    } catch (error) {
        next(error);
    }
});

// Müşteri sil
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;

    try {
        const [existing] = await db.query('SELECT * FROM customers WHERE Id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Müşteri bulunamadı.' });
        }

        await db.query('DELETE FROM customers WHERE Id = ?', [id]);

        await logActivity(
            req.headers['x-user-id'] || 1,
            'DELETE',
            'customers',
            id,
            `"${existing[0].CustomerName}" isimli müşteri silindi.`,
            null
        );

        res.json({ success: true, message: 'Müşteri başarıyla silindi.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
