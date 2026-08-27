/**
 * ============================================================================
 * BİLEŞEN ADI: PackagingBoxes
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Müşteri siparişleri, paketleme, kargo ve iade işlemlerini kapsayan ekran.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu dosya (PackagingBoxes.jsx), Müşteri siparişleri, kargo takibi ve siparişlerin paketlenmesi aşamalarını içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import Barcode from 'react-barcode';

const PackagingBoxes = () => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [boxes, setBoxes] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBox, setEditingBox] = useState(null);
    const [formData, setFormData] = useState({
        BoxName: '',
        Width: '',
        Height: '',
        Depth: '',
        EmptyWeight: '',
        MaxWeightCapacity: '',
        Cost: '',
        MinStockLevel: ''
    });
    const [suppliersData, setSuppliersData] = useState([]);
    
    // Barkod Modal State'leri
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [selectedBoxForBarcode, setSelectedBoxForBarcode] = useState(null);
    const [newBarcode, setNewBarcode] = useState('');

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchBoxes();
        fetchSuppliers();
    }, []);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchSuppliers = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/suppliers');
            const data = await res.json();
            if (data.success) {
                setSuppliers(data.data);
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchBoxes = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/boxes');
            const data = await res.json();
            if (data.success) {
                setBoxes(data.data);
            }
        } catch (error) {
            console.error('Error fetching boxes:', error);
        }
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingBox 
            ? `${import.meta.env.VITE_API_URL}/api/boxes/${editingBox.Id}`
            : import.meta.env.VITE_API_URL + '/api/boxes';
        
        try {
            const fd = new FormData();
            fd.append('BoxName', formData.BoxName);
            fd.append('Width', formData.Width);
            fd.append('Height', formData.Height);
            fd.append('Depth', formData.Depth);
            fd.append('EmptyWeight', formData.EmptyWeight);
            fd.append('MaxWeightCapacity', formData.MaxWeightCapacity);
            fd.append('Cost', formData.Cost);
            fd.append('MinStockLevel', formData.MinStockLevel);
            fd.append('IsActive', 1);

            const validSuppliers = suppliersData.filter(s => s.supplier_id);
            fd.append('suppliers', JSON.stringify(validSuppliers.map(s => ({
                supplier_id: s.supplier_id,
                contract_start_date: s.contract_start_date,
                contract_end_date: s.contract_end_date,
                unit_price: s.unit_price,
                lead_time_days: s.lead_time_days,
                remove_contract: s.remove_contract,
                contract_file: s.contract_file,
                localId: s.localId
            }))));

            validSuppliers.forEach((s, index) => {
                if (s.fileObject) {
                    fd.append('contractFile_' + (s.localId || index), s.fileObject);
                }
            });

            const res = await fetch(url, {
                method: editingBox ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: fd
            });
            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                setFormData({ BoxName: '', Width: '', Height: '', Depth: '', EmptyWeight: '', MaxWeightCapacity: '', Cost: '', MinStockLevel: '' });
                setSuppliersData([]);
                setEditingBox(null);
                fetchBoxes();
            } else {
                alert(data.message || 'Bir hata oluştu.');
            }
        } catch (error) {
                console.error('Error saving box:', error);
            alert('Sunucu hatası.');
        }
    };

    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockFormData, setStockFormData] = useState({
        BoxId: '',
        Quantity: '',
        SupplierId: ''
    });

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        if (!stockFormData.BoxId) {
            alert('Lütfen bir kutu seçiniz.');
            return;
        }

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/boxes/${stockFormData.BoxId}/add-stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stockFormData)
            });
            const data = await res.json();
            if (data.success) {
                setIsStockModalOpen(false);
                setStockFormData({ BoxId: '', Quantity: '', SupplierId: '' });
                fetchBoxes();
                alert('Stok başarıyla eklendi.');
            } else {
                alert(data.message || 'Stok eklenemedi.');
            }
        } catch (err) {
            console.error('Stok hatası:', err);
            alert('Sunucu hatası.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu kutuyu silmek istediğinize emin misiniz?')) return;
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/boxes/${id}`, { method: 'DELETE' });
            if (res.ok) fetchBoxes();
        } catch (error) {
            console.error('Error deleting box:', error);
        }
    };

    const handleEdit = (box) => {
        setEditingBox(box);
        setFormData({
            BoxName: box.BoxName,
            Width: box.Width,
            Height: box.Height,
            Depth: box.Depth,
            EmptyWeight: box.EmptyWeight,
            MaxWeightCapacity: box.MaxWeightCapacity,
            Cost: box.Cost,
            MinStockLevel: box.MinStockLevel || ''
        });
        const initialSuppliersData = box.suppliers 
            ? (typeof box.suppliers === 'string' ? JSON.parse(box.suppliers) : box.suppliers).map(s => ({
                ...s,
                localId: Math.random().toString(),
                contract_start_date: s.contract_start_date ? s.contract_start_date.split('T')[0] : '',
                contract_end_date: s.contract_end_date ? s.contract_end_date.split('T')[0] : ''
            })) 
            : [];
        setSuppliersData(initialSuppliersData);
        setIsModalOpen(true);
    };
    // Barkod İşlemleri
    const generateRandomBarcode = () => {
        return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    };

    const handleAddBarcode = async () => {
        if (!newBarcode) return alert("Barkod boş olamaz!");
        
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/boxes/${selectedBoxForBarcode.Id}/barcodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: newBarcode })
            });
            const data = await res.json();
            if (data.success) {
                // Modalı güncelle
                setSelectedBoxForBarcode({
                    ...selectedBoxForBarcode,
                    barcodes: [...(selectedBoxForBarcode.barcodes || []), data.data]
                });
                setNewBarcode('');
                fetchBoxes(); // Listeyi güncelle
            } else {
                alert(data.message || 'Barkod eklenemedi.');
            }
        } catch (err) {
            console.error('Error adding barcode:', err);
            alert('Bir hata oluştu.');
        }
    };

    const handleDeleteBarcode = async (barcodeId) => {
        if (!window.confirm("Bu barkodu silmek istediğinize emin misiniz?")) return;
        
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/boxes/${selectedBoxForBarcode.Id}/barcodes/${barcodeId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setSelectedBoxForBarcode({
                    ...selectedBoxForBarcode,
                    barcodes: selectedBoxForBarcode.barcodes.filter(b => b.id !== barcodeId)
                });
                fetchBoxes();
            } else {
                alert(data.message || 'Barkod silinemedi.');
            }
        } catch (err) {
            console.error('Error deleting barcode:', err);
            alert('Bir hata oluştu.');
        }
    };
    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: `'Inter', sans-serif` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Kutu Tanımları</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Kargo gönderimleri için kullanılacak kutu ve palet boyutlarını yönetin.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => {
                            setStockFormData({ BoxId: '', Quantity: '', SupplierId: '' });
                            setIsStockModalOpen(true);
                        }}
                        style={{ padding: '10px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                    >
                        + Stok Ekle
                    </button>
                    <button
                        onClick={() => {
                            setEditingBox(null);
                            setFormData({ BoxName: '', Width: '', Height: '', Depth: '', EmptyWeight: '', MaxWeightCapacity: '', Cost: '', MinStockLevel: '' });
                            setSuppliersData([]);
                            setIsModalOpen(true);
                        }}
                        style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                    >
                        + Yeni Kutu Ekle
                    </button>
                </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Kutu Adı</th>
                            <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Ebat (En x Boy x Derinlik)</th>
                            <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Boş Ağırlık</th>
                            <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Max Kapasite</th>
                            <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Maliyet</th>
                            <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '800', color: '#16a34a' }}>Kalan Stok</th>
                            <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {boxes.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Henüz kutu tanımlanmamış.</td>
                            </tr>
                        ) : (
                            boxes.map(box => (
                                <tr key={box.Id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '16px', fontWeight: '600', color: '#0f172a' }}>{box.BoxName}</td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{box.Width} x {box.Height} x {box.Depth} cm</td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{box.EmptyWeight} kg</td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{box.MaxWeightCapacity} kg</td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{box.Cost} TL</td>
                                    <td style={{ padding: '16px', fontWeight: '800', fontSize: '15px', color: (box.StockQuantity || 0) > 0 ? '#16a34a' : '#ef4444' }}>
                                        {box.StockQuantity || 0} Adet
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                            <button 
                                                onClick={() => {
                                                    setSelectedBoxForBarcode(box);
                                                    setIsBarcodeModalOpen(true);
                                                    setNewBarcode('');
                                                }}
                                                title="Barkodları Yönet" 
                                                style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} 
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleEdit(box)}
                                                title="Düzenle" 
                                                style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} 
                                                onMouseOver={e => e.currentTarget.style.color = '#0f172a'} 
                                                onMouseOut={e => e.currentTarget.style.color = '#334155'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(box.Id)}
                                                title="Sil" 
                                                style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} 
                                                onMouseOver={e => e.currentTarget.style.color = '#ef4444'} 
                                                onMouseOut={e => e.currentTarget.style.color = '#334155'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', color: '#1e293b' }}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>{editingBox ? 'Kutu Düzenle' : 'Yeni Kutu Ekle'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Kutu Adı (Örn: Orta Boy Kutu, Palet-1)</label>
                                <input type="text" name="BoxName" value={formData.BoxName} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#334155' }}>En (cm)</label>
                                    <input type="number" step="0.01" name="Width" value={formData.Width} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#334155' }}>Boy (cm)</label>
                                    <input type="number" step="0.01" name="Height" value={formData.Height} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#334155' }}>Derinlik (cm)</label>
                                    <input type="number" step="0.01" name="Depth" value={formData.Depth} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#334155' }}>Boş Ağırlık (kg)</label>
                                    <input type="number" step="0.01" name="EmptyWeight" value={formData.EmptyWeight} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#334155' }}>Max Kapasite (kg)</label>
                                    <input type="number" step="0.01" name="MaxWeightCapacity" value={formData.MaxWeightCapacity} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#334155' }}>Min Stok (Uyarı)</label>
                                    <input type="number" name="MinStockLevel" value={formData.MinStockLevel} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} />
                                </div>
                            </div>
                            
                            {/* MULTIPLE SUPPLIERS SECTION */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#334155', margin: 0 }}>Tedarikçiler ve Sözleşmeler</h3>
                                    <button 
                                        type="button" 
                                        onClick={() => setSuppliersData([...suppliersData, { supplier_id: '', unit_price: '', lead_time_days: '', contract_start_date: '', contract_end_date: '', localId: Math.random().toString() }])}
                                        style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <span style={{ fontSize: '16px' }}>+</span> Tedarikçi Ekle
                                    </button>
                                </div>
                                
                                {suppliersData.length === 0 && (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px', backgroundColor: 'white', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                        Henüz tedarikçi eklenmedi. Yeni bir tedarikçi eklemek için yukarıdaki butonu kullanın.
                                    </div>
                                )}

                                {suppliersData.map((sup, index) => {
                                    const hasActiveContract = sup.contract_start_date && sup.contract_end_date && new Date(sup.contract_end_date) >= new Date();
                                    const hasExistingContract = sup.contract_file && !sup.remove_contract;
                                    
                                    return (
                                        <div key={sup.localId} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '15px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', position: 'relative' }}>
                                            <button 
                                                type="button"
                                                onClick={() => setSuppliersData(suppliersData.filter(s => s.localId !== sup.localId))}
                                                style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                                title="Tedarikçiyi Sil"
                                            >
                                                ×
                                            </button>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '30px' }}>
                                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tedarikçi Seçimi *</label>
                                                <select 
                                                    value={sup.supplier_id} 
                                                    onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, supplier_id: e.target.value } : s))}
                                                    required
                                                    disabled={hasActiveContract && !sup.isNew}
                                                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (hasActiveContract && !sup.isNew) ? '#f1f5f9' : 'white', fontSize: '14px' }}
                                                >
                                                    <option value="">-- Tedarikçi Seç --</option>
                                                    {suppliers.map(s => (
                                                        <option key={s.Id} value={s.Id}>{s.SupplierName}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr 1fr', gap: '15px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Tedarik Süresi (Gün)</label>
                                                    <input type="number" step="1" value={sup.lead_time_days || ''} onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, lead_time_days: e.target.value } : s))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Birim Fiyat (TL)</label>
                                                    <input type="number" step="0.01" value={sup.unit_price || ''} onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, unit_price: e.target.value } : s))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Başlangıç</label>
                                                    <input 
                                                        type="date" 
                                                        value={sup.contract_start_date}
                                                        onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, contract_start_date: e.target.value } : s))}
                                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Bitiş</label>
                                                    <input 
                                                        type="date" 
                                                        value={sup.contract_end_date}
                                                        onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, contract_end_date: e.target.value } : s))}
                                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Dosyası (İsteğe Bağlı PDF/Dosya)</label>
                                                <input 
                                                    type="file" 
                                                    onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, fileObject: e.target.files[0], remove_contract: false } : s))}
                                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px' }} 
                                                />
                                                
                                                {hasExistingContract && !sup.fileObject && (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', marginTop: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '14px' }}>📄</span>
                                                            <a href={`${import.meta.env.VITE_API_URL}${sup.contract_file}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500', fontSize: '13px' }}>
                                                                Mevcut Sözleşmeyi Görüntüle
                                                            </a>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, remove_contract: true } : s))}
                                                            style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                                                        >
                                                            Dosyayı Kaldır
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {sup.fileObject && (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', marginTop: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '14px' }}>📁</span>
                                                            <span style={{ color: '#1d4ed8', fontSize: '13px', fontWeight: '500' }}>
                                                                {sup.fileObject.name}
                                                            </span>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, fileObject: null } : s));
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* END MULTIPLE SUPPLIERS SECTION */}
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isStockModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', color: '#1e293b' }}>
                        <h2 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Kutu Stok Girişi</h2>
                        <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>Stok eklemek istediğiniz kutuyu seçiniz.</p>
                        
                        <form onSubmit={handleStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Kutu Seçimi <span style={{color:'red'}}>*</span></label>
                                <select 
                                    value={stockFormData.BoxId} 
                                    onChange={e => setStockFormData({...stockFormData, BoxId: e.target.value, SupplierId: ''})} 
                                    required 
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }}
                                >
                                    <option value="">-- Kutu Seçiniz --</option>
                                    {boxes.map(b => (
                                        <option key={b.Id} value={b.Id}>{b.BoxName}</option>
                                    ))}
                                </select>
                            </div>

                            {stockFormData.BoxId && (() => {
                                const selectedBox = boxes.find(b => String(b.Id) === String(stockFormData.BoxId));
                                const boxSups = selectedBox?.suppliers 
                                    ? (typeof selectedBox.suppliers === 'string' ? JSON.parse(selectedBox.suppliers) : selectedBox.suppliers)
                                    : [];
                                
                                return (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Tedarikçi Seçimi (İsteğe Bağlı)</label>
                                        <select 
                                            value={stockFormData.SupplierId} 
                                            onChange={e => setStockFormData({...stockFormData, SupplierId: e.target.value})} 
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }}
                                        >
                                            <option value="">-- Tedarikçi Seçiniz --</option>
                                            {boxSups.map(bs => {
                                                const supInfo = suppliers.find(s => String(s.Id) === String(bs.supplier_id));
                                                return supInfo ? <option key={bs.supplier_id} value={bs.supplier_id}>{supInfo.SupplierName}</option> : null;
                                            })}
                                        </select>
                                        {boxSups.length === 0 && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Bu kutuya eklenmiş tedarikçi bulunamadı.</span>}
                                    </div>
                                );
                            })()}

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>Adet <span style={{color:'red'}}>*</span></label>
                                <input type="number" value={stockFormData.Quantity} onChange={e => setStockFormData({...stockFormData, Quantity: e.target.value})} required min="1" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#fff' }} placeholder="Örn: 100" />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsStockModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>İptal</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Stok Ekle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* BARKOD YÖNETİM MODALI */}
            {isBarcodeModalOpen && selectedBoxForBarcode && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', color: '#1e293b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: '0', color: '#0f172a' }}>{selectedBoxForBarcode.BoxName} Barkodları</h2>
                            <button onClick={() => setIsBarcodeModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <input 
                                type="text"
                                placeholder="Yeni barkod okutun..."
                                value={newBarcode}
                                onChange={(e) => setNewBarcode(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setNewBarcode(e.target.value);
                                        handleAddBarcode();
                                    }
                                }}
                                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '2px solid #3b82f6', outline: 'none' }}
                            />
                            <button 
                                onClick={() => setNewBarcode(generateRandomBarcode())}
                                style={{ padding: '0 15px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Üret
                            </button>
                            <button 
                                onClick={handleAddBarcode}
                                style={{ padding: '0 15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Ekle
                            </button>
                        </div>

                        <div>
                            <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>Kayıtlı Barkodlar</h4>
                            {(!selectedBoxForBarcode.barcodes || selectedBoxForBarcode.barcodes.length === 0) ? (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Henüz barkod eklenmemiş.</div>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {selectedBoxForBarcode.barcodes.map(b => (
                                        <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <Barcode value={b.barcode} height={40} width={1.5} fontSize={14} background="transparent" />
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteBarcode(b.id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                title="Sil"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackagingBoxes;


