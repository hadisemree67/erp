/**
 * ============================================================================
 * DOSYA ADI: StockList.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - WMS Operasyonları / Stok Hareket Geçmişi (Stock Ledger)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depolarda gerçekleşen tüm stok giriş, çıkış, transfer, mal kabul ve fire hareketlerinin tarihsel günlüğünü (log table) sunar. İşlem tarihi, ürün, depo ve hareket türüne göre filtreleme sağlar.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Hareket Günlüğü Tablosu, Tarih ve İşlem Filtreleri, Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - WMS modülünün denetim merkezidir; `/api/wms/stock-moves` API rotasından hareket geçmişini sorgular.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (StockList.jsx), Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect, Fragment } from 'react';
import StockEntry from './StockEntry';

const StockList = ({ currentUser, initialEntryVisible = false }) => {
  // 1. Durum (State) Tanımlamaları ve Hook'lar
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEntryVisible, setIsEntryVisible] = useState(initialEntryVisible);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('');
  
  // Expandable Rows State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState([]);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  
  const [isFastDeductVisible, setIsFastDeductVisible] = useState(false);
  const [fastDeductBarcode, setFastDeductBarcode] = useState('');
  const [fastDeductQty, setFastDeductQty] = useState('');
  const [fastDeductLoading, setFastDeductLoading] = useState(false);
  const [fastDeductSelectedShelf, setFastDeductSelectedShelf] = useState(''); // "warehouseId_shelfCode" format

  // Edit State
  const [editingStock, setEditingStock] = useState(null);
  const [sortBy, setSortBy] = useState('isim');
  const [productionRequestProduct, setProductionRequestProduct] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [allShelvesCapacity, setAllShelvesCapacity] = useState({});

  // 3. Backend API İstekleri (Veri Çekme)

  const fetchStockList = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('http://localhost:3000/api/wms/stock-list');
      const data = await response.json();
      if (data.success) {
        // Hammaddeleri Stok listesinden gizle
        setStockItems((data.data || []).filter(item => item.category !== 'Hammadde'));
      } else {
        setError(data.message || 'Stok listesi getirilemedi.');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

  useEffect(() => {
    setIsEntryVisible(initialEntryVisible);
  }, [initialEntryVisible]);

  useEffect(() => {
    fetchStockList();
    apiFetch('http://localhost:3000/api/warehouses')
      .then(res => res.json())
      .then(whData => {
          if (Array.isArray(whData)) setWarehouses(whData.filter(w => w.warehouse_type === 'STOK'));
      }).catch(e => {});
  }, []);

  useEffect(() => {
      if (editingStock && editingStock.warehouse_id && editingStock.product_id) {
          apiFetch(`http://localhost:3000/api/wms/warehouse-capacities?warehouseId=${editingStock.warehouse_id}&productId=${editingStock.product_id}`)
              .then(r => r.json())
              .then(d => {
                  if (d.success) setAllShelvesCapacity(d.data);
              }).catch(e => {});
      } else {
          setAllShelvesCapacity({});
      }
  }, [editingStock?.warehouse_id, editingStock?.product_id]);

  // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

  const handleEditStock = (item) => {
      setEditingStock({...item});
  };

  const handleFastDeductSubmit = async (e) => {
        e.preventDefault();
        if (!fastDeductBarcode.trim() || !fastDeductQty || fastDeductQty <= 0) {
            alert('Lütfen geçerli barkod ve miktar giriniz.');
            return;
        }

        setFastDeductLoading(true);
        try {
            let warehouseId = null;
            let shelfCode = null;
            if (fastDeductSelectedShelf) {
                const parts = fastDeductSelectedShelf.split('_');
                warehouseId = parts[0];
                shelfCode = parts[1];
            }

            const res = await apiFetch('http://localhost:3000/api/wms/deduct-fefo', {
                method: 'POST',
                headers: { 'x-user-id': currentUser?.id, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    barcode: fastDeductBarcode, 
                    quantity: fastDeductQty,
                    warehouseId,
                    shelfCode
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                setIsFastDeductVisible(false);
                setFastDeductBarcode('');
                setFastDeductQty('');
                setFastDeductSelectedShelf('');
                fetchStockList();
            } else {
                alert('Hata: ' + data.message);
            }
        } catch (err) {
            console.error('Fast deduct error:', err);
            alert('Sunucu ile bağlantı kurulamadı.');
        } finally {
            setFastDeductLoading(false);
        }
    };

  const handleDeleteStock = async (id) => {
      if (!window.confirm('Bu stok bakiye kaydını tamamen silmek istediğinize emin misiniz?')) return;
      try {
          const response = await apiFetch(`http://localhost:3000/api/wms/stock/${id}`, { 
              method: 'DELETE',
              headers: { 'x-user-id': currentUser?.id }
          });
          const data = await response.json();
          if (data.success) {
              fetchStockList();
          } else {
              alert(data.message || 'Silme başarısız.');
          }
      } catch (err) {
          alert('Sunucu hatası.');
      }
  };

  const submitEditStock = async (e) => {
      e.preventDefault();
      try {
          const response = await apiFetch(`http://localhost:3000/api/wms/stock/${editingStock.balance_id}`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json',
                  'x-user-id': currentUser?.id
              },
              body: JSON.stringify({
                  quantity: editingStock.quantity,
                  batch_number: editingStock.batch_number,
                  warehouse_id: editingStock.warehouse_id,
                  shelf_code: editingStock.shelf_code
              })
          });
          const data = await response.json();
          if (data.success) {
              setEditingStock(null);
              fetchStockList();
          } else {
              alert(data.message || 'Güncelleme başarısız.');
          }
      } catch (err) {
          alert('Sunucu hatası.');
      }
  };

    const filteredItems = stockItems.filter(item => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            item.product_name?.toLowerCase().includes(search) ||
            item.barcode?.toLowerCase().includes(search) ||
            item.warehouse_name?.toLowerCase().includes(search) ||
            item.shelf_code?.toLowerCase().includes(search)
        );
        const matchesWarehouse = selectedWarehouseFilter ? item.warehouse_name === selectedWarehouseFilter : true;
        return matchesSearch && matchesWarehouse;
    });

    const uniqueWarehouses = [...new Set(stockItems.map(item => item.warehouse_name))].filter(Boolean).sort();

  // Eğer form açıksa, doğrudan formu göster
  if (isEntryVisible) {
    // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div style={{ position: 'relative' }}>
            <button 
                onClick={() => { setIsEntryVisible(false); fetchStockList(); }} 
                style={{ position: 'absolute', top: '24px', right: '32px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                ✕ Listeye Dön
            </button>
            <StockEntry currentUser={currentUser} />
        </div>
    );
  }

  const handleBarcodeSubmit = (e) => {
      e.preventDefault();
      if (!scannedBarcode.trim()) return;
      
      const search = scannedBarcode.trim().toLowerCase();
      // find exact barcode match if possible
      const exactMatch = stockItems.find(item => item.barcode?.toLowerCase() === search);
      
      if (exactMatch) {
          const groupKey = `${exactMatch.product_id}`;
          if (!expandedGroups.includes(groupKey)) {
              setExpandedGroups([...expandedGroups, groupKey]);
          }
          setSearchTerm(search);
      } else {
          setSearchTerm(search);
      }
      
      setIsBarcodeModalOpen(false);
      setScannedBarcode('');
  };

  const toggleGroup = (groupKey) => {
      if (expandedGroups.includes(groupKey)) {
          setExpandedGroups(expandedGroups.filter(k => k !== groupKey));
      } else {
          setExpandedGroups([...expandedGroups, groupKey]);
      }
  };

    const groupedItems = Object.values(filteredItems.reduce((acc, item) => {
        const key = `${item.product_id}`;
        if (!acc[key]) {
            acc[key] = {
                groupKey: key,
                product_id: item.product_id,
                product_name: item.product_name,
                barcode: item.barcode,
                category: item.category,
                brand: item.brand,
                total_quantity: 0,
                batches: []
            };
        }
        acc[key].total_quantity += item.quantity;
        acc[key].batches.push(item);
        return acc;
    }, {})).map(group => {
        // Sort batches by FIFO (Expiration Date first, then ID or something else)
        group.batches.sort((a, b) => {
            if (!a.expiration_date && !b.expiration_date) return a.balance_id - b.balance_id;
            if (!a.expiration_date) return 1;
            if (!b.expiration_date) return -1;
            return new Date(a.expiration_date) - new Date(b.expiration_date);
        });
        return group;
    }).sort((a, b) => {
        if (sortBy === 'enAz') return a.total_quantity - b.total_quantity;
        if (sortBy === 'enCok') return b.total_quantity - a.total_quantity;
        if (sortBy === 'sktYakin') {
            const aExp = a.batches[0]?.expiration_date;
            const bExp = b.batches[0]?.expiration_date;
            if (!aExp && !bExp) return (a.product_name || '').localeCompare(b.product_name || '', 'tr');
            if (!aExp) return 1;
            if (!bExp) return -1;
            return new Date(aExp) - new Date(bExp);
        }
        return (a.product_name || '').localeCompare(b.product_name || '', 'tr');
    });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>Envanter ve Stok Listesi</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Depolardaki ürünleri, raf konumlarını ve bakiye miktarlarını görüntüleyin.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setIsFastDeductVisible(true)}
            style={{
              backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', 
              border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)'
            }}
          >
            - Acil Çıkış
          </button>
          <button 
            onClick={() => setIsEntryVisible(true)}
            style={{
              backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', 
              border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
            }}
          >
            + Manuel Stok Girişi
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {/* Arama Çubuğu */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', maxWidth: '800px', position: 'relative' }}>
          <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', backgroundColor: '#fff', color: '#334155', minWidth: '200px' }}
          >
              <option value="">Tüm Depolar (Hepsi)</option>
              {uniqueWarehouses.map(w => (
                  <option key={w} value={w}>{w}</option>
              ))}
          </select>
          <div style={{ position: 'relative', flex: 1 }}>
              <input 
                  type="text" 
                  placeholder="Ürün Adı, Barkod, Depo veya Raf Ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', paddingRight: '120px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
              />
              <button 
                  onClick={() => { setIsBarcodeModalOpen(true); setTimeout(() => document.getElementById('barcode-input')?.focus(), 100); }}
                  style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', padding: '0 16px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', fontSize: '14px' }}
                  title="Barkod Okuyucu Cihazı ile Tara"
              >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                  Okut
              </button>
          </div>
          <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', backgroundColor: 'white', color: '#334155', cursor: 'pointer', minWidth: '160px' }}
          >
              <option value="isim">İsme Göre (A-Z)</option>
              <option value="enAz">Miktar: En Az</option>
              <option value="enCok">Miktar: En Çok</option>
              <option value="sktYakin">SKT'si En Yakın (Önce Dolanlar)</option>
          </select>
      </div>

      {isBarcodeModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
              <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', animation: 'pulse 2s infinite' }}><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Lütfen Barkodu Okutun</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Cihazınızla ürün barkodunu tarayın.</p>
                  
                  <form onSubmit={handleBarcodeSubmit}>
                      <input 
                          id="barcode-input"
                          type="text" 
                          value={scannedBarcode}
                          onChange={(e) => setScannedBarcode(e.target.value)}
                          placeholder="Barkod bekleniyor..."
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '16px', textAlign: 'center', outline: 'none' }}
                          autoComplete="off"
                      />
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                          <button type="button" onClick={() => setIsBarcodeModalOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                          <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: 'white' }}>Bul</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Düzenleme Modalı */}
      {editingStock && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
              <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Stok Satırını Düzenle</h3>
                  <div style={{ marginBottom: '16px', color: '#475569', fontSize: '14px', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                      <strong>Ürün:</strong> {editingStock.product_name}
                  </div>
                  <form onSubmit={submitEditStock}>
                      <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Depo Seçimi</label>
                          <select
                              value={editingStock.warehouse_id || ''}
                              onChange={e => {
                                  const newWhId = e.target.value;
                                  const whObj = warehouses.find(w => w.id.toString() === newWhId.toString());
                                  const firstShelf = whObj && whObj.Shelves && whObj.Shelves.length > 0 ? whObj.Shelves[0] : '';
                                  setEditingStock({
                                      ...editingStock,
                                      warehouse_id: newWhId,
                                      warehouse_name: whObj ? whObj.name : '',
                                      shelf_code: firstShelf
                                  });
                              }}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: '500' }}
                          >
                              <option value="">Depo Seçin</option>
                              {warehouses.map(w => (
                                  <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                          </select>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Raf Seçimi</label>
                          <select
                              value={editingStock.shelf_code || ''}
                              onChange={e => setEditingStock({...editingStock, shelf_code: e.target.value})}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: '500' }}
                          >
                              <option value="">Raf Seçin</option>
                              {(() => {
                                  const currentWhObj = warehouses.find(w => w.id.toString() === (editingStock.warehouse_id || '').toString());
                                  const currentShelves = currentWhObj && currentWhObj.Shelves ? currentWhObj.Shelves : [];
                                  const sortedShelves = [...currentShelves].sort((a, b) => {
                                      const capA = allShelvesCapacity[a];
                                      const capB = allShelvesCapacity[b];
                                      const isFullA = capA && (capA.maxItems === 0 || !capA.physicallyFits);
                                      const isFullB = capB && (capB.maxItems === 0 || !capB.physicallyFits);
                                      if (isFullA && !isFullB) return 1;
                                      if (!isFullA && isFullB) return -1;
                                      const effA = capA ? capA.efficiency : 0;
                                      const effB = capB ? capB.efficiency : 0;
                                      if (effA !== effB) return effB - effA;
                                      const maxA = capA ? capA.maxItems : 0;
                                      const maxB = capB ? capB.maxItems : 0;
                                      return maxB - maxA;
                                  });

                                  return sortedShelves.map((s, idx) => {
                                      const cap = allShelvesCapacity[s];
                                      const isFull = cap && (cap.maxItems === 0 || !cap.physicallyFits);
                                      const isRecommended = !isFull && idx === 0 && cap;
                                      let text = s;
                                      if (isFull) text += ' (Dolu / Sığmıyor)';
                                      else if (isRecommended) text = `⭐ ${s} (Önerilen - Maks. ${cap.maxItems} Adet)`;
                                      else if (cap) text += ` - Maks. ${cap.maxItems} Adet`;
                                      return (
                                          <option key={idx} value={s} disabled={isFull} style={{ color: isFull ? '#94a3b8' : (isRecommended ? '#047857' : 'inherit'), fontWeight: isRecommended ? 'bold' : 'normal' }}>
                                              {text}
                                          </option>
                                      );
                                  });
                              })()}
                          </select>
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Miktar</label>
                          <input type="number" required value={editingStock.quantity} onChange={e => setEditingStock({...editingStock, quantity: Number(e.target.value)})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </div>
                      <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Parti (Batch) No</label>
                          <input type="text" value={editingStock.batch_number || ''} onChange={e => setEditingStock({...editingStock, batch_number: e.target.value})} placeholder="Örn: BATCH-001" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                          <button type="button" onClick={() => setEditingStock(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                          <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: 'white' }}>Kaydet</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Tablo */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>ÜRÜN & BARKOD</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>KATEGORİ / MARKA</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>DEPO & RAF</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>TOPLAM STOK</th>
              <th style={{ padding: '16px', width: '160px' }}></th>
            </tr>
          </thead>
                    <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</td></tr>
            ) : groupedItems.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Stok kaydı bulunamadı.</td></tr>
            ) : (
              groupedItems.map(group => {
                let displayBarcode = group.barcode;
                if (displayBarcode?.startsWith('[')) {
                    try { displayBarcode = JSON.parse(displayBarcode)[0] || ''; } catch(e){}
                }

                let sktBadge = null;
                const validBatches = group.batches.filter(b => b.expiration_date);
                if (validBatches.length > 0) {
                    const sorted = validBatches.sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date));
                    const nearest = sorted[0];
                    const daysLeft = Math.ceil((new Date(nearest.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysLeft < 0) {
                        sktBadge = <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginTop: '4px' }}>🔴 Günü Geçti!</span>;
                    } else if (daysLeft <= 30) {
                        sktBadge = <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginTop: '4px', whiteSpace: 'nowrap' }}>🟡 {daysLeft} Gün Kaldı</span>;
                    } else {
                        sktBadge = null;
                    }
                }

                const uniqueShelves = [];
                group.batches.forEach(b => {
                    const key = `${b.warehouse_name}-${b.shelf_code}`;
                    if (!uniqueShelves.find(s => s.key === key)) {
                        uniqueShelves.push({ key, cap: b.shelf_max_capacity || 0 });
                    }
                });
                const totalCap = uniqueShelves.reduce((sum, s) => sum + s.cap, 0);

                return (
                    <tr key={group.groupKey} className="hover-row" onClick={() => setSelectedGroup(group)} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s', cursor: 'pointer', backgroundColor: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>
                        <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', marginBottom: '2px' }}>{group.product_name}</div>
                            <div style={{ color: '#64748b', fontSize: '12px' }}>{displayBarcode || 'Barkod Yok'}</div>
                        </td>
                        <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>
                            {group.category} / {group.brand}
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px' }}>
                            {group.total_quantity === 0 && !group.batches[0]?.shelf_code ? (
                                <span style={{ color: '#ef4444', fontWeight: '700' }}>0 / 0 (Raf Yok)</span>
                            ) : (
                                <>
                                    <span style={{ color: '#334155', fontWeight: '500' }}>
                                    {[...new Set(group.batches.map(b => b.warehouse_name).filter(Boolean))].length > 1 ? 'Çoklu Depo' : (group.batches[0]?.warehouse_name || 'Depo Yok')}
                                    </span>
                                    <span style={{ color: '#94a3b8', margin: '0 6px' }}>•</span>
                                    <span style={{ color: '#64748b' }}>
                                    Raf: {[...new Set(group.batches.map(b => b.shelf_code).filter(Boolean))].length > 1 ? 'Çoklu Raf' : (group.batches[0]?.shelf_code || 'Yok')}
                                    </span>
                                </>
                            )}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 'bold', color: '#0f172a', fontSize: '15px', textAlign: 'center' }}>
                            {group.total_quantity === 0 ? (
                                <div style={{ color: '#ef4444', fontSize: '15px' }}>
                                    0 / 0
                                </div>
                            ) : (
                                <div>
                                    {(() => {
                                        const formatUnitStr = (qty, u) => {
                                            if ((u === 'gr' || u === 'ml') && qty >= 1000) {
                                                return `${+(qty / 1000).toFixed(2)} ${u === 'gr' ? 'kg' : 'L'}`;
                                            }
                                            return `${qty} ${u}`;
                                        };
                                        const formatDualStr = (qty, cap, u) => {
                                            if ((u === 'gr' || u === 'ml') && (qty >= 1000 || (cap && cap >= 1000))) {
                                                const targetU = u === 'gr' ? 'kg' : 'L';
                                                const q = +(qty / 1000).toFixed(2);
                                                if (cap > 0) {
                                                    const c = +(cap / 1000).toFixed(2);
                                                    return `${q} / ${c} ${targetU}`;
                                                }
                                                return `${q} ${targetU}`;
                                            }
                                            if (cap > 0) return `${qty} / ${cap} ${u}`;
                                            return `${qty} ${u}`;
                                        };

                                        return group.product?.unit_type && group.product.unit_type !== 'Adet' && group.product?.package_capacity > 0 ? (
                                            <span style={{ fontSize: '13px', color: '#0369a1' }}>
                                                {formatDualStr(group.total_quantity, totalCap, group.product.unit_type)} <br/>
                                                <span style={{ fontSize: '11px' }}>
                                                    ({Math.ceil(group.total_quantity / group.product?.package_capacity)} {group.product?.package_name || 'Kap'} x {formatUnitStr(group.product?.package_capacity, group.product?.unit_type)})
                                                </span>
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                                                {group.total_quantity} {totalCap > 0 ? `/ ${totalCap}` : ''} Adet
                                            </span>
                                        );
                                    })()}
                                </div>
                            )}
                            {sktBadge}
                            <div style={{ marginTop: '8px' }}>
                                {totalCap > 0 && group.total_quantity > totalCap ? (
                                    <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }}>⚠️ Maks. Stok Aşıldı</span>
                                ) : group.total_quantity === 0 ? (
                                    <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }}>🔴 Stok Yok</span>
                                ) : group.total_quantity <= 20 ? (
                                    <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }}>🔴 Kritik Stok</span>
                                ) : group.total_quantity <= 100 ? (
                                    <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }}>🟠 Azalan Stok</span>
                                ) : (
                                    <span style={{ backgroundColor: '#dcfce3', color: '#16a34a', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }}>🟢 Yeterli Stok</span>
                                )}
                            </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div className="action-container" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                {group.product?.Category !== 'Hammadde' ? (
                                    <button style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                        Detay / Üretim ➔
                                    </button>
                                ) : (
                                    <button style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                        Detay Gör ➔
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                );
              })
            )}
          </tbody>
        </table>
            </div>

      {/* Drawer Panel */}
      {selectedGroup && (
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={() => setSelectedGroup(null)}>
              <div 
                  style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '450px', maxWidth: '100%', backgroundColor: '#f8fafc', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out' }}
                  onClick={e => e.stopPropagation()}
              >
                  {/* Drawer Header */}
                  <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#fff' }}>
                      <div>
                          <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
                              Stok & Parti Detayları
                          </div>
                          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{selectedGroup.product_name}</h2>
                          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Toplam Stok: <strong style={{ color: '#0f172a' }}>{selectedGroup.total_quantity} Adet</strong> ({selectedGroup.batches.length} Parti)</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {selectedGroup.product?.Category !== 'Hammadde' && (
                              <button onClick={() => setProductionRequestProduct(selectedGroup)} style={{ padding: '6px 10px', backgroundColor: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#fff'} title="Üretim Talebi">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                                  Talep Aç
                              </button>
                          )}
                          <button onClick={() => setSelectedGroup(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                      </div>
                  </div>
                  
                  {/* Drawer Body */}
                  <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedGroup.batches.map((batch, index) => {
                          const isFirstOut = index === 0 && (batch.expiration_date || batch.batch_number || selectedGroup.batches.length > 1);
                          const totalOnShelf = selectedGroup.batches
                              .filter(b => b.warehouse_name === batch.warehouse_name && b.shelf_code === batch.shelf_code)
                              .reduce((sum, b) => sum + b.quantity, 0);

                          return (
                              <div key={batch.balance_id} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', position: 'relative' }}>
                                  {isFirstOut && (
                                      <div style={{ color: '#10b981', fontSize: '12px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                          FEFO (İlk Çıkacak)
                                      </div>
                                  )}
                                  
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', color: '#475569' }}>
                                      <div>
                                          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Raf Konumu</div>
                                          <div style={{ color: '#0f172a', fontWeight: '600' }}>{batch.warehouse_name} / {batch.shelf_code}</div>
                                      </div>
                                      <div>
                                          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Miktar (Bu Parti)</div>
                                          <div style={{ color: '#0f172a', fontWeight: '600', fontSize: '15px' }}>
                                              {batch.quantity} <span style={{ fontSize: '13px', color: '#0369a1' }}>{batch.unit_type || 'Adet'}</span>
                                          </div>
                                          {batch.shelf_max_capacity > 0 && (
                                              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>
                                                  Raf Toplamı: {totalOnShelf} / {batch.shelf_max_capacity} (%{Math.min(((totalOnShelf / batch.shelf_max_capacity) * 100), 100).toFixed(1)} Dolu)
                                              </div>
                                          )}
                                          {batch.unit_type && batch.unit_type !== 'Adet' && batch.package_capacity > 0 && (
                                              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                                                  ({Math.ceil(batch.quantity / batch.package_capacity)} {batch.package_name || 'Kap'})
                                              </div>
                                          )}
                                      </div>
                                      <div>
                                          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Parti No</div>
                                          <div style={{ color: '#0f172a', fontWeight: '500' }}>{batch.batch_number || '-'}</div>
                                      </div>
                                      <div>
                                          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Son Kullanma (SKT)</div>
                                          <div style={{ color: '#0f172a', fontWeight: '500' }}>{batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString('tr-TR') : '-'}</div>
                                      </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                          <button onClick={() => { setSelectedGroup(null); handleEditStock(batch); }} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }} onMouseOver={e => e.currentTarget.style.color = '#3b82f6'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                          </button>
                                          <button onClick={() => { setSelectedGroup(null); handleDeleteStock(batch.balance_id); }} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>


{productionRequestProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 'bold' }}>Manuel Üretim Talebi</h3>
                            <button onClick={() => setProductionRequestProduct(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ marginBottom: '16px', color: '#475569', fontSize: '14px' }}>
                            <strong>Ürün:</strong> {productionRequestProduct.product_name}
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const res = await apiFetch('http://localhost:3000/api/production/requests', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        productId: productionRequestProduct.product_id,
                                        quantity: e.target.qty.value,
                                        reason: 'Stok Sorumlusu (Manuel)',
                                        creator: currentUser?.username || 'Kullanıcı',
                                        priority: e.target.priority.value
                                    })
                                });
                                const data = await res.json();
                                if(data.success) {
                                    alert('Talep oluşturuldu!');
                                    setProductionRequestProduct(null);
                                } else {
                                    alert('Talep oluşturulamadı');
                                }
                            } catch(err) { console.error(err); }
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Miktar</label>
                                <input name="qty" type="number" required defaultValue="100" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Aciliyet</label>
                                <select name="priority" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                    <option value="Normal">Normal</option>
                                    <option value="Acil">Acil</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setProductionRequestProduct(null)} style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>İptal</button>
                                <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Talep Gönder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isFastDeductVisible && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Acil Çıkış
                        </h3>
                        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px', marginTop: 0 }}>Okuttuğunuz barkoddan belirttiğiniz miktar, son kullanma tarihi en yakın raflardan otomatik düşülecektir.</p>
                        
                        <form onSubmit={handleFastDeductSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Barkod</label>
                                <input 
                                    autoFocus 
                                    type="text" 
                                    value={fastDeductBarcode} 
                                    onChange={(e) => setFastDeductBarcode(e.target.value)} 
                                    placeholder="Barkod okutun..." 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #ef4444', outline: 'none', fontSize: '16px', boxSizing: 'border-box' }}
                                />
                            </div>

                            {(() => {
                                const search = fastDeductBarcode.trim().toLowerCase();
                                if (!search) return null;
                                
                                const availableShelves = stockItems.filter(item => {
                                    let displayBarcode = item.barcode;
                                    if (displayBarcode?.startsWith('[')) {
                                        try { displayBarcode = JSON.parse(displayBarcode)[0] || ''; } catch(e){}
                                    }
                                    return item.barcode?.toLowerCase() === search || displayBarcode?.toLowerCase() === search;
                                }).reduce((acc, item) => {
                                    const key = `${item.warehouse_id}_${item.shelf_code}`;
                                    if (!acc[key]) {
                                        acc[key] = {
                                            warehouse_id: item.warehouse_id,
                                            warehouse_name: item.warehouse_name,
                                            shelf_code: item.shelf_code,
                                            total_quantity: 0
                                        };
                                    }
                                    acc[key].total_quantity += item.quantity;
                                    return acc;
                                }, {});

                                const shelfList = Object.values(availableShelves);
                                if (shelfList.length > 0) {
                                    return (
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Raf Seçimi (İsteğe Bağlı)</label>
                                            <select 
                                                value={fastDeductSelectedShelf}
                                                onChange={(e) => setFastDeductSelectedShelf(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', backgroundColor: 'white' }}
                                            >
                                                <option value="">-- Tüm Raflardan FEFO ile Düş --</option>
                                                {shelfList.map(s => (
                                                    <option key={`${s.warehouse_id}_${s.shelf_code}`} value={`${s.warehouse_id}_${s.shelf_code}`}>
                                                        {s.warehouse_name} / {s.shelf_code} (Mevcut: {s.total_quantity} Adet)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                            
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Düşülecek Miktar</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={fastDeductQty} 
                                    onChange={(e) => setFastDeductQty(e.target.value)} 
                                    placeholder="Örn: 25" 
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setIsFastDeductVisible(false)} disabled={fastDeductLoading} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                                <button type="submit" disabled={fastDeductLoading} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#ef4444', cursor: fastDeductLoading ? 'not-allowed' : 'pointer', fontWeight: '600', color: 'white', display: 'flex', justifyContent: 'center' }}>
                                    {fastDeductLoading ? 'Düşülüyor...' : 'Çıkış Yap'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
    </div>
  );
};
export default StockList;
