/**
 * ============================================================================
 * DOSYA ADI: ProductForm.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Ürün Katalog Modülü / Ürün Ekleme ve Düzenleme Formu
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sisteme yeni bir ürün, hammadde veya yarı mamul eklemek ya da mevcut ürünün adını, barkodunu, stok kodunu (SKU), fiyatlarını, boyutlarını ve teknik özelliklerini düzenlemek için kullanılan detaylı formdur.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React (useState, useEffect), Barkod ve SKU Doğrulama, Dinamik Form Alanları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/products` rotasının POST ve PUT uç noktalarıyla çalışarak ürün kataloğunu günceller.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ProductForm.jsx), Ürün katalogu, fason/satın alma detayları, barkod işlemleri ve toplu ürün güncelleme araçlarını içerir.
 */

import { apiFetch } from '../../utils/api';
import { useState, useEffect } from 'react';
import Barcode from 'react-barcode';

const ProductForm = ({ product, onClose, currentUser }) => {
  const isEditing = !!product;
  
  const hasPerm = (key) => currentUser?.role === 'admin' || (currentUser?.permissions || []).includes(key);
  const canManageFormula = hasPerm('formula_manage');
  
  // Barkod ayıklama (parsing)
  let initialBarcodes = [''];
  if (product?.Barcode) {
    if (Array.isArray(product.Barcode)) {
        initialBarcodes = product.Barcode.length > 0 ? product.Barcode : [''];
    } else if (typeof product.Barcode === 'string') {
        try {
            const parsed = JSON.parse(product.Barcode);
            initialBarcodes = Array.isArray(parsed) && parsed.length > 0 ? parsed : [product.Barcode];
        } catch(e) {
            initialBarcodes = [product.Barcode];
        }
    }
  }

  // Görsel ayıklama (parsing)
  let initialImages = [];
  if (product?.ImagePath) {
    if (Array.isArray(product.ImagePath)) {
        initialImages = product.ImagePath;
    } else if (typeof product.ImagePath === 'string') {
        try {
            const parsed = JSON.parse(product.ImagePath);
            initialImages = Array.isArray(parsed) ? parsed : [product.ImagePath];
        } catch(e) {
            initialImages = [product.ImagePath];
        }
    }
  }

  // Reçete ayıklama (parsing)
  let initialFormula = [];
  if (product?.Formula) {
      try {
          const parsed = JSON.parse(product.Formula);
          initialFormula = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
          // Eğer önceden metin olarak kaydedilmişse boş döneriz veya parse edemiyorsak
          initialFormula = [];
      }
  }

  // 1. Durum (State) Tanımlamaları ve Hook'lar

  const [formData, setFormData] = useState({
    ProductName: product?.ProductName || '',
    Brand: product?.Brand || '',
    Category: product?.Category || '',
    supply_type: product?.supply_type || 'MANUFACTURE',
    unit_type: product?.unit_type || 'Adet',
    package_capacity: product?.package_capacity || 1,
    package_name: product?.package_name || 'Kutu',
    PurchasePrice: product?.PurchasePrice || 0,
    SalePrice: product?.SalePrice || 0,
    StockQuantity: product?.StockQuantity || 0,
    ExpirationDate: product?.ExpirationDate ? product.ExpirationDate.split('T')[0] : '',
    BatchNumber: product?.BatchNumber || '',
    Description: product?.Description || '',
    Formula: product?.Formula || '',
    ProductionTime: product?.ProductionTime || 0,
    Width: product?.Width || '',
    Height: product?.Height || '',
    Depth: product?.Depth || '',
    Diameter: product?.Diameter || '',
    Weight: product?.Weight || '',
    is_stackable: (product?.is_stackable === 1 || product?.is_stackable === true || product?.is_stackable === '1' || product?.is_stackable === 'true') ? true : false,
    max_stack_limit: product?.max_stack_limit || 1,
    supplier_id: product?.supplier_id || '',
    critical_stock_level: product?.critical_stock_level || 0,
    shelf_life_months: product?.shelf_life_months || 0,
  });

  const [barcodes, setBarcodes] = useState(initialBarcodes);
  const [existingImages, setExistingImages] = useState(initialImages);
  const [routingSteps, setRoutingSteps] = useState(
    initialFormula.length > 0 && initialFormula[0]?.step
      ? initialFormula 
      : [{ step: 1, operation: '', machine_id: '', duration: '', materials: [] }]
  );
  const [imageFiles, setImageFiles] = useState([]);
  const [newImageUrls, setNewImageUrls] = useState([]);
  const [brandList, setBrandList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [machineList, setMachineList] = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  
  const [productSuppliers, setProductSuppliers] = useState(
    product?.suppliers && product.suppliers.length > 0 
      ? product.suppliers.map(s => ({
          localId: Math.random().toString(36).substr(2, 9),
          supplier_id: s.supplier_id || '',
          unit_price: s.unit_price || '',
          contract_start_date: s.contract_start_date ? s.contract_start_date.split('T')[0] : '',
          contract_end_date: s.contract_end_date ? s.contract_end_date.split('T')[0] : '',
          contract_file: s.contract_file || null,
          remove_contract: false,
          fileObj: null
        }))
      : [{ localId: Math.random().toString(36).substr(2, 9), supplier_id: '', unit_price: '', contract_start_date: '', contract_end_date: '', contract_file: null, remove_contract: false, fileObj: null }]
  );
  
  // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)
  
  useEffect(() => {
    // 3. Backend API İstekleri (Veri Çekme)
    const fetchMaterialsAndMachines = async () => {
        try {
            const [matRes, machRes, suppRes] = await Promise.all([
                apiFetch('http://localhost:3000/api/products'),
                apiFetch('http://localhost:3000/api/production/machines'),
                apiFetch('http://localhost:3000/api/suppliers')
            ]);
            const matData = await matRes.json();
            if (Array.isArray(matData)) {
                setMaterialsList(matData.filter(p => p.Category === 'Hammadde'));
            }
            const machData = await machRes.json();
            if (machData.success && Array.isArray(machData.data)) {
                setMachineList(machData.data);
            }
            const suppData = await suppRes.json();
            if (suppData.success && Array.isArray(suppData.data)) {
                setSupplierList(suppData.data);
            }
        } catch (err) {
            console.error('Liste verileri alınamadı:', err);
        }
    };
    fetchMaterialsAndMachines();
  }, []);

  // Barkod Modal State'leri
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [currentScanningIndex, setCurrentScanningIndex] = useState(null);

  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [addingBrand, setAddingBrand] = useState(false);

  const [categoryList, setCategoryList] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  
  const fetchBrands = async () => {
    try {
      const response = await apiFetch('http://localhost:3000/api/brands');
      const data = await response.json();
      if (Array.isArray(data)) {
        setBrandList(data);
      } else {
        setBrandList([]);
      }
    } catch (err) {
      console.error('Markalar yüklenemedi', err);
      setBrandList([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiFetch('http://localhost:3000/api/categories');
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategoryList(data);
      } else {
        setCategoryList([]);
      }
    } catch (err) {
      console.error('Kategoriler yüklenemedi', err);
      setCategoryList([]);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, []);

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return;
    setAddingBrand(true);
    try {
        const res = await apiFetch('http://localhost:3000/api/brands', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-User-Id': currentUser?.id 
            },
            body: JSON.stringify({ name: newBrandName.trim() })
        });
        const data = await res.json();
        if (data.success) {
            await fetchBrands();
            setFormData({ ...formData, Brand: data.name });
            setShowNewBrandInput(false);
            setNewBrandName('');
        } else {
            alert(data.message || 'Marka eklenemedi.');
        }
    } catch (err) {
        alert('Sunucu hatası.');
    } finally {
        setAddingBrand(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
        const res = await apiFetch('http://localhost:3000/api/categories', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-User-Id': currentUser?.id 
            },
            body: JSON.stringify({ name: newCategoryName.trim() })
        });
        const data = await res.json();
        if (data.success) {
            await fetchCategories();
            setFormData({ ...formData, Category: data.name });
            setShowNewCategoryInput(false);
            setNewCategoryName('');
        } else {
            alert(data.message || 'Kategori eklenemedi.');
        }
    } catch (err) {
        alert('Sunucu hatası.');
    } finally {
        setAddingCategory(false);
    }
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleBarcodeChange = (index, value) => {
    const newBarcodes = [...barcodes];
    newBarcodes[index] = value;
    setBarcodes(newBarcodes);
  };

  const addBarcodeField = () => {
    setBarcodes([...barcodes, '']);
  };

  const removeBarcodeField = (index) => {
    const newBarcodes = barcodes.filter((_, i) => i !== index);
    if (newBarcodes.length === 0) newBarcodes.push('');
    setBarcodes(newBarcodes);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const addNewUrlField = () => {
    setNewImageUrls([...newImageUrls, '']);
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...newImageUrls];
    newUrls[index] = value;
    setNewImageUrls(newUrls);
  };

  const removeUrlField = (index) => {
    setNewImageUrls(newImageUrls.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const handleStepChange = (stepIndex, field, value) => {
    const newSteps = [...routingSteps];
    newSteps[stepIndex][field] = value;
    setRoutingSteps(newSteps);
  };

  const addStep = () => {
    setRoutingSteps([...routingSteps, { step: routingSteps.length + 1, operation: '', machine_id: '', duration: '', materials: [] }]);
  };

  const removeStep = (stepIndex) => {
    let newSteps = routingSteps.filter((_, i) => i !== stepIndex);
    if (newSteps.length === 0) newSteps.push({ step: 1, operation: '', machine_id: '', duration: '', materials: [] });
    // Adımları yeniden indeksle
    newSteps = newSteps.map((s, i) => ({ ...s, step: i + 1 }));
    setRoutingSteps(newSteps);
  };

  const handleStepMaterialChange = (stepIndex, matIndex, field, value) => {
    const newSteps = [...routingSteps];
    newSteps[stepIndex].materials[matIndex][field] = value;
    setRoutingSteps(newSteps);
  };

  const addStepMaterial = (stepIndex) => {
    const newSteps = [...routingSteps];
    newSteps[stepIndex].materials.push({ material: '', quantity: '', unit: 'gr' });
    setRoutingSteps(newSteps);
  };

  const removeStepMaterial = (stepIndex, matIndex) => {
    const newSteps = [...routingSteps];
    newSteps[stepIndex].materials = newSteps[stepIndex].materials.filter((_, i) => i !== matIndex);
    setRoutingSteps(newSteps);
  };

  const handleProductSupplierChange = (index, field, value) => {
    const newSuppliers = [...productSuppliers];
    newSuppliers[index][field] = value;
    setProductSuppliers(newSuppliers);
  };

  const handleProductSupplierFileChange = (index, file) => {
    const newSuppliers = [...productSuppliers];
    newSuppliers[index].fileObj = file;
    newSuppliers[index].remove_contract = false;
    setProductSuppliers(newSuppliers);
  };

  const addProductSupplier = () => {
    setProductSuppliers([...productSuppliers, { localId: Math.random().toString(36).substr(2, 9), supplier_id: '', unit_price: '', contract_start_date: '', contract_end_date: '', contract_file: null, remove_contract: false, fileObj: null }]);
  };

  const removeProductSupplier = (index) => {
    const newSuppliers = productSuppliers.filter((_, i) => i !== index);
    if (newSuppliers.length === 0) {
      newSuppliers.push({ localId: Math.random().toString(36).substr(2, 9), supplier_id: '', unit_price: '', contract_start_date: '', contract_end_date: '', contract_file: null, remove_contract: false, fileObj: null });
    }
    setProductSuppliers(newSuppliers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = isEditing 
      ? `http://localhost:3000/api/products/${product.Id}`
      : `http://localhost:3000/api/products`;
      
    const method = isEditing ? 'PUT' : 'POST';

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      submitData.append(key, formData[key] || '');
    });
    if (formData.ExpirationDate) {
      submitData.set('ExpirationDate', formData.ExpirationDate);
    } else {
      submitData.delete('ExpirationDate');
    }
    
    // forEach'ten gelen herhangi bir değeri ezmek için yığın (stacking) alanlarını ekle
    submitData.set('is_stackable', formData.is_stackable ? 1 : 0);
    submitData.set('max_stack_limit', formData.max_stack_limit || 1);

    // Boş barkodları filtrele
    const validBarcodes = barcodes.filter(b => b.trim() !== '');
    submitData.set('Barcode', JSON.stringify(validBarcodes));

    // Mevcut görselleri ve yeni URL görsellerini birleştir
    const validNewUrls = newImageUrls.filter(u => u.trim() !== '');
    const combinedExisting = [...existingImages, ...validNewUrls];
    submitData.set('existingImages', JSON.stringify(combinedExisting));

    // Reçete JSON'ını filtrele ve kaydet
    // Boş adımları ve malzemeleri temizle
    const validSteps = routingSteps.filter(s => s.operation.trim() !== '' || s.machine_id !== '').map(s => ({
        ...s,
        machine_id: parseInt(s.machine_id) || null,
        duration: parseInt(s.duration) || 0,
        materials: s.materials.filter(m => m.material.trim() !== '')
    }));
    
    // Adımlardan toplam üretim süresini otomatik hesapla
    const totalTime = validSteps.reduce((sum, s) => sum + s.duration, 0);
    submitData.set('ProductionTime', totalTime);
    
    submitData.set('Formula', JSON.stringify(validSteps));

    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        submitData.append('images', file);
      });
    }

    if (formData.supply_type === 'PURCHASE' || formData.supply_type === 'OUTSOURCED') {
      const validSuppliers = productSuppliers.filter(s => s.supplier_id);
      submitData.set('suppliers', JSON.stringify(validSuppliers));
      
      validSuppliers.forEach((s, index) => {
        if (s.fileObj) {
          submitData.append(`contractFile_${s.localId || index}`, s.fileObj);
        }
      });
    } else {
      submitData.delete('suppliers');
      submitData.delete('supplier_id');
    }

    try {
      const response = await apiFetch(url, {
        method: method,
        headers: {
            'X-User-Id': currentUser?.id
        },
        body: submitData, // FormData otomatik olarak Content-Type: multipart/form-data ayarlar
      });

      const data = await response.json();

      if (data.success) {
        onClose(true); // refresh
      } else {
        setError(data.message || 'Bir hata oluştu.');
      }
    } catch (err) {
      setError('Sunucu bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#0f172a', margin: 0 }}>{isEditing ? 'Ürünü Düzenle' : 'Yeni Ürün Tanımla'}</h2>
        <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>✕ İptal</button>
      </div>

      {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Barkodlar <span style={{color: '#94a3b8', fontWeight: 'normal'}}>(Okutun veya yazın)</span></label>
                <button type="button" onClick={addBarcodeField} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>+</button>
            </div>
                            {barcodes.map((barcode, index) => (
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', position: 'relative', alignItems: 'center' }}>
                                        <div 
                                            style={{ position: 'absolute', left: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', cursor: 'pointer', zIndex: 10 }}
                                            onClick={() => {
                                                setCurrentScanningIndex(index);
                                                setScannedBarcode('');
                                                setIsBarcodeModalOpen(true);
                                                setTimeout(() => document.getElementById('barcode-form-input')?.focus(), 100);
                                            }}
                                            title="Barkod okutmak için tıklayın"
                                        >
                                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                                        </div>
                                        <input type="text" value={barcode} onChange={(e) => handleBarcodeChange(index, e.target.value)} placeholder={`Barkod ${index + 1} okutun veya yazın`} style={{ flex: 1, padding: '10px 10px 10px 36px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                        
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                let newCode = '869'; // Türkiye GS1
                                                for (let i = 0; i < 9; i++) {
                                                    newCode += Math.floor(Math.random() * 10).toString();
                                                }
                                                let sum = 0;
                                                for (let i = 0; i < 12; i++) {
                                                    sum += parseInt(newCode[i]) * (i % 2 === 0 ? 1 : 3);
                                                }
                                                const checkSum = (10 - (sum % 10)) % 10;
                                                handleBarcodeChange(index, newCode + checkSum);
                                            }} 
                                            style={{ marginLeft: '8px', padding: '0 12px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '38px', fontWeight: '600', fontSize: '13px' }}
                                        >
                                            Oluştur
                                        </button>

                                        {barcodes.length > 1 && (
                                            <button type="button" onClick={() => removeBarcodeField(index)} style={{ marginLeft: '8px', padding: '0 10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '38px' }}>×</button>
                                        )}
                                    </div>

                                    {/* Eğer barkod varsa resmini göster */}
                                    {barcode && barcode.trim().length > 0 && (
                                        <div style={{ marginTop: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px' }}>
                                            <Barcode value={barcode} format={barcode.length === 13 ? "EAN13" : "CODE128"} width={1.8} height={50} fontSize={14} background="#ffffff" />
                                        </div>
                                    )}
                                </div>
                            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ürün Adı *</label>
            <input type="text" name="ProductName" value={formData.ProductName} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Kategori *</label>
                {!showNewCategoryInput && (
                    <button type="button" onClick={() => setShowNewCategoryInput(true)} title="Yeni Kategori Ekle" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>+</button>
                )}
            </div>
            
            {showNewCategoryInput ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }} placeholder="Yeni Kategori Adı" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button type="button" onClick={handleAddCategory} disabled={addingCategory} style={{ padding: '0 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>{addingCategory ? '...' : 'Ekle'}</button>
                    <button type="button" onClick={() => setShowNewCategoryInput(false)} style={{ padding: '0 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>İptal</button>
                </div>
            ) : (
                <select name="Category" value={formData.Category} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                  <option value="">Seçiniz...</option>
                  {Array.isArray(categoryList) && categoryList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Marka *</label>
                {!showNewBrandInput && (
                    <button type="button" onClick={() => setShowNewBrandInput(true)} title="Yeni Marka Ekle" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>+</button>
                )}
            </div>
            
            {showNewBrandInput ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBrand(); } }} placeholder="Yeni Marka Adı" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button type="button" onClick={handleAddBrand} disabled={addingBrand} style={{ padding: '0 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>{addingBrand ? '...' : 'Ekle'}</button>
                    <button type="button" onClick={() => setShowNewBrandInput(false)} style={{ padding: '0 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>İptal</button>
                </div>
            ) : (
                <select name="Brand" value={formData.Brand} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                  <option value="">Seçiniz...</option>
                  {Array.isArray(brandList) && brandList.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
            )}
          </div>


          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Satış Fiyatı (₺) *</label>
            <input type="number" step="0.01" name="SalePrice" value={formData.SalePrice} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Raf Ömrü (Ay)</label>
            <input type="number" step="1" min="0" name="shelf_life_months" value={formData.shelf_life_months} onChange={handleChange} placeholder="Örn: 12" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>



          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Genişlik (cm)</label>
              <input type="number" step="0.01" name="Width" value={formData.Width} onChange={handleChange} placeholder="Örn: 10" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Yükseklik (cm)</label>
              <input type="number" step="0.01" name="Height" value={formData.Height} onChange={handleChange} placeholder="Örn: 5" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Derinlik (cm)</label>
              <input type="number" step="0.01" name="Depth" value={formData.Depth} onChange={handleChange} placeholder="Örn: 20" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', whiteSpace: 'nowrap' }}>Çap (cm) <span style={{color: '#94a3b8', fontWeight: 'normal', fontSize: '11px'}}>(Silindirik)</span></label>
              <input type="number" step="0.01" name="Diameter" value={formData.Diameter} onChange={handleChange} placeholder="Örn: 8" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ağırlık (kg/gr)</label>
              <input type="number" step="0.01" name="Weight" value={formData.Weight} onChange={handleChange} placeholder="Örn: 1.5" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Kritik Stok Seviyesi
                <span title="Stok miktarı bu seviyenin altına düştüğünde ana sayfada uyarı verir." style={{ cursor: 'help', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
              </label>
              <input type="number" step="1" min="0" name="critical_stock_level" value={formData.critical_stock_level} onChange={handleChange} placeholder="Örn: 100" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', gridColumn: '1 / -1', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" id="is_stackable" name="is_stackable" checked={formData.is_stackable} onChange={(e) => setFormData({...formData, is_stackable: e.target.checked})} style={{ width: '18px', height: '18px', marginRight: '10px', cursor: 'pointer' }} />
              <label htmlFor="is_stackable" style={{ fontSize: '14px', fontWeight: '600', color: '#166534', cursor: 'pointer' }}>Üst Üste İstiflenebilir mi?</label>
            </div>
            
            {formData.is_stackable && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '6px' }}>Maksimum Kat Sayısı</label>
                <input type="number" min="1" name="max_stack_limit" value={formData.max_stack_limit} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #86efac', backgroundColor: 'white' }} />
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tedarik Tipi *</label>
            <select name="supply_type" value={formData.supply_type} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
              <option value="MANUFACTURE">Kendi Üretimimiz</option>
              <option value="PURCHASE">Satın Alınan (Hazır / Ticari)</option>
              <option value="OUTSOURCED">Fason Üretim (Dışarıda Yaptırılan)</option>
            </select>
          </div>

          {(formData.supply_type === 'PURCHASE' || formData.supply_type === 'OUTSOURCED') && (
            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                        {formData.supply_type === 'OUTSOURCED' ? 'Fason Üreticiler & Sözleşmeler' : 'Tedarikçi Firmalar & Sözleşmeler'}
                    </label>
                    <button type="button" onClick={addProductSupplier} style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>+ Tedarikçi Ekle</button>
                </div>
                
                {productSuppliers.map((supplier, sIndex) => (
                    <div key={supplier.localId || sIndex} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Tedarikçi {sIndex + 1}</span>
                            {productSuppliers.length > 1 && (
                                <button type="button" onClick={() => removeProductSupplier(sIndex)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Sil ✕</button>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Firma Seçimi *</label>
                                <select value={supplier.supplier_id} onChange={(e) => handleProductSupplierChange(sIndex, 'supplier_id', e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '13px' }}>
                                    <option value="">Seçiniz...</option>
                                    {supplierList.map(s => (
                                        <option key={s.Id} value={s.Id}>{s.SupplierName}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Birim Fiyat (₺)</label>
                                <input type="number" step="0.01" value={supplier.unit_price} onChange={(e) => handleProductSupplierChange(sIndex, 'unit_price', e.target.value)} placeholder="0.00" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Başlangıç</label>
                                <input type="date" value={supplier.contract_start_date} onChange={(e) => handleProductSupplierChange(sIndex, 'contract_start_date', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Bitiş</label>
                                <input type="date" value={supplier.contract_end_date} onChange={(e) => handleProductSupplierChange(sIndex, 'contract_end_date', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Dosyası (PDF vb.)</label>
                                {supplier.contract_file && !supplier.remove_contract && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                        <a href={supplier.contract_file.startsWith('http') ? supplier.contract_file : `http://localhost:3000${supplier.contract_file}`} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#059669', textDecoration: 'none', fontWeight: '500' }}>Mevcut Sözleşmeyi Görüntüle</a>
                                        <button type="button" onClick={() => handleProductSupplierChange(sIndex, 'remove_contract', true)} style={{ padding: '4px 8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Kaldır</button>
                                    </div>
                                )}
                                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleProductSupplierFileChange(sIndex, e.target.files[0])} style={{ padding: '6px', border: '1px dashed #94a3b8', borderRadius: '6px', fontSize: '12px' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Ürün Görselleri (Çoklu)</label>
                <button type="button" onClick={addNewUrlField} style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}>+ URL Ekle</button>
            </div>
            
            {/* Mevcut URL alanları */}
            {newImageUrls.map((url, index) => (
                <div key={index} style={{ display: 'flex', marginBottom: '8px' }}>
                    <input type="text" value={url} onChange={(e) => handleUrlChange(index, e.target.value)} placeholder="https://.../resim.jpg" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                    <button type="button" onClick={() => removeUrlField(index)} style={{ marginLeft: '8px', padding: '0 10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
                </div>
            ))}

            <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>Bilgisayardan Dosya Seç (Çoklu Seçim Yapabilirsiniz)</label>
                <div style={{ position: 'relative', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', transition: 'all 0.2s', cursor: 'pointer' }} onMouseOver={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }} onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}>
                    <input type="file" name="images" multiple accept="image/*" onChange={handleFileChange} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e3a8a' }}>Dosyaları buraya sürükleyin veya tıklayarak seçin</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{imageFiles.length > 0 ? <span style={{color: '#10b981', fontWeight: 'bold'}}>✓ {imageFiles.length} dosya seçildi</span> : 'PNG, JPG, JPEG (Max. 5MB)'}</div>
                </div>
            </div>

            {/* Önceden yüklenmiş veya URL ile eklenmiş mevcut resimleri listeleme */}
            {existingImages.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                    {existingImages.map((img, index) => (
                        <div key={index} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <img src={img.startsWith('http') ? img : `http://localhost:3000${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button type="button" onClick={() => removeExistingImage(index)} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '0 0 0 4px', fontSize: '10px', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {canManageFormula && formData.supply_type !== 'PURCHASE' && (
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Üretim Akış Adımları (Rotalama / Routing)</label>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Makine bazlı üretim adımlarını ve o adımda kullanılacak hammaddeleri ekleyin. Toplam süre otomatik hesaplanacaktır.</div>
                </div>
                <button type="button" onClick={addStep} style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>+ Yeni Adım Ekle</button>
            </div>
            
            {routingSteps.map((step, stepIndex) => (
                <div key={stepIndex} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Adım {step.step}</span>
                        <button type="button" onClick={() => removeStep(stepIndex)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Adımı Sil ✕</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Makine / İstasyon</label>
                            <select 
                                value={step.machine_id} 
                                onChange={(e) => handleStepChange(stepIndex, 'machine_id', e.target.value)} 
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                            >
                                <option value="">-- Seç --</option>
                                {machineList.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>İşlem Adı</label>
                            <input 
                                type="text" 
                                value={step.operation} 
                                onChange={(e) => handleStepChange(stepIndex, 'operation', e.target.value)} 
                                placeholder="Örn: Isıtma" 
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} 
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Süre (Dakika)</label>
                            <input 
                                type="number" 
                                value={step.duration} 
                                onChange={(e) => handleStepChange(stepIndex, 'duration', e.target.value)} 
                                placeholder="Örn: 15" 
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} 
                            />
                        </div>
                    </div>

                    <div style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Bu Adımda Kullanılacak Hammaddeler (İsteğe Bağlı)</span>
                            <button type="button" onClick={() => addStepMaterial(stepIndex)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>+ Malzeme</button>
                        </div>
                        {step.materials.length === 0 && (
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Malzeme eklenmedi.</div>
                        )}
                        {step.materials.map((item, matIndex) => (
                            <div key={matIndex} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '4px' }}>
                                <select 
                                    value={item.material} 
                                    onChange={(e) => handleStepMaterialChange(stepIndex, matIndex, 'material', e.target.value)} 
                                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: 'white' }} 
                                >
                                    <option value="">-- Hammadde Seç --</option>
                                    {materialsList.map(m => (
                                        <option key={m.Id} value={m.ProductName}>{m.ProductName}</option>
                                    ))}
                                    {item.material && !materialsList.find(m => m.ProductName === item.material) && (
                                        <option value={item.material}>{item.material} (Eski Kayıt)</option>
                                    )}
                                </select>
                                <input 
                                    type="number" 
                                    value={item.quantity} 
                                    onChange={(e) => handleStepMaterialChange(stepIndex, matIndex, 'quantity', e.target.value)} 
                                    placeholder="Miktar" 
                                    step="0.01"
                                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }} 
                                />
                                <select 
                                    value={item.unit} 
                                    onChange={(e) => handleStepMaterialChange(stepIndex, matIndex, 'unit', e.target.value)} 
                                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: 'white' }}
                                >
                                    <option value="gr">Gram (gr)</option>
                                    <option value="kg">Kilogram (kg)</option>
                                    <option value="ml">Mililitre (ml)</option>
                                    <option value="L">Litre (L)</option>
                                    <option value="tank">Tank</option>
                                    <option value="adet">Adet</option>
                                    <option value="paket">Paket</option>
                                </select>
                                <button type="button" onClick={() => removeStepMaterial(stepIndex, matIndex)} style={{ padding: '0 8px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            
            <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                Toplam Üretim Süresi: <span style={{ color: '#3b82f6' }}>{routingSteps.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0)} Dakika</span>
            </div>
        </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açıklama</label>
          <textarea name="Description" value={formData.Description} onChange={handleChange} rows="3" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={() => onClose(false)} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>İptal</button>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#10b981', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>

      {isBarcodeModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
              <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', animation: 'pulse 2s infinite' }}><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Lütfen Barkodu Okutun</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Cihazınızla ürün barkodunu tarayın.</p>
                  
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      if (scannedBarcode.trim() && currentScanningIndex !== null) {
                          handleBarcodeChange(currentScanningIndex, scannedBarcode.trim());
                      }
                      setIsBarcodeModalOpen(false);
                  }}>
                      <input 
                          id="barcode-form-input"
                          type="text" 
                          value={scannedBarcode}
                          onChange={(e) => setScannedBarcode(e.target.value)}
                          placeholder="Barkod bekleniyor..."
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '16px', textAlign: 'center', outline: 'none' }}
                          autoComplete="off"
                      />
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                          <button type="button" onClick={() => setIsBarcodeModalOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                          <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: 'white' }}>Ekle</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProductForm;
