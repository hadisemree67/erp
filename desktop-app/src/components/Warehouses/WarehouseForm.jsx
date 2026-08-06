/**
 * ============================================================================
 * DOSYA ADI: WarehouseForm.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Depo Tanım Modülü / Depo ve Konum Oluşturma Formu
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sisteme yeni bir fiziksel depo, lokasyon veya şube tanımlamak; mevcut deponun adını, adresini, sorumlu personelini ve genel kapasite özelliklerini düzenlemek için kullanılan formdur.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Depo Tanım Doğrulama, Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/warehouses` rotasına POST ve PUT istekleri göndererek lojistik yapılandırmayı günceller.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (WarehouseForm.jsx), Depo tanımları, raf koordinatları ve depo yerleşim düzeninin (Layout) görselleştirilmesini sağlar.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import BarcodePrintModal from '../Common/BarcodePrintModal';

const WarehouseForm = ({ warehouse, onNavigate }) => {
    const isEditing = !!warehouse;

    // 1. Durum (State) Tanımlamaları ve Hook'lar

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        address: '',
        warehouse_type: 'STOK'
    });

    const [shelves, setShelves] = useState([{ shelfCode: '', width: '', height: '', depth: '', barcode: '' }]); // Başlangıçta 1 adet boş raf inputu
    const [floorPrefix, setFloorPrefix] = useState('');
    const [blockPrefix, setBlockPrefix] = useState('');
    const [blockCount, setBlockCount] = useState('');
    const [shelfWidth, setShelfWidth] = useState('');
    const [shelfHeight, setShelfHeight] = useState('');
    const [shelfDepth, setShelfDepth] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [barcodeModalIndex, setBarcodeModalIndex] = useState(null);
    const [tempBarcode, setTempBarcode] = useState('');
    const [error, setError] = useState(null);

    // Barkod Yazdırma State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printBarcodeData, setPrintBarcodeData] = useState({ value: '', title: '' });

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        if (isEditing && warehouse) {
            setFormData({
                name: warehouse.name || '',
                location: warehouse.location || '',
                address: warehouse.address || '',
                warehouse_type: warehouse.warehouse_type || 'STOK'
            });
            if (warehouse.Shelves_Details && warehouse.Shelves_Details.length > 0) {
                setShelves(warehouse.Shelves_Details.map(s => ({ 
                    shelfCode: s.shelfCode, 
                    width: s.width || '', 
                    height: s.height || '', 
                    depth: s.depth || '',
                    barcode: s.barcode || ''
                })));
            } else if (warehouse.Shelves && warehouse.Shelves.length > 0) {
                // Geriye dönük uyumluluk
                setShelves(warehouse.Shelves.map(s => ({ shelfCode: s, width: '', height: '', depth: '', barcode: '' })));
            } else {
                setShelves([{ shelfCode: '', width: '', height: '', depth: '', barcode: '' }]);
            }
        }
    }, [isEditing, warehouse]);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleShelfChange = (index, field, value) => {
        const newShelves = [...shelves];
        newShelves[index][field] = value;
        setShelves(newShelves);
    };

    const addShelfField = () => {
        setShelves([...shelves, { shelfCode: '', width: '', height: '', depth: '', barcode: '' }]);
    };

    const removeShelfField = (index) => {
        const newShelves = shelves.filter((_, i) => i !== index);
        if (newShelves.length === 0) newShelves.push({ shelfCode: '', width: '', height: '', depth: '', barcode: '' });
        setShelves(newShelves);
    };

    const handleGenerateBlock = () => {
        const count = parseInt(blockCount, 10);

        if (blockPrefix.trim() && !isNaN(count) && count > 0) {
            let newShelves = [];
            const floorStr = floorPrefix.trim() ? floorPrefix.trim() + ' ' : '';
            
            for (let i = 1; i <= count; i++) {
                const shelfCode = `${floorStr}${blockPrefix.trim()}-${i}`;
                newShelves.push({ 
                    shelfCode, 
                    width: shelfWidth, 
                    height: shelfHeight, 
                    depth: shelfDepth,
                    barcode: `RAF-${Date.now().toString().slice(-6)}-${shelfCode.replace(/\s+/g, '-')}`
                });
            }
            const currentShelves = shelves.filter(s => s.shelfCode.trim() !== '');
            setShelves([...currentShelves, ...newShelves]);
            setBlockPrefix('');
            setBlockCount('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError('Lütfen depo adını giriniz.');
            return;
        }

        const validShelves = shelves.filter(s => s.shelfCode.trim() !== '');

        setSubmitting(true);
        try {
            const url = isEditing ? `http://localhost:3000/api/warehouses/${warehouse.id}` : 'http://localhost:3000/api/warehouses';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    location: formData.location,
                    address: formData.address,
                    warehouse_type: formData.warehouse_type,
                    shelves: validShelves
                })
            });

            const data = await response.json();
            if (response.ok) {
                onNavigate('depo-listesi');
            } else {
                setError(data.message || 'Kaydedilirken hata oluştu.');
            }
        } catch (err) {
            setError('Sunucu hatası.');
        } finally {
            setSubmitting(false);
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                    {isEditing ? 'Depoyu Düzenle' : 'Yeni Depo Ekle'}
                </h2>
                <button 
                    type="button"
                    onClick={() => onNavigate('depo-listesi')} 
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Geri Dön
                </button>
            </div>

            {error && <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Depo Adı *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Örn: Merkez Depo" required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Lokasyon / Şube <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(İsteğe Bağlı)</span></label>
                            <input 
                                type="text" 
                                value={formData.location} 
                                onChange={(e) => setFormData({...formData, location: e.target.value})} 
                                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
                                placeholder="Örn: Tuzla, Merkez Bina"
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Depo Türü <span style={{ color: '#ef4444' }}>*</span></label>
                            <select 
                                value={formData.warehouse_type} 
                                onChange={(e) => setFormData({...formData, warehouse_type: e.target.value})} 
                                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', backgroundColor: '#fff' }}
                            >
                                <option value="STOK">Stok Deposu (Ürünler)</option>
                                <option value="HAMMADDE">Hammadde Deposu (Malzemeler)</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Açık Adres <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(İsteğe Bağlı)</span></label>
                            <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Deponun açık adresini buraya girebilirsiniz..." rows="3" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', resize: 'vertical' }}></textarea>
                        </div>
                    </div>

                </div>

                <div style={{ marginBottom: '32px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a' }}>Raf / Bölüm Tanımları</h3>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Aşağıdaki araçla otomatik seri oluşturabilir veya tek tek raf ekleyebilirsiniz.</p>
                        </div>
                        <button type="button" onClick={() => setShelves([...shelves, { shelfCode: '', width: '', height: '', depth: '', barcode: `RAF-${Date.now().toString().slice(-6)}-YENI` }])} style={{ padding: '8px 16px', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '18px' }}>+</span> Tekli Raf Ekle
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '6px' }}>Kat (Ops)</label>
                                    <input type="text" value={floorPrefix} onChange={(e) => setFloorPrefix(e.target.value)} placeholder="Örn: 1" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '14px' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '6px' }}>Blok Adı *</label>
                                    <input type="text" value={blockPrefix} onChange={(e) => setBlockPrefix(e.target.value)} placeholder="Örn: A" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '14px' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '6px' }}>Raf Sayısı *</label>
                                    <input type="number" min="1" value={blockCount} onChange={(e) => setBlockCount(e.target.value)} placeholder="Örn: 10" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '14px' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '6px' }}>Genişlik (cm)</label>
                                    <input type="number" min="0" value={shelfWidth} onChange={(e) => setShelfWidth(e.target.value)} placeholder="G (Ops)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '14px' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '6px' }}>Yükseklik (cm)</label>
                                    <input type="number" min="0" value={shelfHeight} onChange={(e) => setShelfHeight(e.target.value)} placeholder="Y (Ops)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '14px' }} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '6px' }}>Derinlik (cm)</label>
                                    <input type="number" min="0" value={shelfDepth} onChange={(e) => setShelfDepth(e.target.value)} placeholder="D (Ops)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '14px' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={handleGenerateBlock} style={{ padding: '10px 32px', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', height: '40px' }}>Seri Oluştur</button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '12px' }}>
                        {shelves.map((shelf, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', position: 'relative', gap: '8px' }}>
                                <input 
                                    type="text" 
                                    value={shelf.shelfCode} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const newShelves = [...shelves];
                                        newShelves[index] = { ...newShelves[index], shelfCode: val };
                                        
                                        // Eğer barkod atanmamışsa veya RAF- ile başlayıp YENI biten geçici barkodsa, güncelle
                                        if (!newShelves[index].barcode || newShelves[index].barcode.endsWith('YENI')) {
                                            newShelves[index].barcode = `RAF-${Date.now().toString().slice(-6)}-${val.replace(/\s+/g, '-')}`;
                                        }
                                        setShelves(newShelves);
                                    }} 
                                    placeholder={`Raf Kodu ${index + 1}`} 
                                    style={{ flex: 1, minWidth: '100px', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                                />
                                <input 
                                    type="number" 
                                    value={shelf.width} 
                                    onChange={(e) => handleShelfChange(index, 'width', e.target.value)} 
                                    placeholder={`Genişlik`} 
                                    style={{ width: '80px', padding: '10px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                                />
                                <input 
                                    type="number" 
                                    value={shelf.height} 
                                    onChange={(e) => handleShelfChange(index, 'height', e.target.value)} 
                                    placeholder={`Yükseklik`} 
                                    style={{ width: '80px', padding: '10px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                                />
                                <input 
                                    type="number" 
                                    value={shelf.depth} 
                                    onChange={(e) => handleShelfChange(index, 'depth', e.target.value)} 
                                    placeholder={`Derinlik`} 
                                    style={{ width: '80px', padding: '10px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
                                />
                                <div style={{ position: 'relative', display: 'flex', gap: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (barcodeModalIndex === index) {
                                                setBarcodeModalIndex(null);
                                            } else {
                                                setBarcodeModalIndex(index);
                                                setTempBarcode(shelf.barcode || '');
                                                setTimeout(() => document.getElementById(`barcode-input-${index}`)?.focus(), 50);
                                            }
                                        }}
                                        title={shelf.barcode ? `Barkod: ${shelf.barcode} (Değiştirmek için tıklayın)` : "Barkod eklemek için tıklayın"}
                                        style={{
                                            padding: '0',
                                            backgroundColor: shelf.barcode ? '#ecfdf5' : 'white',
                                            border: '1px solid #cbd5e1',
                                            borderColor: shelf.barcode ? '#10b981' : '#cbd5e1',
                                            color: shelf.barcode ? '#10b981' : '#64748b',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '40px',
                                            width: '40px',
                                            flexShrink: 0
                                        }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                                    </button>

                                    {shelf.barcode && (
                                        <button
                                            type="button"
                                            title="Yazdır"
                                            onClick={() => {
                                                setPrintBarcodeData({ value: shelf.barcode, title: `Raf: ${shelf.shelfCode || 'İsimsiz'}` });
                                                setPrintModalOpen(true);
                                            }}
                                            style={{
                                                padding: '0',
                                                backgroundColor: 'white',
                                                border: '1px solid #cbd5e1',
                                                color: '#3b82f6',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '40px',
                                                width: '40px',
                                                flexShrink: 0
                                            }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                        </button>
                                    )}
                                    
                                    {barcodeModalIndex === index && (
                                        <div style={{ position: 'absolute', top: '100%', right: '0', zIndex: 50, marginTop: '8px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                                            <input 
                                                id={`barcode-input-${index}`}
                                                type="text" 
                                                value={tempBarcode} 
                                                onChange={e => setTempBarcode(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const finalBarcode = e.target.value;
                                                        handleShelfChange(index, 'barcode', finalBarcode);
                                                        setBarcodeModalIndex(null);
                                                    }
                                                }}
                                                placeholder="Okutun veya yazın..." 
                                                style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #3b82f6', outline: 'none', width: '180px', fontSize: '14px' }} 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newBarcode = `RAF-${Date.now().toString().slice(-6)}-${shelf.shelfCode ? shelf.shelfCode.replace(/\s+/g, '-') : 'YENI'}`;
                                                    setTempBarcode(newBarcode);
                                                }}
                                                style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}
                                            >
                                                Oluştur
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    handleShelfChange(index, 'barcode', tempBarcode);
                                                    setBarcodeModalIndex(null);
                                                }}
                                                style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                Kaydet
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {shelves.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => removeShelfField(index)} 
                                        style={{ padding: '6px', background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        title="Rafı Kaldır"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                    <button type="button" onClick={() => onNavigate('depo-listesi')} style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>
                        İptal
                    </button>
                    <button type="submit" disabled={submitting} style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {submitting ? 'Kaydediliyor...' : (isEditing ? 'Değişiklikleri Kaydet' : 'Depoyu Kaydet')}
                    </button>
                </div>
            </form>

            <BarcodePrintModal 
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                barcodeValue={printBarcodeData.value}
                title={printBarcodeData.title}
            />
        </div>
    );
};

export default WarehouseForm;
