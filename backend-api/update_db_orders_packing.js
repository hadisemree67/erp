const db = require('./db');

async function updateOrdersTable() {
    try {
        console.log('Veritabanı güncelleniyor: orders tablosuna BoxId ve TrackingNumber ekleniyor...');
        
        try {
            await db.query(`ALTER TABLE orders ADD COLUMN BoxId INT NULL`);
            console.log('BoxId eklendi.');
        } catch(e) {
            if (e.errno === 1060 || e.code === 'ER_DUP_FIELDNAME') {
                console.log('BoxId sütunu zaten mevcut.');
            } else {
                console.error('BoxId eklenirken hata:', e);
            }
        }

        try {
            await db.query(`ALTER TABLE orders ADD COLUMN TrackingNumber VARCHAR(255) NULL`);
            console.log('TrackingNumber eklendi.');
        } catch(e) {
            if (e.errno === 1060 || e.code === 'ER_DUP_FIELDNAME') {
                console.log('TrackingNumber sütunu zaten mevcut.');
            } else {
                console.error('TrackingNumber eklenirken hata:', e);
            }
        }
        
        console.log('İşlem tamamlandı.');
        process.exit(0);
    } catch (err) {
        console.error('Genel Hata:', err);
        process.exit(1);
    }
}

updateOrdersTable();
