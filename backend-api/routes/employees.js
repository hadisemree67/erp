/**
 * ============================================================================
 * DOSYA ADI: employees.js
 * MODÜL / KATMAN: Arkayüz Rotası (API Route) - İnsan Kaynakları (Çalışanlar)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Şirket çalışanlarının (personelin) özlük bilgileri, maaş bilgileri, departman atamaları, izin talepleri ve işten ayrılma (offboarding) süreçlerini yöneten HTTP API uç noktalarını tanımlar.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - Express.js Router, Veritabanı İşlemleri (CRUD), Asenkron Sorgular
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Önyüzdeki EmployeeList, EmployeeForm, LeaveManagement ve EmployeeOffboard bileşenleri ile doğrudan haberleşir.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { logActivity } = require('../utils/logger');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const safeStr = (val) => {
    if (val === undefined || val === null || String(val).trim() === '' || String(val).trim() === 'undefined' || String(val).trim() === 'null') {
        return null;
    }
    return String(val).trim();
};

const safeNum = (val) => {
    const s = safeStr(val);
    if (!s) return null;
    let clean = s.replace(/₺/g, '').replace(/ /g, '');
    if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(/,/g, '.');
    }
    const n = Number(clean);
    return isNaN(n) ? null : n;
};

const safeDate = (val) => {
    const s = safeStr(val);
    if (!s) return null;
    return s;
};

async function ensureEmployeeTables() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                department VARCHAR(100),
                position VARCHAR(100),
                phone VARCHAR(50),
                email VARCHAR(100),
                start_date DATE NULL,
                salary DECIMAL(10,2) NULL,
                tckn VARCHAR(20),
                address TEXT,
                blood_type VARCHAR(10),
                emergency_contact VARCHAR(100),
                photo_path VARCHAR(255),
                is_active TINYINT DEFAULT 1,
                hakedilen_yillik_izin INT DEFAULT 14,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const cols = [
            ['department', 'VARCHAR(100)'],
            ['position', 'VARCHAR(100)'],
            ['phone', 'VARCHAR(50)'],
            ['email', 'VARCHAR(100)'],
            ['start_date', 'DATE NULL'],
            ['salary', 'DECIMAL(10,2) NULL'],
            ['tckn', 'VARCHAR(20)'],
            ['address', 'TEXT'],
            ['blood_type', 'VARCHAR(10)'],
            ['emergency_contact', 'VARCHAR(100)'],
            ['photo_path', 'VARCHAR(255)'],
            ['is_active', 'TINYINT DEFAULT 1'],
            ['hakedilen_yillik_izin', 'INT DEFAULT 14'],
            ['work_status', "VARCHAR(50) DEFAULT 'Aktif'"]
        ];
        for (const [col, def] of cols) {
            try {
                await db.query(`ALTER TABLE employees ADD COLUMN ${col} ${def}`);
            } catch(e) {
                if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') console.warn(`Kolon ekleme hatası (${col}):`, e.message);
            }
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS employee_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                file_name VARCHAR(255),
                file_path VARCHAR(255),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS employee_leaves (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee_id INT NOT NULL,
                leave_type VARCHAR(100) NOT NULL,
                payment_status VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                total_days INT NOT NULL,
                status VARCHAR(50) DEFAULT 'Onaylandı',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);
    } catch(err) {
        console.error('Employee table init error:', err);
    }
}
ensureEmployeeTables();

// GET: Tüm personelleri getir
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM employees';
        let params = [];
        
        if (search) {
            query += ' WHERE full_name LIKE ? OR tckn LIKE ?';
            params = [`%${search}%`, `%${search}%`];
        }
        
        query += ' ORDER BY is_active DESC, id DESC';
        
        const [rows] = await db.query(query, params);
        
        // Her çalışan için şu anda (bugün) aktif bir izin veya rapor var mı kontrol edelim:
        let leaveMap = {};
        try {
            const [activeLeaves] = await db.query(`
                SELECT employee_id, leave_type, start_date, end_date, total_days 
                FROM employee_leaves 
                WHERE DATE(start_date) <= CURDATE() AND DATE(end_date) >= CURDATE() AND (status = 'Onaylandı' OR status IS NULL OR status = '')
            `);
            activeLeaves.forEach(l => {
                leaveMap[l.employee_id] = l;
            });
        } catch(e) {
            console.log('İzin sorgusu uyarı:', e.message);
        }

        const enrichedRows = rows.map(emp => {
            const activeLeave = leaveMap[emp.id];
            const isOnLeave = Boolean(activeLeave || emp.work_status === 'İzinli' || emp.work_status === 'İzinli / Raporlu');
            return {
                ...emp,
                is_on_leave: isOnLeave,
                active_leave_type: activeLeave ? activeLeave.leave_type : (emp.work_status === 'İzinli' || emp.work_status === 'İzinli / Raporlu' ? 'İzinli / Raporlu' : null),
                active_leave_end: activeLeave ? activeLeave.end_date : null
            };
        });

        res.json(enrichedRows);
    } catch (error) {
        console.error('Personel listesi çekilirken hata:', error);
        res.status(500).json({ success: false, message: 'Personeller getirilemedi: ' + (error.sqlMessage || error.message || error) });
    }
});

// POST: Yeni personel ekle
router.post('/', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'documents', maxCount: 10 }]), async (req, res) => {
    const { full_name, department, position, phone, email, start_date, salary, tckn, address, blood_type, emergency_contact, work_status } = req.body;
    const photo_path = req.files && req.files.photo ? `/uploads/${req.files.photo[0].filename}` : null;
    
    if (!full_name || !safeStr(full_name)) {
        return res.status(400).json({ success: false, message: 'Ad Soyad zorunludur.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO employees (full_name, department, position, phone, email, start_date, salary, tckn, address, blood_type, emergency_contact, photo_path, work_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [safeStr(full_name), safeStr(department), safeStr(position), safeStr(phone), safeStr(email), safeDate(start_date), safeNum(salary), safeStr(tckn), safeStr(address), safeStr(blood_type), safeStr(emergency_contact), photo_path, safeStr(work_status) || 'Aktif']
        );
        
        const insertId = result.insertId;

        // Dosyaları kaydet
        if (req.files && req.files.documents) {
            for (const doc of req.files.documents) {
                await db.query(
                    'INSERT INTO employee_documents (employee_id, file_name, file_path) VALUES (?, ?, ?)',
                    [insertId, doc.originalname, `/uploads/${doc.filename}`]
                );
            }
        }
        
        await logActivity(req.headers['x-user-id'] || '', 'INSERT', 'employees', insertId, `"${full_name}" adlı personeli İK listesine ekledi.`, null);

        res.status(201).json({ success: true, message: 'Personel başarıyla eklendi.' });
    } catch (error) {
        console.error('Personel eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + (error.sqlMessage || error.message || error) });
    }
});
// PUT: Seçili personelleri toplu düzenle
router.put('/bulk-edit', async (req, res) => {
    const { ids, updates } = req.body; 
    
    let finalUpdates = updates;
    if (!finalUpdates && req.body.field) {
        finalUpdates = [{ field: req.body.field, type: req.body.type, value: req.body.value }];
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Personel seçilmedi.' });
    }
    if (!finalUpdates || !Array.isArray(finalUpdates) || finalUpdates.length === 0) {
        return res.status(400).json({ success: false, message: 'Değişiklik bulunamadı.' });
    }

    try {
        await db.query('START TRANSACTION');
        
        for (const id of ids) {
            const [oldRows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
            if (oldRows.length === 0) continue;
            const oldData = oldRows[0];
            
            for (const update of finalUpdates) {
                const { field, type, value } = update;
                if (!['salary', 'departmentAndPosition'].includes(field)) continue;

                let newVal;
                let logMsg = '';
                const isNumeric = ['salary'].includes(field);

                if (isNumeric) {
                    let currentVal = parseFloat(oldData[field]) || 0;
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) continue;

                    newVal = currentVal;
                    
                    if (type === 'percentage') {
                        newVal = currentVal + (currentVal * numValue / 100);
                    } else if (type === 'fixed') {
                        newVal = currentVal + numValue;
                    }
                    
                    if (newVal < 0) newVal = 0;
                    
                    const actionText = numValue >= 0 ? 'artırdı' : 'düşürdü';
                    const valText = type === 'percentage' ? `%${Math.abs(numValue)}` : `${Math.abs(numValue)}₺`;
                    logMsg = `"${oldData.full_name}" adlı personelin maaşını ${valText} ${actionText}.`;

                    await db.query(`UPDATE employees SET ${field} = ? WHERE id = ?`, [newVal, id]);
                } else if (field === 'departmentAndPosition') {
                    const { department, position } = value;
                    logMsg = `"${oldData.full_name}" adlı personelin birimini "${department}" ve görevini "${position}" olarak güncelledi.`;

                    await db.query(`UPDATE employees SET department = ?, position = ? WHERE id = ?`, [department, position, id]);
                }
                
                await logActivity(req.headers['x-user-id'], 'UPDATE', 'employees', id, logMsg, oldData);
            }
        }
        
        await db.query('COMMIT');
        res.json({ success: true, message: `${ids.length} adet personel başarıyla güncellendi.` });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Toplu düzenleme hatası:', error);
        res.status(500).json({ success: false, message: 'Toplu güncelleme sırasında sunucu hatası oluştu.' });
    }
});

// DELETE: Seçili personelleri toplu sil
router.delete('/bulk', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Silinecek personel seçilmedi.' });
    }
    
    try {
        await db.query('START TRANSACTION');
        
        for (const id of ids) {
            const [oldRows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
            if (oldRows.length === 0) continue;
            const oldData = oldRows[0];
            
            await db.query('DELETE FROM employees WHERE id = ?', [id]);
            await logActivity(req.headers['x-user-id'], 'DELETE', 'employees', id, `"${oldData.full_name}" adlı personeli toplu işlem ile sistemden sildi.`, oldData);
        }
        
        await db.query('COMMIT');
        res.json({ success: true, message: `${ids.length} adet personel başarıyla silindi.` });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Toplu silme hatası:', error);
        res.status(500).json({ success: false, message: 'Personeller silinirken sunucu hatası oluştu.' });
    }
});

// PUT: Personel güncelle
router.put('/:id', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'documents', maxCount: 10 }]), async (req, res) => {
    const { id } = req.params;
    const { full_name, department, position, phone, email, start_date, salary, tckn, address, blood_type, emergency_contact, work_status } = req.body;
    
    if (!full_name || !safeStr(full_name)) {
        return res.status(400).json({ success: false, message: 'Ad Soyad zorunludur.' });
    }

    try {
        const [oldRows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
        const oldData = oldRows.length > 0 ? oldRows[0] : null;

        if (req.files && req.files.photo) {
            const photo_path = `/uploads/${req.files.photo[0].filename}`;
            await db.query(
                'UPDATE employees SET full_name=?, department=?, position=?, phone=?, email=?, start_date=?, salary=?, tckn=?, address=?, blood_type=?, emergency_contact=?, photo_path=?, work_status=? WHERE id=?',
                [safeStr(full_name), safeStr(department), safeStr(position), safeStr(phone), safeStr(email), safeDate(start_date), safeNum(salary), safeStr(tckn), safeStr(address), safeStr(blood_type), safeStr(emergency_contact), photo_path, safeStr(work_status) || 'Aktif', id]
            );
        } else {
            await db.query(
                'UPDATE employees SET full_name=?, department=?, position=?, phone=?, email=?, start_date=?, salary=?, tckn=?, address=?, blood_type=?, emergency_contact=?, work_status=? WHERE id=?',
                [safeStr(full_name), safeStr(department), safeStr(position), safeStr(phone), safeStr(email), safeDate(start_date), safeNum(salary), safeStr(tckn), safeStr(address), safeStr(blood_type), safeStr(emergency_contact), safeStr(work_status) || 'Aktif', id]
            );
        }

        // Dosyaları ek olarak kaydet (eskileri silmiyoruz, üstüne ekliyoruz)
        if (req.files && req.files.documents) {
            for (const doc of req.files.documents) {
                await db.query(
                    'INSERT INTO employee_documents (employee_id, file_name, file_path) VALUES (?, ?, ?)',
                    [id, doc.originalname, `/uploads/${doc.filename}`]
                );
            }
        }

        await logActivity(req.headers['x-user-id'] || '', 'UPDATE', 'employees', id, `"${full_name}" adlı personeli güncelledi.`, oldData);

        res.json({ success: true, message: 'Personel güncellendi.' });
    } catch (error) {
        console.error('Personel güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + (error.sqlMessage || error.message || error) });
    }
});

// POST: Çıkış Talebi Başlat (Offboard Request)
router.post('/:id/offboard-request', async (req, res) => {
    const { id } = req.params;
    const { sgk_code, end_date, exit_reason, severance_pay } = req.body;
    
    if (!end_date || !exit_reason || !sgk_code) {
        return res.status(400).json({ success: false, message: 'Çıkış tarihi, SGK Kodu ve nedeni zorunludur.' });
    }

    const initialDetails = {
        sgk_code,
        exit_reason,
        end_date,
        severance_pay: severance_pay || 0,
        approvals: {
            it: false,
            idari: false,
            finans: false,
            hukuk: false
        }
    };

    try {
        await db.query(
            'UPDATE employees SET offboarding_status=?, offboarding_details=? WHERE id=?',
            ['PENDING', JSON.stringify(initialDetails), id]
        );
        await logActivity(req.headers['x-user-id'], 'UPDATE', 'employees', id, `Personel için ${sgk_code} koduyla Çıkış Talebi başlattı.`, null);
        res.json({ success: true, message: 'Çıkış talebi başarıyla başlatıldı.' });
    } catch (error) {
        console.error('Çıkış talebi başlatılırken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// PUT: Departman Onayı Ver (Offboard Approve)
router.put('/:id/offboard-approve', async (req, res) => {
    const { id } = req.params;
    const { department, status } = req.body; // department: 'it', 'idari', 'finans', 'hukuk'

    try {
        const [rows] = await db.query('SELECT offboarding_status, offboarding_details FROM employees WHERE id = ?', [id]);
        if (rows.length === 0 || rows[0].offboarding_status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'Geçerli bir çıkış talebi bulunamadı.' });
        }

        const details = rows[0].offboarding_details;
        details.approvals[department] = status;

        await db.query(
            'UPDATE employees SET offboarding_details=? WHERE id=?',
            [JSON.stringify(details), id]
        );
        
        await logActivity(req.headers['x-user-id'], 'UPDATE', 'employees', id, `Çıkış talebi için ${department.toUpperCase()} onayını ${status ? 'verdi' : 'kaldırdı'}.`, null);
        res.json({ success: true, message: 'Onay durumu güncellendi.' });
    } catch (error) {
        console.error('Onay güncellenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// PUT: Personel çıkışını kesinleştir (Offboard Finalize)
router.put('/:id/offboard', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
        const oldData = rows.length > 0 ? rows[0] : null;
        
        if (!oldData || oldData.offboarding_status !== 'PENDING') {
            return res.status(404).json({ success: false, message: 'Onay bekleyen personel bulunamadı.' });
        }

        const details = oldData.offboarding_details;
        const apps = details.approvals;
        if (!apps.it || !apps.idari || !apps.finans || !apps.hukuk) {
            return res.status(400).json({ success: false, message: 'Tüm departman onayları tamamlanmadan çıkış kesinleştirilemez.' });
        }

        await db.query(
            'UPDATE employees SET is_active=0, work_status=?, end_date=?, exit_reason=?, severance_pay=?, offboarding_status=? WHERE id=?',
            ['İşten Ayrıldı', details.end_date, details.exit_reason, details.severance_pay, 'COMPLETED', id]
        );

        await logActivity(req.headers['x-user-id'], 'UPDATE', 'employees', id, `"${oldData.full_name}" adlı personelin çıkış işlemini (SGK ${details.sgk_code}) kesinleştirdi.`, oldData);

        res.json({ success: true, message: 'Personel çıkışı kesinleştirildi.' });
    } catch (error) {
        console.error('Personel çıkışı kesinleştirilirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});


// DELETE: Personel sil
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [oldRows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
        const oldData = oldRows.length > 0 ? oldRows[0] : null;

        await db.query('DELETE FROM employees WHERE id = ?', [id]);

        await logActivity(req.headers['x-user-id'], 'DELETE', 'employees', id, `"${oldData ? oldData.full_name : 'Bilinmeyen'}" adlı personeli listeden çıkardı.`, oldData);

        res.json({ success: true, message: 'Personel silindi.' });
    } catch (error) {
        console.error('Personel silinirken hata:', error);
        res.status(500).json({ success: false, message: 'Personel silinemedi.' });
    }
});

// Yardımcı fonksiyon: İSG kurallarına göre hakedilen toplam izni hesapla
function calculateTotalLeaveEntitlement(startDateStr) {
    if (!startDateStr) return 0;
    
    const startDate = new Date(startDateStr);
    const today = new Date();
    
    if (isNaN(startDate.getTime())) return 0;

    let totalDays = 0;
    let yearsOfService = 0;

    // Her tam yıl için hesaplama yap (başlangıç tarihinden bugüne kadar)
    let checkDate = new Date(startDate);
    checkDate.setFullYear(checkDate.getFullYear() + 1);

    while (checkDate <= today) {
        yearsOfService++;
        
        if (yearsOfService >= 1 && yearsOfService <= 5) {
            totalDays += 14;
        } else if (yearsOfService >= 6 && yearsOfService <= 15) {
            totalDays += 20;
        } else if (yearsOfService >= 16) {
            totalDays += 26;
        }
        
        checkDate.setFullYear(checkDate.getFullYear() + 1);
    }
    
    return totalDays;
}

// GET: İzin bakiyesini getir (hem leave-balance hem leave-summary uyumluluğu)
router.get(['/:id/leave-balance', '/:id/leave-summary'], async (req, res) => {
    const { id } = req.params;
    try {
        const [empRows] = await db.query('SELECT start_date FROM employees WHERE id = ?', [id]);
        if (empRows.length === 0) return res.status(404).json({ success: false, message: 'Personel bulunamadı.' });
        
        const startDate = empRows[0].start_date;
        const hakedilen = calculateTotalLeaveEntitlement(startDate);
        
        const [leaveRows] = await db.query(
            "SELECT COALESCE(SUM(total_days), 0) AS kullanilan FROM employee_leaves WHERE employee_id = ? AND payment_status = 'Ücretli' AND (status = 'Onaylandı' OR status IS NULL OR status = '')",
            [id]
        );
        const kullanilan = leaveRows[0].kullanilan;
        const kalan = hakedilen - kullanilan;
        
        res.json({ success: true, hakedilen, kullanilan, kalan });
    } catch (error) {
        console.error('İzin özeti alınırken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// GET: İzin geçmişini getir
router.get('/:id/leaves', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM employee_leaves WHERE employee_id = ? ORDER BY start_date DESC, id DESC', [id]);
        res.json({ success: true, leaves: rows });
    } catch (error) {
        console.error('İzin geçmişi alınırken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + (error.sqlMessage || error.message || error) });
    }
});

// POST: Personel için yeni izin ekle
router.post('/:id/leaves', async (req, res) => {
    const { id } = req.params;
    const { leave_type, payment_status, start_date, end_date, total_days, description } = req.body;
    
    if (!leave_type || !payment_status || !start_date || !end_date || !total_days) {
        return res.status(400).json({ success: false, message: 'Gerekli alanlar eksik.' });
    }

    try {
        await db.query(
            'INSERT INTO employee_leaves (employee_id, leave_type, payment_status, start_date, end_date, total_days, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, leave_type, payment_status, start_date, end_date, total_days, 'Onaylandı', description || null]
        );
        
        // Eğer eklenen izin/rapor tarihi bugün ile kesişiyorsa (şu an izinliyse), personel tablosundaki çalışma durumunu otomatik güncelleyelim:
        const todayStr = new Date().toISOString().split('T')[0];
        if (start_date <= todayStr && end_date >= todayStr) {
            await db.query("UPDATE employees SET work_status = 'İzinli' WHERE id = ?", [id]);
        }

        await logActivity(req.headers['x-user-id'] || '', 'INSERT', 'employee_leaves', id, `Personel için ${total_days} günlük ${leave_type} kaydedildi.`, null);
        res.json({ success: true, message: 'İzin başarıyla kaydedildi.' });
    } catch (error) {
        console.error('İzin eklenirken hata:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası: ' + (error.sqlMessage || error.message || error) });
    }
});
// ==========================================
// MESAI VE MAAŞ (OVERTIME & SALARIES)
// ==========================================

// Add overtime for one or multiple employees
router.post('/overtimes', async (req, res) => {
    try {
        const { employee_ids, overtime_date, hours, month, year } = req.body;
        
        if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Personel seçilmedi.' });
        }
        
        if (!overtime_date || !hours || !month || !year) {
            return res.status(400).json({ success: false, message: 'Gerekli alanlar eksik.' });
        }

        const h = parseFloat(hours);
        if (isNaN(h) || h <= 0) {
            return res.status(400).json({ success: false, message: 'Geçersiz mesai saati.' });
        }

        // Get employees to calculate hourly wages
        const placeholders = employee_ids.map(() => '?').join(',');
        const [employees] = await db.query(`SELECT id, salary FROM employees WHERE id IN (${placeholders})`, employee_ids);

        for (const emp of employees) {
            const salary = parseFloat(emp.salary) || 0;
            const hourly_wage = salary > 0 ? (salary / 225) : 0;
            const total_amount = hourly_wage * 1.5 * h;

            await db.query(
                `INSERT INTO employee_overtimes (employee_id, overtime_date, hours, hourly_wage, total_amount, month, year) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [emp.id, overtime_date, h, hourly_wage, total_amount, month, year]
            );
        }

        res.json({ success: true, message: 'Mesai başarıyla eklendi.' });
    } catch (error) {
        console.error('Mesai ekleme hatası:', error);
        res.status(500).json({ success: false, message: 'Mesai eklenirken sunucu hatası oluştu.' });
    }
});

// Get salaries and overtimes for a specific month and year
router.get('/salaries', async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Ay ve yıl belirtilmedi.' });
        }

        const query = `
            SELECT 
                e.id, 
                e.full_name, 
                e.department, 
                e.position, 
                e.salary as base_salary,
                COALESCE(SUM(eo.hours), 0) as total_overtime_hours,
                COALESCE(SUM(eo.total_amount), 0) as total_overtime_pay
            FROM employees e
            LEFT JOIN employee_overtimes eo ON e.id = eo.employee_id AND eo.month = ? AND eo.year = ?
            WHERE e.is_active = 1 OR e.work_status = 'Çalışıyor'
            GROUP BY e.id
            ORDER BY e.full_name ASC
        `;

        const [rows] = await db.query(query, [month, year]);
        
        const data = rows.map(r => ({
            ...r,
            total_salary: parseFloat(r.base_salary || 0) + parseFloat(r.total_overtime_pay || 0)
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Maaş listesi getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Maaş bilgileri alınırken sunucu hatası oluştu.' });
    }
});

module.exports = router;
