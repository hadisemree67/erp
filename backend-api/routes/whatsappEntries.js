const express = require('express');
const router = express.Router();
const { getPendingEntries, approveEntry, rejectEntry } = require('../services/whatsappBot');

// Tüm bekleyen işlemleri getir
router.get('/', async (req, res, next) => {
    try {
        const entries = await getPendingEntries();
        res.json({ success: true, data: entries });
    } catch (e) {
        next(e);
    }
});

// İşlemi Onayla
router.post('/:id/approve', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { approverName } = req.body;
        const processorId = req.headers['x-user-id'] || 1; // Frontend sends x-user-id
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
router.post('/:id/reject', async (req, res, next) => {
    try {
        const { id } = req.params;
        const processorId = req.headers['x-user-id'] || 1;
        await rejectEntry(id, processorId);
        res.json({ success: true, message: 'İşlem reddedildi.' });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
