const db = require('../db');
const { sendMachineMaintenanceReminderEmail } = require('../services/emailService');

const checkUpcomingMaintenances = async () => {
    try {
        const [rows] = await db.query('SELECT * FROM production_machines WHERE next_maintenance IS NOT NULL AND supplier_email IS NOT NULL AND maintenance_reminder_sent = 0');
        const now = new Date();
        for (let m of rows) {
            const nextDate = new Date(m.next_maintenance);
            const diffTime = nextDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Bakıma 7 gün veya daha az kaldıysa mail at
            if (diffDays <= 7) {
                console.log(`[Machine Notifier] Makine bakım zamanı yaklaştı (${diffDays} gün): ${m.name}. E-posta iletiliyor...`);
                const sent = await sendMachineMaintenanceReminderEmail(m);
                if (sent) {
                    await db.query('UPDATE production_machines SET maintenance_reminder_sent = 1 WHERE id = ?', [m.id]);
                    console.log(`[Machine Notifier] ${m.name} için bakım hatırlatması gönderildi ve işaretlendi.`);
                }
            }
        }
    } catch (err) {
        console.error('[Machine Notifier] Bakım kontrolü hatası:', err);
    }
};

module.exports = {
    checkUpcomingMaintenances
};
