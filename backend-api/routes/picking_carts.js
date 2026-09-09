/**
 * ============================================================================
 * BİLEŞEN ADI: picking_carts
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');

// GET /api/picking_carts - List all carts
router.get('/', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    try {
        const [carts] = await db.query(`
            SELECT c.*, w.name as warehouse_name
            FROM picking_carts c
            LEFT JOIN warehouses w ON c.warehouse_id = w.id
            ORDER BY c.created_at DESC
        `);

        for (const cart of carts) {
            const [sections] = await db.query('SELECT * FROM picking_cart_sections WHERE cart_id = ?', [cart.id]);
            cart.sections = sections;
            
            const [orders] = await db.query(`
                SELECT CartSectionIds FROM orders 
                WHERE OrderStatus IN ('Toplamada', 'Hazırlanıyor', 'Hazır', 'Paketleniyor', 'Haz_rlan_yor', 'Haz_r')
                AND JSON_LENGTH(CartSectionIds) > 0
            `);
            cart.orders = orders;
        }

        // Format for frontend
        const formattedCarts = carts.map(cart => {
            const activeSectionIds = new Set();
            if (cart.orders) {
                cart.orders.forEach(order => {
                    if (order.CartSectionIds) {
                        try {
                            const ids = typeof order.CartSectionIds === 'string' ? JSON.parse(order.CartSectionIds) : order.CartSectionIds;
                            if (Array.isArray(ids)) {
                                ids.forEach(id => activeSectionIds.add(id));
                            }
                        } catch(e){}
                    }
                });
            }

            const sectionsWithStatus = cart.sections.map(sec => ({
                ...sec,
                is_full: activeSectionIds.has(sec.id)
            }));

            return {
                id: cart.id,
                name: cart.name,
                warehouse_id: cart.warehouse_id,
                warehouse_name: cart.warehouse_name || 'Bilinmeyen Depo',
                section_count: cart.sections.length,
                sections: sectionsWithStatus,
                is_active: cart.is_active,
                barcode: cart.barcode
            };
        });

        res.json({ success: true, data: formattedCarts });
    } catch (error) {
        console.error('Taşıma arabaları getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Taşıma arabaları yüklenemedi.' });
    }
});

// POST /api/picking_carts - Create new cart and its sections
router.post('/', authMiddleware, checkPermission('wms_transfer'),  checkRole(['Depo']), async (req, res) => {
    const { name, warehouse_id, sections, barcode } = req.body;

    if (!name || !warehouse_id || !sections || !Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurun ve en az bir bölüm ekleyin.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');

        const [cartResult] = await conn.query(
            'INSERT INTO picking_carts (name, warehouse_id, is_active, barcode) VALUES (?, ?, ?, ?)',
            [name, parseInt(warehouse_id), 1, barcode || null]
        );
        const cartId = cartResult.insertId;

        const sectionsToCreate = sections
            .filter(sec => sec.section_name && sec.section_name.trim() !== '')
            .map(sec => [cartId, sec.section_name.trim(), sec.barcode || null]);

        if (sectionsToCreate.length > 0) {
            await conn.query(
                'INSERT INTO picking_cart_sections (cart_id, section_name, barcode) VALUES ?',
                [sectionsToCreate]
            );
        }

        await conn.query('COMMIT');
        res.json({ success: true, message: 'Taşıma arabası ve bölümleri başarıyla oluşturuldu.' });
    } catch (error) {
        await conn.query('ROLLBACK');
        console.error('Taşıma arabası eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Eklenirken bir hata oluştu.' });
    } finally {
        conn.release();
    }
});

// PUT /api/picking_carts/:id - Update cart details and sections
router.put('/:id', authMiddleware, checkPermission('wms_transfer'),  checkRole(['Depo']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Araba ID.' });
    const { name, warehouse_id, sections, barcode } = req.body;

    if (!name || !warehouse_id) {
        return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurun.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.query('START TRANSACTION');

        await conn.query(
            'UPDATE picking_carts SET name = ?, warehouse_id = ?, barcode = ? WHERE id = ?',
            [name, parseInt(warehouse_id), barcode || null, id]
        );

        if (Array.isArray(sections)) {
            const [existingSections] = await conn.query('SELECT * FROM picking_cart_sections WHERE cart_id = ?', [id]);
            const existingIds = existingSections.map(s => s.id);
            const receivedIds = sections.filter(s => s.id).map(s => s.id);
            
            const idsToDelete = existingIds.filter(eId => !receivedIds.includes(eId));
            if (idsToDelete.length > 0) {
                await conn.query('DELETE FROM picking_cart_sections WHERE id IN (?)', [idsToDelete]);
            }

            const sectionsToUpdate = sections.filter(s => s.id);
            for (const sec of sectionsToUpdate) {
                await conn.query(
                    'UPDATE picking_cart_sections SET section_name = ?, barcode = ? WHERE id = ?',
                    [sec.section_name, sec.barcode || null, sec.id]
                );
            }

            const sectionsToCreate = sections.filter(s => !s.id && s.section_name.trim() !== '')
                                           .map(sec => [id, sec.section_name, sec.barcode || null]);
            if (sectionsToCreate.length > 0) {
                await conn.query(
                    'INSERT INTO picking_cart_sections (cart_id, section_name, barcode) VALUES ?',
                    [sectionsToCreate]
                );
            }
        }

        await conn.query('COMMIT');
        res.json({ success: true, message: 'Taşıma arabası güncellendi.' });
    } catch (error) {
        await conn.query('ROLLBACK');
        console.error('Taşıma arabası güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Güncelleme başarısız.' });
    } finally {
        conn.release();
    }
});

// PUT /api/picking_carts/:id/toggle-active - Toggle active status
router.put('/:id/toggle-active', authMiddleware, checkPermission('wms_transfer'),  checkRole(['Depo']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Araba ID.' });
    const { is_active } = req.body;

    try {
        await db.query('UPDATE picking_carts SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
        res.json({ success: true, message: 'Araba durumu güncellendi.' });
    } catch (error) {
        console.error('Durum güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Durum güncellenemedi.' });
    }
});

// DELETE /api/picking_carts/:id - Delete a cart
router.delete('/:id', authMiddleware, checkPermission('wms_transfer'),  checkRole(['Depo']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Araba ID.' });
    
    try {
        await db.query('DELETE FROM picking_carts WHERE id = ?', [id]);
        res.json({ success: true, message: 'Taşıma arabası silindi.' });
    } catch (error) {
        console.error('Araba silinirken hata:', error);
        res.status(500).json({ success: false, message: 'Araba silinemedi.' });
    }
});

module.exports = router;
