const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');

// GET /api/picking_carts - List all carts
router.get('/', authMiddleware, checkPermission('wms_transfer'), async (req, res) => {
    try {
        const carts = await prisma.picking_carts.findMany({
            include: {
                warehouse: { select: { name: true } },
                sections: true,
                orders: {
                    where: { OrderStatus: { in: ['Toplamada', 'Haz_rlan_yor', 'Haz_r', 'Paketleniyor'] } },
                    select: { CartSectionIds: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // Format for frontend
        const formattedCarts = carts.map(cart => {
            const activeSectionIds = new Set();
            if (cart.orders) {
                cart.orders.forEach(order => {
                    if (order.CartSectionIds && Array.isArray(order.CartSectionIds)) {
                        order.CartSectionIds.forEach(id => activeSectionIds.add(id));
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
                warehouse_name: cart.warehouse ? cart.warehouse.name : 'Bilinmeyen Depo',
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

    try {
        await prisma.$transaction(async (tx) => {
            // Create the cart
            const cart = await tx.picking_carts.create({
                data: {
                    name,
                    warehouse_id: parseInt(warehouse_id),
                    is_active: true,
                    barcode: barcode || null
                }
            });

            // Create sections
            const sectionsToCreate = sections
                .filter(sec => sec.section_name && sec.section_name.trim() !== '')
                .map(sec => ({
                    cart_id: cart.id,
                    section_name: sec.section_name.trim(),
                    barcode: sec.barcode || null
                }));

            if (sectionsToCreate.length > 0) {
                await tx.picking_cart_sections.createMany({
                    data: sectionsToCreate
                });
            }
        });

        res.json({ success: true, message: 'Taşıma arabası ve bölümleri başarıyla oluşturuldu.' });
    } catch (error) {
        console.error('Taşıma arabası eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Eklenirken bir hata oluştu.' });
    }
});

// PUT /api/picking_carts/:id - Update cart details and sections
router.put('/:id', authMiddleware, checkPermission('wms_transfer'),  checkRole(['Depo']), async (req, res) => {
    const { id } = req.params;
    const { name, warehouse_id, sections, barcode } = req.body; // sections: [{id?: number, section_name: string, barcode?: string}]

    if (!name || !warehouse_id) {
        return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurun.' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Update cart basic details
            await tx.picking_carts.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    warehouse_id: parseInt(warehouse_id),
                    barcode: barcode || null
                }
            });

            // If sections array is provided, sync them
            if (Array.isArray(sections)) {
                const existingSections = await tx.picking_cart_sections.findMany({
                    where: { cart_id: parseInt(id) }
                });
                
                const existingIds = existingSections.map(s => s.id);
                const receivedIds = sections.filter(s => s.id).map(s => s.id);
                
                // 1. Delete sections that are missing from the request
                const idsToDelete = existingIds.filter(eId => !receivedIds.includes(eId));
                if (idsToDelete.length > 0) {
                    await tx.picking_cart_sections.deleteMany({
                        where: { id: { in: idsToDelete } }
                    });
                }

                // 2. Update existing sections
                const sectionsToUpdate = sections.filter(s => s.id);
                for (const sec of sectionsToUpdate) {
                    await tx.picking_cart_sections.update({
                        where: { id: sec.id },
                        data: { 
                            section_name: sec.section_name,
                            barcode: sec.barcode || null 
                        }
                    });
                }

                // 3. Create new sections
                const sectionsToCreate = sections.filter(s => !s.id && s.section_name.trim() !== '');
                if (sectionsToCreate.length > 0) {
                    await tx.picking_cart_sections.createMany({
                        data: sectionsToCreate.map(sec => ({
                            cart_id: parseInt(id),
                            section_name: sec.section_name,
                            barcode: sec.barcode || null
                        }))
                    });
                }
            }
        });

        res.json({ success: true, message: 'Taşıma arabası güncellendi.' });
    } catch (error) {
        console.error('Taşıma arabası güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Güncelleme başarısız.' });
    }
});

// PUT /api/picking_carts/:id/toggle-active - Toggle active status
router.put('/:id/toggle-active', authMiddleware, checkPermission('wms_transfer'),  checkRole(['Depo']), async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        await prisma.picking_carts.update({
            where: { id: parseInt(id) },
            data: { is_active }
        });
        res.json({ success: true, message: 'Araba durumu güncellendi.' });
    } catch (error) {
        console.error('Durum güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Durum güncellenemedi.' });
    }
});

// DELETE /api/picking_carts/:id - Delete a cart
router.delete('/:id', authMiddleware, checkPermission('wms_transfer'),  checkRole(['Depo']), async (req, res) => {
    const { id } = req.params;
    
    try {
        await prisma.picking_carts.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Taşıma arabası silindi.' });
    } catch (error) {
        console.error('Araba silinirken hata:', error);
        res.status(500).json({ success: false, message: 'Araba silinemedi.' });
    }
});

module.exports = router;
