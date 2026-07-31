/*
 * ÖZET:
 * Bu modül, sistemde kullanılan kargo/ambalaj kutularının tanımlanması, 
 * çoklu tedarikçi bilgileri ve stok ekleme/düşme işlemlerini yöneten API rotalarıdır.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Sözleşme dosyaları için multer ayarı
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../uploads/contracts');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// GET /api/boxes - Tüm kutuları getir
router.get('/', async (req, res) => {
    try {
        const [boxes] = await db.query(`
            SELECT * FROM packaging_boxes
            WHERE IsActive = 1 
            ORDER BY Id DESC
        `);
        
        // Her bir kutu için tedarikçilerini getir
        for (let box of boxes) {
            const [suppliers] = await db.query(`
                SELECT bs.*, s.SupplierName 
                FROM box_suppliers bs
                JOIN suppliers s ON bs.supplier_id = s.Id
                WHERE bs.box_id = ?
            `, [box.Id]);
            box.suppliers = suppliers;
        }

        res.json({ success: true, data: boxes });
    } catch (err) {
        console.error('Kutular getirilirken hata:', err);
        res.status(500).json({ success: false, message: 'Kutular yüklenemedi.' });
    }
});

// Yardımcı fonksiyon: Tedarikçileri kaydet
const saveBoxSuppliers = async (boxId, suppliersRaw, files) => {
    if (!suppliersRaw) return;
    try {
        let suppliers = JSON.parse(suppliersRaw);
        
        // Önce mevcutları alalım ki contract_file tutulsun (Eğer silinmemişse)
        const [existing] = await db.query('SELECT supplier_id, contract_file FROM box_suppliers WHERE box_id = ?', [boxId]);
        
        await db.query('DELETE FROM box_suppliers WHERE box_id = ?', [boxId]);

        for (let i = 0; i < suppliers.length; i++) {
            let s = suppliers[i];
            let contract_file = null;

            let fileField = 'contractFile_' + s.localId;
            let fileFieldFallback = 'contractFile_' + i;
            let foundFile = files.find(f => f.fieldname === fileField || f.fieldname === fileFieldFallback);

            if (foundFile) {
                contract_file = '/uploads/contracts/' + foundFile.filename;
            } else {
                if (s.remove_contract) {
                    contract_file = null;
                } else if (s.contract_file) {
                    contract_file = s.contract_file; // Mevcut olanı koru
                } else {
                    let ex = existing.find(e => e.supplier_id == s.supplier_id);
                    if (ex) contract_file = ex.contract_file;
                }
            }

            await db.query(`
                INSERT INTO box_suppliers (box_id, supplier_id, lead_time_days, unit_price, contract_start_date, contract_end_date, contract_file)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                boxId, 
                s.supplier_id, 
                s.lead_time_days || null, 
                s.unit_price || null, 
                s.contract_start_date || null, 
                s.contract_end_date || null, 
                contract_file
            ]);
        }
    } catch (e) {
        console.error('Tedarikçiler kaydedilirken hata:', e);
    }
};

// POST /api/boxes - Yeni kutu ekle
router.post('/', upload.any(), async (req, res) => {
    const { BoxName, Width, Height, Depth, EmptyWeight, MaxWeightCapacity, Cost, MinStockLevel, suppliers } = req.body;
    
    if (!BoxName || !Width || !Height || !Depth || !EmptyWeight || !MaxWeightCapacity) {
        return res.status(400).json({ success: false, message: 'Tüm kutu ebat ve ağırlık bilgileri zorunludur.' });
    }

    try {
        const [result] = await db.query(`
            INSERT INTO packaging_boxes (BoxName, Width, Height, Depth, EmptyWeight, MaxWeightCapacity, Cost, MinStockLevel)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [BoxName, Width, Height, Depth, EmptyWeight, MaxWeightCapacity, Cost || 0, MinStockLevel || 0]);
        
        await saveBoxSuppliers(result.insertId, suppliers, req.files || []);

        res.status(201).json({ success: true, message: 'Kutu başarıyla eklendi.', data: { id: result.insertId } });
    } catch (err) {
        console.error('Kutu eklenirken hata:', err);
        res.status(500).json({ success: false, message: 'Kutu eklenemedi.' });
    }
});

// PUT /api/boxes/:id - Kutu güncelle
router.put('/:id', upload.any(), async (req, res) => {
    const { BoxName, Width, Height, Depth, EmptyWeight, MaxWeightCapacity, Cost, IsActive, MinStockLevel, suppliers } = req.body;
    const { id } = req.params;

    try {
        await db.query(`
            UPDATE packaging_boxes 
            SET BoxName = ?, Width = ?, Height = ?, Depth = ?, EmptyWeight = ?, MaxWeightCapacity = ?, Cost = ?, IsActive = ?, MinStockLevel = ?
            WHERE Id = ?
        `, [BoxName, Width, Height, Depth, EmptyWeight, MaxWeightCapacity, Cost, IsActive, MinStockLevel || 0, id]);
        
        await saveBoxSuppliers(id, suppliers, req.files || []);

        res.json({ success: true, message: 'Kutu başarıyla güncellendi.' });
    } catch (err) {
        console.error('Kutu güncellenirken hata:', err);
        res.status(500).json({ success: false, message: 'Kutu güncellenemedi.' });
    }
});

// DELETE /api/boxes/:id - Kutu sil (Pasife al)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE packaging_boxes SET IsActive = 0 WHERE Id = ?', [id]);
        res.json({ success: true, message: 'Kutu silindi (pasife alındı).' });
    } catch (err) {
        console.error('Kutu silinirken hata:', err);
        res.status(500).json({ success: false, message: 'Kutu silinemedi.' });
    }
});

// POST /api/boxes/:id/add-stock - Kutu stok ekle (veya eksilt)
router.post('/:id/add-stock', async (req, res) => {
    const { id } = req.params;
    const { Quantity, SupplierId } = req.body;

    if (!Quantity || isNaN(Quantity)) {
        return res.status(400).json({ success: false, message: 'Geçerli bir miktar girilmelidir.' });
    }

    try {
        // 1. Kutunun mevcut bilgilerini al
        const [boxRows] = await db.query('SELECT * FROM packaging_boxes WHERE Id = ?', [id]);
        if (boxRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Kutu bulunamadı.' });
        }
        const box = boxRows[0];

        // 2. Tedarikçi bilgisini bulalım (Eğer SupplierId geldiyse onu, yoksa ilkini)
        let queryParams = [id];
        let supplierQuery = `
            SELECT s.SupplierName, s.Email, s.ContactPerson, bs.contract_file, bs.unit_price 
            FROM box_suppliers bs
            JOIN suppliers s ON bs.supplier_id = s.Id
            WHERE bs.box_id = ?
        `;
        if (SupplierId) {
            supplierQuery += ` AND bs.supplier_id = ?`;
            queryParams.push(SupplierId);
        }
        supplierQuery += ` ORDER BY bs.id ASC LIMIT 1`;

        const [supplierRows] = await db.query(supplierQuery, queryParams);
        const mainSupplier = supplierRows.length > 0 ? supplierRows[0] : null;
        
        const priceToSave = mainSupplier ? mainSupplier.unit_price : null;

        // 3. İşlem kaydını at
        await db.query(`
            INSERT INTO box_stock_entries (BoxId, Quantity, SupplierName, Price, ContractNo)
            VALUES (?, ?, ?, ?, ?)
        `, [id, Quantity, mainSupplier ? mainSupplier.SupplierName : null, priceToSave, null]);

        // 4. Kutu ana stoğunu güncelle
        await db.query(`
            UPDATE packaging_boxes 
            SET StockQuantity = COALESCE(StockQuantity, 0) + ? 
            WHERE Id = ?
        `, [Quantity, id]);

        // 4.5 Finans Gider Kaydı (Otomatik)
        if (priceToSave && priceToSave > 0 && Quantity > 0) {
            const totalCost = parseFloat(priceToSave) * Quantity;
            const supName = mainSupplier ? mainSupplier.SupplierName : 'Bilinmeyen Tedarikçi';
            const boxName = box.BoxName || 'Kutu/Ambalaj';
            const desc = `${boxName} malzemesi için ${supName} adlı tedarikçiden ${Quantity} adet alım yapıldı.`;
            
            await db.query(`
                INSERT INTO finance_transactions 
                (type, amount, category, description, transaction_date) 
                VALUES ('GİDER', ?, 'Hammadde / Ürün Alımı', ?, CURDATE())
            `, [totalCost, desc]);
        }

        // 5. Yeni stoğu kontrol et ve gerekiyorsa e-posta at
        const newStock = (box.StockQuantity || 0) + parseInt(Quantity, 10);
        if (newStock <= (box.MinStockLevel || 0) && mainSupplier && mainSupplier.Email) {
            const { sendLowBoxStockEmail } = require('../services/emailService');
            box.StockQuantity = newStock;
            sendLowBoxStockEmail({ Email: mainSupplier.Email, ContactPerson: mainSupplier.ContactPerson, SupplierName: mainSupplier.SupplierName }, box).catch(console.error);
        }

        res.status(201).json({ success: true, message: 'Stok başarıyla eklendi/güncellendi.' });
    } catch (err) {
        console.error('Stok eklenirken hata:', err);
        res.status(500).json({ success: false, message: 'Stok eklenemedi.' });
    }
});

module.exports = router;
