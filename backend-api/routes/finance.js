/*
 * ÖZET:
 * Bu modül, uygulamanın gelir ve gider hesaplamalarını yönetir. Manüel eklenen 
 * harcamaları ve sistem tarafından otomatik hesaplanan maaş/tedarik giderlerini sunar.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Yardımcı fonksiyonlar
const safeNum = (val, def = 0) => {
    const n = Number(val);
    return isNaN(n) ? def : n;
};

// GET /api/finance/accounts?tab=GİDER (veya GELİR)
router.get('/accounts', authMiddleware, async (req, res) => {
    try {
        const tab = req.query.tab || 'GİDER';
        const period = req.query.period || 'this_month';

        let dateConditionTx = "1=1";
        let dateConditionPO = "1=1";
        let dateConditionWMS = "1=1";

        if (period === 'this_month') {
            dateConditionTx = "transaction_date >= DATE_FORMAT(NOW(), '%Y-%m-01')";
            dateConditionPO = "DATE(po.created_at) >= DATE_FORMAT(NOW(), '%Y-%m-01')";
            dateConditionWMS = "DATE(b.last_counted_at) >= DATE_FORMAT(NOW(), '%Y-%m-01')";
        } else if (period === 'last_3_months') {
            dateConditionTx = "transaction_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)";
            dateConditionPO = "DATE(po.created_at) >= DATE_SUB(NOW(), INTERVAL 3 MONTH)";
            dateConditionWMS = "DATE(b.last_counted_at) >= DATE_SUB(NOW(), INTERVAL 3 MONTH)";
        } else if (period === 'last_6_months') {
            dateConditionTx = "transaction_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
            dateConditionPO = "DATE(po.created_at) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
            dateConditionWMS = "DATE(b.last_counted_at) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)";
        } else if (period === 'this_year') {
            dateConditionTx = "transaction_date >= DATE_FORMAT(NOW(), '%Y-01-01')";
            dateConditionPO = "DATE(po.created_at) >= DATE_FORMAT(NOW(), '%Y-01-01')";
            dateConditionWMS = "DATE(b.last_counted_at) >= DATE_FORMAT(NOW(), '%Y-01-01')";
        }

        // 1) Toplam Gelirleri hesapla
        const [incRows] = await db.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM finance_transactions WHERE type = 'GELİR' AND ${dateConditionTx}`);
        const totalIncome = safeNum(incRows[0].total);

        if (tab === 'GİDER') {
            // --- A) MANUEL GİDERLER (finance_transactions) ---
            const [manRows] = await db.query(`SELECT * FROM finance_transactions WHERE type = 'GİDER' AND ${dateConditionTx} ORDER BY transaction_date DESC, id DESC`);
            let manualTotal = 0;
            const manualExpenses = manRows.map(row => {
                const amt = safeNum(row.amount);
                manualTotal += amt;
                return {
                    id: `man_${row.id}`,
                    raw_id: row.id,
                    type: 'MANUAL',
                    category: row.category || 'Diğer Giderler',
                    title: row.description || row.category || 'Gider Kalemi',
                    subtitle: 'Manuel Eklenen Gider Kalemi',
                    amount: amt,
                    date: row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ''),
                    badge: '📌 Manuel Gider',
                    color: '#64748b',
                    is_manual: true
                };
            });

            // --- B) OTOMATİK PERSONEL MAAŞLARI (employees) ---
            const [empRows] = await db.query(`
                SELECT e.id, e.full_name, e.department, e.position, e.salary, e.work_status,
                       COALESCE(SUM(o.total_amount), 0) AS current_month_overtime
                FROM employees e
                LEFT JOIN employee_overtimes o ON e.id = o.employee_id 
                                               AND o.month = MONTH(CURRENT_DATE()) 
                                               AND o.year = YEAR(CURRENT_DATE())
                WHERE e.work_status IN ('Çalışıyor', 'Aktif', 'İzinli') AND e.salary > 0
                GROUP BY e.id
            `);
            let salaryTotal = 0;
            const salaryExpenses = empRows.map(emp => {
                const baseSalary = safeNum(emp.salary);
                const overtime = safeNum(emp.current_month_overtime);
                const amt = baseSalary + overtime;
                salaryTotal += amt;
                
                let subtitleStr = `${emp.department || 'Genel'} — ${emp.position || 'Personel'} (Maaş: ${baseSalary.toLocaleString('tr-TR')} ₺`;
                if (overtime > 0) subtitleStr += ` + Mesai: ${overtime.toLocaleString('tr-TR')} ₺`;
                subtitleStr += `)`;

                return {
                    id: `emp_${emp.id}`,
                    raw_id: emp.id,
                    type: 'SALARY',
                    category: 'Personel Maaşı',
                    title: `${emp.full_name}`,
                    subtitle: subtitleStr,
                    amount: amt,
                    date: new Date().toISOString().split('T')[0],
                    badge: '👥 İK - Mesaili Maaş (Tahmini)',
                    color: '#0284c7',
                    is_manual: false
                };
            });

            // --- C) OTOMATİK MALZEME TEDARİK MALIYETLERİ (purchase_orders + products + suppliers) ---
            const [poRows] = await db.query(`
                SELECT po.id, po.product_name, po.quantity, po.received_quantity, po.unit_price, po.total_price, po.created_at, po.status, s.SupplierName as supplier_name, s.Address as supplier_address, s.Phone as supplier_phone, s.ContactPerson as supplier_contact, p.PurchasePrice as default_price, p.unit_type as unit_type, p.Id as product_code
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.Id
                LEFT JOIN products p ON po.product_name = p.ProductName
                WHERE po.status != 'İptal' AND ${dateConditionPO}
                ORDER BY po.id DESC
            `);
            let procurementTotal = 0;
            const procurementExpenses = poRows.map(po => {
                const uPrice = (po.unit_price && safeNum(po.unit_price) > 0) ? safeNum(po.unit_price) : safeNum(po.default_price);
                const qty = (po.received_quantity && safeNum(po.received_quantity) > 0) ? safeNum(po.received_quantity) : safeNum(po.quantity);
                const tCost = (po.total_price && safeNum(po.total_price) > 0) ? safeNum(po.total_price) : (uPrice * qty);
                
                procurementTotal += tCost;
                return {
                    id: `po_${po.id}`,
                    raw_id: po.id,
                    type: 'PROCUREMENT',
                    category: 'Malzeme Siparişi / Tedariki',
                    title: po.product_name,
                    subtitle: `Tedarikçi: ${po.supplier_name || 'Belirtilmemiş'} (${qty.toLocaleString('tr-TR')} ${po.unit_type || 'Adet'} × ${uPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ Birim Maliyeti)`,
                    amount: tCost,
                    date: po.created_at ? new Date(po.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    badge: '📦 WMS - Malzeme Tedariki',
                    color: '#d97706',
                    status: po.status,
                    is_manual: false,
                    supplier_name: po.supplier_name,
                    supplier_address: po.supplier_address,
                    supplier_phone: po.supplier_phone,
                    supplier_contact: po.supplier_contact,
                    unit_price: uPrice,
                    quantity: qty,
                    unit_type: po.unit_type || 'Adet',
                    product_code: po.product_code ? `PRD-${po.product_code}` : `STK-${po.id}`
                };
            });

            // --- C2) DEPO STOK MALİYET GİRİŞLERİ (wms_stock_balances) ---
            const [wmsRows] = await db.query(`
                SELECT b.id, b.product_id, b.quantity, b.unit_price, b.last_counted_at, p.ProductName, p.unit_type as unit_type, p.Id as product_code, s.SupplierName as supplier_name, s.Address as supplier_address, s.Phone as supplier_phone, s.ContactPerson as supplier_contact, w.name as warehouse_name
                FROM wms_stock_balances b
                JOIN products p ON b.product_id = p.id
                LEFT JOIN suppliers s ON b.supplier_id = s.Id
                LEFT JOIN warehouses w ON b.warehouse_id = w.id
                WHERE b.unit_price > 0 AND b.quantity > 0 AND ${dateConditionWMS}
                ORDER BY b.id DESC
            `);
            const wmsProcurementExpenses = wmsRows.map(b => {
                const uPrice = safeNum(b.unit_price);
                const qty = safeNum(b.quantity);
                const tCost = uPrice * qty;
                procurementTotal += tCost;
                return {
                    id: `wms_${b.id}`,
                    raw_id: b.id,
                    type: 'PROCUREMENT',
                    category: 'Malzeme Siparişi / Depo Stok Gideri',
                    title: `${b.ProductName} (${b.warehouse_name || 'Depo'})`,
                    subtitle: `Tedarikçi: ${b.supplier_name || 'Genel Stok'} (${qty.toLocaleString('tr-TR')} ${b.unit_type || 'Adet'} × ${uPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺ Birim Maliyeti)`,
                    amount: tCost,
                    date: b.last_counted_at ? new Date(b.last_counted_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    badge: '🏭 Depo Malzeme Girişi',
                    color: '#b45309',
                    status: 'Depoda Mevcut',
                    is_manual: false,
                    supplier_name: b.supplier_name || 'Genel Stok',
                    supplier_address: b.supplier_address,
                    supplier_phone: b.supplier_phone,
                    supplier_contact: b.supplier_contact,
                    unit_price: uPrice,
                    quantity: qty,
                    unit_type: b.unit_type || 'Adet',
                    product_code: b.product_code ? `PRD-${b.product_code}` : `STK-${b.product_id}`
                };
            });

            // Tüm giderleri birleştir, tutarı 0 olanları filtrele ve tarihe göre yeniden eskiye sırala
            const allExpenses = [...manualExpenses, ...salaryExpenses, ...procurementExpenses, ...wmsProcurementExpenses]
                .filter(exp => exp.amount > 0)
                .sort((a, b) => {
                    return new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01');
                });

            const totalExpense = manualTotal + salaryTotal + procurementTotal;
            const netBalance = totalIncome - totalExpense;

            return res.json({
                success: true,
                summary: {
                    totalExpense,
                    manualTotal,
                    salaryTotal,
                    procurementTotal,
                    totalIncome,
                    netBalance
                },
                data: allExpenses
            });

        } else {
            // --- GELİRLER SEKME VERİSİ ---
            const [manRows] = await db.query("SELECT * FROM finance_transactions WHERE type = 'GELİR' ORDER BY transaction_date DESC, id DESC");
            let manualIncomeTotal = 0;
            const manualIncomes = manRows.map(row => {
                const amt = safeNum(row.amount);
                manualIncomeTotal += amt;
                return {
                    id: `man_${row.id}`,
                    raw_id: row.id,
                    type: 'MANUAL',
                    category: row.category || 'Diğer Gelirler',
                    title: row.description || row.category || 'Gelir Kalemi',
                    subtitle: 'Manuel Eklenen Gelir Kalemi',
                    amount: amt,
                    date: row.transaction_date ? new Date(row.transaction_date).toISOString().split('T')[0] : (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ''),
                    badge: '💰 Manuel Gelir',
                    color: '#16a34a',
                    is_manual: true
                };
            });

            // Toplam giderleri de hesaplayalım ki özet bilgisi tutarlı olsun
            const [manExp] = await db.query("SELECT COALESCE(SUM(amount), 0) as tot FROM finance_transactions WHERE type = 'GİDER'");
            const [empExp] = await db.query("SELECT COALESCE(SUM(salary), 0) as tot FROM employees WHERE work_status IN ('Çalışıyor', 'Aktif', 'İzinli') AND salary > 0");
            const [poRows] = await db.query(`
                SELECT po.quantity, po.received_quantity, po.unit_price, po.total_price, p.PurchasePrice as default_price
                FROM purchase_orders po
                LEFT JOIN products p ON po.product_name = p.ProductName
                WHERE po.status != 'İptal'
            `);
            let procExpTot = 0;
            poRows.forEach(po => {
                const uPrice = (po.unit_price && safeNum(po.unit_price) > 0) ? safeNum(po.unit_price) : safeNum(po.default_price);
                const qty = (po.received_quantity && safeNum(po.received_quantity) > 0) ? safeNum(po.received_quantity) : safeNum(po.quantity);
                const tCost = (po.total_price && safeNum(po.total_price) > 0) ? safeNum(po.total_price) : (uPrice * qty);
                procExpTot += tCost;
            });

            const [wmsRows] = await db.query(`SELECT COALESCE(SUM(quantity * unit_price), 0) as tot FROM wms_stock_balances WHERE unit_price > 0 AND quantity > 0`);
            procExpTot += safeNum(wmsRows[0].tot);

            const totalExpense = safeNum(manExp[0].tot) + safeNum(empExp[0].tot) + procExpTot;
            const netBalance = totalIncome - totalExpense;

            return res.json({
                success: true,
                summary: {
                    totalExpense,
                    manualTotal: safeNum(manExp[0].tot),
                    salaryTotal: safeNum(empExp[0].tot),
                    procurementTotal: procExpTot,
                    totalIncome,
                    netBalance
                },
                data: manualIncomes.filter(inc => inc.amount > 0)
            });
        }
    } catch (error) {
        console.error('Finans hesapları listelenirken hata:', error);
        res.status(500).json({ success: false, message: 'Finans verileri alınamadı.' });
    }
});

// POST /api/finance/transactions - Yeni Manüel Gelir / Gider Ekle
router.post('/transactions', authMiddleware, async (req, res) => {
    try {
        const { type, category, amount, description, transaction_date } = req.body;
        
        if (!type || !amount || safeNum(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Lütfen geçerli bir işlem türü ve tutar giriniz.' });
        }

        const dateVal = transaction_date || new Date().toISOString().split('T')[0];
        const catVal = category || (type === 'GİDER' ? 'Diğer Giderler' : 'Diğer Gelirler');
        const descVal = description || catVal;

        const [result] = await db.query(`
            INSERT INTO finance_transactions (bank_account_id, type, amount, category, description, transaction_date)
            VALUES (NULL, ?, ?, ?, ?, ?)
        `, [type, safeNum(amount), catVal, descVal, dateVal]);

        // Sistem loglarına ekle
        try {
            const logMsg = `Yeni ${type === 'GİDER' ? 'Gider' : 'Gelir'} kalemi eklendi: ${catVal} - ${safeNum(amount).toLocaleString('tr-TR')} ₺`;
            await logActivity(req.user?.id, 'INSERT', 'finance_transactions', result.insertId, logMsg, null);
        } catch (logErr) { console.warn('Aktivite loglanırken hata:', logErr.message); }

        res.json({ success: true, message: `${type === 'GİDER' ? 'Gider' : 'Gelir'} kalemi başarıyla kaydedildi.` });
    } catch (error) {
        console.error('Finans işlemi eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'İşlem kaydedilirken bir sunucu hatası oluştu.' });
    }
});

// DELETE /api/finance/transactions/:id - Manüel İşlemi Sil
router.delete('/transactions/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query("SELECT * FROM finance_transactions WHERE id = ?", [id]);
        const oldData = rows.length > 0 ? rows[0] : null;

        await db.query("DELETE FROM finance_transactions WHERE id = ?", [id]);

        if (oldData) {
            const logMsg = `"${oldData.description || oldData.category}" başlıklı ${oldData.type === 'GİDER' ? 'Gider' : 'Gelir'} işlemi silindi (${safeNum(oldData.amount).toLocaleString('tr-TR')} ₺).`;
            await logActivity(req.user?.id, 'DELETE', 'finance_transactions', id, logMsg, oldData);
        }

        res.json({ success: true, message: 'İşlem başarıyla silindi.' });
    } catch (error) {
        console.error('Finans işlemi silinirken hata:', error);
        res.status(500).json({ success: false, message: 'İşlem silinemedi.' });
    }
});

module.exports = router;
