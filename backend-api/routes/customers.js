/*
 * ÖZET:
 * Bu modül, sistemdeki müşterilerin (B2B/B2C cari firmalar veya şahıslar) listelenmesi, 
 * eklenmesi, güncellenmesi ve silinmesi işlemlerini yürüten API uç noktalarıdır.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

// Tüm müşterileri listele
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const { search, page, limit } = req.query;
        let query = 'SELECT * FROM customers';
        let countQuery = 'SELECT COUNT(*) as total FROM customers';
        let params = [];

        if (search) {
            query += ' WHERE CustomerName LIKE ? OR Phone LIKE ?';
            countQuery += ' WHERE CustomerName LIKE ? OR Phone LIKE ?';
            const escapedSearch = search.replace(/[%_]/g, '\\$&');
            params.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
        }
        query += ' ORDER BY Id DESC';

        if (page && limit) {
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 50;
            const offset = (pageNum - 1) * limitNum;
            query += ` LIMIT ${limitNum} OFFSET ${offset}`;
        }

        const [rows] = await db.query(query, params);

        if (page && limit) {
            const countParams = search ? params.slice(0, 2) : [];
            const [countRows] = await db.query(countQuery, countParams);
            res.json({
                success: true,
                data: rows,
                total: countRows[0].total,
                page: parseInt(page, 10) || 1,
                limit: parseInt(limit, 10) || 50
            });
        } else {
            res.json({ success: true, data: rows });
        }
    } catch (error) {
        next(error);
    }
});

// Yeni müşteri ekle
router.post('/', authMiddleware, async (req, res, next) => {
    const { CustomerName, Phone, Email, Address, City, Gender, Age } = req.body;

    if (!CustomerName || !CustomerName.trim()) {
        return res.status(400).json({ success: false, message: 'Müşteri adı / ünvanı zorunludur.' });
    }

    if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email.trim())) {
        return res.status(400).json({ success: false, message: 'Geçersiz e-posta formatı.' });
    }

    try {
        // SQL Injection'a karşı tüm değişkenler '?' parametresi ile güvenli şekilde gönderilir
        // City (Şehir), Gender (Cinsiyet) ve Age (Yaş) alanları demografik analizler (Örn: DataExport) için eklenmiştir.
        // Güvenlik: Age (Yaş) alanına sayı yerine metin girilirse sistemin çökmemesi için isNaN kontrolü yapılıyor.
        let safeAge = null;
        if (Age !== undefined && Age !== null && Age !== '') {
            safeAge = parseInt(Age);
            if (isNaN(safeAge)) {
                return res.status(400).json({ success: false, message: 'Yaş alanı sadece rakamlardan oluşmalıdır (Metin girilemez).' });
            }
        }

        const [result] = await db.query(
            'INSERT INTO customers (CustomerName, Phone, Email, Address, City, Gender, Age) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [CustomerName.trim(), Phone ? Phone.trim() : null, Email ? Email.trim() : null, Address ? Address.trim() : null, City ? City.trim() : null, Gender ? Gender.trim() : null, safeAge]
        );

        await logActivity(
            req.user?.id,
            'INSERT',
            'customers',
            result.insertId,
            `"${CustomerName}" isimli yeni müşteri eklendi.`,
            null
        );

        res.status(201).json({
            success: true,
            message: 'Müşteri başarıyla eklendi.',
            data: { Id: result.insertId, CustomerName, Phone, Email, Address, City, Gender, Age }
        });
    } catch (error) {
        next(error);
    }
});

// Müşteri bilgisini güncelle
router.put('/:id', authMiddleware, async (req, res, next) => {
    const { id } = req.params;
    const { CustomerName, Phone, Email, Address, City, Gender, Age } = req.body;

    if (!CustomerName || !CustomerName.trim()) {
        return res.status(400).json({ success: false, message: 'Müşteri adı / ünvanı zorunludur.' });
    }

    if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email.trim())) {
        return res.status(400).json({ success: false, message: 'Geçersiz e-posta formatı.' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM customers WHERE Id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Müşteri bulunamadı.' });
        }

        // Güvenlik: Age (Yaş) alanına sayı yerine metin girilirse sistemin çökmemesi için isNaN kontrolü yapılıyor.
        let safeAge = null;
        if (Age !== undefined && Age !== null && Age !== '') {
            safeAge = parseInt(Age);
            if (isNaN(safeAge)) {
                return res.status(400).json({ success: false, message: 'Yaş alanı sadece rakamlardan oluşmalıdır (Metin girilemez).' });
            }
        }

        await db.query(
            'UPDATE customers SET CustomerName = ?, Phone = ?, Email = ?, Address = ?, City = ?, Gender = ?, Age = ? WHERE Id = ?',
            [CustomerName.trim(), Phone ? Phone.trim() : null, Email ? Email.trim() : null, Address ? Address.trim() : null, City ? City.trim() : null, Gender ? Gender.trim() : null, safeAge, id]
        );

        await logActivity(
            req.user?.id,
            'UPDATE',
            'customers',
            id,
            `"${CustomerName}" isimli müşteri bilgileri güncellendi.`,
            existing[0]
        );

        res.json({ success: true, message: 'Müşteri bilgileri güncellendi.' });
    } catch (error) {
        next(error);
    }
});

// Müşteri sil
router.delete('/:id', authMiddleware, async (req, res, next) => {
    const { id } = req.params;

    try {
        const [existing] = await db.query('SELECT * FROM customers WHERE Id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Müşteri bulunamadı.' });
        }

        // Satış/sipariş geçmişi kontrolü (Hard delete riskine karşı)
        try {
            const [orderCheck] = await db.query('SELECT COUNT(*) as orderCount FROM orders WHERE CustomerId = ?', [id]);
            if (orderCheck[0].orderCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu müşteriye ait geçmiş satış/sipariş kayıtları bulunmaktadır. Finansal tutarlılığın bozulmaması için müşteriyi silemezsiniz. Lütfen pasife almayı tercih edin.'
                });
            }
        } catch (tableErr) {
            if (tableErr.code !== 'ER_NO_SUCH_TABLE') {
                console.warn('Sipariş kontrolü sırasında beklenmeyen hata:', tableErr.message);
            }
        }

        await db.query('DELETE FROM customers WHERE Id = ?', [id]);

        await logActivity(
            req.user?.id,
            'DELETE',
            'customers',
            id,
            `"${existing[0].CustomerName}" isimli müşteri silindi.`,
            existing[0]
        );

        res.json({ success: true, message: 'Müşteri başarıyla silindi.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
