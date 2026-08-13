/*
 * `boxes` tablosuna (veya ilişkili tabloya) tedarikçi ataması yapmak için gerekli
 * sütunları / işlemleri veritabanına ekler.
 */

const db = require('../db');

async function updateBoxDb() {
    try {
        console.log('Veritabanı güncelleniyor: Kutu Tedarikçi ve Min Stok');

        const alters = [
            `ALTER TABLE packaging_boxes ADD COLUMN MinStockLevel INT DEFAULT 0;`
        ];

        for (let q of alters) {
            try {
                await db.query(q);
                console.log('Sütun eklendi.');
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log('Sütun zaten mevcut.');
                } else {
                    console.error('Sütun ekleme hatası:', e);
                }
            }
        }

        console.log('İşlem başarıyla tamamlandı!');
    } catch (err) {
        console.error('Genel hata:', err);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

updateBoxDb();
