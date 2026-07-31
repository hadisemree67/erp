const cron = require('node-cron');
const db = require('./db');

// Her ayın 1'inde gece 00:00'da çalışacak maaş ve mesai otomasyonu
cron.schedule('0 0 1 * *', async () => {
    console.log('Maaş ve Mesai otomatik ödeme işlemi başlatılıyor...');
    
    try {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const targetMonth = lastMonth.getMonth() + 1; // JS'de aylar 0-11
        const targetYear = lastMonth.getFullYear();

        // Aktif çalışanları ve geçen ayki mesailerini getir
        const [empRows] = await db.query(`
            SELECT e.id, e.full_name, e.salary, e.work_status,
                   COALESCE(SUM(o.total_amount), 0) AS last_month_overtime
            FROM employees e
            LEFT JOIN employee_overtimes o ON e.id = o.employee_id 
                                           AND o.month = ? 
                                           AND o.year = ?
            WHERE e.work_status IN ('Çalışıyor', 'Aktif', 'İzinli') AND e.salary > 0
            GROUP BY e.id
        `, [targetMonth, targetYear]);

        for (const emp of empRows) {
            const baseSalary = Number(emp.salary) || 0;
            const overtime = Number(emp.last_month_overtime) || 0;
            const totalAmount = baseSalary + overtime;

            if (totalAmount > 0) {
                // 1. Finance_transactions'a gider olarak ekle
                const description = `${emp.full_name} - ${targetMonth}/${targetYear} Maaş ve Mesai Ödemesi`;
                await db.query(`
                    INSERT INTO finance_transactions 
                    (type, category, description, amount, transaction_date) 
                    VALUES ('GİDER', 'Personel Maaşı', ?, ?, CURDATE())
                `, [description, totalAmount]);
            }
        }

        // 2. Mesaileri sıfırla (geçen aya ait mesaileri sil)
        // NOT: Kullanıcı isteği doğrultusunda tamamen sıfırlanıyor.
        await db.query(`
            DELETE FROM employee_overtimes 
            WHERE month = ? AND year = ?
        `, [targetMonth, targetYear]);

        console.log(`Otomatik maaş ödeme işlemi tamamlandı. Toplam ${empRows.length} personelin işlemi yapıldı.`);
    } catch (error) {
        console.error('Otomatik maaş ödeme işlemi sırasında hata:', error);
    }
});

module.exports = {};
