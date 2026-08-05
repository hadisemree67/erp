/**
 * machineNotifier.js
 * Makinelerin periyodik bakım tarihlerini denetleyen ve yaklaşan bakımlar için 
 * tedarikçilere/ilgililere otomatik e-posta bildirimi gönderen arka plan servisi.
 */

const db = require('../db');
let sendMachineMaintenanceReminderEmail = null;

// E-posta servisinin çökme ihtimaline karşı güvenli yükleme
try {
    sendMachineMaintenanceReminderEmail = require('../services/emailService').sendMachineMaintenanceReminderEmail;
} catch (e) {
    console.warn('[Machine Notifier] emailService yüklenemedi, e-posta bildirimleri devre dışı.');
}

/**
 * Yaklaşan makine bakımlarını denetler ve e-posta iletir
 */
const checkUpcomingMaintenances = async () => {
    try {
        // Yalnızca gelecekte bakımı olan, e-posta adresi tanımlı ve henüz hatırlatılmamış makineleri getir
        const [rows] = await db.query(`
            SELECT * FROM production_machines 
            WHERE next_maintenance IS NOT NULL 
              AND supplier_email IS NOT NULL 
              AND TRIM(supplier_email) != '' 
              AND maintenance_reminder_sent = 0
        `);

        if (rows.length === 0) {
            return;
        }

        // Bugünü saat bileşenleri sıfırlanmış olarak alıyoruz (Timezone sapmalarını önleme)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let m of rows) {
            try {
                const nextDate = new Date(m.next_maintenance);
                nextDate.setHours(0, 0, 0, 0);

                // Gün farkı hesaplama
                const diffTime = nextDate - today;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                // MANTIK DÜZELTMESİ: Bakıma 0 ile 7 gün arası kaldıysa e-posta at
                // (diffDays < 0 olan yani tarihi çoktan geçmiş bakımlar için e-posta atmaz)
                if (diffDays >= 0 && diffDays <= 7) {
                    console.log(`[Machine Notifier] Bakım zamanı yaklaştı (${diffDays} gün kaldı): ${m.name || m.code}. E-posta hazırlanıyor...`);

                    if (sendMachineMaintenanceReminderEmail) {
                        const sent = await sendMachineMaintenanceReminderEmail(m, diffDays);

                        if (sent) {
                            await db.query('UPDATE production_machines SET maintenance_reminder_sent = 1 WHERE id = ?', [m.id]);
                            console.log(`[Machine Notifier] ${m.name || m.code} için bakım hatırlatması gönderildi ve işaretlendi.`);
                        }
                    }
                }
            } catch (singleMachineErr) {
                // Tek bir makinenin mail atımında hata çıkarsa diğer makinelerin döngüsü bozulmaz
                console.error(`[Machine Notifier] ${m.name} makinesi için bildirim gönderilirken hata:`, singleMachineErr.message);
            }
        }
    } catch (err) {
        console.error('[Machine Notifier] Bakım kontrolü genel veritabanı hatası:', err);
    }
};

module.exports = {
    checkUpcomingMaintenances
};
