/*
 * ÖZET:
 * Bu modül, WhatsApp botundan gelen stok işlemlerini, fişlerini (giriş/çıkış) ve
 * onay bekleyen kayıtları listeleyip, yetkili kişilerin bu işlemleri onaylamasını 
 * veya reddetmesini sağlayan API uç noktalarını içerir.
 */

const express = require('express');
const router = express.Router();
const { getPendingEntries, approveEntry, rejectEntry } = require('../services/whatsappBot');
const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// Tüm bekleyen işlemleri getir
router.get('/', authMiddleware, checkPermission('crm_tickets'), async (req, res, next) => {
    try {
        const entries = await getPendingEntries();
        res.json({ success: true, data: entries });
    } catch (e) {
        next(e);
    }
});

// İşlemi Onayla
router.post('/:id/approve', authMiddleware, checkPermission('crm_tickets'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { approverName } = req.body;
        const processorId = req.user?.id;
        const result = await approveEntry(id, processorId, approverName);
        const successMsg = result.isDeduction 
            ? 'İşlem başarıyla onaylandı ve stoktan düşüldü.'
            : 'İşlem başarıyla onaylandı ve stoğa eklendi.';
        res.json({ success: true, message: successMsg });
    } catch (e) {
        next(e);
    }
});

// İşlemi Reddet
router.post('/:id/reject', authMiddleware, checkPermission('crm_tickets'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const processorId = req.user?.id;
        await rejectEntry(id, processorId);
        res.json({ success: true, message: 'İşlem reddedildi.' });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
