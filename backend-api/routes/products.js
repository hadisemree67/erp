/**
 * ============================================================================
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki tüm ürünlerin (hammadde, mamul, paketli ürünler) eklenmesi, 
 *   düzenlenmesi, vitrine çıkarılması ve stok durumlarının hesaplanması işlemlerini 
 *   yürüten API rotalarıdır. Resim yükleme ve tedarikçi eşleştirmesi gibi alt 
 *   bağlantılar da bu dosyada işlenir.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkRole, checkPermission } = require('../middleware/rbac');
const { logActivity } = require('../utils/logger');
const multer = require('multer');
const path = require('path');

// Multer (dosya yükleme) depolama ayarları
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // GÜVENLİK: Kriptografik UUID kullanımı ve uzantı sanitizasyonu
        const crypto = require('crypto');
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
        cb(null, 'product-' + crypto.randomUUID() + ext);
    }
});

// GÜVENLİK: Arbitrary File Upload (Rastgele Dosya Yükleme) zafiyetini önlemek için sadece resimlere izin verildi
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Desteklenmeyen dosya formatı. Sadece resim dosyaları yüklenebilir.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB sınır
});

const safeFloat = (val, defaultVal = 0) => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (Array.isArray(val)) val = val[val.length - 1];
    const n = parseFloat(val);
    return isNaN(n) ? defaultVal : n;
};

const safeInt = (val, defaultVal = 0) => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (Array.isArray(val)) val = val[val.length - 1];
    const n = parseInt(val, 10);
    return isNaN(n) ? defaultVal : n;
};

const parseStackable = (val, defaultVal = 0) => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (Array.isArray(val)) val = val[val.length - 1];
    return (val === '1' || val === 1 || val === 'true' || val === true) ? 1 : 0;
};

// ===========================
// [GET] Vitrin Ürünlerini Listeleme (Herkese Açık)
// Web sitesi ve müşteri panelinde aktif ürünleri (kategori, marka vb. filtrelere göre) listeler. Güncel mevcut stoğu hesaplar.
// ===========================
router.get('/public', async (req, res) => {
    try {
        const { category, subcategory, subtitle, brand } = req.query;

        let queryStr = `
            SELECT Id, ProductName, ProductCode, FeaturedFeatures, Brand, Category, SalePrice, Description, ImagePath, web_categories, web_subcategories, web_subtitles, Highlights, is_bestseller,
            (COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = products.Id), products.StockQuantity) - 
             COALESCE((SELECT SUM(quantity) FROM cart_reservations WHERE product_id = products.Id AND expires_at > NOW()), 0) -
             COALESCE((SELECT SUM(oi.Quantity) FROM orderitems oi JOIN orders o ON oi.OrderId = o.Id WHERE oi.ProductId = products.Id AND o.OrderStatus IN ('Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Toplamada', 'İptal Bekliyor')), 0)) AS AvailableStock
            FROM products 
            WHERE is_active = 1 
              AND Category NOT IN ('Hammadde', 'Malzeme')
        `;
        const params = [];

        if (brand) {
            queryStr += ` AND Brand = ?`;
            params.push(brand);
        }

        if (category) {
            queryStr += ` AND (web_categories LIKE ? OR Category = ?)`;
            params.push(`%"${category}"%`, category);
        }
        if (subcategory) {
            queryStr += ` AND web_subcategories LIKE ?`;
            params.push(`%"${subcategory}"%`);
        }
        if (subtitle) {
            queryStr += ` AND web_subtitles LIKE ?`;
            params.push(`%"${subtitle}"%`);
        }

        queryStr += ` ORDER BY Id DESC`;

        console.log("EXECUTING QUERY:", queryStr, params);

        const [rows] = await db.query(queryStr, params);
        
        // ImagePath JSON parse
        const productsWithParsedImages = rows.map(product => {
            let images = [];
            try {
                if (product.ImagePath) {
                    images = JSON.parse(product.ImagePath);
                }
            } catch (e) {
                if (product.ImagePath) images = [product.ImagePath];
            }
            return {
                ...product,
                images: images
            };
        });

        res.json({ success: true, data: productsWithParsedImages });
    } catch (error) {
        console.error('Public ürünler listelenirken hata:', error);
        res.status(500).json({ success: false, message: 'Ürünler getirilirken sunucu hatası oluştu.' });
    }
});

// ===========================
// [GET] Tekil Ürün Detayı Getirme (Herkese Açık)
// Web sitesinde ürün detay sayfasına girildiğinde seçilen ürünün tüm bilgilerini (resimler, güncel stok, özellikler vb.) getirir.
// ===========================
router.get('/public/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Ürün ID.' });
    try {
        const [rows] = await db.query(`
            SELECT Id, ProductName, ProductCode, FeaturedFeatures, Brand, Category, SalePrice, Description, ImagePath, web_categories, web_subcategories, web_subtitles, FeaturesImage, FeaturesBgColor, FeaturesTextColor, WhoCanUse, HowToUse, BannerSlogan, BannerLogo, CircularFeatures, CalloutText, Highlights, is_bestseller,
            (COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = products.Id), products.StockQuantity) - 
             COALESCE((SELECT SUM(quantity) FROM cart_reservations WHERE product_id = products.Id AND expires_at > NOW()), 0) -
             COALESCE((SELECT SUM(oi.Quantity) FROM orderitems oi JOIN orders o ON oi.OrderId = o.Id WHERE oi.ProductId = products.Id AND o.OrderStatus IN ('Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Toplamada', 'İptal Bekliyor')), 0)) AS AvailableStock
            FROM products 
            WHERE Id = ? AND is_active = 1 AND Category NOT IN ('Hammadde', 'Malzeme')
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı veya pasif durumda.' });
        }

        const product = rows[0];
        let images = [];
        try {
            if (product.ImagePath) {
                images = JSON.parse(product.ImagePath);
            }
        } catch (e) {
            if (product.ImagePath) images = [product.ImagePath];
        }
        const [barcodeRows] = await db.query('SELECT barcode FROM product_barcodes WHERE product_id = ?', [product.Id]);
        product.Barcode = barcodeRows.map(b => b.barcode);
        product.images = images;

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Public ürün detayı getirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Ürün getirilirken sunucu hatası oluştu.' });
    }
});

// ===========================
// [GET] Tüm Ürünleri Listeleme (Yönetim Paneli)
// Depo veya üretim personelinin sistemi yönetirken kullanacağı tüm ürün listesini detaylarıyla çeker. (Tedarikçiler ve raf lokasyonları dahildir.)
// ===========================
router.get('/', authMiddleware, checkPermission('view_products'), async (req, res) => {
    try {
        // Ürünleri çekerken, WMS (Depo) sistemindeki raf stoklarını (wms_stock_balances) topluyoruz.
        // Eğer ürünün WMS'te hiçbir hareketi yoksa (yeni eklenmişse), 'COALESCE' kullanarak
        // ürün eklerken girilen başlangıç stoğunu (p.StockQuantity) baz alıyoruz.
        const [rows] = await db.query(`
            SELECT p.*, 
            COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = p.Id), p.StockQuantity) AS StockQuantity,
            (COALESCE((SELECT SUM(quantity) FROM wms_stock_balances WHERE product_id = p.Id), p.StockQuantity) - 
             COALESCE((SELECT SUM(quantity) FROM cart_reservations WHERE product_id = p.Id AND expires_at > NOW()), 0) -
             COALESCE((SELECT SUM(oi.Quantity) FROM orderitems oi JOIN orders o ON oi.OrderId = o.Id WHERE oi.ProductId = p.Id AND o.OrderStatus IN ('Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Toplamada', 'İptal Bekliyor')), 0)) AS AvailableStock
            FROM products p ORDER BY p.Id DESC
        `);

        // Ürünlere ait tedarikçi bilgilerini (ürünü kimden alıyoruz) çekiyoruz.
        const [suppliers] = await db.query('SELECT ps.*, s.SupplierName FROM product_suppliers ps LEFT JOIN suppliers s ON ps.supplier_id = s.Id');

        // Çektiğimiz tedarikçileri, ilgili ürünlerin altına bir dizi (array) olarak eşleştirip ekliyoruz.
        // Aynı zamanda raf/depo konumlarını da ekliyoruz.
        const [locations] = await db.query(`
            SELECT b.product_id, b.warehouse_id, b.shelf_code, b.quantity, w.name as warehouse_name 
            FROM wms_stock_balances b 
            LEFT JOIN warehouses w ON b.warehouse_id = w.id
            WHERE b.quantity > 0
        `);

        const [barcodes] = await db.query('SELECT product_id, barcode FROM product_barcodes');

        const productsWithDetails = rows.map(product => {
            product.suppliers = suppliers.filter(s => s.product_id === product.Id);
            product.locations = locations.filter(l => l.product_id === product.Id);
            const productBarcodes = barcodes.filter(b => b.product_id === product.Id).map(b => b.barcode);
            product.Barcode = JSON.stringify(productBarcodes); // Frontendin beklentisini karşılamak için stringify ediyoruz
            return product;
        });

        // Sonucu ön yüze (Frontend) gönderiyoruz.
        res.json(productsWithDetails);
    } catch (error) {
        console.error('Ürünler listelenirken hata:', error);
        res.status(500).json({ success: false, message: 'Ürünler getirilirken sunucu hatası oluştu.' });
    }
});

// ===========================
// [POST] Yeni Ürün Ekleme İşlemi
// Sisteme yeni bir ürün kaydeder. Aynı anda resim yükleme (multer), barkod ekleme ve çoklu tedarikçi atamalarını gerçekleştirir. İşlemi transaction ile güvenceye alır.
// ===========================
router.post('/', authMiddleware, checkPermission('product_add'), upload.any(), async (req, res) => {
    const { Barcode, ProductName, ProductCode, FeaturedFeatures, Brand, Category, PurchasePrice, SalePrice, StockQuantity, ExpirationDate, BatchNumber, Description, existingImages, Location, Formula, ProductionTime, Width, Height, Depth, Diameter, Weight, is_stackable, max_stack_limit, unit_type, package_capacity, package_name, critical_stock_level, shelf_life_months, minimum_production_quantity, supplier_id, suppliers, supply_type, is_active, is_bestseller, web_categories, web_subcategories, web_subtitles, FeaturesBgColor, FeaturesTextColor, WhoCanUse, HowToUse, existingFeaturesImage, BannerSlogan, existingBannerLogo, CircularFeatures, CalloutText, Highlights } = req.body;

    let parsedBarcodes = [];
    try { if (Barcode) parsedBarcodes = JSON.parse(Barcode); } catch (e) { console.warn('JSON Parse Error (Barcode):', e.message); }
    if (!Array.isArray(parsedBarcodes)) parsedBarcodes = Barcode ? [Barcode] : [];

    let parsedExistingImages = [];
    try { if (existingImages) parsedExistingImages = JSON.parse(existingImages); } catch (e) { console.warn('JSON Parse Error (existingImages):', e.message); }
    if (!Array.isArray(parsedExistingImages)) parsedExistingImages = existingImages ? [existingImages] : [];

    const imagesFiles = req.files ? req.files.filter(f => f.fieldname === 'images') : [];
    const newFiles = imagesFiles.map(f => `/uploads/${f.filename}`);
    const finalImagesArray = [...parsedExistingImages.filter(Boolean), ...newFiles];
    const finalImagePath = JSON.stringify(finalImagesArray);

    const featuresImageFile = req.files ? req.files.find(f => f.fieldname === 'FeaturesImage') : null;
    const finalFeaturesImage = featuresImageFile ? `/uploads/${featuresImageFile.filename}` : (existingFeaturesImage || null);

    let parsedWhoCanUse = null;
    try { if (WhoCanUse) parsedWhoCanUse = typeof WhoCanUse === 'string' ? WhoCanUse : JSON.stringify(WhoCanUse); } catch (e) {}

    let parsedHowToUse = null;
    try { if (HowToUse) parsedHowToUse = typeof HowToUse === 'string' ? HowToUse : JSON.stringify(HowToUse); } catch (e) {}

    const bannerLogoFile = req.files ? req.files.find(f => f.fieldname === 'BannerLogo') : null;
    const finalBannerLogo = bannerLogoFile ? `/uploads/${bannerLogoFile.filename}` : (existingBannerLogo || null);

    let parsedCircularFeatures = null;
    try { if (CircularFeatures) parsedCircularFeatures = typeof CircularFeatures === 'string' ? CircularFeatures : JSON.stringify(CircularFeatures); } catch (e) {}

    let parsedHighlights = null;
    try { if (Highlights) parsedHighlights = typeof Highlights === 'string' ? Highlights : JSON.stringify(Highlights); } catch (e) {}

    let parsedSuppliers = [];
    try { if (suppliers) parsedSuppliers = JSON.parse(suppliers); } catch (e) { console.warn('JSON Parse Error (suppliers):', e.message); }
    if (!Array.isArray(parsedSuppliers)) parsedSuppliers = [];

    try {
        // İşlemlerin yarım kalmaması için veritabanı Transaction (işlem bloğu) başlatıyoruz.
        // Hata olursa ROLLBACK ile tüm değişiklikler geri alınacak.
        await db.query('START TRANSACTION');

        // 1. Gelen barkodların sistemde zaten kayıtlı olup olmadığını kontrol et (Çakışma kontrolü)
        if (parsedBarcodes.length > 0) {
            const conditions = parsedBarcodes.map(() => 'barcode = ?').join(' OR ');
            const [existing] = await db.query(`SELECT id FROM product_barcodes WHERE ${conditions}`, parsedBarcodes);
            if (existing.length > 0) {
                await db.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Bu barkoda sahip bir ürün zaten var.' });
            }
        }

        const widthVal = safeFloat(Width, 0);
        const heightVal = safeFloat(Height, 0);
        const depthVal = safeFloat(Depth, 0);
        const diameterVal = safeFloat(Diameter, 0);
        const weightVal = safeFloat(Weight, 0);

        let volumeVal = 0;
        if (diameterVal > 0 && widthVal === 0 && depthVal === 0) {
            // Silindirik Hacim = pi * r^2 * h
            const radius = diameterVal / 2;
            volumeVal = Math.PI * Math.pow(radius, 2) * heightVal;
        } else {
            // Dikdörtgen Hacim
            volumeVal = widthVal * heightVal * depthVal;
        }

        const isStackableVal = parseStackable(is_stackable, 0);
        const maxStackLimitVal = safeInt(max_stack_limit, 1);

        const isActiveVal = (is_active === 'false' || is_active === false || is_active === 0 || is_active === '0') ? 0 : 1;
        const isBestsellerVal = (is_bestseller === 'true' || is_bestseller === true || is_bestseller === 1 || is_bestseller === '1') ? 1 : 0;

        const insertQuery = `
            INSERT INTO products (
                ProductName, ProductCode, FeaturedFeatures, Brand, Category, PurchasePrice, SalePrice, 
                StockQuantity, ExpirationDate, BatchNumber, Description, ImagePath, Location, Formula,
                ProductionTime, Width, Height, Depth, Diameter, Volume, Weight, is_stackable, max_stack_limit,
                unit_type, package_capacity, package_name, critical_stock_level, minimum_production_quantity,
                supplier_id, shelf_life_months, supply_type, is_active, is_bestseller, web_categories, web_subcategories, web_subtitles,
                FeaturesImage, FeaturesBgColor, FeaturesTextColor, WhoCanUse, HowToUse,
                BannerSlogan, BannerLogo, CircularFeatures, CalloutText, Highlights
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertParams = [
            ProductName || '',
            ProductCode || null,
            FeaturedFeatures ? (typeof FeaturedFeatures === 'string' ? FeaturedFeatures : JSON.stringify(FeaturedFeatures)) : null,
            Brand || '',
            Category || '',
            safeFloat(PurchasePrice, 0),
            safeFloat(SalePrice, 0),
            safeFloat(StockQuantity, 0),
            ExpirationDate || null,
            BatchNumber || '',
            Description || '',
            finalImagePath,
            Location || '',
            Formula || '',
            safeInt(ProductionTime, 0),
            widthVal,
            heightVal,
            depthVal,
            diameterVal,
            volumeVal,
            weightVal,
            isStackableVal,
            maxStackLimitVal,
            unit_type || null,
            safeFloat(package_capacity, 1),
            package_name || null,
            safeInt(critical_stock_level, 0),
            safeInt(minimum_production_quantity, 0),
            safeInt(supplier_id, null),
            safeInt(shelf_life_months, 0),
            supply_type || 'MANUFACTURE',
            isActiveVal,
            isBestsellerVal,
            web_categories ? JSON.stringify(web_categories) : null,
            web_subcategories ? JSON.stringify(web_subcategories) : null,
            web_subtitles ? JSON.stringify(web_subtitles) : null,
            finalFeaturesImage,
            FeaturesBgColor || '#0d9488',
            FeaturesTextColor || '#ffffff',
            parsedWhoCanUse,
            parsedHowToUse,
            BannerSlogan || null,
            finalBannerLogo,
            parsedCircularFeatures,
            CalloutText || null,
            parsedHighlights
        ];

        const [result] = await db.query(insertQuery, insertParams);
        const productId = result.insertId;

        // 2. Barkodları yeni tabloya kaydet
        if (parsedBarcodes.length > 0) {
            for (const barcode of parsedBarcodes) {
                if (barcode && barcode.trim()) {
                    await db.query('INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)', [productId, barcode.trim()]);
                }
            }
        }

        // 3. Ürüne ait tedarikçileri (product_suppliers) kaydet ve varsa PDF sözleşme dosyalarını yükle
        for (let i = 0; i < parsedSuppliers.length; i++) {
            const supplier = parsedSuppliers[i];
            if (!supplier.supplier_id) continue;

            let contractFilePath = null;
            if (req.files) {
                const contractFile = req.files.find(f => f.fieldname === `contractFile_${supplier.localId || i}`);
                if (contractFile) contractFilePath = `/uploads/${contractFile.filename}`;
            }
            if (!contractFilePath && supplier.contract_file) contractFilePath = supplier.contract_file;
            if (supplier.remove_contract) contractFilePath = null;

            await db.query(`
                INSERT INTO product_suppliers (product_id, supplier_id, contract_file, contract_start_date, contract_end_date, is_primary, unit_price, lead_time_days)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [productId, supplier.supplier_id, contractFilePath, supplier.contract_start_date || null, supplier.contract_end_date || null, i === 0, safeFloat(supplier.unit_price, 0), safeInt(supplier.lead_time_days, 0)]);
        }

        await logActivity(req.user?.id, 'INSERT', 'products', productId, `"${ProductName}" adlı yeni ürün ekledi.`);
        await db.query('COMMIT');
        res.status(201).json({ success: true, message: 'Ürün başarıyla eklendi.', productId });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Ürün eklenirken hata:', error);
        // GÜVENLİK: Dahili hata detayları istemciye gönderilmiyor
        res.status(500).json({ success: false, message: 'Ürün eklenirken bir hata oluştu. Lütfen tekrar deneyin.' });
    }
});

// ===========================
// [PUT] Toplu Ürün Güncelleme
// Seçilen birden fazla üründe fiyat, kategori, aktif/pasif veya stok kritik seviyesi gibi alanları tek seferde topluca günceller.
// ===========================
router.put('/bulk-edit', authMiddleware, checkPermission('product_edit'), async (req, res) => {
    const { ids, updates } = req.body;

    let finalUpdates = updates;
    if (!finalUpdates && req.body.field) {
        finalUpdates = [{ field: req.body.field, type: req.body.type, value: req.body.value }];
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Ürün seçilmedi.' });
    }
    if (!finalUpdates || !Array.isArray(finalUpdates) || finalUpdates.length === 0) {
        return res.status(400).json({ success: false, message: 'Değişiklik bulunamadı.' });
    }

    try {
        await db.query('START TRANSACTION');

        for (const id of ids) {
            const [oldRows] = await db.query('SELECT * FROM products WHERE Id = ?', [id]);
            if (oldRows.length === 0) continue;
            const oldData = oldRows[0];

            for (const update of finalUpdates) {
                const { field, type, value } = update;
                if (!['SalePrice', 'PurchasePrice', 'Category', 'Brand', 'is_stackable', 'max_stack_limit', 'critical_stock_level', 'is_active', 'is_bestseller', 'web_categories', 'web_subcategories', 'web_subtitles'].includes(field)) continue;

                let newVal;
                const isNumeric = ['SalePrice', 'PurchasePrice', 'max_stack_limit', 'critical_stock_level'].includes(field);

                if (isNumeric) {
                    let currentVal = parseFloat(oldData[field]) || 0;
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) continue;

                    newVal = currentVal;
                    if (type === 'percentage') {
                        newVal = currentVal + (currentVal * (numValue / 100));
                    } else if (type === 'amount') {
                        newVal = currentVal + numValue;
                    } else if (type === 'fixed') {
                        newVal = numValue;
                    }
                    if (newVal < 0) newVal = 0;
                    if (['SalePrice', 'PurchasePrice'].includes(field)) {
                        newVal = Math.round(newVal * 100) / 100;
                    } else {
                        newVal = Math.round(newVal);
                    }
                } else {
                    if (['web_categories', 'web_subcategories', 'web_subtitles'].includes(field)) {
                        newVal = value ? JSON.stringify(value) : null;
                    } else {
                        newVal = value;
                    }
                }

                await db.query(`UPDATE products SET ${field} = ? WHERE Id = ?`, [newVal, id]);
            }
        }

        await logActivity(req.user?.id, 'UPDATE', 'products', 0, `${ids.length} adet üründe toplu güncelleme yapıldı.`);
        await db.query('COMMIT');
        res.json({ success: true, message: 'Seçili ürünler başarıyla güncellendi.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Toplu ürün güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Toplu güncelleme sırasında sunucu hatası oluştu.' });
    }
});

// ===========================
// [PUT] Tekil Ürün Bilgilerini Güncelleme
// Mevcut bir ürünün tüm özelliklerini, barkodlarını, tedarikçilerini ve yeni resimlerini günceller. Eski resimlerin yönetimi ve log (geçmiş) kaydını tutar.
// ===========================
router.put('/:id', authMiddleware, checkPermission('product_edit'), upload.any(), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Ürün ID.' });
    const { Barcode, ProductName, ProductCode, FeaturedFeatures, Brand, Category, shelf_life_months, lead_time_days, PurchasePrice, SalePrice, StockQuantity, ExpirationDate, BatchNumber, Description, existingImages, Location, Formula, ProductionTime, Width, Height, Depth, Diameter, Weight, is_stackable, max_stack_limit, unit_type, package_capacity, package_name, critical_stock_level, minimum_production_quantity, supplier_id, suppliers, supply_type, is_bestseller, web_categories, web_subcategories, web_subtitles, FeaturesBgColor, FeaturesTextColor, WhoCanUse, HowToUse, existingFeaturesImage, removeFeaturesImage, BannerSlogan, existingBannerLogo, removeBannerLogo, CircularFeatures, CalloutText, Highlights } = req.body;

    let parsedBarcodes = [];
    try { if (Barcode) parsedBarcodes = JSON.parse(Barcode); } catch (e) { console.warn('JSON Parse Error (Barcode update):', e.message); }
    if (!Array.isArray(parsedBarcodes)) parsedBarcodes = Barcode ? [Barcode] : [];

    let parsedExistingImages = [];
    try { if (existingImages) parsedExistingImages = JSON.parse(existingImages); } catch (e) { console.warn('JSON Parse Error (existingImages update):', e.message); }
    if (!Array.isArray(parsedExistingImages)) parsedExistingImages = existingImages ? [existingImages] : [];

    const imagesFiles = req.files ? req.files.filter(f => f.fieldname === 'images') : [];
    const newFiles = imagesFiles.map(f => `/uploads/${f.filename}`);
    const finalImagesArray = [...parsedExistingImages.filter(Boolean), ...newFiles];
    const finalImagePath = JSON.stringify(finalImagesArray);

    const featuresImageFile = req.files ? req.files.find(f => f.fieldname === 'FeaturesImage') : null;
    let finalFeaturesImage = featuresImageFile ? `/uploads/${featuresImageFile.filename}` : (existingFeaturesImage || null);
    if (removeFeaturesImage === 'true') finalFeaturesImage = 'REMOVED';

    let parsedWhoCanUse = null;
    try { if (WhoCanUse) parsedWhoCanUse = typeof WhoCanUse === 'string' ? WhoCanUse : JSON.stringify(WhoCanUse); } catch (e) {}

    let parsedHowToUse = null;
    try { if (HowToUse) parsedHowToUse = typeof HowToUse === 'string' ? HowToUse : JSON.stringify(HowToUse); } catch (e) {}

    const bannerLogoFile = req.files ? req.files.find(f => f.fieldname === 'BannerLogo') : null;
    let finalBannerLogo = bannerLogoFile ? `/uploads/${bannerLogoFile.filename}` : (existingBannerLogo || null);
    if (removeBannerLogo === 'true') finalBannerLogo = 'REMOVED';

    let parsedCircularFeatures = null;
    try { if (CircularFeatures) parsedCircularFeatures = typeof CircularFeatures === 'string' ? CircularFeatures : JSON.stringify(CircularFeatures); } catch (e) {}

    let parsedHighlights = null;
    try { if (Highlights) parsedHighlights = typeof Highlights === 'string' ? Highlights : JSON.stringify(Highlights); } catch (e) {}

    let parsedSuppliers = [];
    try { if (suppliers) parsedSuppliers = JSON.parse(suppliers); } catch (e) { console.warn('JSON Parse Error (suppliers update):', e.message); }
    if (!Array.isArray(parsedSuppliers)) parsedSuppliers = [];

    try {
        await db.query('START TRANSACTION');

        if (parsedBarcodes.length > 0) {
            const conditions = parsedBarcodes.map(() => 'barcode = ?').join(' OR ');
            const queryParams = [...parsedBarcodes, id];
            const [existing] = await db.query(`SELECT id FROM product_barcodes WHERE (${conditions}) AND product_id != ?`, queryParams);
            if (existing.length > 0) {
                await db.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Bu barkoda sahip başka bir ürün zaten var.' });
            }
        }

        const [oldRows] = await db.query('SELECT * FROM products WHERE Id = ?', [id]);
        const oldData = oldRows.length > 0 ? oldRows[0] : null;

        if (!oldData) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Güncellenecek ürün bulunamadı.' });
        }

        const widthVal = req.body.Width !== undefined ? safeFloat(req.body.Width, 0) : safeFloat(oldData.Width, 0);
        const heightVal = req.body.Height !== undefined ? safeFloat(req.body.Height, 0) : safeFloat(oldData.Height, 0);
        const depthVal = req.body.Depth !== undefined ? safeFloat(req.body.Depth, 0) : safeFloat(oldData.Depth, 0);
        const diameterVal = req.body.Diameter !== undefined ? safeFloat(req.body.Diameter, 0) : safeFloat(oldData.Diameter, 0);
        const weightVal = req.body.Weight !== undefined ? safeFloat(req.body.Weight, 0) : safeFloat(oldData.Weight, 0);

        let volumeVal = 0;
        if (diameterVal > 0 && widthVal === 0 && depthVal === 0) {
            const radius = diameterVal / 2;
            volumeVal = Math.PI * Math.pow(radius, 2) * heightVal;
        } else {
            volumeVal = widthVal * heightVal * depthVal;
        }

        const isStackableVal = req.body.is_stackable !== undefined ? parseStackable(req.body.is_stackable, 0) : (oldData.is_stackable ? 1 : 0);
        const maxStackLimitVal = req.body.max_stack_limit !== undefined ? safeInt(req.body.max_stack_limit, 1) : safeInt(oldData.max_stack_limit, 1);

        const values = [
            req.body.ProductName !== undefined ? req.body.ProductName : oldData.ProductName,
            req.body.ProductCode !== undefined ? req.body.ProductCode : oldData.ProductCode,
            req.body.FeaturedFeatures !== undefined ? (typeof req.body.FeaturedFeatures === 'string' ? req.body.FeaturedFeatures : JSON.stringify(req.body.FeaturedFeatures)) : (typeof oldData.FeaturedFeatures === 'string' ? oldData.FeaturedFeatures : (oldData.FeaturedFeatures ? JSON.stringify(oldData.FeaturedFeatures) : null)),
            req.body.Brand !== undefined ? req.body.Brand : oldData.Brand,
            req.body.Category !== undefined ? req.body.Category : oldData.Category,
            req.body.unit_type !== undefined ? req.body.unit_type : oldData.unit_type,
            req.body.package_capacity !== undefined ? safeFloat(req.body.package_capacity, 1) : safeFloat(oldData.package_capacity, 1),
            req.body.package_name !== undefined ? req.body.package_name : oldData.package_name,
            req.body.PurchasePrice !== undefined ? safeFloat(req.body.PurchasePrice, 0) : safeFloat(oldData.PurchasePrice, 0),
            req.body.SalePrice !== undefined ? safeFloat(req.body.SalePrice, 0) : safeFloat(oldData.SalePrice, 0),
            req.body.StockQuantity !== undefined ? safeFloat(req.body.StockQuantity, 0) : safeFloat(oldData.StockQuantity, 0),
            req.body.ExpirationDate !== undefined ? (req.body.ExpirationDate || null) : oldData.ExpirationDate,
            req.body.BatchNumber !== undefined ? req.body.BatchNumber : oldData.BatchNumber,
            req.body.Description !== undefined ? req.body.Description : oldData.Description,
            (imagesFiles.length > 0 || req.body.existingImages !== undefined) ? finalImagePath : oldData.ImagePath,
            req.body.Location !== undefined ? req.body.Location : oldData.Location,
            req.body.Formula !== undefined ? req.body.Formula : oldData.Formula,
            req.body.ProductionTime !== undefined ? safeInt(req.body.ProductionTime, 0) : safeInt(oldData.ProductionTime, 0),
            widthVal,
            heightVal,
            depthVal,
            diameterVal,
            volumeVal,
            weightVal,
            isStackableVal,
            maxStackLimitVal,
            req.body.critical_stock_level !== undefined ? safeInt(req.body.critical_stock_level, 0) : safeInt(oldData.critical_stock_level, 0),
            req.body.minimum_production_quantity !== undefined ? safeInt(req.body.minimum_production_quantity, 0) : safeInt(oldData.minimum_production_quantity, 0),
            req.body.supplier_id !== undefined ? safeInt(req.body.supplier_id, null) : (oldData.supplier_id ? safeInt(oldData.supplier_id, null) : null),
            req.body.shelf_life_months !== undefined ? safeInt(req.body.shelf_life_months, 0) : safeInt(oldData.shelf_life_months, 0),
            req.body.supply_type !== undefined ? req.body.supply_type : (oldData.supply_type || 'MANUFACTURE'),
            req.body.is_active !== undefined ? ((req.body.is_active === 'false' || req.body.is_active === false || req.body.is_active === 0 || req.body.is_active === '0') ? 0 : 1) : oldData.is_active,
            req.body.is_bestseller !== undefined ? ((req.body.is_bestseller === 'true' || req.body.is_bestseller === true || req.body.is_bestseller === 1 || req.body.is_bestseller === '1') ? 1 : 0) : oldData.is_bestseller,
            req.body.web_categories !== undefined ? (typeof req.body.web_categories === 'string' ? req.body.web_categories : JSON.stringify(req.body.web_categories)) : (typeof oldData.web_categories === 'string' ? oldData.web_categories : (oldData.web_categories ? JSON.stringify(oldData.web_categories) : null)),
            req.body.web_subcategories !== undefined ? (typeof req.body.web_subcategories === 'string' ? req.body.web_subcategories : JSON.stringify(req.body.web_subcategories)) : (typeof oldData.web_subcategories === 'string' ? oldData.web_subcategories : (oldData.web_subcategories ? JSON.stringify(oldData.web_subcategories) : null)),
            req.body.web_subtitles !== undefined ? (typeof req.body.web_subtitles === 'string' ? req.body.web_subtitles : JSON.stringify(req.body.web_subtitles)) : (typeof oldData.web_subtitles === 'string' ? oldData.web_subtitles : (oldData.web_subtitles ? JSON.stringify(oldData.web_subtitles) : null)),
            finalFeaturesImage === 'REMOVED' ? null : (finalFeaturesImage !== null ? finalFeaturesImage : oldData.FeaturesImage),
            FeaturesBgColor !== undefined ? FeaturesBgColor : oldData.FeaturesBgColor,
            FeaturesTextColor !== undefined ? FeaturesTextColor : oldData.FeaturesTextColor,
            parsedWhoCanUse !== null ? parsedWhoCanUse : (typeof oldData.WhoCanUse === 'string' ? oldData.WhoCanUse : (oldData.WhoCanUse ? JSON.stringify(oldData.WhoCanUse) : null)),
            parsedHowToUse !== null ? parsedHowToUse : (typeof oldData.HowToUse === 'string' ? oldData.HowToUse : (oldData.HowToUse ? JSON.stringify(oldData.HowToUse) : null)),
            req.body.BannerSlogan !== undefined ? req.body.BannerSlogan : oldData.BannerSlogan,
            finalBannerLogo === 'REMOVED' ? null : (finalBannerLogo !== null ? finalBannerLogo : oldData.BannerLogo),
            parsedCircularFeatures !== null ? parsedCircularFeatures : (typeof oldData.CircularFeatures === 'string' ? oldData.CircularFeatures : (oldData.CircularFeatures ? JSON.stringify(oldData.CircularFeatures) : null)),
            req.body.CalloutText !== undefined ? req.body.CalloutText : oldData.CalloutText,
            parsedHighlights !== null ? parsedHighlights : (typeof oldData.Highlights === 'string' ? oldData.Highlights : (oldData.Highlights ? JSON.stringify(oldData.Highlights) : null)),
            id
        ];

        let query = `
            UPDATE products 
            SET ProductName=?, ProductCode=?, FeaturedFeatures=?, Brand=?, Category=?, unit_type=?, package_capacity=?, package_name=?, PurchasePrice=?, SalePrice=?, StockQuantity=?, ExpirationDate=?, BatchNumber=?, Description=?, ImagePath=?, Location=?, Formula=?, ProductionTime=?, Width=?, Height=?, Depth=?, Diameter=?, Volume=?, Weight=?, is_stackable=?, max_stack_limit=?, critical_stock_level=?, minimum_production_quantity=?, supplier_id=?, shelf_life_months=?, supply_type=?, is_active=?, is_bestseller=?, web_categories=?, web_subcategories=?, web_subtitles=?, FeaturesImage=?, FeaturesBgColor=?, FeaturesTextColor=?, WhoCanUse=?, HowToUse=?, BannerSlogan=?, BannerLogo=?, CircularFeatures=?, CalloutText=?, Highlights=?
            WHERE Id=?
        `;

        await db.query(query, values);

        let barcodesChanged = false;
        if (req.body.Barcode !== undefined) {
            const [oldBarcodesRows] = await db.query('SELECT barcode FROM product_barcodes WHERE product_id = ?', [id]);
            const oldBarcodes = oldBarcodesRows.map(b => b.barcode).sort();
            const newBarcodes = [...new Set(parsedBarcodes.filter(b => b && b.trim()).map(b => b.trim()))].sort();
            
            if (JSON.stringify(oldBarcodes) !== JSON.stringify(newBarcodes)) {
                barcodesChanged = true;
                await db.query('DELETE FROM product_barcodes WHERE product_id = ?', [id]);
                for (const barcode of newBarcodes) {
                    await db.query('INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)', [id, barcode]);
                }
            }
        }

        // Tedarikçileri güncelle
        let suppliersChanged = false;
        if (req.body.suppliers !== undefined) {
            const [oldSuppliersRows] = await db.query('SELECT supplier_id, unit_price, lead_time_days FROM product_suppliers WHERE product_id = ? ORDER BY supplier_id', [id]);
            const oldSuppliersSimple = oldSuppliersRows.map(s => ({ id: Number(s.supplier_id), price: Number(s.unit_price || 0), time: Number(s.lead_time_days || 0) }));
            const newSuppliersSimple = parsedSuppliers.filter(s => s && s.supplier_id).map(s => ({ id: Number(s.supplier_id), price: Number(s.unit_price || 0), time: Number(s.lead_time_days || 0) })).sort((a, b) => a.id - b.id);
            if (JSON.stringify(oldSuppliersSimple) !== JSON.stringify(newSuppliersSimple)) {
                suppliersChanged = true;
            }

            await db.query('DELETE FROM product_suppliers WHERE product_id = ?', [id]);
            for (let i = 0; i < parsedSuppliers.length; i++) {
                const supplier = parsedSuppliers[i];
                if (!supplier.supplier_id) continue;

                let contractFilePath = null;
                if (req.files) {
                    const contractFile = req.files.find(f => f.fieldname === `contractFile_${supplier.localId || i}`);
                    if (contractFile) contractFilePath = `/uploads/${contractFile.filename}`;
                }
                if (!contractFilePath && supplier.contract_file) contractFilePath = supplier.contract_file;
                if (supplier.remove_contract === true || supplier.remove_contract === 'true') contractFilePath = null;

                await db.query(`
                    INSERT INTO product_suppliers (product_id, supplier_id, contract_file, contract_start_date, contract_end_date, is_primary, unit_price, lead_time_days)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [id, supplier.supplier_id, contractFilePath, supplier.contract_start_date || null, supplier.contract_end_date || null, i === 0, safeFloat(supplier.unit_price, 0), safeInt(supplier.lead_time_days, 0)]);
            }
        }

        const fieldLabels = {
            ProductName: 'Ürün Adı', ProductCode: 'Ürün Kodu', FeaturedFeatures: 'Öne Çıkan Bilgiler', Brand: 'Marka', Category: 'Kategori', unit_type: 'Birim',
            package_capacity: 'Paket Kapasitesi', package_name: 'Paket Türü', PurchasePrice: 'Alış Fiyatı',
            SalePrice: 'Satış Fiyatı', StockQuantity: 'Stok Miktarı', ExpirationDate: 'SKT',
            BatchNumber: 'Parti No', Description: 'Açıklama', Location: 'Konum', Formula: 'Formül',
            ProductionTime: 'Üretim Süresi', Width: 'Genişlik', Height: 'Yükseklik', Depth: 'Derinlik',
            Diameter: 'Çap', Volume: 'Hacim', Weight: 'Ağırlık', is_stackable: 'İstiflenebilir', max_stack_limit: 'Maks. İstif',
            critical_stock_level: 'Kritik Stok', minimum_production_quantity: 'Min. Üretim', shelf_life_months: 'Raf Ömrü'
        };

        const newValsMap = {
            ProductName: values[0], ProductCode: values[1], FeaturedFeatures: values[2], Brand: values[3], Category: values[4], unit_type: values[5],
            package_capacity: values[6], package_name: values[7], PurchasePrice: values[8],
            SalePrice: values[9], StockQuantity: values[10], ExpirationDate: values[11],
            BatchNumber: values[12], Description: values[13], Location: values[15], Formula: values[16],
            ProductionTime: values[17], Width: values[18], Height: values[19], Depth: values[20],
            Diameter: values[21], Volume: values[22], Weight: values[23], is_stackable: values[24], max_stack_limit: values[25],
            critical_stock_level: values[26], minimum_production_quantity: values[27], shelf_life_months: values[29], is_active: values[31], is_bestseller: values[32]
        };

        const changes = [];
        const numericFields = ['package_capacity', 'PurchasePrice', 'SalePrice', 'StockQuantity', 'ProductionTime', 'Width', 'Height', 'Depth', 'Diameter', 'Volume', 'Weight', 'max_stack_limit', 'critical_stock_level', 'minimum_production_quantity', 'shelf_life_months'];

        const formatLogVal = (key, val) => {
            if (val === null || val === undefined || val === '') return '';
            if (numericFields.includes(key)) {
                const n = parseFloat(val);
                if (!isNaN(n)) return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
            }
            if (key === 'ExpirationDate') {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
            return String(val).trim();
        };

        for (const [key, label] of Object.entries(fieldLabels)) {
            let oldVal = oldData[key];
            let newVal = newValsMap[key];
            if (key === 'is_stackable') {
                oldVal = oldVal ? 'Evet' : 'Hayır';
                newVal = newVal ? 'Evet' : 'Hayır';
            }

            if (numericFields.includes(key)) {
                const numOld = parseFloat(oldVal) || 0;
                const numNew = parseFloat(newVal) || 0;
                if (Math.abs(numOld - numNew) < 0.000001) continue;
            }

            if (key === 'ExpirationDate') {
                const fmtOld = formatLogVal('ExpirationDate', oldVal);
                const fmtNew = formatLogVal('ExpirationDate', newVal);
                if (fmtOld === fmtNew) continue;
            }

            if (key === 'Formula') {
                try {
                    const objOld = typeof oldVal === 'string' ? JSON.parse(oldVal) : oldVal;
                    const objNew = typeof newVal === 'string' ? JSON.parse(newVal) : newVal;
                    if (JSON.stringify(objOld || []) === JSON.stringify(objNew || [])) continue;
                } catch (e) { console.warn('JSON Parse Error (images/barcodes fetch):', e.message); }
                changes.push(`${label} güncellendi`);
                continue;
            }

            const strOld = formatLogVal(key, oldVal);
            const strNew = formatLogVal(key, newVal);

            if (strOld !== strNew && strNew !== '') {
                if (!strOld) {
                    changes.push(`${label} eklendi: "${strNew}"`);
                } else {
                    changes.push(`${label} "${strOld}" -> "${strNew}" olarak değiştirildi`);
                }
            }
        }
        if (barcodesChanged) {
            changes.push(`Barkodlar güncellendi`);
        }
        if (imagesFiles.length > 0 || req.body.existingImages !== undefined) {
            try {
                const oldImg = typeof oldData.ImagePath === 'string' ? JSON.parse(oldData.ImagePath) : (oldData.ImagePath || []);
                const newImg = typeof finalImagePath === 'string' ? JSON.parse(finalImagePath) : (finalImagePath || []);
                if (JSON.stringify(oldImg) !== JSON.stringify(newImg)) {
                    changes.push(`Resimler güncellendi`);
                }
            } catch (e) {
                if (finalImagePath !== oldData.ImagePath) changes.push(`Resimler güncellendi`);
            }
        }
        if (suppliersChanged) {
            changes.push(`Tedarikçiler güncellendi`);
        }

        let logDetailMsg = `"${ProductName || oldData.ProductName}" adlı ürünü güncelledi.`;
        if (changes.length > 0) {
            logDetailMsg = `"${ProductName || oldData.ProductName}" adlı üründe yapılan değişiklikler: ${changes.join(', ')}.`;
        }

        await logActivity(req.user?.id, 'UPDATE', 'products', id, logDetailMsg, oldData);
        await db.query('COMMIT');
        res.json({ success: true, message: 'Ürün başarıyla güncellendi.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Ürün güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Ürün güncellenirken sunucu hatası oluştu: ' + (error.message || 'Bilinmeyen Hata') });
    }
});


router.delete('/bulk', authMiddleware, checkPermission('product_delete'), async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Silinecek ürün seçilmedi.' });
    }

    try {
        await db.query('START TRANSACTION');

        for (const id of ids) {
            const [oldRows] = await db.query('SELECT * FROM products WHERE Id = ?', [id]);
            if (oldRows.length === 0) continue;
            const oldData = oldRows[0];

            const [barcodeRows] = await db.query('SELECT barcode FROM product_barcodes WHERE product_id = ?', [id]);
            const barcodeStr = barcodeRows.map(b => b.barcode).join(', ');

            oldData._barcodes = barcodeRows.map(b => b.barcode);
            const [supplierRows] = await db.query('SELECT * FROM product_suppliers WHERE product_id = ?', [id]);
            oldData._suppliers = supplierRows;
            const [stockRows] = await db.query('SELECT * FROM wms_stock_balances WHERE product_id = ?', [id]);
            oldData._stocks = stockRows;

            // İlişkili kayıtları sil (Stoklar, Siparişler, Hareketler vb.)
            await db.query('DELETE FROM orderitems WHERE ProductId = ?', [id]);
            await db.query('DELETE FROM product_barcodes WHERE product_id = ?', [id]);
            await db.query('DELETE FROM product_suppliers WHERE product_id = ?', [id]);
            await db.query('DELETE FROM production_requests WHERE product_id = ?', [id]);
            await db.query('DELETE FROM stockmovements WHERE ProductId = ?', [id]);
            await db.query('DELETE FROM wms_stock_balances WHERE product_id = ?', [id]);
            await db.query('DELETE FROM production_orders WHERE product_id = ?', [id]);
            await db.query('DELETE FROM production_materials WHERE material_product_id = ?', [id]);
            await db.query('DELETE FROM purchase_requests WHERE product_id = ?', [id]);

            await db.query('DELETE FROM products WHERE Id = ?', [id]);
            
            const barcodeMsg = barcodeStr ? `${barcodeStr} barkodlu ` : '';
            await logActivity(req.user?.id, 'DELETE', 'products', id, `${barcodeMsg}"${oldData.ProductName}" adlı ürün silindi.`, oldData);
        }

        await db.query('COMMIT');
        res.json({ success: true, message: `${ids.length} adet ürün başarıyla silindi.` });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Toplu silme hatası:', error);
        res.status(500).json({ success: false, message: 'Ürünler silinirken sunucu hatası oluştu.' });
    }
});

// DELETE: Ürünü sil
router.delete('/:id', authMiddleware, checkPermission('product_delete'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Geçersiz Ürün ID.' });

    try {
        await db.query('START TRANSACTION');

        const [oldRows] = await db.query('SELECT * FROM products WHERE Id = ?', [id]);
        const oldData = oldRows.length > 0 ? oldRows[0] : null;

        const [barcodeRows] = await db.query('SELECT barcode FROM product_barcodes WHERE product_id = ?', [id]);
        const barcodeStr = barcodeRows.map(b => b.barcode).join(', ');

        if (oldData) {
            oldData._barcodes = barcodeRows.map(b => b.barcode);
            const [supplierRows] = await db.query('SELECT * FROM product_suppliers WHERE product_id = ?', [id]);
            oldData._suppliers = supplierRows;
            const [stockRows] = await db.query('SELECT * FROM wms_stock_balances WHERE product_id = ?', [id]);
            oldData._stocks = stockRows;
        }

        // İlişkili kayıtları sil (Stoklar, Siparişler, Hareketler vb.)
        await db.query('DELETE FROM orderitems WHERE ProductId = ?', [id]);
        await db.query('DELETE FROM product_barcodes WHERE product_id = ?', [id]);
        await db.query('DELETE FROM product_suppliers WHERE product_id = ?', [id]);
        await db.query('DELETE FROM production_requests WHERE product_id = ?', [id]);
        await db.query('DELETE FROM stockmovements WHERE ProductId = ?', [id]);
        await db.query('DELETE FROM wms_stock_balances WHERE product_id = ?', [id]);
        await db.query('DELETE FROM production_orders WHERE product_id = ?', [id]);
        await db.query('DELETE FROM production_materials WHERE material_product_id = ?', [id]);
        await db.query('DELETE FROM purchase_requests WHERE product_id = ?', [id]);

        const [result] = await db.query('DELETE FROM products WHERE Id = ?', [id]);

        if (result.affectedRows === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Silinecek ürün bulunamadı.' });
        }

        const barcodeMsg = barcodeStr ? `${barcodeStr} barkodlu ` : '';
        await logActivity(req.user?.id, 'DELETE', 'products', id, `${barcodeMsg}"${oldData ? oldData.ProductName : 'Bilinmeyen'}" adlı ürün silindi.`, oldData);

        await db.query('COMMIT');
        res.json({ success: true, message: 'Ürün başarıyla silindi.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Ürün silinirken hata:', error);
        require('fs').appendFileSync('error.log', new Date().toISOString() + ' [API HATASI] DELETE PRODUCT : ' + (error.stack || error.message || error) + '\n');
        res.status(500).json({ success: false, message: 'Ürün silinirken sunucu hatası oluştu.' });
    }
});

module.exports = router;
