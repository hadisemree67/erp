/**
 * ============================================================================
 * BİLEŞEN ADI: crm.js
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP CRM - Müşteri Soru ve Taleplerinin yönetildiği API rotalarıdır.
 *   E-ticaret vitrininden gelen ürün sorularını listeler, yanıtlar, yayınlar
 *   veya kötü niyetli/uygunsuz soruların silinmesini sağlar.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Tüm rotalar ERP personel kimlik doğrulamasına tabidir
router.use(authMiddleware);

// GÜVENLİK: RBAC (Rol ve İzin Bazlı Erişim Kontrolü)
// Soru listesini görüntüleme yetkisi: Admin, Satış rolü veya 'view_crm', 'crm_tickets' iznine sahip personeller
const canViewQuestions = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Oturum bilgisi bulunamadı.' });
    if (req.user.role === 'admin' || req.user.role === 'Satış') return next();
    const perms = req.user.permissions || [];
    if (perms.includes('view_crm') || perms.includes('crm_tickets') || perms.includes('crm_customer_add')) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Müşteri soru ve taleplerini görüntüleme yetkiniz bulunmamaktadır.' });
};

// Soru yanıtlama, vitrinde yayınlama, durum değiştirme ve silme yetkisi:
// Sadece Admin, Satış rolü veya doğrudan 'crm_tickets' iznine sahip yetkili personeller
const canManageQuestions = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Oturum bilgisi bulunamadı.' });
    if (req.user.role === 'admin' || req.user.role === 'Satış') return next();
    const perms = req.user.permissions || [];
    if (perms.includes('crm_tickets')) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Müşteri sorularını yanıtlama, düzenleme veya silme yetkiniz bulunmamaktadır.' });
};

/**
 * [GET] /api/crm/questions
 * Soruları filtreleme, arama ve istatistiklerle birlikte listeler
 * GÜVENLİK: Yalnızca yetkili personel erişebilir
 */
router.get('/questions', canViewQuestions, async (req, res) => {
    try {
        const { status, topic, search } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = (page - 1) * limit;

        let whereClauses = [];
        let params = [];

        if (status && status !== 'Tümü') {
            whereClauses.push('pq.status = ?');
            params.push(status);
        }

        if (topic && topic !== 'Tümü') {
            whereClauses.push('pq.topic = ?');
            params.push(topic);
        }

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            whereClauses.push('(p.ProductName LIKE ? OR p.ProductCode LIKE ? OR c.CustomerName LIKE ? OR c.Email LIKE ? OR pq.question LIKE ?)');
            params.push(term, term, term, term, term);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // İstatistikler (Badge sayıları için)
        const [statsRows] = await db.query(`
            SELECT 
                COUNT(*) AS totalCount,
                SUM(CASE WHEN status = 'Beklemede' THEN 1 ELSE 0 END) AS pendingCount,
                SUM(CASE WHEN status = 'Cevaplandı' THEN 1 ELSE 0 END) AS answeredCount,
                SUM(CASE WHEN status = 'Reddedildi' THEN 1 ELSE 0 END) AS rejectedCount
            FROM product_questions
        `);
        const stats = {
            total: statsRows[0].totalCount || 0,
            pending: statsRows[0].pendingCount || 0,
            answered: statsRows[0].answeredCount || 0,
            rejected: statsRows[0].rejectedCount || 0
        };

        // Toplam eşleşen kayıt sayısı
        const [countRows] = await db.query(`
            SELECT COUNT(*) AS matchCount
            FROM product_questions pq
            JOIN products p ON pq.product_id = p.Id
            JOIN customers c ON pq.customer_id = c.Id
            ${whereSql}
        `, params);
        const totalMatches = countRows[0].matchCount || 0;

        // Soruları çek
        const dataSql = `
            SELECT 
                pq.id,
                pq.product_id,
                pq.customer_id,
                pq.topic,
                pq.is_anonymous,
                pq.question,
                pq.answer,
                pq.status,
                pq.answered_by,
                pq.created_at,
                pq.answered_at,
                p.ProductName,
                p.ProductCode,
                p.ImagePath,
                c.CustomerName,
                c.Email AS CustomerEmail,
                c.Phone AS CustomerPhone,
                COALESCE(u.name, u.username) AS AnsweredByName
            FROM product_questions pq
            JOIN products p ON pq.product_id = p.Id
            JOIN customers c ON pq.customer_id = c.Id
            LEFT JOIN users u ON pq.answered_by = u.id
            ${whereSql}
            ORDER BY pq.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const queryParams = [...params, limit, offset];
        const [rows] = await db.query(dataSql, queryParams);

        // ImagePath ayrıştır
        const questions = rows.map(q => {
            let images = [];
            try {
                if (q.ImagePath) images = JSON.parse(q.ImagePath);
            } catch (e) {
                if (q.ImagePath) images = [q.ImagePath];
            }
            return {
                ...q,
                productImage: images.length > 0 ? images[0] : null
            };
        });

        res.json({
            success: true,
            stats,
            total: totalMatches,
            page,
            limit,
            questions
        });
    } catch (error) {
        console.error('CRM soruları alınırken hata:', error);
        res.status(500).json({ success: false, message: 'Sorular yüklenirken hata oluştu.' });
    }
});

/**
 * [PUT] /api/crm/questions/:id/answer
 * Soruyu yanıtlar ve vitrinde yayınlanabilir 'Cevaplandı' durumuna getirir
 * GÜVENLİK: Yalnızca yetkili personel yanıtlayabilir ve girdi temizlenir
 */
router.put('/questions/:id/answer', canManageQuestions, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        const { answer } = req.body;

        if (!questionId || isNaN(questionId)) {
            return res.status(400).json({ success: false, message: 'Geçersiz soru ID.' });
        }

        const rawAnswer = (answer && typeof answer === 'string') ? answer.trim() : '';
        // XSS Önlemi: HTML taglerini temizle
        const cleanAnswer = rawAnswer.replace(/<[^>]*>?/gm, '').trim();

        if (!cleanAnswer) {
            return res.status(400).json({ success: false, message: 'Lütfen geçerli bir yanıt metni girin.' });
        }

        if (cleanAnswer.length > 2000) {
            return res.status(400).json({ success: false, message: 'Yanıt metni en fazla 2000 karakter olabilir.' });
        }

        const [existing] = await db.query(`
            SELECT pq.*, p.ProductName 
            FROM product_questions pq
            JOIN products p ON pq.product_id = p.Id
            WHERE pq.id = ?
        `, [questionId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Soru bulunamadı.' });
        }

        const questionData = existing[0];
        const staffId = req.user ? req.user.id : null;

        await db.query(`
            UPDATE product_questions 
            SET answer = ?, 
                status = 'Cevaplandı', 
                answered_by = ?, 
                answered_at = NOW() 
            WHERE id = ?
        `, [cleanAnswer, staffId, questionId]);

        // Müşteriye bildirim oluştur
        try {
            const truncatedAnswer = cleanAnswer.length > 100 ? cleanAnswer.slice(0, 100) + '...' : cleanAnswer;
            await db.query(`
                INSERT INTO customer_notifications (customer_id, type, title, message, link, is_read)
                VALUES (?, 'qa', ?, ?, ?, 0)
            `, [
                questionData.customer_id,
                'Sorunuz Satıcı Tarafından Cevaplandı! 💬',
                `"${questionData.ProductName}" ürünü için sorduğunuz soru yanıtlandı: "${truncatedAnswer}"`,
                `/urun/${questionData.product_id}`
            ]);
        } catch (notifErr) {
            console.error('Müşteri bildirimi oluşturma hatası:', notifErr);
        }

        try {
            if (logActivity && staffId) {
                await logActivity(staffId, 'UPDATE', 'product_questions', questionId, `"${questionData.ProductName}" ürününe ait soru yanıtlandı ve vitrinde yayınlandı.`, questionData);
            }
        } catch (logErr) {}

        res.json({ success: true, message: 'Soru başarıyla yanıtlandı ve yayınlandı.' });
    } catch (error) {
        console.error('Soru yanıtlama hatası:', error);
        res.status(500).json({ success: false, message: 'Soru yanıtlanırken sunucu hatası oluştu.' });
    }
});

/**
 * [DELETE] /api/crm/questions/:id
 * Kötü niyetli, spam veya uygunsuz soruları tamamen siler
 * GÜVENLİK: Yalnızca yetkili personel silebilir ve aktivite kaydedilir
 */
router.delete('/questions/:id', canManageQuestions, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        if (!questionId || isNaN(questionId)) {
            return res.status(400).json({ success: false, message: 'Geçersiz soru ID.' });
        }

        const [existing] = await db.query('SELECT * FROM product_questions WHERE id = ?', [questionId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Soru bulunamadı.' });
        }

        await db.query('DELETE FROM product_questions WHERE id = ?', [questionId]);

        const staffId = req.user ? req.user.id : null;
        try {
            if (logActivity && staffId) {
                await logActivity(staffId, 'DELETE', 'product_questions', questionId, `Kötü niyetli / uygunsuz soru silindi. (Soru: "${(existing[0].question || '').slice(0, 50)}")`, existing[0]);
            }
        } catch (logErr) {}

        res.json({ success: true, message: 'Soru başarıyla silindi.' });
    } catch (error) {
        console.error('Soru silme hatası:', error);
        res.status(500).json({ success: false, message: 'Soru silinirken hata oluştu.' });
    }
});

/**
 * [PUT] /api/crm/questions/:id/status
 * Soru durumunu günceller (Örn: 'Reddedildi', 'Beklemede')
 * GÜVENLİK: Yalnızca yetkili personel değiştirebilir
 */
router.put('/questions/:id/status', canManageQuestions, async (req, res) => {
    try {
        const questionId = parseInt(req.params.id, 10);
        const { status } = req.body;

        if (!questionId || isNaN(questionId)) {
            return res.status(400).json({ success: false, message: 'Geçersiz soru ID.' });
        }

        const allowedStatuses = ['Beklemede', 'Cevaplandı', 'Reddedildi'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Geçersiz durum değeri.' });
        }

        await db.query('UPDATE product_questions SET status = ? WHERE id = ?', [status, questionId]);

        try {
            if (logActivity && req.user?.id) {
                await logActivity(req.user.id, 'UPDATE', 'product_questions', questionId, `Soru durumu "${status}" olarak güncellendi.`);
            }
        } catch (logErr) {}

        res.json({ success: true, message: `Soru durumu "${status}" olarak güncellendi.` });
    } catch (error) {
        console.error('Soru durum güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Durum güncellenirken hata oluştu.' });
    }
});

module.exports = router;

