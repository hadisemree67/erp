/**
 * ============================================================================
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Bu modül, depo (Warehouse Management System) işlemlerini yönetir. 
 *   Mal kabul, raftan rafa transfer, 3D hacim/desi hesabı, stok sayım 
 *   düzenlemeleri ve lokasyon takibi bu dosyada yapılır.
 * ============================================================================
 */
const express = require('express');
const multer = require('multer');
const {
  checkAndNotifyLowStock
} = require('../utils/stockNotifier');
const router = express.Router();
const wmsController = require('../controllers/wmsController');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const {
  checkRole,
  checkPermission
} = require('../middleware/rbac');
const {
  logActivity
} = require('../utils/logger');
const {
  calculateShelf3D
} = require('../utils/wmsUtils');

// ===========================
// [GET] Tüm Depoları Listeleme
// Sistemdeki tüm fiziki veya sanal depoları listeler.
// ===========================
router.get('/warehouses', authMiddleware, wmsController.getWarehouses);

// Bir depo için lokasyonları getir
router.get('/warehouses/:warehouseId/locations', authMiddleware, wmsController.getWarehousesWarehouseIdLocations);

// Depo krokisini kaydet
router.post('/warehouses/:warehouseId/layout', authMiddleware, checkRole(['Depo', 'Yönetici', 'yonetici', 'Admin', 'admin']), wmsController.postWarehousesWarehouseIdLayout);

// Bir depoda belirli bir ürünü içeren rafları getir
router.get('/warehouses/:warehouseId/products/:productId/shelves', authMiddleware, wmsController.getWarehousesWarehouseIdProductsProductIdShelves);

// Depo krokisini getir
router.get('/warehouses/:warehouseId/layout', authMiddleware, wmsController.getWarehousesWarehouseIdLayout);

// ===========================
// [GET] Raf Bazlı Stok Detayı Getirme
// Seçilen rafa ait 3 boyutlu hacim hesaplamalarını (dolu/boş hacim) ve o raftaki mevcut ürünleri listeler.
// ===========================
router.get('/warehouses/:warehouseId/shelves/:shelfCode/stock', authMiddleware, wmsController.getWarehousesWarehouseIdShelvesShelfCodeStock);

// ===========================
// [POST] Rafı Tamamen Boşaltma
// Seçilen raftaki tüm ürünleri stoktan düşer (sıfırlar) ve işlem geçmişine log kaydı bırakır.
// ===========================
router.post('/warehouses/:warehouseId/shelves/:shelfCode/clear', authMiddleware, checkRole(['Depo', 'Yönetici', 'yonetici', 'Admin', 'admin']), wmsController.postWarehousesWarehouseIdShelvesShelfCodeClear);

// ===========================
// [POST] Manuel Mal Kabul (Stok Girişi)
// Depoya yeni gelen ürünleri raflara yerleştirir. 3D sığabilirlik kontrolü (kapasite aşımı) yapar ve otomatik finans gideri oluşturur.
// ===========================
router.post('/stock-entry', authMiddleware, checkPermission('stock_entry'), wmsController.postStockEntry);

// ===========================
// [GET] Genel Stok Envanteri Listeleme
// Tüm ürünlerin raf bazlı mevcut adetlerini, rafın maksimum alabileceği kapasiteyi ve ürün özelliklerini detaylı liste halinde çeker.
// ===========================
router.get('/stock-list', authMiddleware, checkPermission('inventory_view'), wmsController.getStockList);

// ===========================
// [PUT] Stok Bakiyesi Güncelleme (Manuel Düzeltme)
// Sayım farklılıklarında veya hatalı girişlerde; stok miktarını, raf lokasyonunu veya son kullanma tarihini manuel düzeltir.
// ===========================
router.put('/stock/:id', authMiddleware, checkRole(['Depo', 'Yönetici', 'yonetici', 'Admin', 'admin']), wmsController.putStockId);

// Bir stok bakiyesi satırını sil
router.delete('/stock/:id', authMiddleware, checkRole(['Depo', 'Yönetici', 'yonetici', 'Admin', 'admin']), wmsController.deleteStockId);

// ===========================
// [POST] Raftan Rafa Tekli Ürün Transferi
// Bir raftaki ürünü başka bir depoya veya rafa fiziksel olarak taşır. Eski raftan düşer, yeni rafa ekler.
// ===========================
router.post('/transfer', authMiddleware, checkRole(['Depo', 'Yönetici', 'yonetici', 'Admin', 'admin']), wmsController.postTransfer);

// ===========================
// [POST] Toplu Stok İşlemleri
// Seçilen birden fazla raf/stok kaydı için aynı anda ekleme, düşme, sıfırlama veya toplu transfer işlemleri gerçekleştirir.
// ===========================
router.post('/bulk-action', authMiddleware, checkRole(['Depo', 'Yönetici', 'yonetici', 'Admin', 'admin']), wmsController.postBulkAction);

// GET /shelf-capacity
router.get('/shelf-capacity', authMiddleware, wmsController.getShelfCapacity);

// GET /warehouse-capacities (bulk)
router.get('/warehouse-capacities', authMiddleware, wmsController.getWarehouseCapacities);

// GET /shelf-by-barcode
router.get('/shelf-by-barcode', authMiddleware, wmsController.getShelfByBarcode);

// FEFO tabanlı hızlı stok düşüşü (Hızlı Çıkış)
router.post('/deduct-fefo', authMiddleware, checkRole(['Depo', 'Yönetici', 'yonetici', 'Admin', 'admin']), wmsController.postDeductFefo);
module.exports = router;