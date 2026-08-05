/*
 * ÖZET:
 * Bu modül, her ayın 1'inde otomatik olarak personel maaşlarını ve mesailerini hesaplayıp 
 * finans tablosuna gider olarak işleyen zamanlanmış (cron) görevdir.
 */

const cron = require('node-cron');
const db = require('../db');

// Her ayın 1. günü saat 01:00'da çalışır (0 1 1 * *)
cron.schedule('0 1 1 * *', async () => {
    let connection;
    try {
        console.log('Maaş ödeme günü (Ayın 1\'i) geldi. Geçen ayın maaş ve mesaileri hesaplanıp gidere yazılıyor...');
        
        // 1. Güvenli Tarih Hesaplama: Yılbaşı/Ay atlama bug'ını önler
        const now = new Date();
        const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const targetMonth = targetDate.getMonth() + 1; // 1-12 formatı
        const targetYear = targetDate.getFullYear();
        const periodStr = `${targetMonth}/${targetYear}`;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 2. İdempotency (Çift Kayıt) Kontrolü
        const [existing] = await connection.query(`
            SELECT COUNT(*) as cnt 
            FROM finance_transactions 
            WHERE category = 'Personel Maaşı' 
              AND description LIKE ?
        `, [`%${periodStr} dönemi maaş ödemesi yapıldı%`]);

        if (existing[0].cnt > 0) {
            console.warn(`⚠️ [Maaş Cron] ${periodStr} dönemi için maaşlar zaten ödenmiş! İşlem iptal edildi (Mükerrer Ödeme Koruması).`);
            await connection.rollback();
            connection.release();
            return;
        }

        // 3. Personel ve Mesai Bilgilerini Çek
        const [empRows] = await connection.query(`
            SELECT e.id, e.full_name, e.salary, e.work_status,
                   COALESCE(SUM(o.total_amount), 0) AS last_month_overtime
            FROM employees e
            LEFT JOIN employee_overtimes o ON e.id = o.employee_id 
                                           AND o.month = ? 
                                           AND o.year = ?
            WHERE e.work_status IN ('Çalışıyor', 'Aktif', 'İzinli') AND e.salary > 0
            GROUP BY e.id
        `, [targetMonth, targetYear]);

        if (empRows.length === 0) {
            console.log(`[Maaş Cron] ${periodStr} dönemi için maaş ödenecek aktif personel bulunamadı.`);
            await connection.rollback();
            connection.release();
            return;
        }

        // 4. Finans Tablosuna Gider Olarak İşle
        for (const emp of empRows) {
            const baseSalary = parseFloat(emp.salary) || 0;
            const overtimePay = parseFloat(emp.last_month_overtime) || 0;
            
            // Not: İleride avans/kesinti modülü gelirse, totalSalary hesabından düşülmelidir.
            const totalSalary = baseSalary + overtimePay;

            if (totalSalary > 0) {
                const desc = `${emp.full_name} personelinin ${periodStr} dönemi maaş ödemesi yapıldı (Sabit: ${baseSalary} TL, Mesai: ${overtimePay} TL)`;
                await connection.query(`
                    INSERT INTO finance_transactions 
                    (type, amount, category, description, transaction_date) 
                    VALUES ('GİDER', ?, 'Personel Maaşı', ?, CURDATE())
                `, [totalSalary, desc]);
            }
        }
        
        // 5. Eski Mesaileri Temizle
        await connection.query(`
            DELETE FROM employee_overtimes 
            WHERE month = ? AND year = ?
        `, [targetMonth, targetYear]);

        // 6. İşlemi Onayla
        await connection.commit();
        console.log(`✅ [Maaş Cron] ${periodStr} dönemi için tüm personel maaşları finans tablosuna işlendi ve mesailer sıfırlandı.`);

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('❌ [Maaş Cron] Maaş otomasyonu hatası (İşlem geri alındı):', error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
});
