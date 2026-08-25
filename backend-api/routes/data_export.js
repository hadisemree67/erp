/**
 * ============================================================================
 * BİLEŞEN ADI: data_export
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
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
        const allWarehouses = await prisma.warehouses.findMany();
        const whMap = {};
        const reverseWhMap = {};
        allWarehouses.forEach(w => {
            whMap[w.id] = w.name;
            reverseWhMap[w.name] = w.id;
        });

        if (module === 'orders') {
            let whereClause = {};
            if (status && status !== 'Tümü') {
                whereClause.OrderStatus = toPrismaStatus(status);
            }
            
            let customerFilter = {};
            if (city && city !== 'Tümü') customerFilter.City = { contains: city };
            if (gender && gender !== 'Tümü') customerFilter.Gender = gender;
            
            if (ageGroup && ageGroup !== 'Tümü') {
                if (ageGroup === '18-') customerFilter.Age = { lt: 18 };
                else if (ageGroup === '18-25') customerFilter.Age = { gte: 18, lte: 25 };
                else if (ageGroup === '26-35') customerFilter.Age = { gte: 26, lte: 35 };
                else if (ageGroup === '36-45') customerFilter.Age = { gte: 36, lte: 45 };
                else if (ageGroup === '45+') customerFilter.Age = { gt: 45 };
            }
            if (Object.keys(customerFilter).length > 0) {
                whereClause.customers = customerFilter;
            }

            const orders = await prisma.orders.findMany({
                where: whereClause,
                include: {
                    customers: true,
                    shippers: true,
                    users_orders_PickerIdTousers: true, // Picker
                    users_orders_PackerIdTousers: true, // Packer
                    orderitems: {
                        include: { products: true }
                    }
                }
            });

            data = orders.map(o => {
                const c = o.customers || {};
                const itemsList = o.orderitems.map(oi => `${oi.Quantity}x ${oi.products?.ProductName || 'Bilinmeyen Ürün'} (${oi.UnitPrice} TL)`).join(' | ');

                return {
                    'Sipariş No': o.OrderNumber,
                    'Tarih': o.OrderDate ? new Date(o.OrderDate).toLocaleDateString('tr-TR') : '-',
                    'Müşteri Adı': c.CustomerName || '-',
                    'Telefon': c.Phone || '-',
                    'E-Posta': c.Email || '-',
                    'Şehir': c.City || '-',
                    'Cinsiyet': c.Gender || '-',
                    'Yaş': c.Age || '-',
                    'Sevk Adresi': o.ShippingAddress || c.Address || '-',
                    'Sipariş Kalemleri': itemsList,
                    'Durum': toFrontendStatus(o.OrderStatus) || '-',
                    'Kargo Firması': o.shippers?.CompanyName || '-',
                    'Kargo Takip No': o.TrackingNumber || '-',
                    'Toplam Tutar': o.TotalAmount ? `${parseFloat(o.TotalAmount).toFixed(2)} TL` : '0.00 TL',
                    'İptal Nedeni (Varsa)': '-', 
                    'Toplayan Personel': o.users_orders_PickerIdTousers?.name || '-',
                    'Paketleyen Personel': o.users_orders_PackerIdTousers?.name || '-'
                };
            });
        }
        else if (module === 'customers') {
            let whereClause = {};
            if (city && city !== 'Tümü') whereClause.City = { contains: city };
            if (gender && gender !== 'Tümü') whereClause.Gender = gender;
            
            if (ageGroup && ageGroup !== 'Tümü') {
                if (ageGroup === '18-') whereClause.Age = { lt: 18 };
                else if (ageGroup === '18-25') whereClause.Age = { gte: 18, lte: 25 };
                else if (ageGroup === '26-35') whereClause.Age = { gte: 26, lte: 35 };
                else if (ageGroup === '36-45') whereClause.Age = { gte: 36, lte: 45 };
                else if (ageGroup === '45+') whereClause.Age = { gt: 45 };
            }

            const customers = await prisma.customers.findMany({
                where: whereClause,
                orderBy: { CustomerName: 'asc' }
            });

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
            const balances = await prisma.wms_stock_balances.findMany({
                include: {
                    products: { include: { product_barcodes: true } }
                }
            });

            let filteredBalances = balances;
            
            if (warehouse && warehouse !== 'Tümü') {
                filteredBalances = filteredBalances.filter(b => whMap[b.warehouse_id] === warehouse);
            }
            if (category && category !== 'Tümü') {
                filteredBalances = filteredBalances.filter(b => b.products?.Category === category);
            }
            if (brand && brand !== 'Tümü') {
                filteredBalances = filteredBalances.filter(b => b.products?.Brand === brand);
            }

            data = filteredBalances.map(b => ({
                'Ürün Kodu': b.product_id,
                'Ürün Adı': b.products?.ProductName || '-',
                'Barkod': b.products?.product_barcodes ? JSON.stringify(b.products.product_barcodes.map(pb => pb.barcode)) : '-',
                'Kategori': b.products?.Category || '-',
                'Depo': whMap[b.warehouse_id] || '-',
                'Raf': b.shelf_code || '-',
                'Parti/Lot': b.batch_number || '-',
                'Miktar': b.quantity || 0,
                'Birim': b.products?.unit_type || '-',
                'SKT': b.expiration_date ? new Date(b.expiration_date).toLocaleDateString('tr-TR') : '-'
            }));
        }
        else if (module === 'products') {
            let whereClause = {};
            
            if (category && category !== 'Tümü') {
                whereClause.Category = category;
            }
            if (brand && brand !== 'Tümü') {
                whereClause.Brand = brand;
            }
            if (warehouse && warehouse !== 'Tümü') {
                const wId = reverseWhMap[warehouse];
                if (wId) {
                    whereClause.wms_stock_balances = { some: { warehouse_id: wId } };
                }
            }

            const products = await prisma.products.findMany({
                where: whereClause,
                include: { product_barcodes: true }
            });

            data = products.map(p => ({
                'Ürün ID': p.Id,
                'Ürün Adı': p.ProductName,
                'Marka': p.Brand,
                'Kategori': p.Category,
                'Barkod': p.product_barcodes ? JSON.stringify(p.product_barcodes.map(pb => pb.barcode)) : '-',
                'Alış Fiyatı': p.PurchasePrice ? `${parseFloat(p.PurchasePrice).toFixed(2)} TL` : '-',
                'Satış Fiyatı': p.SalePrice ? `${parseFloat(p.SalePrice).toFixed(2)} TL` : '-',
                'Stok Miktarı': p.StockQuantity || 0,
                'Birim': p.unit_type || '-',
                'Kritik Stok': p.critical_stock_level || 0
            }));
        }
        else if (module === 'raw_materials') {
            let whereClause = {
                supply_type: 'PURCHASE'
            };

            if (category && category !== 'Tümü') {
                whereClause.Category = category;
            }
            if (brand && brand !== 'Tümü') {
                whereClause.Brand = brand;
            }
            if (warehouse && warehouse !== 'Tümü') {
                const wId = reverseWhMap[warehouse];
                if (wId) {
                    whereClause.wms_stock_balances = { some: { warehouse_id: wId } };
                }
            }

            const products = await prisma.products.findMany({
                where: whereClause,
                include: { product_barcodes: true }
            });

            data = products.map(p => ({
                'Hammadde ID': p.Id,
                'Hammadde Adı': p.ProductName,
                'Kategori': p.Category,
                'Barkod': p.product_barcodes ? JSON.stringify(p.product_barcodes.map(pb => pb.barcode)) : '-',
                'Tedarik Süresi (Gün)': p.lead_time_days || 0,
                'Maliyet': p.PurchasePrice ? `${parseFloat(p.PurchasePrice).toFixed(2)} TL` : '-',
                'Mevcut Stok': p.StockQuantity || 0,
                'Birim': p.unit_type || '-'
            }));
        }
        else if (module === 'employees') {
            let whereClause = {};
            if (department && department !== 'Tümü') {
                whereClause.department = department;
            }

            const emps = await prisma.employees.findMany({
                where: whereClause
            });

            data = emps.map(e => ({
                'ID': e.id,
                'Ad Soyad': e.full_name,
                'TCKN': e.tckn || '-',
                'Departman': e.department || '-',
                'Pozisyon': e.position || '-',
                'Telefon': e.phone || '-',
                'E-Posta': e.email || '-',
                'İşe Giriş Tarihi': e.start_date ? new Date(e.start_date).toLocaleDateString('tr-TR') : '-',
                'Maaş': e.salary ? `${parseFloat(e.salary).toFixed(2)} TL` : '-',
                'Çalışma Durumu': e.work_status || '-'
            }));
        }
        else if (module === 'users') {
            let whereClause = {};
            if (filterKey === 'role' && filterValue && filterValue !== 'Tümü') {
                whereClause.role = filterValue;
            }

            const users = await prisma.users.findMany({
                where: whereClause
            });

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

