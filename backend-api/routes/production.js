/*
 * ÖZET:
 * Bu modül, sistemdeki üretim ve imalat işlemlerini yönetir. Reçeteler, makine durumları, 
 * üretim siparişleri, üretim adımları ve makinelerin bakım takibi burada yapılır.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger'); // assuming logger exists
const { sendMachineMaintenanceReminderEmail, sendMachineBreakdownEmail } = require('../services/emailService');
const { checkAndNotifyLowStock } = require('../utils/stockNotifier');

// =======================
// MAKİNE YÖNETİMİ
// =======================

// Tüm makineleri getir
router.get('/machines', authMiddleware, checkPermission('view_production'), async (req, res) => {
    try {
        // Update status if busy_until has passed
        await db.query(`UPDATE production_machines SET status = 'Boş', busy_until = NULL WHERE status = 'Dolu' AND busy_until < NOW()`);

        const [rows] = await db.query('SELECT * FROM production_machines ORDER BY id DESC');

        // Otomatik Bakım Hatırlatma E-postası Kontrolü (Son 7 gün kalanlar)
        const now = new Date();
        for (let m of rows) {
            if (m.next_maintenance && m.supplier_email && !m.maintenance_reminder_sent) {
                const nextDate = new Date(m.next_maintenance);
                const diffTime = nextDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // Bakıma 7 gün veya daha az kaldıysa mail at
                if (diffDays <= 7) {
                    const sent = await sendMachineMaintenanceReminderEmail(m);
                    if (sent) {
                        await db.query('UPDATE production_machines SET maintenance_reminder_sent = 1 WHERE id = ?', [m.id]);
                        m.maintenance_reminder_sent = 1;
                    }
                }
            }
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching machines:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Add a machine
router.post('/machines', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { name, last_maintenance, machine_code, max_capacity, min_capacity, allowed_categories, prep_time_minutes, alternative_machine_id, supplier_name, supplier_email, supplier_phone, maintenance_period_months } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Makine adı zorunludur.' });

    try {
        const catsJson = allowed_categories ? JSON.stringify(allowed_categories) : null;

        // Next maintenance hesabı
        let next_maintenance = null;
        const period = parseInt(maintenance_period_months) || 12;
        if (last_maintenance) {
            const d = new Date(last_maintenance);
            d.setMonth(d.getMonth() + period);
            next_maintenance = d.toISOString().split('T')[0];
        }

        const [result] = await db.query(`
            INSERT INTO production_machines (name, last_maintenance, status, machine_code, max_capacity, min_capacity, allowed_categories, prep_time_minutes, alternative_machine_id, supplier_name, supplier_email, supplier_phone, maintenance_period_months, next_maintenance, maintenance_reminder_sent) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
            name, last_maintenance || null, 'Boş',
            machine_code || null,
            max_capacity || null,
            min_capacity || null,
            catsJson,
            prep_time_minutes || 0,
            alternative_machine_id || null,
            supplier_name || null,
            supplier_email || null,
            supplier_phone || null,
            period,
            next_maintenance
        ]);
        await logActivity(req.user?.id, 'INSERT', 'production_machines', result.insertId, `Yeni makine eklendi: ${name}`);
        res.json({ success: true, message: 'Makine başarıyla eklendi.', data: { id: result.insertId, name } });
    } catch (err) {
        console.error('Error adding machine:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Update machine status manually (optional)
router.put('/machines/:id/status', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { status } = req.body;
    try {
        const [result] = await db.query('UPDATE production_machines SET status = ? WHERE id = ?', [status, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Makine bulunamadı.' });
        await logActivity(req.user?.id, 'UPDATE', 'production_machines', req.params.id, `Makine durumu "${status}" olarak güncellendi.`);
        res.json({ success: true, message: 'Makine durumu güncellendi.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Edit a machine
router.put('/machines/:id', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { id } = req.params;
    const { name, last_maintenance, machine_code, max_capacity, min_capacity, allowed_categories, prep_time_minutes, alternative_machine_id, supplier_name, supplier_email, supplier_phone, maintenance_period_months } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Makine adı zorunludur.' });

    try {
        const catsJson = allowed_categories ? JSON.stringify(allowed_categories) : null;

        // Next maintenance hesabı
        let next_maintenance = null;
        const period = parseInt(maintenance_period_months) || 12;
        if (last_maintenance) {
            const d = new Date(last_maintenance);
            d.setMonth(d.getMonth() + period);
            next_maintenance = d.toISOString().split('T')[0];
        }

        const [result] = await db.query(`
            UPDATE production_machines 
            SET name = ?, last_maintenance = ?, machine_code = ?, max_capacity = ?, min_capacity = ?, allowed_categories = ?, prep_time_minutes = ?, alternative_machine_id = ?, supplier_name = ?, supplier_email = ?, supplier_phone = ?, maintenance_period_months = ?, next_maintenance = ?, maintenance_reminder_sent = 0
            WHERE id = ?
        `, [
            name, last_maintenance || null,
            machine_code || null,
            max_capacity || null,
            min_capacity || null,
            catsJson,
            prep_time_minutes || 0,
            alternative_machine_id || null,
            supplier_name || null,
            supplier_email || null,
            supplier_phone || null,
            period,
            next_maintenance,
            id
        ]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Makine bulunamadı.' });
        await logActivity(req.user?.id, 'UPDATE', 'production_machines', id, `Makine bilgileri güncellendi: ${name}`);
        res.json({ success: true, message: 'Makine başarıyla güncellendi.' });
    } catch (err) {
        console.error('Error updating machine:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Report machine issue / breakdown
router.post('/machines/:id/report-issue', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { id } = req.params;
    const { issue_description, reporter_name } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM production_machines WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Makine bulunamadı.' });

        const machine = rows[0];

        // Durumu Arızalı yap
        await db.query('UPDATE production_machines SET status = ? WHERE id = ?', ['Arızalı', id]);
        await logActivity(req.user?.id, 'UPDATE', 'production_machines', id, `Makine arıza bildirimi yapıldı. Bildiren: ${reporter_name}`);

        // E-posta gönder
        let emailSent = false;
        if (machine.supplier_email) {
            emailSent = await sendMachineBreakdownEmail(machine, issue_description, reporter_name);
        }

        res.json({
            success: true,
            message: emailSent
                ? 'Arıza bildirim e-postası bakımcıya/satıcıya iletildi ve makine durumu "Arızalı" olarak güncellendi.'
                : 'Makine durumu "Arızalı" olarak güncellendi. (Makine için kayıtlı e-posta adresi bulunamadığından veya mail sunucusu ayarlanmadığından e-posta gönderilemedi).'
        });
    } catch (err) {
        console.error('Error reporting machine issue:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Delete a machine
router.delete('/machines/:id', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM production_machines WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Makine bulunamadı.' });
        await logActivity(req.user?.id, 'DELETE', 'production_machines', id, `Makine silindi.`);
        res.json({ success: true, message: 'Makine silindi.' });
    } catch (err) {
        console.error('Error deleting machine:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});


// =======================
// ÜRETİM SİPARİŞLERİ
// =======================

// Uygun makineleri bul
router.post('/orders/match', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { product_id, planned_quantity } = req.body;
    if (!product_id || !planned_quantity) return res.status(400).json({ success: false, message: 'Ürün ve miktar gerekli.' });

    try {
        // 1. Get product category and formula
        const [prodRows] = await db.query('SELECT Category, Formula FROM products WHERE Id = ?', [product_id]);
        if (prodRows.length === 0) return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });

        const category = prodRows[0].Category;
        const qty = parseFloat(planned_quantity);

        let formula = [];
        try {
            if (prodRows[0].Formula) formula = JSON.parse(prodRows[0].Formula);
        } catch (e) { console.warn('JSON Parse Error (Formula/production):', e.message); }

        let totalPerProductVolume = 0;
        for (const step of formula) {
            for (const mat of (step.materials || [])) {
                let mQty = parseFloat(mat.quantity) || 0;
                let mUnit = (mat.unit || '').toLowerCase();

                // Sadece ağırlık/hacim birimlerini makine kapasitesine dahil et (adet, koli vs. hariç)
                if (mUnit === 'gr' || mUnit === 'ml') {
                    totalPerProductVolume += (mQty / 1000);
                } else if (mUnit === 'kg' || mUnit === 'l' || mUnit === 'litre') {
                    totalPerProductVolume += mQty;
                } else if (mUnit === 'tank') {
                    totalPerProductVolume += (mQty * 1000);
                }
            }
        }

        const valueToCheck = totalPerProductVolume > 0 ? (totalPerProductVolume * qty) : qty;

        // 2. Fetch all machines
        const [machines] = await db.query('SELECT * FROM production_machines');

        // 3. Filter machines by category and capacity
        const matched = machines.filter(m => {
            // Check capacity
            const max = parseFloat(m.max_capacity) || Infinity;
            const min = parseFloat(m.min_capacity) || 0;
            if (valueToCheck > max || valueToCheck < min) return false;

            // Check categories
            if (m.allowed_categories) {
                try {
                    let cats = m.allowed_categories;
                    if (typeof cats === 'string') cats = JSON.parse(cats);
                    if (Array.isArray(cats) && cats.length > 0) {
                        if (!cats.includes(category)) return false;
                    }
                } catch (e) { console.warn('JSON Parse Error (allowed_categories):', e.message); }
            }
            return true;
        });

        if (matched.length === 0) {
            return res.status(400).json({ success: false, message: 'Bu ürünü ve miktarı işleyebilecek uygun makine/kazan bulunamadı. Lütfen kapasiteleri ve kategorileri kontrol edin.' });
        }

        // 4. Sort matched: 'Boş' ones first, then by capacity or prep time. 
        // Or just prioritize Boş ones.
        matched.sort((a, b) => {
            if (a.status === 'Boş' && b.status !== 'Boş') return -1;
            if (a.status !== 'Boş' && b.status === 'Boş') return 1;
            return 0;
        });

        // The first one is recommended
        const recommended = matched[0];

        res.json({ success: true, recommended, allMatches: matched });
    } catch (err) {
        console.error('Match error:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// Yeni bir üretim siparişi oluştur
router.post('/orders', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { product_id, planned_quantity, machine_id, assigned_user_id } = req.body;

    if (!product_id || !planned_quantity || !machine_id) {
        return res.status(400).json({ success: false, message: 'Gerekli alanlar eksik.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get the product's formula
        const [productRows] = await connection.query('SELECT Formula, ProductName FROM products WHERE Id = ?', [product_id]);
        if (productRows.length === 0) throw new Error('Ürün bulunamadı.');
        const product = productRows[0];

        let formula = [];
        try {
            if (product.Formula) formula = JSON.parse(product.Formula);
        } catch (e) { console.warn('JSON Parse Error (Formula check):', e.message); }

        if (!formula || formula.length === 0) {
            throw new Error(`${product.ProductName} için reçete (formül) tanımlanmamış.`);
        }

        // Üretim formülü için %10 fire (waste) hesaplanıyor
        const multiplier = 1.10;
        const targetQuantity = parseFloat(planned_quantity) * multiplier;
        const waste_percentage = 10;

        // 3. Aggregate materials across all steps and check stock
        const aggregatedMaterials = {};
        for (const step of formula) {
            for (const mat of (step.materials || [])) {
                if (!aggregatedMaterials[mat.material]) {
                    aggregatedMaterials[mat.material] = { quantity: 0, unit: mat.unit || '' };
                }
                aggregatedMaterials[mat.material].quantity += (parseFloat(mat.quantity) || 0) * targetQuantity;
            }
        }

        const missingMaterials = [];
        const requiredMaterials = [];

        for (const [materialName, matData] of Object.entries(aggregatedMaterials)) {
            const reqQtyRaw = matData.quantity;
            if (reqQtyRaw <= 0) continue;

            // Lookup product ID by name
            const [pRows] = await connection.query('SELECT Id, unit_type FROM products WHERE ProductName = ? LIMIT 1', [materialName]);
            if (pRows.length === 0) {
                missingMaterials.push({ name: materialName, required: reqQtyRaw, original_unit: matData.unit, required_unit: matData.unit, available: 0, missing: reqQtyRaw });
                continue;
            }
            const matId = pRows[0].Id;
            const productUnit = pRows[0].unit_type || '';

            // Convert reqQtyRaw (formula unit) to productUnit (stock unit)
            let reqQty = reqQtyRaw;
            const fromUnit = (matData.unit || '').toLowerCase();
            const toUnit = productUnit.toLowerCase();

            if (fromUnit !== toUnit && fromUnit !== '') {
                const isFromSmall = (fromUnit === 'gr' || fromUnit === 'ml');
                const isToLarge = (toUnit === 'kg' || toUnit === 'kilogram' || toUnit === 'l' || toUnit === 'litre');

                const isFromLarge = (fromUnit === 'kg' || fromUnit === 'kilogram' || fromUnit === 'l' || fromUnit === 'litre');
                const isToSmall = (toUnit === 'gr' || toUnit === 'ml');

                if (isFromSmall && isToLarge) {
                    reqQty = reqQtyRaw / 1000;
                } else if (isFromLarge && isToSmall) {
                    reqQty = reqQtyRaw * 1000;
                } else if (fromUnit === 'tank' && isToLarge) {
                    reqQty = reqQtyRaw * 10;
                }
            }

            // Check stock
            const [stockRows] = await connection.query('SELECT SUM(quantity) as total_stock FROM wms_stock_balances WHERE product_id = ?', [matId]);
            const totalStock = parseFloat(stockRows[0].total_stock) || 0;

            if (totalStock < reqQty) {
                missingMaterials.push({
                    name: materialName,
                    required: reqQty, // In product unit
                    required_unit: productUnit,
                    original_required: reqQtyRaw,
                    original_unit: matData.unit,
                    available: totalStock,
                    available_unit: productUnit,
                    missing: reqQty - totalStock
                });
            } else {
                requiredMaterials.push({
                    product_id: matId,
                    required_quantity: reqQty // Keep it in product's base unit for stock deductions!
                });
            }
        }

        if (missingMaterials.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Yetersiz stok! Lütfen eksik malzemeleri tamamlayın.',
                missing: missingMaterials
            });
        }

        // 4. Create the production order
        // Machine ID is now step-specific, but we might need a default machine or null. We'll use the first step's machine_id.
        const firstStepMachineId = formula[0]?.machine_id || machine_id;

        const [orderResult] = await connection.query(`
            INSERT INTO production_orders (product_id, machine_id, assigned_user_id, planned_quantity, waste_percentage, status)
            VALUES (?, ?, ?, ?, ?, 'Bekliyor')
        `, [product_id, firstStepMachineId, assigned_user_id || null, planned_quantity, waste_percentage]);

        const orderId = orderResult.insertId;

        // 5. Insert Production Order Steps
        // Check if formula is V3 (has steps) or V2 (old format with just materials)
        const isV3 = formula.length > 0 && formula[0].step !== undefined;

        if (isV3) {
            for (const step of formula) {
                await connection.query(`
                    INSERT INTO production_order_steps (production_order_id, step_number, operation_name, machine_id, duration_minutes, status)
                    VALUES (?, ?, ?, ?, ?, 'Bekliyor')
                `, [orderId, step.step, step.operation || 'İşlem', step.machine_id || null, step.duration || 0]);
            }
        } else {
            // Old product format: create a single default step
            await connection.query(`
                INSERT INTO production_order_steps (production_order_id, step_number, operation_name, machine_id, duration_minutes, status)
                VALUES (?, 1, 'Standart Üretim', ?, 0, 'Bekliyor')
            `, [orderId, machine_id]);
        }

        // 6. Determine picking locations for the required materials
        for (let mat of requiredMaterials) {
            // Get locations where this material is stored, order by expiration date (FIFO)
            const [locRows] = await connection.query(`
                SELECT id, warehouse_id, shelf_code, quantity 
                FROM wms_stock_balances 
                WHERE product_id = ? AND quantity > 0
                ORDER BY expiration_date ASC, id ASC
            `, [mat.product_id]);

            let remainingToPick = mat.required_quantity;
            for (let loc of locRows) {
                if (remainingToPick <= 0) break;

                const pickQty = Math.min(loc.quantity, remainingToPick);

                await connection.query(`
                    INSERT INTO production_materials (production_order_id, material_product_id, required_quantity, location_id, warehouse_id, shelf_code)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [orderId, mat.product_id, pickQty, loc.id, loc.warehouse_id, loc.shelf_code]);

                remainingToPick -= pickQty;
            }
        }

        await logActivity(req.user?.id, 'INSERT', 'production_orders', orderId, `Yeni üretim emri oluşturuldu. (Hedef Miktar: ${targetQuantity})`);
        await connection.commit();
        res.json({ success: true, message: 'Üretim emri oluşturuldu, toplama aşamasına geçilebilir.', orderId });
    } catch (err) {
        await connection.rollback();
        console.error('Error creating production order:', err);
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// Tüm üretim siparişlerini getir
router.get('/orders', authMiddleware, checkPermission('view_production'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT po.*, p.ProductName as product_name, m.name as machine_name, u.name as user_name, p.Formula as product_formula
            FROM production_orders po
            LEFT JOIN products p ON po.product_id = p.Id
            LEFT JOIN production_machines m ON po.machine_id = m.id
            LEFT JOIN users u ON po.assigned_user_id = u.id
            WHERE po.status != 'Arşivlendi'
            ORDER BY po.id DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Siparişi sil
router.delete('/orders/:id', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT status FROM production_orders WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });
        }

        if (rows[0].status === 'Üretimde' || rows[0].status === 'Tamamlandı') {
            return res.status(400).json({ success: false, message: 'Üretimde veya tamamlanmış sipariş iptal edilemez.' });
        }

        await db.query('DELETE FROM production_orders WHERE id = ?', [id]);
        await logActivity(req.user?.id, 'DELETE', 'production_orders', id, `Üretim emri iptal edildi/silindi.`);
        res.json({ success: true, message: 'Sipariş başarıyla iptal edildi ve silindi.' });
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Siparişi arşivle
router.post('/orders/:id/archive', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orderRows] = await connection.query(`
            SELECT po.*, p.ProductName as product_name, u.name as user_name, du.name as delivered_user_name
            FROM production_orders po
            LEFT JOIN products p ON po.product_id = p.Id
            LEFT JOIN users u ON po.assigned_user_id = u.id
            LEFT JOIN users du ON po.delivered_to_user_id = du.id
            WHERE po.id = ?
        `, [req.params.id]);

        if (orderRows.length === 0) throw new Error('Emir bulunamadı.');
        const order = orderRows[0];

        if (order.status !== 'Tamamlandı' && order.status !== 'Kabul Edildi') {
            throw new Error('Sadece Tamamlandı veya Kabul Edildi durumundaki siparişler arşivlenebilir.');
        }

        // Create log entry
        const userName = order.user_name || 'Bilinmeyen Kullanıcı';
        const productName = order.product_name || 'Bilinmeyen Ürün';
        const wastePct = parseFloat(order.waste_percentage || 0).toFixed(1);
        const deliveredUser = order.delivered_user_name || 'Bilinmeyen Depocu';
        let logMessage = `${userName} adlı kullanıcı ${productName} adlı üründen %${wastePct} fire ile üretti ve ${deliveredUser} adlı depo görevlisine teslim etti.`;
        if (order.manager_explanation) {
            logMessage += ` Açıklama: ${order.manager_explanation}`;
        }

        // We use system logger if available or insert directly into activity_logs
        await connection.query(`
            INSERT INTO activity_logs (user_id, action_type, description, target_id, target_table)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user?.id || order.assigned_user_id || 1, 'Üretim Arşivleme', logMessage, order.id, 'production_orders']);

        // Update status
        await connection.query(`UPDATE production_orders SET status = 'Arşivlendi' WHERE id = ?`, [req.params.id]);

        await connection.commit();
        res.json({ success: true, message: 'Sipariş arşivlendi ve loglandı.' });
    } catch (err) {
        await connection.rollback();
        console.error('Archive error:', err);
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// Sipariş detaylarını getir (toplanacak malzemeler dahil)
router.get('/orders/:id', authMiddleware, checkPermission('view_production'), async (req, res) => {
    try {
        const [orderRows] = await db.query(`
            SELECT po.*, p.ProductName as product_name, m.name as machine_name, u.name as user_name, p.Formula as product_formula
            FROM production_orders po
            LEFT JOIN products p ON po.product_id = p.Id
            LEFT JOIN production_machines m ON po.machine_id = m.id
            LEFT JOIN users u ON po.assigned_user_id = u.id
            WHERE po.id = ?
        `, [req.params.id]);

        if (orderRows.length === 0) return res.status(404).json({ success: false, message: 'Emir bulunamadı.' });

        const [materialRows] = await db.query(`
            SELECT pm.*, p.ProductName as material_name, w.name as warehouse_name,
                   p.Volume as product_volume, p.package_capacity, p.unit_type, p.package_name,
                   (SELECT JSON_ARRAYAGG(barcode) FROM product_barcodes WHERE product_id = p.Id) as barcode
            FROM production_materials pm
            LEFT JOIN products p ON pm.material_product_id = p.Id
            LEFT JOIN warehouses w ON pm.warehouse_id = w.id
            WHERE pm.production_order_id = ?
        `, [req.params.id]);

        const [stepRows] = await db.query(`
            SELECT pos.*, m.name as machine_name, m.prep_time_minutes 
            FROM production_order_steps pos
            LEFT JOIN production_machines m ON pos.machine_id = m.id
            WHERE pos.production_order_id = ?
            ORDER BY pos.step_number ASC
        `, [req.params.id]);

        res.json({ success: true, order: orderRows[0], materials: materialRows, steps: stepRows });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Malzemeyi toplandı olarak işaretle
router.post('/orders/:id/pick', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { material_id, actual_quantity } = req.body;
    try {
        let actQty = null;
        if (actual_quantity !== undefined && actual_quantity !== null) {
            actQty = parseFloat(actual_quantity);
        }
        const [result] = await db.query(`UPDATE production_materials SET is_picked = 1, picked_at = NOW(), actual_quantity = ? WHERE id = ? AND production_order_id = ?`, [actQty, material_id, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Malzeme bulunamadı.' });

        await logActivity(req.user?.id, 'UPDATE', 'production_materials', material_id, `Üretim emri için malzeme toplandı (Emir #${req.params.id}).`);

        // Check if all picked
        const [notPicked] = await db.query(`SELECT id FROM production_materials WHERE production_order_id = ? AND is_picked = 0`, [req.params.id]);
        if (notPicked.length === 0) {
            // Update order status if it was 'Bekliyor'
            await db.query(`UPDATE production_orders SET status = 'Toplanıyor' WHERE id = ? AND status = 'Bekliyor'`, [req.params.id]);
        }

        res.json({ success: true, message: 'Toplandı işaretlendi.' });
    } catch (err) {
        console.error('Error marking material as picked:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Üretimi başlat
router.post('/orders/:id/start', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [order] = await connection.query(`
            SELECT po.machine_id, po.status, po.product_id, pm.prep_time_minutes, p.ProductionTime 
            FROM production_orders po
            LEFT JOIN production_machines pm ON po.machine_id = pm.id
            LEFT JOIN products p ON po.product_id = p.Id
            WHERE po.id = ?
        `, [req.params.id]);

        if (order.length === 0) throw new Error('Emir bulunamadı');
        if (order[0].status !== 'Toplanıyor' && order[0].status !== 'Bekliyor') {
            throw new Error('Sadece toplama işlemi biten üretimler başlayabilir.');
        }

        // In V3, starting the order doesn't lock a single machine globally.
        // It just marks the order as "Üretimde", and the Job Card takes over locking specific machines per step.


        await connection.query(`
            UPDATE production_orders 
            SET status = 'Üretimde', start_time = NOW() 
            WHERE id = ?
        `, [req.params.id]);

        await logActivity(req.user?.id, 'UPDATE', 'production_orders', req.params.id, `Üretim başlatıldı.`);

        await connection.commit();
        res.json({ success: true, message: 'Üretim başladı, birinci adım işletilebilir.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// Belirli bir üretim adımını başlat
router.post('/orders/:id/steps/:step_id/start', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { id, step_id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [stepRows] = await connection.query(`
            SELECT pos.*, m.prep_time_minutes, m.alternative_machine_id, m.status as machine_status 
            FROM production_order_steps pos 
            LEFT JOIN production_machines m ON pos.machine_id = m.id 
            WHERE pos.id = ? AND pos.production_order_id = ?
        `, [step_id, id]);

        if (stepRows.length === 0) throw new Error('Adım bulunamadı.');
        const step = stepRows[0];

        if (step.status !== 'Bekliyor') throw new Error('Adım daha önce başlatılmış veya tamamlanmış.');

        const prepTime = parseInt(step.prep_time_minutes) || 0;
        const totalBusyTime = prepTime + (parseInt(step.duration_minutes) || 0);

        let targetMachineId = step.machine_id;

        if (targetMachineId) {
            // Check if primary machine is busy
            if (step.machine_status === 'Dolu' && step.alternative_machine_id) {
                // Check if alternative machine is available
                const [altMachineRows] = await connection.query(`SELECT status FROM production_machines WHERE id = ?`, [step.alternative_machine_id]);
                if (altMachineRows.length > 0 && altMachineRows[0].status === 'Boş') {
                    targetMachineId = step.alternative_machine_id;

                    // Update step to use alternative machine
                    await connection.query(`UPDATE production_order_steps SET machine_id = ? WHERE id = ?`, [targetMachineId, step_id]);
                } else {
                    throw new Error('Hem asıl makine hem de alternatif makine şu an dolu. Lütfen boşa çıkmalarını bekleyin.');
                }
            } else if (step.machine_status === 'Dolu') {
                throw new Error('Makine şu an dolu. Lütfen boşa çıkmasını bekleyin.');
            }

            await connection.query(`
                UPDATE production_machines 
                SET status = 'Dolu', busy_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) 
                WHERE id = ?
            `, [totalBusyTime, targetMachineId]);
        }

        await connection.query(`
            UPDATE production_order_steps 
            SET status = 'Çalışıyor', started_at = NOW() 
            WHERE id = ?
        `, [step_id]);

        await logActivity(req.user?.id, 'UPDATE', 'production_order_steps', step_id, `Üretim adımı #${step_id} başlatıldı (Emir #${id}).`);

        await connection.commit();
        res.json({ success: true, message: 'Adım başladı.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// Bir adım için malzemeyi doğrula
router.post('/orders/:id/steps/:step_id/verify-material', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { material_name } = req.body;
    try {
        const [rows] = await db.query('SELECT verified_materials FROM production_order_steps WHERE id = ? AND production_order_id = ?', [req.params.step_id, req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Adım bulunamadı.' });

        let verified = [];
        try {
            const vm = rows[0].verified_materials;
            if (typeof vm === 'string') {
                verified = JSON.parse(vm);
            } else if (Array.isArray(vm)) {
                verified = vm;
            }
        } catch (e) { console.warn('JSON Parse Error (verified_materials):', e.message); }

        if (!Array.isArray(verified)) verified = [];
        if (!verified.includes(material_name)) {
            verified.push(material_name);
        }

        await db.query('UPDATE production_order_steps SET verified_materials = ? WHERE id = ?', [JSON.stringify(verified), req.params.step_id]);
        await logActivity(req.user?.id, 'UPDATE', 'production_order_steps', req.params.step_id, `Malzeme doğrulandı: ${material_name} (Emir #${req.params.id}).`);

        res.json({ success: true, verified_materials: verified });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// Belirli bir üretim adımını tamamla
router.post('/orders/:id/steps/:step_id/complete', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { id, step_id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [stepRows] = await connection.query(`
            SELECT pos.* 
            FROM production_order_steps pos 
            WHERE pos.id = ? AND pos.production_order_id = ?
        `, [step_id, id]);

        if (stepRows.length === 0) throw new Error('Adım bulunamadı.');
        const step = stepRows[0];

        if (step.status !== 'Çalışıyor') throw new Error('Adım çalışır durumda değil.');

        if (step.machine_id) {
            await connection.query(`
                UPDATE production_machines 
                SET status = 'Boş', busy_until = NULL 
                WHERE id = ?
            `, [step.machine_id]);
        }

        await connection.query(`
            UPDATE production_order_steps 
            SET status = 'Tamamlandı', completed_at = NOW() 
            WHERE id = ?
        `, [step_id]);

        await logActivity(req.user?.id, 'UPDATE', 'production_order_steps', step_id, `Üretim adımı #${step_id} tamamlandı (Emir #${id}).`);

        await connection.commit();
        res.json({ success: true, message: 'Adım tamamlandı.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// Üretimi tamamla
router.post('/orders/:id/complete', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { actual_quantity, waste_reason, manager_explanation, is_manager_approval, delivered_to_user_id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query(`SELECT po.*, m.max_capacity FROM production_orders po LEFT JOIN production_machines m ON po.machine_id = m.id WHERE po.id = ?`, [req.params.id]);
        if (orders.length === 0) throw new Error('Emir bulunamadı');
        const order = orders[0];

        if (order.status !== 'Üretimde' && order.status !== 'Onay Bekliyor') {
            throw new Error('Üretim henüz başlamamış veya çoktan tamamlanmış.');
        }

        const planned = parseFloat(order.planned_quantity);
        const actual = parseFloat(actual_quantity);

        // Makine kapasitesi kontrolü kaldırıldı (Partili üretime geçileceği için toplam miktar makine kapasitesinden büyük olabilir)

        // Target was planned * 1.10. Waste means they didn't get planned quantity.
        // Or user specifies actual_quantity as what they managed to produce.
        // Let's say planned = 100. Target raw mats = 110. Actual = 95. Waste = ((110 - 95)/110)*100 ?
        // Or simpler: (planned - actual) / planned * 100. Let's use (planned - actual) for calculation?
        // Wait, they used raw materials for 110. So total input = 110. Output = actual.
        // Waste % = ((input - output) / input) * 100.
        let waste_pct = ((planned - actual) / planned) * 100;
        if (waste_pct < 0) waste_pct = 0; // Produced more than planned

        // Logic check
        if (!is_manager_approval) {
            if (waste_pct > 5 && waste_pct <= 30 && !waste_reason) {
                return res.status(400).json({ success: false, requireReason: true, message: 'Fire oranı %5-%30 arasında. Lütfen bir neden giriniz.' });
            }
            if (waste_pct > 30) {
                // Move to 'Onay Bekliyor'
                await connection.query(`
                    UPDATE production_orders 
                    SET status = 'Onay Bekliyor', actual_quantity = ?, waste_percentage = ?, waste_reason = ? 
                    WHERE id = ?
                `, [actual, waste_pct, waste_reason || null, order.id]);
                await logActivity(req.user?.id, 'UPDATE', 'production_orders', order.id, `Üretim Fire Onayına Gönderildi (Fire: %${waste_pct.toFixed(2)}).`);
                await connection.commit();
                return res.json({ success: true, requireManager: true, message: 'Fire oranı %30 üzeri! Yönetici onayı bekleniyor.' });
            }
        } else {
            // Manager approval step
            if (!manager_explanation) {
                return res.status(400).json({ success: false, message: 'Yönetici açıklaması zorunludur.' });
            }
        }

        // If we reach here, it's either <5%, or 5-30% with reason, or manager approved >30%.

        // Fetch warehouse manager name
        let warehouseManagerName = 'Bilinmiyor';
        if (delivered_to_user_id) {
            const [wUsers] = await connection.query('SELECT name FROM users WHERE id = ?', [delivered_to_user_id]);
            if (wUsers.length > 0) warehouseManagerName = wUsers[0].name;
        }

        // Fallback user id
        const [uRows] = await connection.query('SELECT id FROM users LIMIT 1');
        const fallbackUserId = uRows.length > 0 ? uRows[0].id : null;
        const finalUserId = order.assigned_user_id || fallbackUserId;

        // 1. Deduct raw materials from stock_balances
        const [materials] = await connection.query(`SELECT * FROM production_materials WHERE production_order_id = ?`, [order.id]);

        for (let mat of materials) {
            let deductQty = mat.required_quantity;
            if (mat.actual_quantity !== null && mat.actual_quantity !== undefined) {
                deductQty = mat.actual_quantity;
            }

            // Deduct from location_id
            await connection.query(`
                UPDATE wms_stock_balances 
                SET quantity = quantity - ? 
                WHERE id = ?
            `, [deductQty, mat.location_id]);

            // Fetch the actual location_id from wms_stock_balances
            const [balRows] = await connection.query(`SELECT location_id FROM wms_stock_balances WHERE id = ?`, [mat.location_id]);
            const actualLocationId = balRows.length > 0 ? balRows[0].location_id : null;

            // Add movement
            await connection.query(`
                INSERT INTO stockmovements (ProductId, MovementType, Quantity, location_id, warehouse_id, shelf_code, MovementDate, Description, UserId)
                VALUES (?, 'OUT', ?, ?, ?, ?, NOW(), ?, ?)
            `, [mat.material_product_id, deductQty, actualLocationId, mat.warehouse_id, mat.shelf_code, `Üretim Tüketimi (Emir #${order.id})`, finalUserId]);
        }

        // 2. We no longer add produced item to stock immediately.
        // It will be added by the Warehouse Manager after acceptance.
        // 3. Mark order as 'Depo Teslim Bekliyor'
        await connection.query(`
            UPDATE production_orders 
            SET status = 'Depo Teslim Bekliyor', actual_quantity = ?, waste_percentage = ?, waste_reason = ?, manager_explanation = ?, delivered_to_user_id = ?, end_time = NOW() 
            WHERE id = ?
        `, [actual, waste_pct, waste_reason || order.waste_reason, manager_explanation || null, delivered_to_user_id || null, order.id]);

        // Release machine
        await connection.query(`UPDATE production_machines SET status = 'Boş', busy_until = NULL WHERE id = ?`, [order.machine_id]);

        await logActivity(req.user?.id, 'UPDATE', 'production_orders', order.id, `Üretim tamamlandı. Gerçekleşen Miktar: ${actual}, Depo Onayına Gönderildi.`);

        await connection.commit();
        res.json({ success: true, message: 'Üretim tamamlandı, depo onayına gönderildi.' });
    } catch (err) {
        await connection.rollback();
        console.error('Complete error:', err);
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// Users with Üretim role
router.get('/users', authMiddleware, checkPermission('view_production'), async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT id, name FROM users WHERE role = 'Üretim' OR role = 'admin'`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Users with Depo role
router.get('/warehouse-users', authMiddleware, checkPermission('view_production'), async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT id, name FROM users WHERE role = 'Depo' OR role = 'admin'`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching warehouse users:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// ----------------- DEPO KABUL İŞLEMLERİ -----------------

// Fetch orders waiting for warehouse acceptance
router.get('/warehouse-acceptances', authMiddleware, checkPermission('view_production'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                po.*, 
                p.ProductName as product_name,
                p.Category as product_category,
                p.shelf_life_months as shelf_life_months,
                u.name as user_name,
                du.name as delivered_user_name
            FROM production_orders po
            JOIN products p ON po.product_id = p.Id
            LEFT JOIN users u ON po.assigned_user_id = u.id
            LEFT JOIN users du ON po.delivered_to_user_id = du.id
            WHERE po.status IN ('Depo Teslim Bekliyor', 'Kabul Edildi')
            ORDER BY po.end_time DESC, po.id DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching warehouse acceptances:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Mark order as accepted by warehouse manager
router.post('/orders/:id/accept-delivery', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    try {
        const [result] = await db.query(`
            UPDATE production_orders 
            SET status = 'Kabul Edildi' 
            WHERE id = ? AND status = 'Depo Teslim Bekliyor'
        `, [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'İşlem yapılamadı. Belki de zaten kabul edilmiştir.' });
        }
        await logActivity(req.user?.id, 'UPDATE', 'production_orders', req.params.id, `Üretim siparişi depo tarafından kabul edildi.`);
        res.json({ success: true, message: 'Teslim alındı olarak işaretlendi.' });
    } catch (err) {
        console.error('Accept delivery error:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Report defect / discrepancy and accept valid amount
router.post('/orders/:id/report-defect', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { received_quantity, reason } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query(`
            SELECT po.*, p.ProductName as product_name 
            FROM production_orders po
            LEFT JOIN products p ON po.product_id = p.Id
            WHERE po.id = ? AND po.status = 'Depo Teslim Bekliyor'
        `, [req.params.id]);

        if (orders.length === 0) {
            throw new Error('Emir bulunamadı veya işlem için uygun statüde değil.');
        }

        const order = orders[0];
        const originalQty = parseFloat(order.actual_quantity);
        const newQty = parseFloat(received_quantity);

        if (isNaN(newQty) || newQty < 0 || newQty > originalQty) {
            throw new Error('Geçersiz teslim alınan miktar.');
        }

        const missingQty = originalQty - newQty;
        const logMessage = `Depo görevlisi teslim alırken eksik/hatalı ürün bildirdi. Üretilen: ${originalQty}, Teslim Alınan: ${newQty}, Fire/Eksik: ${missingQty}. Açıklama: ${reason || 'Belirtilmedi'}`;

        // 1. Log to activity_logs
        await connection.query(`
            INSERT INTO activity_logs (user_id, action_type, description, target_id, target_table)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user?.id || order.delivered_to_user_id || 1, 'Depo Hatalı Teslimat', logMessage, order.id, 'production_orders']);

        // 2. Update actual_quantity and status
        await connection.query(`
            UPDATE production_orders 
            SET actual_quantity = ?, status = 'Kabul Edildi'
            WHERE id = ?
        `, [newQty, req.params.id]);

        await connection.commit();
        res.json({ success: true, message: 'Hatalı teslimat raporlandı ve sağlam ürünler teslim alındı.' });
    } catch (err) {
        await connection.rollback();
        console.error('Report defect error:', err);
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});

// Finalize stock entry by warehouse manager
router.post('/orders/:id/warehouse-stock-entry', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { shelfAllocations, batch_number, expiration_date } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query(`SELECT * FROM production_orders WHERE id = ? AND status = 'Kabul Edildi'`, [req.params.id]);
        if (orders.length === 0) throw new Error('Emir bulunamadı veya henüz teslim alınmamış.');
        const order = orders[0];
        const actualQty = parseFloat(order.actual_quantity);

        if (!shelfAllocations || !Array.isArray(shelfAllocations) || shelfAllocations.length === 0) {
            throw new Error('Lütfen en az bir raf ve miktar belirtiniz.');
        }

        // Validate total quantity matches actualQty
        const totalAllocated = shelfAllocations.reduce((sum, alloc) => sum + (parseFloat(alloc.quantity) || 0), 0);
        if (Math.abs(totalAllocated - actualQty) > 0.01) {
            throw new Error(`Tahsis edilen miktar (${totalAllocated}) ile üretim miktarı (${actualQty}) eşleşmiyor.`);
        }

        // Fetch product volume
        const [productData] = await connection.query('SELECT Volume, package_capacity FROM products WHERE Id = ?', [order.product_id]);
        const productVolume = parseFloat(productData[0]?.Volume) || 0;
        const packageCapacity = parseFloat(productData[0]?.package_capacity) || 1;

        for (const allocation of shelfAllocations) {
            const warehouseId = allocation.warehouseId;
            const shelfCode = allocation.shelfCode;
            const allocQty = parseFloat(allocation.quantity) || 0;

            if (!warehouseId || allocQty <= 0) {
                throw new Error('Geçersiz depo veya miktar girildi.');
            }

            // Volumetric check matching warehouses.js
            if (productVolume > 0 && shelfCode) {
                const [shelfData] = await connection.query('SELECT max_volume FROM warehouse_shelves WHERE warehouse_id = ? AND shelf_code = ?', [warehouseId, shelfCode]);

                if (shelfData.length === 0) {
                    throw new Error(`Geçersiz raf kodu seçildi: ${shelfCode}`);
                }

                const maxVolume = parseFloat(shelfData[0]?.max_volume) || 0;

                if (maxVolume > 0) {
                    const [filledData] = await connection.query(
                        'SELECT COALESCE(SUM(b.quantity * p.Volume), 0) as filled FROM wms_stock_balances b JOIN products p ON b.product_id = p.Id WHERE b.warehouse_id = ? AND b.shelf_code = ? FOR UPDATE',
                        [warehouseId, shelfCode]
                    );
                    const currentFilled = parseFloat(filledData[0].filled) || 0;

                    const emptyVolume = Math.max(maxVolume - currentFilled, 0);
                    const finalMax = Math.floor(emptyVolume / productVolume);

                    if (allocQty > finalMax) {
                        throw new Error(`Hata: ${shelfCode} rafının kapasitesi aşıldı! En fazla ${finalMax} adet sığabilir.`);
                    }
                }
            }

            // 2. Add to wms_stock_balances
            const [existingBal] = await connection.query(`
                SELECT id FROM wms_stock_balances 
                WHERE product_id = ? AND warehouse_id = ? AND (shelf_code = ? OR (shelf_code IS NULL AND ? IS NULL)) 
                AND batch_number = ? AND (expiration_date = ? OR (expiration_date IS NULL AND ? IS NULL))
            `, [order.product_id, warehouseId, shelfCode || null, shelfCode || null, batch_number || '', expiration_date || null, expiration_date || null]);

            if (existingBal.length > 0) {
                await connection.query(`UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?`, [allocQty, existingBal[0].id]);
            } else {
                await connection.query(`
                    INSERT INTO wms_stock_balances (product_id, location_id, warehouse_id, shelf_code, quantity, batch_number, expiration_date)
                    VALUES (?, NULL, ?, ?, ?, ?, ?)
                `, [order.product_id, warehouseId, shelfCode || null, allocQty, batch_number || '', expiration_date || null]);
            }

            // 4. Record IN movement
            let warehouseManagerName = 'Bilinmiyor';
            if (order.delivered_to_user_id) {
                const [wUsers] = await connection.query('SELECT name FROM users WHERE id = ?', [order.delivered_to_user_id]);
                if (wUsers.length > 0) warehouseManagerName = wUsers[0].name;
            }
            await connection.query(`
                INSERT INTO stockmovements (ProductId, MovementType, Quantity, location_id, warehouse_id, shelf_code, MovementDate, Description, UserId)
                VALUES (?, 'IN', ?, NULL, ?, ?, NOW(), ?, ?)
            `, [order.product_id, allocQty, warehouseId, shelfCode || null, `Üretim Tamamlandı (Depo Kabul - ${warehouseManagerName}) - BATCH: ${batch_number || 'Yok'}`, order.delivered_to_user_id || 1]);
        }

        // 3. Update global products StockQuantity
        await connection.query(`UPDATE products SET StockQuantity = StockQuantity + ? WHERE Id = ?`, [actualQty, order.product_id]);

        // 5. Update Order Status
        await connection.query(`UPDATE production_orders SET status = 'Tamamlandı' WHERE id = ?`, [order.id]);

        await logActivity(req.user?.id, 'UPDATE', 'production_orders', order.id, 'Üretim sonucu oluşan stoklar depoya başarıyla yerleştirildi.');

        await connection.commit();
        res.json({ success: true, message: 'Stok girişi başarıyla tamamlandı.' });
    } catch (err) {
        await connection.rollback();
        console.error('Warehouse entry error:', err);
        res.status(500).json({ success: false, message: err.message || 'Sunucu hatası.' });
    } finally {
        connection.release();
    }
});


// Get max producible quantity based on stock
router.get('/max-quantity/:productId', authMiddleware, checkPermission('view_production'), async (req, res) => {
    try {
        const { productId } = req.params;
        const [prodRows] = await db.query('SELECT Formula, ProductName, Category FROM products WHERE Id = ?', [productId]);
        if (prodRows.length === 0) return res.json({ success: false, message: 'Ürün bulunamadı.' });

        const product = prodRows[0];
        let formula = [];
        try {
            if (product.Formula) formula = JSON.parse(product.Formula);
        } catch (e) { console.warn('JSON Parse Error (Formula packing):', e.message); }

        if (!formula || formula.length === 0) return res.json({ success: false, message: 'Reçete yok.' });

        const aggregatedMaterials = {};
        for (const step of formula) {
            for (const mat of (step.materials || [])) {
                if (!aggregatedMaterials[mat.material]) {
                    aggregatedMaterials[mat.material] = { quantity: 0, unit: mat.unit || '' };
                }
                aggregatedMaterials[mat.material].quantity += parseFloat(mat.quantity) || 0;
            }
        }

        let maxProducible = Infinity;

        for (const [materialName, matData] of Object.entries(aggregatedMaterials)) {
            const reqQtyRaw = matData.quantity;
            if (reqQtyRaw <= 0) continue;

            const [pRows] = await db.query('SELECT Id, unit_type FROM products WHERE ProductName = ? LIMIT 1', [materialName]);
            if (pRows.length === 0) {
                maxProducible = 0;
                break;
            }
            const matId = pRows[0].Id;
            const productUnit = (pRows[0].unit_type || '').toLowerCase();
            const fromUnit = (matData.unit || '').toLowerCase();

            let reqQtyForOne = reqQtyRaw;
            if (fromUnit !== productUnit && fromUnit !== '') {
                const isFromSmall = (fromUnit === 'gr' || fromUnit === 'ml');
                const isToLarge = (productUnit === 'kg' || productUnit === 'kilogram' || productUnit === 'l' || productUnit === 'litre');
                const isFromLarge = (fromUnit === 'kg' || fromUnit === 'kilogram' || fromUnit === 'l' || fromUnit === 'litre');
                const isToSmall = (productUnit === 'gr' || productUnit === 'ml');

                if (isFromSmall && isToLarge) reqQtyForOne = reqQtyRaw / 1000;
                else if (isFromLarge && isToSmall) reqQtyForOne = reqQtyRaw * 1000;
                else if (fromUnit === 'tank' && isToLarge) reqQtyForOne = reqQtyRaw * 10;
            }

            const [stockRows] = await db.query('SELECT SUM(quantity) as total_stock FROM wms_stock_balances WHERE product_id = ?', [matId]);
            const totalStock = parseFloat(stockRows[0].total_stock) || 0;

            // Üretim formülü için %10 fire hesaplanıyor
            const possible = totalStock / (reqQtyForOne * 1.10);
            if (possible < maxProducible) {
                maxProducible = possible;
            }
        }

        if (maxProducible === Infinity) maxProducible = 0;

        // Find max machine capacity
        const category = product.Category;
        let totalPerProductVolume = 0;

        for (const [matName, matData] of Object.entries(aggregatedMaterials)) {
            let mQty = matData.quantity;
            let mUnit = (matData.unit || '').toLowerCase();

            if (mUnit === 'gr' || mUnit === 'ml') {
                totalPerProductVolume += (mQty / 1000);
            } else if (mUnit === 'kg' || mUnit === 'l' || mUnit === 'litre') {
                totalPerProductVolume += mQty;
            } else if (mUnit === 'tank') {
                totalPerProductVolume += (mQty * 1000);
            }
        }

        let maxMachineCount = Infinity;
        if (totalPerProductVolume > 0) {
            let limitCapacity = 0;
            let firstMachineId = null;
            if (formula && formula.length > 0 && formula[0].machine_id) {
                firstMachineId = formula[0].machine_id;
            }

            if (firstMachineId) {
                const [mRows] = await db.query('SELECT max_capacity FROM production_machines WHERE id = ?', [firstMachineId]);
                if (mRows.length > 0) {
                    limitCapacity = parseFloat(mRows[0].max_capacity) || 0;
                }
            } else {
                const [machines] = await db.query('SELECT * FROM production_machines');
                for (const m of machines) {
                    if (m.allowed_categories) {
                        try {
                            let cats = m.allowed_categories;
                            if (typeof cats === 'string') cats = JSON.parse(cats);
                            if (Array.isArray(cats) && cats.length > 0 && cats.includes(category)) {
                                const cap = parseFloat(m.max_capacity) || 0;
                                if (cap > limitCapacity) {
                                    limitCapacity = cap;
                                }
                            }
                        } catch (e) { console.warn('JSON Parse Error (packaging_info):', e.message); }
                    }
                }
            }

            if (limitCapacity > 0) {
                maxMachineCount = limitCapacity / totalPerProductVolume;
            } else {
                maxMachineCount = 0;
            }
        }

        let minMachineCount = 0;
        if (totalPerProductVolume > 0 && formula && formula.length > 0) {
            const machineIds = formula.map(step => step.machine_id).filter(id => id);
            if (machineIds.length > 0) {
                const [machines] = await db.query('SELECT min_capacity FROM production_machines WHERE id IN (?)', [machineIds]);
                let maxOfMins = 0;
                for (const m of machines) {
                    const minC = parseFloat(m.min_capacity) || 0;
                    if (minC > maxOfMins) maxOfMins = minC;
                }
                minMachineCount = maxOfMins / totalPerProductVolume;
            }
        }

        const finalMax = Math.min(maxProducible, maxMachineCount);

        res.json({
            success: true,
            maxQuantity: finalMax,
            stockLimit: maxProducible,
            machineLimit: maxMachineCount === Infinity ? null : maxMachineCount,
            minMachineLimit: minMachineCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});



// ==========================================
// PRODUCTION CAPACITY ANALYSIS
// ==========================================

// GET: Ürün için üretim kapasitesi ve hammadde analizi
router.get('/capacity-analysis/:productId', authMiddleware, checkPermission('view_production'), async (req, res) => {
    const { productId } = req.params;
    try {
        // 1. Ürün bilgilerini al
        const [productRows] = await db.query('SELECT Id, ProductName, Formula, supply_type FROM products WHERE Id = ?', [productId]);
        if (productRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });
        }
        const product = productRows[0];

        let formula = [];
        try {
            formula = JSON.parse(product.Formula || '[]');
        } catch (e) {
            formula = [];
        }

        if (!Array.isArray(formula) || formula.length === 0) {
            return res.json({ success: true, data: { hasFormula: false, message: 'Bu ürün için reçete (BOM) tanımlanmamış.' } });
        }

        // 2. Makine kapasiteleri
        const machineIds = formula.map(step => step.machine_id).filter(id => id);
        let machineInfo = [];
        let minMachineCapacity = null;
        let maxMachineCapacity = null;

        if (machineIds.length > 0) {
            const [machines] = await db.query('SELECT id, name, min_capacity, max_capacity, status FROM production_machines WHERE id IN (?)', [machineIds]);
            machineInfo = machines.map(m => ({
                id: m.id,
                name: m.name,
                minCapacity: parseFloat(m.min_capacity) || 0,
                maxCapacity: parseFloat(m.max_capacity) || 0,
                status: m.status
            }));

            for (const m of machineInfo) {
                if (m.maxCapacity > 0) {
                    if (maxMachineCapacity === null || m.maxCapacity < maxMachineCapacity) {
                        maxMachineCapacity = m.maxCapacity;
                    }
                }
                if (m.minCapacity > 0) {
                    if (minMachineCapacity === null || m.minCapacity > minMachineCapacity) {
                        minMachineCapacity = m.minCapacity;
                    }
                }
            }
        }

        // 3. Hammadde analizi - her adımda ne kadar malzeme kullanılıyor ve stokta ne kadar var
        let materialsAnalysis = [];
        let totalVolumePerProduct = 0; // 1 ürün üretmek için toplam hacim (kg/L)

        for (const step of formula) {
            for (const mat of (step.materials || [])) {
                const matQty = parseFloat(mat.quantity) || 0;
                const matUnit = (mat.unit || '').toLowerCase();
                const matName = mat.material || 'Bilinmiyor';

                // Hacim hesabı (kg/L bazında)
                let volumePerProduct = 0;
                if (matUnit === 'gr' || matUnit === 'ml') {
                    volumePerProduct = matQty / 1000;
                } else if (matUnit === 'kg' || matUnit === 'l' || matUnit === 'litre') {
                    volumePerProduct = matQty;
                } else if (matUnit === 'adet') {
                    volumePerProduct = 0; // adet bazlı olanlar hacim hesabına girmiyor
                }

                totalVolumePerProduct += volumePerProduct;

                // Stokta bu hammaddeden ne kadar var?
                const [stockRows] = await db.query(`
                    SELECT COALESCE(SUM(wsb.quantity), 0) as totalStock
                    FROM wms_stock_balances wsb
                    JOIN products p ON wsb.product_id = p.Id
                    WHERE p.ProductName = ?
                `, [matName]);

                const currentStock = parseFloat(stockRows[0]?.totalStock) || 0;

                // Bu hammaddeden kaç ürün üretilebilir?
                let maxProductsFromMaterial = null;
                if (matQty > 0 && matUnit !== 'adet') {
                    maxProductsFromMaterial = Math.floor(currentStock / matQty);
                } else if (matUnit === 'adet' && matQty > 0) {
                    maxProductsFromMaterial = Math.floor(currentStock / matQty);
                }

                materialsAnalysis.push({
                    name: matName,
                    quantityPerProduct: matQty,
                    unit: mat.unit || '',
                    currentStock: currentStock,
                    maxProducts: maxProductsFromMaterial,
                    step: step.step
                });
            }
        }

        // 4. Darboğaz: Hammaddeden üretilebilecek maks ürün sayısı
        let maxFromMaterials = null;
        for (const m of materialsAnalysis) {
            if (m.maxProducts !== null) {
                if (maxFromMaterials === null || m.maxProducts < maxFromMaterials) {
                    maxFromMaterials = m.maxProducts;
                }
            }
        }

        // 5. Makineden üretilebilecek min/maks adet (hacim bazında)
        let minFromMachine = null;
        let maxFromMachine = null;
        if (totalVolumePerProduct > 0) {
            if (minMachineCapacity !== null) {
                minFromMachine = Math.ceil(minMachineCapacity / totalVolumePerProduct);
            }
            if (maxMachineCapacity !== null) {
                maxFromMachine = Math.floor(maxMachineCapacity / totalVolumePerProduct);
            }
        }

        // 6. Önerilen aralık
        const recommendedMin = minFromMachine || 1;
        let recommendedMax = maxFromMachine || 99999;
        if (maxFromMaterials !== null && maxFromMaterials < recommendedMax) {
            recommendedMax = maxFromMaterials;
        }

        res.json({
            success: true,
            data: {
                hasFormula: true,
                productName: product.ProductName,
                machines: machineInfo,
                materials: materialsAnalysis,
                totalVolumePerProduct: totalVolumePerProduct,
                capacity: {
                    minMachineCapacity: minMachineCapacity,
                    maxMachineCapacity: maxMachineCapacity,
                    minFromMachine: minFromMachine,
                    maxFromMachine: maxFromMachine,
                    maxFromMaterials: maxFromMaterials,
                    recommendedMin: recommendedMin,
                    recommendedMax: recommendedMax > 0 ? recommendedMax : 0
                }
            }
        });
    } catch (error) {
        console.error('Kapasite analizi hatası:', error);
        res.status(500).json({ success: false, message: 'Kapasite analizi yapılamadı.' });
    }
});

// ==========================================
// PRODUCTION REQUESTS API
// ==========================================

// Get all production requests
router.get('/requests', authMiddleware, checkRole(['Üretim'], 'view_production'), async (req, res) => {
    try {
        const query = `
            SELECT pr.*, p.ProductName,
                   (SELECT JSON_ARRAYAGG(barcode) FROM product_barcodes WHERE product_id = p.Id) as Barcode 
            FROM production_requests pr 
            JOIN products p ON pr.product_id = p.Id 
            ORDER BY pr.created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Üretim talepleri getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Üretim talepleri alınamadı.' });
    }
});

// Create manual production request
router.post('/requests', authMiddleware, checkRole(['Üretim'], 'production_manage'), async (req, res) => {
    const { productId, quantity, reason, creator } = req.body;
    if (!productId || !quantity || !reason || !creator) {
        return res.status(400).json({ success: false, message: 'Eksik bilgi gönderildi.' });
    }

    try {
        const [productData] = await db.query('SELECT Formula FROM products WHERE Id = ?', [productId]);
        let quantitiesToRequest = [parseInt(quantity, 10)];

        for (let i = 0; i < quantitiesToRequest.length; i++) {
            const qtyToRequest = quantitiesToRequest[i];
            const finalReason = reason;

            await db.query(
                'INSERT INTO production_requests (product_id, requested_quantity, source, creator, reason, status, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [productId, qtyToRequest, 'Manuel', creator, finalReason, 'Bekleyen', req.body.priority || 'Normal']
            );
        }

        await logActivity(req.user?.id, 'INSERT', 'production_requests', null, `Manuel üretim talebi oluşturuldu: ${quantity} adet (Bölünmüş olabilir). Neden: ${reason}`);

        res.json({ success: true, message: 'Talep başarıyla oluşturuldu.' });
    } catch (error) {
        console.error('Talep oluşturulurken hata:', error);
        res.status(500).json({ success: false, message: 'Talep oluşturulamadı.' });
    }
});

// Update request status
router.put('/requests/:id/status', authMiddleware, checkRole(['Üretim'], 'production_manage'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        if (status === 'Reddedildi') {
            const [result] = await db.query('DELETE FROM production_requests WHERE id = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Talep bulunamadı.' });
            await logActivity(req.user?.id, 'DELETE', 'production_requests', id, `Üretim talebi reddedildi ve silindi.`);
            res.json({ success: true, message: 'Talep reddedildi ve listeden silindi.' });
        } else {
            const [result] = await db.query('UPDATE production_requests SET status = ? WHERE id = ?', [status, id]);
            if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Talep bulunamadı.' });
            await logActivity(req.user?.id, 'UPDATE', 'production_requests', id, `Üretim talebi durumu güncellendi: ${status}`);
            res.json({ success: true, message: `Talep durumu ${status} olarak güncellendi.` });
        }
    } catch (error) {
        console.error('Talep güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Talep güncellenemedi.' });
    }
});

// Update product critical stock levels (for automated requests setup)
router.put('/product-stock-rules/:productId', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    const { productId } = req.params;
    const { critical_stock_level, minimum_production_quantity } = req.body;

    try {
        const [result] = await db.query(
            'UPDATE products SET critical_stock_level = ?, minimum_production_quantity = ? WHERE Id = ?',
            [critical_stock_level, minimum_production_quantity, productId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });
        await logActivity(req.user?.id, 'UPDATE', 'products', productId, `Kritik stok kuralı güncellendi (Kritik: ${critical_stock_level}, Min Üretim: ${minimum_production_quantity})`);
        res.json({ success: true, message: 'Kritik stok kuralları güncellendi.' });
    } catch (error) {
        console.error('Kritik stok kuralı güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Kural güncellenemedi.' });
    }
});


// Otomatik Stok Kontrolü ve Talep Oluşturma (Cron Job benzeri yapı)
async function checkCriticalStocks() {
    try {
        // Find all active products and delegate checking to the central logic
        const [products] = await db.query('SELECT Id FROM products WHERE Category != ?', ['Hammadde']);

        for (const p of products) {
            try {
                await checkAndNotifyLowStock(p.Id);
            } catch (err) {
                console.error(`Otomatik stok kontrolü hatası (Ürün ID: ${p.Id}):`, err);
            }
        }
    } catch (err) {
        console.error('Otomatik stok kontrol ana döngü hatası:', err);
    }
}

// Check every 2 hours
setInterval(checkCriticalStocks, 2 * 60 * 60 * 1000);
// Also run once on startup
setTimeout(checkCriticalStocks, 5000);

// Endpoint for manual trigger if needed
router.post('/trigger-stock-check', authMiddleware, checkPermission('production_manage'),  checkRole(['Üretim']), async (req, res) => {
    await checkCriticalStocks();
    res.json({ success: true, message: 'Stok kontrolü tamamlandı.' });
});

module.exports = router;
