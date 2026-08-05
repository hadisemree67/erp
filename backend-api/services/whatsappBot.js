const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('../db');
const { logActivity } = require('../utils/logger');
const { calculateShelf3D } = require('../utils/wmsUtils');

let client;
let isReady = false;

// Kullanıcıların bot ile olan etkileşim durumlarını tutacağımız geçici hafıza
// { '90532...': { step: 'awaiting_confirmation', data: { product: 'A', shelf: 'B', qty: 100 } } }
const userSessions = {};

const initializeWhatsAppBot = () => {
    console.log('WhatsApp Bot başlatılıyor...');

    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('Lütfen WhatsApp uygulamanızdan aşağıdaki QR Kodu okutun:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        isReady = true;
        console.log('WhatsApp Bot Başarıyla Bağlandı ve Hazır!');
    });

    client.on('authenticated', () => {
        console.log('WhatsApp Bot Doğrulandı!');
    });

    client.on('auth_failure', msg => {
        console.error('WhatsApp Bot Doğrulama Hatası:', msg);
    });

    client.on('message', async msg => {
        try {
            const sender = msg.from;
            const contact = await msg.getContact();
            const realPhone = contact.number ? contact.number + '@c.us' : sender;
            const text = msg.body.trim();
            const session = userSessions[sender];

            // 1. Onay Bekleme Aşaması
            if (session && session.step === 'awaiting_confirmation') {
                if (text.toLowerCase() === 'evet' || text.toLowerCase() === 'onayla') {
                    // Veritabanına kaydet
                    const { productBarcode, warehouseName, shelfBarcode, quantity, photoUrl } = session.data;
                    
                    const sql = `INSERT INTO whatsapp_pending_entries (phone_number, product_barcode, warehouse_name, shelf_barcode, quantity, photo_url) VALUES (?, ?, ?, ?, ?, ?)`;
                    await db.query(sql, [realPhone, productBarcode, warehouseName, shelfBarcode, quantity, photoUrl || null]);
                    
                    msg.reply('✅ İşleminiz başarıyla ERP Sorumlusunun onayına gönderildi.');
                    delete userSessions[sender];
                } else if (text.toLowerCase() === 'hayır' || text.toLowerCase() === 'iptal') {
                    msg.reply('❌ İşlem iptal edildi.');
                    delete userSessions[sender];
                } else {
                    msg.reply('Lütfen sadece "Evet" veya "Hayır" şeklinde cevap veriniz.');
                }
                return;
            }

            // 2. Yeni Mesaj (Metin veya Fotoğraf)
            if (msg.hasMedia) {
                // Fotoğraf gönderildiyse
                msg.reply('📸 Fotoğraf alındı. Lütfen teyit ediniz...');
                
                // NOT: Gerçek bir barkod okuma altyapısı (ZXing vb.) eklenebilir. 
                // Şimdilik WhatsApp sıkıştırması nedeniyle okuma zorluğuna karşı kullanıcıyı metne yönlendiriyoruz.
                const caption = msg.body;
                
                // Eğer açıklamada "ÜRÜNKODU RAFKODU MİKTAR" varsa oradan alalım
                if (caption && caption.split(' ').length >= 3) {
                    processEntry(sender, caption, msg, 'Görsel eklendi (Gelecekte URL olabilir)');
                } else {
                    msg.reply('⚠️ Fotoğraftan barkod net okunamadı veya miktar yazılmadı. Lütfen aralara VİRGÜL (,) koyarak şu formatta yazın:\n\n*Format:* ÜRÜN_BARKODU, DEPO_ADI, RAF_ADI, MİKTAR\n*Örnek:* 86901234, merkez, 1 b 2, 50');
                }
            } else {
                // Sadece Metin gönderildiyse
                if (text.toLowerCase() === 'yardım' || text.toLowerCase() === 'merhaba') {
                    msg.reply('👋 Merhaba! Ben ERP Stok Botu.\nStok girmek için lütfen aralara VİRGÜL (,) koyarak şu formatta mesaj yazın:\n\nÜRÜN_BARKODU, DEPO_ADI, RAF_ADI, MİKTAR\n\nÖrnek:\n*8690123456789, merkez depo, 1 b 2, 100*');
                    return;
                }

                processEntry(sender, text, msg, null);
            }

        } catch (error) {
            console.error('WhatsApp Mesaj İşleme Hatası:', error);
            msg.reply('Sistemsel bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    });

    client.initialize();
};

async function processEntry(sender, text, msg, photoUrl) {
    // Virgül ile ayır
    const parts = text.split(',').map(p => p.trim()).filter(p => p !== '');
    
    if (parts.length === 2) {
        const productBarcode = parts[0];
        const quantity = parseInt(parts[1], 10);
        
        if (isNaN(quantity) || quantity >= 0) {
            msg.reply('⚠️ FEFO Hızlı Çıkış formatı için miktar negatif (-) olmalıdır.\nÖrnek: 86901234, -25');
            return;
        }

        // Ürünü teyit et
        let productName = 'Bilinmeyen Ürün (' + productBarcode + ')';
        try {
            const [rows] = await db.query('SELECT ProductName FROM products WHERE Barcode LIKE ?', [`%${productBarcode}%`]);
            if (rows && rows.length > 0) {
                productName = rows[0].ProductName;
            }
        } catch(e) {}

        userSessions[sender] = {
            step: 'awaiting_confirmation',
            data: { productBarcode, warehouseName: 'OTO-FEFO', shelfBarcode: 'OTO-FEFO', quantity, photoUrl }
        };

        let confirmMsg = `📦 *Stok Çıkış (FEFO) Teyidi*\n\n`;
        confirmMsg += `*Ürün:* ${productName}\n`;
        confirmMsg += `*Miktar:* ${Math.abs(quantity)} Adet ÇIKILACAK\n\n`;
        confirmMsg += `Sistem en yakın SKT'ye sahip raflardan otomatik düşüm yapacaktır.\nYukarıdaki işlemi onaylıyor musunuz? (Evet / Hayır)`;
        msg.reply(confirmMsg);

    } else if (parts.length >= 4) {
        const productBarcode = parts[0];
        const warehouseName = parts[1];
        const shelfBarcode = parts[2];
        const quantity = parseInt(parts[3], 10);
        
        if (isNaN(quantity)) {
             msg.reply('⚠️ Miktar algılanamadı (Sayı olmalıdır). Lütfen aralara virgül koyarak şu formata uyun:\nÜRÜN_BARKODU, DEPO_ADI, RAF_ADI, MİKTAR');
             return;
        }

        // Veritabanından ürünü ve rafı teyit et ile Kapasite Kontrolü
        let productName = 'Bilinmeyen Ürün (' + productBarcode + ')';
        let hasCapacityError = false;
        let errorMsg = '';
        
        try {
            const [pData] = await db.query('SELECT Id, ProductName, Width, Height, Depth, Volume, package_capacity, is_stackable, max_stack_limit FROM products WHERE Barcode LIKE ?', [`%${productBarcode}%`]);
            if (pData && pData.length > 0) {
                const prod = pData[0];
                productName = prod.ProductName;
                
                const cleanShelf = shelfBarcode.replace(/[\s\-]/g, '').toLowerCase();
                const [sData] = await db.query(`
                    SELECT ws.id, ws.warehouse_id, ws.shelf_code, ws.width, ws.height, ws.depth, ws.max_volume, w.name as warehouse_name
                    FROM warehouse_shelves ws
                    JOIN warehouses w ON ws.warehouse_id = w.id
                    WHERE 
                      (LOWER(REPLACE(REPLACE(ws.barcode, ' ', ''), '-', '')) = ? OR LOWER(REPLACE(REPLACE(ws.shelf_code, ' ', ''), '-', '')) = ?) 
                      AND w.name LIKE ?
                `, [cleanShelf, cleanShelf, `%${warehouseName}%`]);
                
                if (sData && sData.length > 0) {
                    const shelf = sData[0];
                    
                    const [filledData] = await db.query(`
                        SELECT b.product_id, b.quantity, p.Volume as pVol, p.Width as pW, p.Height as pH, p.Depth as pD, p.package_capacity as pCap
                        FROM wms_stock_balances b
                        JOIN products p ON b.product_id = p.Id
                        WHERE b.warehouse_id = ? AND b.shelf_code = ?
                    `, [shelf.warehouse_id, shelf.shelf_code]);
                    
                    let currentFilledVol = 0;
                    let currentPackages = 0;
                    for (const f of filledData) {
                        let fPW = parseFloat(f.pW) || 0;
                        let fPH = parseFloat(f.pH) || 0;
                        let fPD = parseFloat(f.pD) || 0;
                        let vol = parseFloat(f.pVol) || 0;
                        if (fPW * fPH * fPD > 0) vol = fPW * fPH * fPD;
                        
                        let fCap = parseFloat(f.pCap) || 1;
                        let pkgs = Math.ceil((parseFloat(f.quantity) || 0) / fCap);
                        currentPackages += pkgs;
                        currentFilledVol += pkgs * vol;
                    }
                    
                    const calc = calculateShelf3D({
                        sW: parseFloat(shelf.width) || 0,
                        sH: parseFloat(shelf.height) || 0,
                        sD: parseFloat(shelf.depth) || 0,
                        maxVolume: parseFloat(shelf.max_volume) || 0,
                        pW: parseFloat(prod.Width) || 0,
                        pH: parseFloat(prod.Height) || 0,
                        pD: parseFloat(prod.Depth) || 0,
                        productVolume: parseFloat(prod.Volume) || 0,
                        isStackable: (prod.is_stackable === 1 || prod.is_stackable === true || prod.is_stackable === '1'),
                        maxStackLimit: parseInt(prod.max_stack_limit) || 1,
                        pCap: parseFloat(prod.package_capacity) || 1,
                        currentPackages, 
                        currentFilledVol
                    });
                    
                    if (calc.maxItems !== Infinity && quantity > calc.maxItems) {
                        hasCapacityError = true;
                        errorMsg = `⚠️ *HATA: KAPASİTE AŞIMI*\n\nBelirttiğiniz *${shelf.shelf_code}* rafına ${quantity} adet ürün sığmaz. Rafa maksimum *${calc.maxItems} adet* daha ürün koyabilirsiniz.\n\n`;
                        
                        const [otherShelves] = await db.query(`
                            SELECT shelf_code, quantity 
                            FROM wms_stock_balances 
                            WHERE product_id = ? AND shelf_code != ? AND quantity > 0
                            ORDER BY quantity DESC LIMIT 3
                        `, [prod.Id, shelf.shelf_code]);
                        
                        if (otherShelves && otherShelves.length > 0) {
                            errorMsg += `💡 *Önerilen Diğer Raflar (Aynı Ürün Var):*\n`;
                            otherShelves.forEach(os => {
                                errorMsg += `- ${os.shelf_code} (Mevcut: ${os.quantity})\n`;
                            });
                        } else {
                            errorMsg += `💡 *Önerilen Diğer Raflar:*\nBu ürünün halihazırda bulunduğu başka bir raf bulunamadı.`;
                        }
                    }
                }
            }
        } catch(e) { console.error('WhatsApp Bot Capacity Error:', e); }

        if (hasCapacityError) {
            msg.reply(errorMsg);
            return;
        }

        userSessions[sender] = {
            step: 'awaiting_confirmation',
            data: { productBarcode, warehouseName, shelfBarcode, quantity, photoUrl }
        };

        let confirmMsg = `📦 *Stok Giriş Teyidi*\n\n`;
        confirmMsg += `*Ürün:* ${productName}\n`;
        confirmMsg += `*Depo:* ${warehouseName}\n`;
        confirmMsg += `*Raf:* ${shelfBarcode}\n`;
        confirmMsg += `*Miktar:* ${quantity} Adet\n\n`;
        confirmMsg += `Yukarıdaki işlemi onaylıyor musunuz? (Evet / Hayır)`;
        msg.reply(confirmMsg);

    } else {
        msg.reply('⚠️ Geçersiz format. Lütfen aralara VİRGÜL (,) koyarak şu formattan birini kullanın:\n\n*GİRİŞ İÇİN:*\nÜRÜN_BARKODU, DEPO_ADI, RAF_ADI, MİKTAR (Örn: 869012, merkez, 1b2, 100)\n\n*ÇIKIŞ (FEFO) İÇİN:*\nÜRÜN_BARKODU, -MİKTAR (Örn: 869012, -25)');
    }
}

const getPendingEntries = async () => {
    try {
        const query = `
            SELECT 
                wpe.*, 
                e.full_name as sender_name 
            FROM whatsapp_pending_entries wpe
            LEFT JOIN employees e 
                ON RIGHT(REGEXP_REPLACE(e.phone, '[^0-9]', ''), 10) COLLATE utf8mb4_unicode_ci = RIGHT(REGEXP_REPLACE(wpe.phone_number, '[^0-9]', ''), 10) COLLATE utf8mb4_unicode_ci
                AND e.phone IS NOT NULL AND e.phone != ''
            WHERE wpe.status = "Bekliyor" 
            ORDER BY wpe.created_at DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    } catch (e) {
        throw e;
    }
};

const approveEntry = async (id, processorId, approverName) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        // 1. Kaydı al
        const [rows] = await connection.query(`
            SELECT 
                wpe.*, 
                e.full_name as sender_name 
            FROM whatsapp_pending_entries wpe
            LEFT JOIN employees e 
                ON RIGHT(REGEXP_REPLACE(e.phone, '[^0-9]', ''), 10) COLLATE utf8mb4_unicode_ci = RIGHT(REGEXP_REPLACE(wpe.phone_number, '[^0-9]', ''), 10) COLLATE utf8mb4_unicode_ci
                AND e.phone IS NOT NULL AND e.phone != ''
            WHERE wpe.id = ?
        `, [id]);
        if (rows.length === 0) throw new Error('Kayıt bulunamadı');
        const entry = rows[0];

        if (entry.status !== 'Bekliyor') throw new Error('Bu kayıt zaten işlenmiş.');

        // 2. Ürünü bul
        const [products] = await connection.query('SELECT Id, shelf_life_months FROM products WHERE Barcode LIKE ?', [`%${entry.product_barcode}%`]);
        if (products.length === 0) throw new Error('Ürün barkodu sistemde bulunamadı.');
        const productId = products[0].Id;
        const shelfLifeMonths = products[0].shelf_life_months || 0;

        const senderName = entry.sender_name || 'Bilinmeyen Personel';
        const finalApproverName = approverName || 'Bilinmeyen Yönetici';
        const description = `WhatsApp: ${senderName} tarafından gönderildi. Onaylayan: ${finalApproverName} (Ref: WP-${id})`;

        if (entry.quantity < 0) {
            // FEFO Çıkış Mantığı
            const deductQty = Math.abs(entry.quantity);
            
            // Toplam stok kontrolü
            const [productData] = await connection.query('SELECT StockQuantity FROM products WHERE Id = ?', [productId]);
            if (!productData || productData[0].StockQuantity < deductQty) {
                throw new Error(`Yetersiz stok! Mevcut: ${productData ? productData[0].StockQuantity : 0}`);
            }

            const [balances] = await connection.query(
                'SELECT * FROM wms_stock_balances WHERE product_id = ? AND quantity > 0 ORDER BY ISNULL(expiration_date), expiration_date ASC, id ASC FOR UPDATE',
                [productId]
            );

            let remainingToDeduct = deductQty;
            for (const balance of balances) {
                if (remainingToDeduct <= 0) break;

                const qtyToTake = Math.min(balance.quantity, remainingToDeduct);
                remainingToDeduct -= qtyToTake;

                if (balance.quantity === qtyToTake) {
                    await connection.query('DELETE FROM wms_stock_balances WHERE id = ?', [balance.id]);
                } else {
                    await connection.query('UPDATE wms_stock_balances SET quantity = quantity - ? WHERE id = ?', [qtyToTake, balance.id]);
                }

                await connection.query(
                    'INSERT INTO StockMovements (ProductId, UserId, MovementType, Quantity, warehouse_id, shelf_code, batch_number, expiration_date, Description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        productId, 
                        processorId, 
                        'OUT', 
                        qtyToTake, 
                        balance.warehouse_id, 
                        balance.shelf_code, 
                        balance.batch_number, 
                        balance.expiration_date, 
                        description + ' [FEFO Çıkışı]'
                    ]
                );
            }

            // Genel stoğu düşür
            await connection.query('UPDATE products SET StockQuantity = StockQuantity - ? WHERE Id = ?', [deductQty, productId]);
            
            // Düşük stok uyarısı (Asenkron)
            const { checkAndNotifyLowStock } = require('../utils/stockNotifier');
            checkAndNotifyLowStock(productId).catch(err => console.error("Stok uyarısı hatası:", err));

        } else {
            // Normal Giriş Mantığı
            const cleanShelf = entry.shelf_barcode.replace(/[\s\-]/g, '').toLowerCase();
            
            const [shelves] = await connection.query(`
                SELECT ws.id, ws.warehouse_id, ws.shelf_code 
                FROM warehouse_shelves ws
                JOIN warehouses w ON ws.warehouse_id = w.id
                WHERE 
                  (
                     LOWER(REPLACE(REPLACE(ws.barcode, ' ', ''), '-', '')) = ? 
                     OR LOWER(REPLACE(REPLACE(ws.shelf_code, ' ', ''), '-', '')) = ?
                  ) 
                  AND w.name LIKE ?
            `, [cleanShelf, cleanShelf, `%${entry.warehouse_name}%`]);
            
            if (shelves.length === 0) throw new Error('Belirtilen depo veya raf sistemde bulunamadı.');
            const locationId = shelves[0].id;
            const warehouseId = shelves[0].warehouse_id;
            const shelfCode = shelves[0].shelf_code;

            const today = new Date();
            const batchNum = 'WP-' + id + '-' + today.toISOString().slice(2, 10).replace(/-/g, '');
            let expirationDate = null;
            if (shelfLifeMonths > 0) {
                expirationDate = new Date(today);
                expirationDate.setMonth(expirationDate.getMonth() + shelfLifeMonths);
            }

            const inventorySql = `
                INSERT INTO stockmovements (
                    ProductId, location_id, MovementType, Quantity,
                    Description, UserId, warehouse_id, shelf_code,
                    batch_number, expiration_date
                ) VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.query(inventorySql, [
                productId, 
                locationId, 
                entry.quantity, 
                description, 
                processorId,
                warehouseId,
                shelfCode,
                batchNum,
                expirationDate
            ]);

            await connection.query('UPDATE products SET StockQuantity = StockQuantity + ? WHERE Id = ?', [entry.quantity, productId]);

            const [existingBalances] = await connection.query(
                'SELECT id FROM wms_stock_balances WHERE product_id = ? AND warehouse_id = ? AND shelf_code = ? AND COALESCE(batch_number, "") = ?',
                [productId, warehouseId, shelfCode, batchNum]
            );

            if (existingBalances.length > 0) {
                await connection.query('UPDATE wms_stock_balances SET quantity = quantity + ? WHERE id = ?', [entry.quantity, existingBalances[0].id]);
            } else {
                await connection.query(
                    'INSERT INTO wms_stock_balances (product_id, warehouse_id, shelf_code, batch_number, quantity, location_id, expiration_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [productId, warehouseId, shelfCode, batchNum, entry.quantity, locationId, expirationDate]
                );
            }
        }

        // WhatsApp statüsünü güncelle
        await connection.query('UPDATE whatsapp_pending_entries SET status = "Onaylandı", processed_at = NOW(), processor_id = ? WHERE id = ?', [processorId, id]);
        
        await logActivity(processorId, 'UPDATE', 'whatsapp_pending_entries', id, `WhatsApp stok talebi onaylandı. Ürün: ${entry.product_barcode}, Miktar: ${entry.quantity}`);

        // Bota mesaj attır
        if (isReady && client) {
            try {
                if (entry.quantity < 0) {
                    client.sendMessage(entry.phone_number, `✅ Gönderdiğiniz ${Math.abs(entry.quantity)} adet FEFO Çıkış talebi ERP yöneticisi tarafından onaylanarak stoktan başarıyla DÜŞÜLDÜ.`);
                } else {
                    client.sendMessage(entry.phone_number, `✅ Gönderdiğiniz ${entry.quantity} adet ürün ERP yöneticisi tarafından onaylanarak stoğa EKLENDİ.`);
                }
            } catch(e) { console.error('Kullanıcıya mesaj atılamadı:', e); }
        }

        await connection.commit();
        connection.release();
        return { success: true, isDeduction: entry.quantity < 0 };
    } catch (e) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        await connection.query('UPDATE whatsapp_pending_entries SET status = "Hatalı", processed_at = NOW(), processor_id = ? WHERE id = ?', [processorId, id]);
        throw e;
    }
};

const rejectEntry = async (id, processorId) => {
    try {
        const [rows] = await db.query('SELECT phone_number FROM whatsapp_pending_entries WHERE id = ?', [id]);
        
        const [result] = await db.query('UPDATE whatsapp_pending_entries SET status = "Reddedildi", processed_at = NOW(), processor_id = ? WHERE id = ?', [processorId, id]);
        if (result.affectedRows === 0) throw new Error('Talep bulunamadı.');

        await logActivity(processorId, 'UPDATE', 'whatsapp_pending_entries', id, `WhatsApp stok talebi reddedildi.`);

        if (rows.length > 0 && isReady && client) {
             client.sendMessage(rows[0].phone_number, `❌ Gönderdiğiniz giriş talebi ERP yöneticisi tarafından REDDEDİLDİ.`);
        }
        return { success: true };
    } catch (e) {
        throw e;
    }
}

module.exports = {
    initializeWhatsAppBot,
    getPendingEntries,
    approveEntry,
    rejectEntry
};
