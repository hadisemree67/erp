/*
 * ÖZET:
 * Bu modül, her ayın 1'inde otomatik olarak personel maaşlarını ve mesailerini hesaplayıp 
 * finans tablosuna gider olarak işleyen zamanlanmış (cron) görevdir.
 */

const cron = require('node-cron');
const db = require('../db');

// Her ayın 1. günü saat 01:00'da çalışır (0 1 1 * *)
cron.schedule('0 1 1 * *', async () => {
    try {
        console.log('Maaş ödeme günü (Ayın 1\'i) geldi. Geçen ayın maaş ve mesaileri hesaplanıp gidere yazılıyor...');
        
        // Geçen ayın ve yılın bulunması
        let date = new Date();
        date.setMonth(date.getMonth() - 1);
        let targetMonth = date.getMonth() + 1; // getMonth() 0-11 döner
        let targetYear = date.getFullYear();

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
            const baseSalary = parseFloat(emp.salary) || 0;
            const overtimePay = parseFloat(emp.last_month_overtime) || 0;
            const totalSalary = baseSalary + overtimePay;

            if (totalSalary > 0) {
                const desc = `${emp.full_name} personelinin ${targetMonth}/${targetYear} dönemi maaş ödemesi yapıldı (Sabit: ${baseSalary} TL, Mesai: ${overtimePay} TL)`;
                await db.query(`
                    INSERT INTO finance_transactions 
                    (type, amount, category, description, transaction_date) 
                    VALUES ('GİDER', ?, 'Personel Maaşı', ?, CURDATE())
                `, [totalSalary, desc]);
            }
        }
        
        // Kullanıcı isteği doğrultusunda eski mesaileri sıfırlama (silme)
        await db.query(`
            DELETE FROM employee_overtimes 
            WHERE month = ? AND year = ?
        `, [targetMonth, targetYear]);

        console.log('Tüm aktif personellerin maaşları başarıyla finans tablosuna işlendi ve mesailer sıfırlandı!');
    } catch (error) {
        console.error('Maaş otomasyonu hatası:', error);
    }
});
