/**
 * ============================================================================
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Bu modül, üretim ve imalat işlemlerini yönetir. Reçetelerin (formüllerin)
 *   okunması, stok kontrolleri (yeterli hammadde var mı?), makine kapasiteleri 
 *   üzerinden eşleştirme ve üretim aşamalarının takibi burada yapılır.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const {
  checkRole,
  checkPermission
} = require('../middleware/rbac');
const {
  logActivity
} = require('../utils/logger'); // assuming logger exists
const {
  sendMachineMaintenanceReminderEmail,
  sendMachineBreakdownEmail
} = require('../services/emailService');
const {
  checkAndNotifyLowStock
} = require('../utils/stockNotifier');

// =======================
// MAKİNE YÖNETİMİ
// =======================

// ===========================
// [GET] Tüm Makineleri ve Durumlarını Listeleme
// Üretim alanındaki tüm kazan/makineleri, kapasitelerini ve anlık doluluk/boşluk durumlarını getirir.
// ===========================
router.get('/machines', authMiddleware, checkPermission('view_production'), productionController.getMachines);

// ===========================
// [POST] Yeni Makine Ekleme
// Üretim bandına kapasite ve üretim kategorisi bazlı yeni bir makine/kazan kaydeder.
// ===========================
router.post('/machines', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postMachines);

// ===========================
// [PUT] Makine Durumunu Manuel Güncelleme
// Makineyi manuel olarak "Dolu", "Boş" veya "Arızalı" durumuna alır.
// ===========================
router.put('/machines/:id/status', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.putMachinesIdStatus);

// ===========================
// [PUT] Makine Bilgilerini Güncelleme
// Makinenin kapasite sınırlarını, izin verilen ürün kategorilerini ve bakım tarihlerini düzenler.
// ===========================
router.put('/machines/:id', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.putMachinesId);

// ===========================
// [POST] Makine Arıza Bildirimi (Otomatik Mail)
// Makineyi "Arızalı" duruma çeker ve ilgili yetkiliye/tedarikçiye sistem üzerinden otomatik arıza maili gönderir.
// ===========================
router.post('/machines/:id/report-issue', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postMachinesIdReportIssue);

// ===========================
// [DELETE] Makine Silme
// Sistemden makine kaydını kalıcı olarak siler.
// ===========================
router.delete('/machines/:id', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.deleteMachinesId);

// =======================
// ÜRETİM SİPARİŞLERİ
// =======================

// ===========================
// [POST] Uygun Makine/Kazan Eşleştirme (Algoritma)
// Üretilecek ürünün reçetesine (kategori) ve toplam hacmine göre boştaki en uygun makineyi seçer.
// ===========================
router.post('/orders/match', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersMatch);

// ===========================
// [POST] Yeni Üretim Siparişi (İş Emri) Oluşturma
// Reçeteyi okur, gereken hammadde stoklarını kontrol eder. Stok yetersizse uyarır, yeterliyse iş emri oluşturur.
// ===========================
router.post('/orders', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrders);

// ===========================
// [GET] Tüm Üretim Siparişleri (Aktif)
// Arşivlenmemiş tüm üretim (imalat) siparişlerini listeler.
// ===========================
router.get('/orders', authMiddleware, checkPermission('view_production'), productionController.getOrders);

// ===========================
// [DELETE] Üretim Siparişini İptal Etme
// Üretim adımları başlamamış bir siparişi iptal eder ve siler.
// ===========================
router.delete('/orders/:id', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.deleteOrdersId);

// ===========================
// [POST] Siparişi Arşivleme ve Tamamlama
// Tamamlanmış veya depoya teslim edilmiş üretimi aktif ekrandan kaldırıp geçmişe (arşive) yollar.
// ===========================
router.post('/orders/:id/archive', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdArchive);

// ===========================
// [GET] Üretim Siparişi Detayı (İş Kartı)
// Siparişin tüm bilgilerini, kullanılması gereken hammaddeleri ve üretim adımlarını (reçete aşamalarını) çeker.
// ===========================
router.get('/orders/:id', authMiddleware, checkPermission('view_production'), productionController.getOrdersId);

// ===========================
// [POST] Hammadde Toplama (Pick) İşlemi
// Depodan ilgili hammaddenin üretime alındığını onaylar (Toplandı işareti koyar).
// ===========================
router.post('/orders/:id/pick', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdPick);

// ===========================
// [POST] Üretimi (İş Emrini) Başlatma
// Malzemeleri depodan toplanan iş emrinin durumunu "Üretimde" olarak günceller ve makine adımlarına izin verir.
// ===========================
router.post('/orders/:id/start', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdStart);

// ===========================
// [POST] Üretim Adımını Başlatma (Makineyi Kilitleme)
// Belirli bir reçete adımını başlatır ve kullanılacak makineyi/kazanı işlemin süresi boyunca "Dolu" (kilitli) yapar.
// ===========================
router.post('/orders/:id/steps/:step_id/start', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdStepsStepIdStart);

// ===========================
// [POST] Malzeme Doğrulama (Barkod/Kontrol)
// Karışım esnasında personelin doğru hammaddeleri makineye kattığını teyit eder.
// ===========================
router.post('/orders/:id/steps/:step_id/verify-material', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdStepsStepIdVerifyMaterial);

// Belirli bir üretim adımını tamamla
router.post('/orders/:id/steps/:step_id/complete', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdStepsStepIdComplete);

// Üretimi tamamla
router.post('/orders/:id/complete', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdComplete);

// Users with Üretim role
router.get('/users', authMiddleware, checkPermission('view_production'), productionController.getUsers);

// Users with Depo role
router.get('/warehouse-users', authMiddleware, checkPermission('view_production'), productionController.getWarehouseUsers);

// ----------------- DEPO KABUL İŞLEMLERİ -----------------

// Fetch orders waiting for warehouse acceptance
router.get('/warehouse-acceptances', authMiddleware, checkPermission('view_production'), productionController.getWarehouseAcceptances);

// Mark order as accepted by warehouse manager
router.post('/orders/:id/accept-delivery', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdAcceptDelivery);

// Report defect / discrepancy and accept valid amount
router.post('/orders/:id/report-defect', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdReportDefect);

// Finalize stock entry by warehouse manager
router.post('/orders/:id/warehouse-stock-entry', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postOrdersIdWarehouseStockEntry);

// Get max producible quantity based on stock
router.get('/max-quantity/:productId', authMiddleware, checkPermission('view_production'), productionController.getMaxQuantityProductId);

// ==========================================
// PRODUCTION CAPACITY ANALYSIS
// ==========================================

// GET: Ürün için üretim kapasitesi ve hammadde analizi
router.get('/capacity-analysis/:productId', authMiddleware, checkPermission('view_production'), productionController.getCapacityAnalysisProductId);

// ==========================================
// PRODUCTION REQUESTS API
// ==========================================

// Get all production requests
router.get('/requests', authMiddleware, checkRole(['Üretim'], 'view_production'), productionController.getRequests);

// Create manual production request
router.post('/requests', authMiddleware, checkRole(['Üretim'], 'production_manage'), productionController.postRequests);

// Update request status
router.put('/requests/:id/status', authMiddleware, checkRole(['Üretim'], 'production_manage'), productionController.putRequestsIdStatus);

// Update product critical stock levels (for automated requests setup)
router.put('/product-stock-rules/:productId', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.putProductStockRulesProductId);

// Otomatik Stok Kontrolü ve Talep Oluşturma (Cron Job benzeri yapı)
async function checkCriticalStocks() {
  try {
    // Find all active products and delegate checking to the central logic
    const [products] = await db.query('SELECT Id FROM products WHERE Category != ?', ['Hammadde']);
    for (const p of products) {
      try {
        await checkAndNotifyLowStock(p.Id);
      } catch (err) {
        console.error(`Otomatik stok kontrolü hatası (Ürün ID: ${p.Id}):`, err);
      }
    }
  } catch (err) {
    console.error('Otomatik stok kontrol ana döngü hatası:', err);
  }
}

// Check every 2 hours
setInterval(checkCriticalStocks, 2 * 60 * 60 * 1000);
// Also run once on startup
setTimeout(checkCriticalStocks, 5000);

// Endpoint for manual trigger if needed
router.post('/trigger-stock-check', authMiddleware, checkPermission('production_manage'), checkRole(['Üretim']), productionController.postTriggerStockCheck);
module.exports = router;