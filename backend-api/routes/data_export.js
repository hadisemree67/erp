/**
 * ============================================================================
 * BİLEŞEN ADI: data_export
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { toPrismaStatus, toFrontendStatus } = require('../utils/enumMapper');

// GET /api/data-export
// Query params:
// - module: 'orders', 'stock', 'products', 'raw_materials', 'employees', 'users'
// - filterKey: e.g. 'status', 'warehouse'
// - filterValue: e.g. 'Teslim Edildi', 'Depo 1'

const authMiddleware = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

router.get('/', authMiddleware, checkPermission('view_reports'), async (req, res) => {
    try {
        const { module, status, warehouse, category, brand, department, city, gender, ageGroup, filterKey, filterValue } = req.query;
        let data = [];

        // Pre-fetch warehouses for potential filtering in multiple modules
        const [allWarehouses] = await db.query('SELECT * FROM warehouses');
        const whMap = {};
        const reverseWhMap = {};
        allWarehouses.forEach(w => {
            whMap[w.id] = w.name;
            reverseWhMap[w.name] = w.id;
        });

        if (module === 'orders') {
            let whereClause = "1=1";
            let params = [];

            if (status && status !== 'Tümü') {
                whereClause += " AND o.OrderStatus = ?";
                params.push(toPrismaStatus(status));
            }
            
            if (city && city !== 'Tümü') {
                whereClause += " AND c.City LIKE ?";
                params.push(`%${city}%`);
            }
            if (gender && gender !== 'Tümü') {
                whereClause += " AND c.Gender = ?";
                params.push(gender);
            }
            
            if (ageGroup && ageGroup !== 'Tümü') {
                if (ageGroup === '18-') { whereClause += " AND c.Age < ?"; params.push(18); }
                else if (ageGroup === '18-25') { whereClause += " AND c.Age >= ? AND c.Age <= ?"; params.push(18, 25); }
                else if (ageGroup === '26-35') { whereClause += " AND c.Age >= ? AND c.Age <= ?"; params.push(26, 35); }
                else if (ageGroup === '36-45') { whereClause += " AND c.Age >= ? AND c.Age <= ?"; params.push(36, 45); }
                else if (ageGroup === '45+') { whereClause += " AND c.Age > ?"; params.push(45); }
            }

            const [orders] = await db.query(`
                SELECT o.*, 
                       c.CustomerName as c_name, c.Phone as c_phone, c.Email as c_email, c.City as c_city, c.Gender as c_gender, c.Age as c_age, c.Address as c_address,
                       s.CompanyName as s_name,
                       u1.name as picker_name, u2.name as packer_name,
                       (
                           SELECT JSON_ARRAYAGG(
                               JSON_OBJECT('Quantity', oi.Quantity, 'UnitPrice', oi.UnitPrice, 'ProductName', p.ProductName)
                           ) 
                           FROM orderitems oi 
                           LEFT JOIN products p ON oi.ProductId = p.Id 
                           WHERE oi.OrderId = o.Id
                       ) as orderitems
                FROM orders o
                LEFT JOIN customers c ON o.CustomerId = c.Id
                LEFT JOIN shippers s ON o.ShipperId = s.Id
                LEFT JOIN users u1 ON o.PickerId = u1.id
                LEFT JOIN users u2 ON o.PackerId = u2.id
                WHERE ${whereClause}
            `, params);

            data = orders.map(o => {
                let itemsList = '-';
                if (o.orderitems && typeof o.orderitems === 'string') {
                    try {
                        const parsed = JSON.parse(o.orderitems);
                        itemsList = parsed.map(oi => `${oi.Quantity}x ${oi.ProductName || 'Bilinmeyen Ürün'} (${oi.UnitPrice} TL)`).join(' | ');
                    } catch(e){}
                }

                return {
                    'Sipariş No': o.OrderNumber,
                    'Tarih': o.OrderDate ? new Date(o.OrderDate).toLocaleDateString('tr-TR') : '-',
                    'Müşteri Adı': o.c_name || '-',
                    'Telefon': o.c_phone || '-',
                    'E-Posta': o.c_email || '-',
                    'Şehir': o.c_city || '-',
                    'Cinsiyet': o.c_gender || '-',
                    'Yaş': o.c_age || '-',
                    'Sevk Adresi': o.ShippingAddress || o.c_address || '-',
                    'Sipariş Kalemleri': itemsList,
                    'Durum': toFrontendStatus(o.OrderStatus) || '-',
                    'Kargo Firması': o.s_name || '-',
                    'Kargo Takip No': o.TrackingNumber || '-',
                    'Toplam Tutar': o.TotalAmount ? `${parseFloat(o.TotalAmount).toFixed(2)} TL` : '0.00 TL',
                    'İptal Nedeni (Varsa)': '-', 
                    'Toplayan Personel': o.picker_name || '-',
                    'Paketleyen Personel': o.packer_name || '-'
                };
            });
        }
        else if (module === 'customers') {
            let whereClause = "1=1";
            let params = [];

            if (city && city !== 'Tümü') { whereClause += " AND City LIKE ?"; params.push(`%${city}%`); }
            if (gender && gender !== 'Tümü') { whereClause += " AND Gender = ?"; params.push(gender); }
            
            if (ageGroup && ageGroup !== 'Tümü') {
                if (ageGroup === '18-') { whereClause += " AND Age < ?"; params.push(18); }
                else if (ageGroup === '18-25') { whereClause += " AND Age >= ? AND Age <= ?"; params.push(18, 25); }
                else if (ageGroup === '26-35') { whereClause += " AND Age >= ? AND Age <= ?"; params.push(26, 35); }
                else if (ageGroup === '36-45') { whereClause += " AND Age >= ? AND Age <= ?"; params.push(36, 45); }
                else if (ageGroup === '45+') { whereClause += " AND Age > ?"; params.push(45); }
            }

            const [customers] = await db.query(`SELECT * FROM customers WHERE ${whereClause} ORDER BY CustomerName ASC`, params);

            data = customers.map(c => ({
                'Müşteri ID': c.Id,
                'Müşteri Adı': c.CustomerName || '-',
                'Telefon': c.Phone || '-',
                'E-Posta': c.Email || '-',
                'Şehir': c.City || '-',
                'Cinsiyet': c.Gender || '-',
                'Yaş': c.Age || '-',
                'Adres': c.Address || '-'
            }));
        } 
        else if (module === 'stock') {
            const [balances] = await db.query(`
                SELECT b.*, p.ProductName, p.Category, p.Brand, p.unit_type, p.expiration_date as p_exp,
                       (SELECT JSON_ARRAYAGG(pb.barcode) FROM product_barcodes pb WHERE pb.product_id = p.Id) as barcodes
                FROM wms_stock_balances b
                LEFT JOIN products p ON b.product_id = p.Id
            `);

            let filteredBalances = balances;
            
            if (warehouse && warehouse !== 'Tümü') {
                filteredBalances = filteredBalances.filter(b => whMap[b.warehouse_id] === warehouse);
            }
            if (category && category !== 'Tümü') {
                filteredBalances = filteredBalances.filter(b => b.Category === category);
            }
            if (brand && brand !== 'Tümü') {
                filteredBalances = filteredBalances.filter(b => b.Brand === brand);
            }

            data = filteredBalances.map(b => {
                let barcodesList = '-';
                if (b.barcodes) {
                    try { barcodesList = JSON.parse(b.barcodes).join(', '); } catch(e){}
                }
                return {
                    'Ürün Kodu': b.product_id,
                    'Ürün Adı': b.ProductName || '-',
                    'Barkod': barcodesList,
                    'Kategori': b.Category || '-',
                    'Depo': whMap[b.warehouse_id] || '-',
                    'Raf': b.shelf_code || '-',
                    'Parti/Lot': b.batch_number || '-',
                    'Miktar': b.quantity || 0,
                    'Birim': b.unit_type || '-',
                    'SKT': b.expiration_date ? new Date(b.expiration_date).toLocaleDateString('tr-TR') : '-'
                };
            });
        }
        else if (module === 'products') {
            let whereClause = "1=1";
            let params = [];
            
            if (category && category !== 'Tümü') {
                whereClause += " AND p.Category = ?"; params.push(category);
            }
            if (brand && brand !== 'Tümü') {
                whereClause += " AND p.Brand = ?"; params.push(brand);
            }
            if (warehouse && warehouse !== 'Tümü') {
                const wId = reverseWhMap[warehouse];
                if (wId) {
                    whereClause += " AND EXISTS (SELECT 1 FROM wms_stock_balances b WHERE b.product_id = p.Id AND b.warehouse_id = ?)";
                    params.push(wId);
                }
            }

            const [products] = await db.query(`
                SELECT p.*,
                       (SELECT JSON_ARRAYAGG(pb.barcode) FROM product_barcodes pb WHERE pb.product_id = p.Id) as barcodes
                FROM products p
                WHERE ${whereClause}
            `, params);

            data = products.map(p => {
                let barcodesList = '-';
                if (p.barcodes) {
                    try { barcodesList = JSON.parse(p.barcodes).join(', '); } catch(e){}
                }
                return {
                    'Ürün ID': p.Id,
                    'Ürün Adı': p.ProductName,
                    'Marka': p.Brand,
                    'Kategori': p.Category,
                    'Barkod': barcodesList,
                    'Alış Fiyatı': p.PurchasePrice ? `${parseFloat(p.PurchasePrice).toFixed(2)} TL` : '-',
                    'Satış Fiyatı': p.SalePrice ? `${parseFloat(p.SalePrice).toFixed(2)} TL` : '-',
                    'Stok Miktarı': p.StockQuantity || 0,
                    'Birim': p.unit_type || '-',
                    'Kritik Stok': p.critical_stock_level || 0
                };
            });
        }
        else if (module === 'raw_materials') {
            let whereClause = "p.supply_type = 'PURCHASE'";
            let params = [];

            if (category && category !== 'Tümü') {
                whereClause += " AND p.Category = ?"; params.push(category);
            }
            if (brand && brand !== 'Tümü') {
                whereClause += " AND p.Brand = ?"; params.push(brand);
            }
            if (warehouse && warehouse !== 'Tümü') {
                const wId = reverseWhMap[warehouse];
                if (wId) {
                    whereClause += " AND EXISTS (SELECT 1 FROM wms_stock_balances b WHERE b.product_id = p.Id AND b.warehouse_id = ?)";
                    params.push(wId);
                }
            }

            const [products] = await db.query(`
                SELECT p.*,
                       (SELECT JSON_ARRAYAGG(pb.barcode) FROM product_barcodes pb WHERE pb.product_id = p.Id) as barcodes
                FROM products p
                WHERE ${whereClause}
            `, params);

            data = products.map(p => {
                let barcodesList = '-';
                if (p.barcodes) {
                    try { barcodesList = JSON.parse(p.barcodes).join(', '); } catch(e){}
                }
                return {
                    'Hammadde ID': p.Id,
                    'Hammadde Adı': p.ProductName,
                    'Kategori': p.Category,
                    'Barkod': barcodesList,
                    'Tedarik Süresi (Gün)': p.lead_time_days || 0,
                    'Maliyet': p.PurchasePrice ? `${parseFloat(p.PurchasePrice).toFixed(2)} TL` : '-',
                    'Mevcut Stok': p.StockQuantity || 0,
                    'Birim': p.unit_type || '-'
                };
            });
        }
        else if (module === 'employees') {
            let whereClause = "1=1";
            let params = [];
            if (department && department !== 'Tümü') {
                whereClause += " AND department = ?"; params.push(department);
            }

            const [emps] = await db.query(`SELECT * FROM employees WHERE ${whereClause}`, params);

            // GÜVENLİK (KVKK & Maaş Gizliliği): Sadece admin veya İK yetkisi olanlar açık maaş ve TCKN görebilir
            const canSeeSensitiveData = req.user && (
                req.user.role === 'admin' || 
                req.user.role === 'İK' || 
                (Array.isArray(req.user.permissions) && (
                    req.user.permissions.includes('employee_edit') || 
                    req.user.permissions.includes('staff_manage')
                ))
            );

            const formatTckn = (tckn) => {
                if (!tckn || tckn === '-') return '-';
                if (canSeeSensitiveData) return tckn;
                const str = String(tckn);
                if (str.length <= 4) return '***';
                return str.slice(0, 3) + '******' + str.slice(-2);
            };

            const formatSalary = (salary) => {
                if (!salary) return '-';
                if (canSeeSensitiveData) return `${parseFloat(salary).toFixed(2)} TL`;
                return '*** TL (Yetki Kısıtlı)';
            };

            data = emps.map(e => ({
                'ID': e.id,
                'Ad Soyad': e.full_name,
                'TCKN': formatTckn(e.tckn),
                'Departman': e.department || '-',
                'Pozisyon': e.position || '-',
                'Telefon': e.phone || '-',
                'E-Posta': e.email || '-',
                'İşe Giriş Tarihi': e.start_date ? new Date(e.start_date).toLocaleDateString('tr-TR') : '-',
                'Maaş': formatSalary(e.salary),
                'Çalışma Durumu': e.work_status || '-'
            }));
        }
        else if (module === 'users') {
            let whereClause = "1=1";
            let params = [];
            if (filterKey === 'role' && filterValue && filterValue !== 'Tümü') {
                whereClause += " AND role = ?"; params.push(filterValue);
            }

            const [users] = await db.query(`SELECT * FROM users WHERE ${whereClause}`, params);

            data = users.map(u => ({
                'ID': u.id,
                'Kullanıcı Adı': u.username || '-',
                'Ad Soyad': u.name,
                'E-Posta': u.email,
                'Rol': u.role || '-',
                'Kayıt Tarihi': u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '-',
                'Aktif Mi': u.is_active ? 'Evet' : 'Hayır'
            }));
        }
        else {
            return res.status(400).json({ success: false, message: 'Geçersiz modül seçimi.' });
        }

        res.json({
            success: true,
            data: data
        });

    } catch (err) {
        console.error('Export Data error:', err);
        res.status(500).json({ success: false, message: 'Rapor verisi alınırken hata oluştu.' });
    }
});

module.exports = router;
