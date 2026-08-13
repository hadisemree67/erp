/*
 * `orders` (Siparişler) tablosuna `BoxId` ve `TrackingNumber` sütunlarını ekler. 
 * Siparişin hangi kutuyla kargolandığını tutmak içindir.
 */

const db = require('../db');

async function updateOrdersTable() {
    try {
        console.log('Siparişler (orders) tablosuna kargo kutusu ve takip no sütunları ekleniyor...');

        try {
            await db.query(`ALTER TABLE orders ADD COLUMN BoxId INT NULL`);
            console.log('Kutu ID (BoxId) sütunu eklendi.');
        } catch (e) {
            if (e.errno === 1060 || e.code === 'ER_DUP_FIELDNAME') {
                console.log('Kutu ID (BoxId) sütunu zaten var.');
            } else {
                console.error('Kutu ID eklenirken hata oluştu:', e);
            }
        }

        try {
            await db.query(`ALTER TABLE orders ADD COLUMN TrackingNumber VARCHAR(255) NULL`);
            console.log('Kargo Takip No (TrackingNumber) eklendi.');
        } catch (e) {
            if (e.errno === 1060 || e.code === 'ER_DUP_FIELDNAME') {
                console.log('Kargo Takip No sütunu zaten var.');
            } else {
                console.error('Kargo Takip No eklenirken hata oluştu:', e);
            }
        }

        console.log('İşlem başarıyla tamamlandı!');
    } catch (err) {
        console.error('Sistem Hatası:', err);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

updateOrdersTable();
