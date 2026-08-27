/**
 * ============================================================================
 * BİLEŞEN ADI: ProductList
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki ürünlerin, varyantların ve stok kartlarının yönetildiği modül.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ProductList.jsx), Ürün katalogu, fason/satın alma detayları, barkod işlemleri ve toplu ürün güncelleme araçlarını içerir.
 */

import { apiFetch } from '../../utils/api';
import { useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import ProductForm from './ProductForm';
import BulkEditModal from './BulkEditModal';
import BarcodePrintModal from '../Common/BarcodePrintModal';

const ProductList = ({ onNavigate, currentUser }) => {
  // 1. Durum (State) Tanımlamaları ve Hook'lar
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBulkEditVisible, setIsBulkEditVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Barkod Okuyucu State'i
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  // Barkod Yazdırma State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printBarcodeData, setPrintBarcodeData] = useState({ value: '', title: '' });

  const hasPerm = (key) => currentUser?.role === 'admin' || (currentUser?.permissions || []).includes(key);
  const canSeeCosts = currentUser?.role === 'admin' || hasPerm('view_finance');

  // 3. Backend API İstekleri (Veri Çekme)

  const fetchProducts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await apiFetch(import.meta.env.VITE_API_URL + '/api/products');
      const data = await response.json();
      if (response.ok) {
        // Hammaddeleri state'e alıyoruz ama listede gizleyeceğiz
        setProducts(Array.isArray(data) ? data : []);
      } else {
        if (!isSilent) setError(data.message || 'Ürünler getirilemedi.');
      }
    } catch (err) {
      if (!isSilent) setError('Sunucuya bağlanılamadı.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(() => {
        fetchProducts(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    
    try {
      const response = await apiFetch(`${import.meta.env.VITE_API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
            'X-User-Id': currentUser?.id
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(products.filter(p => p.Id !== id));
      } else {
        alert(data.message || 'Silme işlemi başarısız.');
      }
    } catch (err) {
      alert('Sunucu hatası, ürün silinemedi.');
    }
  };

  // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsFormVisible(true);
  };

  const handleAddNew = () => {
    if (onNavigate) {
      onNavigate('urun-ekle');
    } else {
      setEditingProduct(null);
      setIsFormVisible(true);
    }
  };

  const handleFormClose = (shouldRefresh) => {
    setIsFormVisible(false);
    setEditingProduct(null);
    if (shouldRefresh) {
      fetchProducts();
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.Id));
    } else {
      setSelectedIds([]);
    }
  };

  if (isFormVisible) {
    return <ProductForm product={editingProduct} onClose={handleFormClose} currentUser={currentUser} />;
  }

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length > 10) {
        alert('Güvenlik nedeniyle tek seferde en fazla 10 ürün silebilirsiniz.');
        return;
    }
    if (!window.confirm(`${selectedIds.length} ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    
    try {
      const response = await apiFetch(import.meta.env.VITE_API_URL + '/api/products/bulk', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await response.json();
      if (data.success) {
        setSelectedIds([]);
        fetchProducts();
      } else {
        alert(data.message || 'Silme başarısız oldu.');
      }
    } catch (err) {
      alert('Sunucu hatası.');
    }
  };

  const handleBulkAction = (action) => {
    alert(`${selectedIds.length} ürün için "${action}" modülü yakında eklenecektir.`);
  };

  const handleBarcodeSubmit = (e) => {
      e.preventDefault();
      if (!scannedBarcode.trim()) return;
      
      const barcodeToSearch = scannedBarcode.trim().toLowerCase();
      // Tam eşleşen barkod varsa direkt ürünün içine git (düzenleme modunu aç)
      const exactMatch = products.find(p => {
          let barcodes = [];
          try { 
              const parsed = JSON.parse(p.Barcode); 
              barcodes = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch(e) { 
              barcodes = p.Barcode ? [p.Barcode] : []; 
          }
          return barcodes.some(b => b && b.toLowerCase() === barcodeToSearch);
      });

      if (exactMatch) {
          handleEdit(exactMatch);
          setIsBarcodeModalOpen(false);
          setScannedBarcode('');
      } else {
          // Bulunamazsa sadece aramaya yaz
          setSearchTerm(barcodeToSearch);
          setIsBarcodeModalOpen(false);
          setScannedBarcode('');
      }
  };

  const filteredProducts = products.filter(p => p.Category !== 'Hammadde').filter(p => {
      const search = searchTerm.toLowerCase();
      
      const searchInField = (field) => {
          if (!field) return false;
          if (typeof field === 'string') return field.toLowerCase().includes(search);
          if (Array.isArray(field)) return field.some(item => item.toLowerCase().includes(search));
          return JSON.stringify(field).toLowerCase().includes(search);
      };

      return searchInField(p.ProductName) || 
             searchInField(p.Barcode) ||
             searchInField(p.ProductCode) ||
             searchInField(p.Category) ||
             searchInField(p.Brand) ||
             searchInField(p.web_categories) ||
             searchInField(p.web_subcategories) ||
             searchInField(p.web_subtitles);
  });

  // 5. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>Ürünler</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Sistemdeki tüm ürünleri görüntüleyin ve yönetin.</p>
        </div>
        {hasPerm('product_add') && (
        <button 
          onClick={handleAddNew}
          style={{
            backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', 
            border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
          }}
        >
          + Yeni Ürün Ekle
        </button>
        )}
      </div>

      {error && <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {/* Arama Çubuğu */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
              <input 
                  type="text" 
                  placeholder="Ürün Adı, Barkod, Kategori Ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
              />
          </div>
          <button 
              onClick={() => { setIsBarcodeModalOpen(true); setTimeout(() => document.getElementById('barcode-input')?.focus(), 100); }}
              style={{ padding: '0 20px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '15px' }}
              title="Barkod Okuyucu Cihazı ile Tara"
          >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
              Barkod Okut
          </button>
      </div>

      {/* Barkod Okuma Modalı */}
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

      {selectedIds.length > 0 && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.2s ease-in-out' }}>
            <div style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '14px' }}>
                <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', marginRight: '8px' }}>{selectedIds.length}</span>
                ürün seçildi
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                {hasPerm('product_edit') && (
                <button 
                    onClick={() => setIsBulkEditVisible(true)}
                    style={{ padding: '8px 16px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Seçili Ürünleri Düzenle
                </button>
                )}
                {hasPerm('product_delete') && (
                <button 
                    onClick={handleBulkDelete}
                    style={{ padding: '8px 16px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Sil
                </button>
                )}
            </div>
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Henüz sistemde ürün bulunmuyor.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>
                    <input 
                        type="checkbox" 
                        checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                        onChange={handleSelectAll}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                    />
                </th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Barkod</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Ürün Adı</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Kategori</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Toplam Stok</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Kullanılabilir Stok</th>
                {canSeeCosts && <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Br. Maliyet</th>}
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Satış Fiyatı</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                let barcodes = [];
                try { 
                    const parsed = JSON.parse(product.Barcode); 
                    barcodes = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
                } catch(e) { 
                    barcodes = product.Barcode ? [product.Barcode] : []; 
                }
                
                let images = [];
                try { 
                    const parsed = JSON.parse(product.ImagePath); 
                    images = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
                } catch(e) { 
                    images = product.ImagePath ? [product.ImagePath] : []; 
                }
                const firstImage = images.length > 0 ? images[0] : null;

                let unitCost = 0;
                try {
                    const getPrice = (prodItem) => {
                        if (prodItem.suppliers && prodItem.suppliers.length > 0) {
                            const primary = prodItem.suppliers.find(s => s.is_primary === 1 || s.is_primary === true) || prodItem.suppliers[0];
                            return parseFloat(primary.unit_price) || 0;
                        }
                        return parseFloat(prodItem.PurchasePrice) || 0;
                    };

                    if (product.Formula && product.Category !== 'Hammadde' && product.supply_type === 'MANUFACTURE') {
                        const formulaStr = typeof product.Formula === 'string' ? product.Formula : JSON.stringify(product.Formula);
                        const formula = JSON.parse(formulaStr);
                        if (Array.isArray(formula)) {
                            formula.forEach(step => {
                                if (step.materials && Array.isArray(step.materials)) {
                                    step.materials.forEach(mat => {
                                        const rm = products.find(p => p.ProductName === mat.material);
                                        if (rm) {
                                            const qty = parseFloat(mat.quantity) || 0;
                                            const price = getPrice(rm);
                                            
                                            let multiplier = 1;
                                            const matUnit = (mat.unit || '').toLowerCase().trim();
                                            const rmUnit = (rm.unit_type || '').toLowerCase().trim();
                                            
                                            if ((matUnit === 'gr' && rmUnit === 'kg') || (matUnit === 'ml' && (rmUnit === 'litre' || rmUnit === 'l'))) {
                                                multiplier = 1 / 1000;
                                            } else if ((matUnit === 'kg' && rmUnit === 'gr') || ((matUnit === 'litre' || matUnit === 'l') && rmUnit === 'ml')) {
                                                multiplier = 1000;
                                            }
                                            
                                            unitCost += (qty * multiplier * price);
                                        }
                                    });
                                }
                            });
                        }
                    } else if (product.Category === 'Hammadde' || product.supply_type === 'PURCHASE' || product.supply_type === 'OUTSOURCED') {
                        unitCost = getPrice(product);
                    }
                } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }

                let webCat = '';
                try { webCat = Array.isArray(product.web_categories) ? product.web_categories[0] : (typeof product.web_categories === 'string' ? JSON.parse(product.web_categories)[0] : ''); } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
                let webSub = '';
                try { webSub = Array.isArray(product.web_subcategories) ? product.web_subcategories[0] : (typeof product.web_subcategories === 'string' ? JSON.parse(product.web_subcategories)[0] : ''); } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
                let webTitle = '';
                try { webTitle = Array.isArray(product.web_subtitles) ? product.web_subtitles[0] : (typeof product.web_subtitles === 'string' ? JSON.parse(product.web_subtitles)[0] : ''); } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }

                return (
                <tr key={product.Id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', backgroundColor: selectedIds.includes(product.Id) ? '#f0f9ff' : 'transparent' }} onMouseOver={e => e.currentTarget.style.backgroundColor = selectedIds.includes(product.Id) ? '#f0f9ff' : '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = selectedIds.includes(product.Id) ? '#f0f9ff' : 'transparent'}>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <input 
                          type="checkbox" 
                          checked={selectedIds.includes(product.Id)}
                          onChange={() => handleSelectOne(product.Id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                      />
                  </td>
                  <td style={{ padding: '12px 24px', color: '#0f172a', fontWeight: '500', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {barcodes.length > 0 ? barcodes.map((b, idx) => <span key={idx}>{b}</span>) : <span>-</span>}
                        </div>
                        {barcodes.length > 0 && (
                            <button
                                type="button"
                                title="Yazdır"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPrintBarcodeData({ value: barcodes.filter(b => b), title: product.ProductName });
                                    setPrintModalOpen(true);
                                }}
                                style={{
                                    padding: '4px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.backgroundColor = '#e0f2fe'; }}
                                onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            </button>
                        )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 24px', color: '#334155', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {firstImage ? (
                            <>
                              <img src={firstImage.startsWith('http') ? firstImage : `${import.meta.env.VITE_API_URL}${firstImage}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                              <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#f1f5f9', display: 'none', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>Görsel Yok</div>
                            </>
                        ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>Görsel Yok</div>
                        )}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{product.ProductName}</div>
                                {product.supply_type === 'PURCHASE' && <span title="Ticari Ürün" style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534' }}>Hazır</span>}
                                {product.supply_type === 'MANUFACTURE' && <span title="Kendi Üretimimiz" style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#dbeafe', color: '#1e40af' }}>Üretim</span>}
                                {product.supply_type === 'OUTSOURCED' && <span title="Fason Dış Üretim" style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#ffedd5', color: '#9a3412' }}>Fason</span>}
                                {(product.is_active === 0 || product.is_active === false || product.is_active === '0' || product.is_active === 'false') && <span title="Bu ürün pasife alınmıştır" style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>Pasif</span>}
                            </div>
                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{product.Brand}</div>
                        </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 24px', color: '#475569', fontSize: '14px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {webCat && <span style={{ fontWeight: '600', color: '#0f172a' }}>{webCat}</span>}
                        {webSub && <span style={{ fontSize: '12px', color: '#64748b' }}>{webSub}</span>}
                        {webTitle && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{webTitle}</span>}
                        {!webCat && !webSub && !webTitle && <span>-</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                      backgroundColor: product.StockQuantity > 10 ? '#f1f5f9' : '#fee2e2',
                      color: product.StockQuantity > 10 ? '#475569' : '#dc2626'
                    }}>
                      {product.StockQuantity} Adet
                    </span>
                  </td>
                  <td style={{ padding: '12px 24px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                      backgroundColor: product.AvailableStock > 10 ? '#f0fdf4' : (product.AvailableStock > 0 ? '#fef08a' : '#fee2e2'),
                      color: product.AvailableStock > 10 ? '#166534' : (product.AvailableStock > 0 ? '#a16207' : '#dc2626')
                    }} title="Sepetlerde bekleyen stoğu düşülmüş net rakam">
                      {product.AvailableStock} Adet
                    </span>
                  </td>
                  {canSeeCosts && (
                    <td style={{ padding: '12px 24px', color: '#0f172a', fontWeight: '600', fontSize: '14px', textAlign: 'right' }}>
                      <span style={{ fontWeight: '400', marginRight: '4px', color: '#64748b' }}>₺</span>
                      {Number(unitCost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                  <td style={{ padding: '12px 24px', color: '#0f172a', fontWeight: '600', fontSize: '14px', textAlign: 'right' }}>
                    <span style={{ fontWeight: '400', marginRight: '4px', color: '#64748b' }}>₺</span>
                    {Number(product.SalePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                    <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                      {hasPerm('product_edit') && (
                      <button onClick={() => handleEdit(product)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      )}
                      {hasPerm('product_delete') && (
                      <button onClick={() => handleDelete(product.Id)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {isBulkEditVisible && (
        <BulkEditModal 
            selectedIds={selectedIds}
            currentUser={currentUser}
            onClose={() => setIsBulkEditVisible(false)}
            onSuccess={() => {
                setIsBulkEditVisible(false);
                setSelectedIds([]);
                fetchProducts();
            }}
        />
      )}

      <BarcodePrintModal 
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          barcodeValue={printBarcodeData.value}
          title={printBarcodeData.title}
      />
    </div>
  );
};

export default ProductList;

