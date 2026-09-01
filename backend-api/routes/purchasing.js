/**
 * ============================================================================
 * BİLEŞEN ADI: purchasing
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu modül, satınalma talepleri, tedarikçi siparişleri, sipariş onay süreçleri 
 * ve gelen malzemelerin depo kabul işlemlerini yürüten API rotalarıdır.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const crypto = require('crypto');
const { logActivity } = require('../utils/logger');

// GET /api/purchasing/requests - Tüm satın alma taleplerini listele
router.get('/requests', authMiddleware, checkPermission('view_procurement'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT pr.*, u.name as employee_name, s.SupplierName as supplier_name, s.Email as supplier_email
            FROM purchase_requests pr
            LEFT JOIN users u ON pr.employee_id = u.id
            LEFT JOIN suppliers s ON pr.supplier_id = s.id
            ORDER BY pr.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching purchase requests:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// POST /api/purchasing/requests - Yeni bir satın alma talebi oluştur
router.post('/requests', authMiddleware, checkPermission('procurement_request'),  checkRole(['Depo']), async (req, res) => {
    const { employee_id, product_name, quantity, description, supplier_id } = req.body;

    if (!product_name || !quantity) {
        return res.status(400).json({ success: false, message: 'Ürün adı ve miktar zorunludur.' });
    }

    try {
        const [result] = await db.query(`
            INSERT INTO purchase_requests (employee_id, product_name, quantity, description, status, supplier_id)
            VALUES (?, ?, ?, ?, 'Bekliyor', ?)
        `, [employee_id || null, product_name, quantity, description || '', supplier_id || null]);
        
        await logActivity(req.user?.id, 'INSERT', 'purchase_requests', result.insertId, `Yeni satın alma talebi oluşturuldu: ${product_name} (${quantity} Adet)`);
        res.json({ success: true, message: 'Satın alma talebi oluşturuldu.', id: result.insertId });
    } catch (err) {
        console.error('Error creating purchase request:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// PUT /api/purchasing/requests/:id/status - Talep durumunu güncelle
router.put('/requests/:id/status', authMiddleware, checkPermission('procurement_request'),  checkRole(['Depo']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Talep ID.' });
    const { status } = req.body; // 'Bekliyor', 'Onaylandı', 'Reddedildi'

    if (!['Bekliyor', 'Onaylandı', 'Reddedildi'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Geçersiz durum.' });
    }

    try {
        const [result] = await db.query(`
            UPDATE purchase_requests 
            SET status = ? 
            WHERE id = ?
        `, [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı.' });
        }

        await logActivity(req.user?.id, 'UPDATE', 'purchase_requests', id, `Satın alma talebi durumu güncellendi: ${status}`);
        res.json({ success: true, message: 'Durum güncellendi.' });
    } catch (err) {
        console.error('Error updating purchase request status:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// POST /api/purchasing/requests/:id/send-order - E-posta gönder ve satın alma siparişi oluştur
router.post('/requests/:id/send-order', authMiddleware, checkPermission('procurement_request'),  checkRole(['Depo']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Talep ID.' });
    const { quantity, description, supplier_id, supplier_email, product_name } = req.body;

    if (!quantity || !supplier_id || !supplier_email) {
        return res.status(400).json({ success: false, message: 'Miktar, tedarikçi ve e-posta zorunludur.' });
    }

    try {
        // Generate secure token
        const actionToken = crypto.randomBytes(32).toString('hex');

        // Base URL for actions
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        // Action URLs
        const onaylaUrl = `${baseUrl}/api/purchasing/orders/action?token=${actionToken}&status=Hazırlanıyor`;
        const hazirlandiUrl = `${baseUrl}/api/purchasing/orders/action?token=${actionToken}&status=Hazırlandı`;
        const kargolandiUrl = `${baseUrl}/api/purchasing/orders/action?token=${actionToken}&status=Kargoya%20Verildi`;

        // Send email using nodemailer
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // GÜVENLİK: HTML Injection / XSS önleme — Tüm kullanıcı girdileri escape ediliyor
        const escapeHtml = (str) => String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const safeProductName = escapeHtml(product_name);
        const safeQuantity = escapeHtml(quantity);
        const safeDescription = description ? escapeHtml(description) : null;

        const mailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #0284c7; margin-top: 0;">Yeni Sipariş Talebi</h2>
                <p>Sayın İlgili,</p>
                <p>Şirketimiz üretim/depo süreçlerinde kullanılmak üzere aşağıdaki malzemeden sipariş geçmek istiyoruz. İlgili siparişi onaylayıp tarafımıza dönüş yapmanızı rica ederiz.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 30px;">
                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px; text-align: left;">Ürün Adı</th>
                        <th style="padding: 12px; text-align: left;">Sipariş Miktarı</th>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${safeProductName}</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${safeQuantity}</strong></td>
                    </tr>
                </table>

                ${safeDescription ? `<p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;"><strong>Ek Açıklama:</strong><br>${safeDescription}</p>` : ''}

                <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
                    <h3 style="margin-top: 0; color: #0f172a;">Durum Bildirim Butonları</h3>
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Lütfen siparişinizin durumunu bildirmek için aşağıdaki butonlardan uygun olanına tıklayınız. Sistemimiz otomatik olarak güncellenecektir.</p>
                    
                    <a href="${onaylaUrl}" style="display: block; width: 100%; max-width: 300px; margin: 0 auto 10px auto; padding: 12px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Siparişi Onaylıyorum (Hazırlanıyor)</a>
                    <a href="${hazirlandiUrl}" style="display: block; width: 100%; max-width: 300px; margin: 0 auto 10px auto; padding: 12px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Sipariş Hazırlandı</a>
                    <a href="${kargolandiUrl}" style="display: block; width: 100%; max-width: 300px; margin: 0 auto 10px auto; padding: 12px; background-color: #d97706; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Kargoya Verildi / Yola Çıktı</a>
                </div>

                <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center;">Bu e-posta stok yönetim sistemi tarafından otomatik oluşturulmuştur.</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"Satın Alma Birimi" <${process.env.SMTP_USER}>`,
            to: supplier_email,
            subject: `Sipariş Talebi - ${product_name}`,
            html: mailHtml,
        });

        // Update request status to 'Onaylandı'
        await db.query(`UPDATE purchase_requests SET status = 'Onaylandı' WHERE id = ?`, [id]);

        // Insert into purchase_orders with action_token
        await db.query(`
            INSERT INTO purchase_orders (supplier_id, product_name, quantity, unit_price, total_price, status, action_token)
            VALUES (?, ?, ?, 0, 0, 'Bekliyor', ?)
        `, [supplier_id, product_name, quantity, actionToken]);

        await logActivity(req.user?.id, 'INSERT', 'purchase_orders', id, `${product_name} ürünü için satın alma siparişi tedarikçiye mail ile gönderildi.`);
        res.json({ success: true, message: 'Mail başarıyla gönderildi ve sipariş oluşturuldu.' });

    } catch (err) {
        console.error('Error sending order email:', err);
        res.status(500).json({ success: false, message: 'Mail gönderilirken hata oluştu.' });
    }
});

// GET /api/purchasing/orders/action - Tedarikçi işlem webhook'u
router.get('/orders/action', async (req, res) => {
    const { token, status } = req.query;

    if (!token || !status) {
        return res.status(400).send("Geçersiz istek.");
    }

    if (!['Hazırlanıyor', 'Hazırlandı', 'Kargoya Verildi'].includes(status)) {
        return res.status(400).send("Geçersiz durum güncellemesi.");
    }

    // GÜVENLİK: Defense-in-depth — whitelist kontrolü yeterli olsa da
    // HTML'e yazılan tüm değerler escape edilir (XSS önleme katmanı)
    const escapeHtml = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const safeStatus = escapeHtml(status);

    try {
        const [result] = await db.query(`
            UPDATE purchase_orders 
            SET status = ? 
            WHERE action_token = ?
        `, [status, token]);

        if (result.affectedRows === 0) {
            return res.status(404).send(`
                <html><head><meta charset="UTF-8"><title>Hata</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: #dc2626;">Sipariş Bulunamadı veya Link Geçersiz</h1>
                </body></html>
            `);
        }

        // Return nice HTML page
        res.send(`
            <html><head><meta charset="UTF-8"><title>Durum Güncellendi</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f8fafc;">
                <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
                    <h1 style="color: #059669; font-size: 48px; margin: 0;">✓</h1>
                    <h2 style="color: #0f172a;">Durum Başarıyla Güncellendi</h2>
                    <p style="color: #64748b; font-size: 18px;">Siparişin durumu <strong>"${safeStatus}"</strong> olarak ERP sistemine kaydedildi.</p>
                    <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">Bu pencereyi kapatabilirsiniz.</p>
                </div>
            </body></html>
        `);
    } catch (err) {
        console.error('Error updating status from token:', err);
        res.status(500).send("Sunucu hatası.");
    }
});

// GET /api/purchasing/orders - Tüm satın alma siparişlerini listele
router.get('/orders', authMiddleware, checkPermission('view_procurement'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT po.*, s.SupplierName as supplier_name, s.Email as supplier_email, s.Phone as supplier_phone, s.Address as supplier_address, s.ContactPerson as supplier_contact, p.shelf_life_months as shelf_life_months, p.Id as product_id, p.PurchasePrice as product_price, p.unit_type as unit_type,
            (SELECT unit_price FROM product_suppliers WHERE product_id = p.Id AND supplier_id = po.supplier_id LIMIT 1) as supplier_unit_price
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.Id
            LEFT JOIN products p ON po.product_name = p.ProductName
            ORDER BY po.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching purchase orders:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// PUT /api/purchasing/orders/:id/status - Sipariş durumunu güncelle
router.put('/orders/:id/status', authMiddleware, checkPermission('procurement_request'),  checkRole(['Depo']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    const { status } = req.body;

    if (!['Bekliyor', 'Onaylandı', 'Hazırlanıyor', 'Hazırlandı', 'Kargoya Verildi', 'Depo Kabul Bekliyor', 'Depoya Alındı', 'İptal', 'Teslim Edildi'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Geçersiz durum.' });
    }

    try {
        const [result] = await db.query(`
            UPDATE purchase_orders 
            SET status = ? 
            WHERE id = ?
        `, [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });
        }

        await logActivity(req.user?.id, 'UPDATE', 'purchase_orders', id, `Satın alma siparişi durumu güncellendi: ${status}`);
        res.json({ success: true, message: 'Durum güncellendi.' });
    } catch (err) {
        console.error('Error updating purchase order status:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// POST /api/purchasing/orders/:id/receive - Depoya mal kabul işlemini gerçekleştir
router.post('/orders/:id/receive', authMiddleware, checkPermission('procurement_request'),  checkRole(['Depo']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Sipariş ID.' });
    const { quantity, shelfAllocations, location_id, warehouse_id, shelf_code, batch_number, expiration_date, user_id } = req.body;

    const allocs = (shelfAllocations && Array.isArray(shelfAllocations) && shelfAllocations.length > 0)
        ? shelfAllocations
        : [{ warehouse_id, shelf_code, quantity: parseFloat(quantity) || 0 }];

    if (allocs.length === 0 || !allocs[0].warehouse_id || !allocs[0].shelf_code) {
        return res.status(400).json({ success: false, message: 'Miktar, depo ve raf bilgileri zorunludur.' });
    }

    try {
        await db.query('BEGIN'); // Start transaction

        // 1. Get the purchase order
        const [orders] = await db.query('SELECT * FROM purchase_orders WHERE id = ? AND status != "İptal"', [id]);
        if (orders.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Geçerli sipariş bulunamadı veya iptal edilmiş.' });
        }
        const order = orders[0];

        // Validate against remaining quantity for partial receipts
        let checkTotal = 0;
        for (const alloc of allocs) {
            checkTotal += (parseFloat(alloc.quantity) || 0);
        }
        const orderQty = parseFloat(order.quantity) || 0;
        const alreadyReceived = parseFloat(order.received_quantity) || 0;
        const remainingQty = Math.max(0, orderQty - alreadyReceived);

        if (checkTotal > remainingQty) {
            await db.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Hata: Girilen miktar (${checkTotal} Adet), kalan sipariş miktarını (${remainingQty} Adet) aşamaz!` });
        }

        // 2. We need the product ID from products table matching order.product_name
        const [products] = await db.query('SELECT Id FROM products WHERE ProductName = ?', [order.product_name]);
        if (products.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Siparişteki ürün, malzeme listesinde bulunamadı.' });
        }
        const productId = products[0].Id;
        const [uRows] = await db.query('SELECT id FROM users LIMIT 1');
        const fallbackUserId = uRows.length > 0 ? uRows[0].id : 1;
        const finalUserId = user_id || order.employee_id || fallbackUserId;

        // 3. Loop over allocations and save balances & movements
        let totalReceived = 0;
        for (const alloc of allocs) {
            const qty = parseFloat(alloc.quantity) || 0;
            if (qty <= 0) continue;
            totalReceived += qty;
            const whId = alloc.warehouse_id || warehouse_id;
            const shCode = alloc.shelf_code || shelf_code;

            // Extract batch and supplier info
            const bNum = alloc.batch_number || batch_number || '';
            const expDate = alloc.expiration_date || expiration_date || null;
            const suppId = order.supplier_id || null;
            const uPrice = order.unit_price || null;

            // Update or Insert into wms_stock_balances matching shelf and batch
            const [existingBalance] = await db.query(
                'SELECT id, quantity FROM wms_stock_balances WHERE product_id = ? AND warehouse_id = ? AND shelf_code = ? AND COALESCE(batch_number, "") = ? AND (expiration_date = ? OR (expiration_date IS NULL AND ? IS NULL)) AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL))',
                [productId, whId, shCode, bNum, expDate, expDate, suppId, suppId]
            );

            if (existingBalance.length > 0) {
                await db.query(
                    'UPDATE wms_stock_balances SET quantity = quantity + ?, batch_number = ?, expiration_date = COALESCE(expiration_date, ?), supplier_id = COALESCE(supplier_id, ?), unit_price = COALESCE(unit_price, ?) WHERE id = ?',
                    [qty, bNum, expDate, suppId, uPrice, existingBalance[0].id]
                );
            } else {
                await db.query(
                    'INSERT INTO wms_stock_balances (product_id, warehouse_id, shelf_code, batch_number, expiration_date, quantity, supplier_id, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [productId, whId, shCode, bNum, expDate, qty, suppId, uPrice]
                );
            }

            // Location is managed via warehouse_id and shelf_code
            const validLocationId = null;

            // Insert into stockmovements
            await db.query(`
                INSERT INTO stockmovements 
                (ProductId, UserId, MovementType, Quantity, location_id, warehouse_id, shelf_code, batch_number, expiration_date, RelatedId, Description, supplier_id, unit_price)
                VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                productId,
                finalUserId, // Dynamic valid user ID
                qty,
                validLocationId, // Valid wms_locations id or null
                whId,
                shCode || '',
                bNum || null,
                expDate || null,
                order.id, // RelatedId points to purchase_order id
                'Mal Kabul (Satın Alma Siparişi)',
                order.supplier_id || null,
                order.unit_price || 0
            ]);
        }

        // 4. Update purchase_orders with partial receipt support
        const currentReceived = parseFloat(order.received_quantity) || 0;
        const newTotalReceived = currentReceived + totalReceived;
        const totalOrderQty = parseFloat(order.quantity) || 0;
        const isCompleted = newTotalReceived >= totalOrderQty;

        if (isCompleted) {
            await db.query(`
                UPDATE purchase_orders 
                SET status = 'Depoya Alındı', received_quantity = ? 
                WHERE id = ?
            `, [newTotalReceived, id]);
        } else {
            await db.query(`
                UPDATE purchase_orders 
                SET received_quantity = ? 
                WHERE id = ?
            `, [newTotalReceived, id]);
        }

        // 5. Finans Gider Kaydı (Otomatik)
        if (order.unit_price && order.unit_price > 0 && totalReceived > 0) {
            const totalCost = parseFloat(order.unit_price) * totalReceived;
            let supplierName = 'Bilinmeyen Tedarikçi';
            if (order.supplier_id) {
                const [supRows] = await db.query('SELECT SupplierName FROM suppliers WHERE Id = ?', [order.supplier_id]);
                if (supRows.length > 0) supplierName = supRows[0].SupplierName;
            }
            const desc = `${order.product_name} ürünü için ${supplierName} adlı tedarikçiden ${totalReceived} adet mal kabul yapıldı.`;

            await db.query(`
                INSERT INTO finance_transactions 
                (type, amount, category, description, transaction_date) 
                VALUES ('GİDER', ?, 'Hammadde / Ürün Alımı', ?, CURDATE())
            `, [totalCost, desc]);
        }

        await db.query('COMMIT'); // Commit transaction
        await logActivity(req.user?.id, 'UPDATE', 'purchase_orders', id, `${totalReceived} adet ${order.product_name} için depo mal kabulü yapıldı.`);
        res.json({ success: true, message: isCompleted ? 'Mal kabul başarıyla yapıldı ve sipariş tamamlandı.' : `Kısmi mal kabul yapıldı (${newTotalReceived}/${totalOrderQty} Adet alındı). Kalan ürünler mal kabul bekliyor.` });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error receiving goods:', err);
        res.status(500).json({ success: false, message: 'Mal kabul işlemi sırasında sunucu hatası oluştu.' });
    }
});

module.exports = router;

