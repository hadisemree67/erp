/**
 * ============================================================================
 * BİLEŞEN ADI: StockEntry
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depo (WMS), stok giriş-çıkış, envanter ve raf işlemlerini yöneten ekran.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (StockEntry.jsx), Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect } from 'react';
import ShelfBarcodeScanner from './ShelfBarcodeScanner';

const StockEntry = ({ currentUser, onNavigate, onSuccess }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [shelves, setShelves] = useState([]);
    
    const [formData, setFormData] = useState({
        productId: '',
        warehouseId: '',
        shelfAllocations: [{ shelfCode: '', quantity: '' }],
        batchNumber: '',
        expirationDate: '',
        description: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [shelfCapacities, setShelfCapacities] = useState({});
    const [allShelvesCapacity, setAllShelvesCapacity] = useState({});

    const [productSearchBarcode, setProductSearchBarcode] = useState('');
    const [warehouseSearchBarcode, setWarehouseSearchBarcode] = useState('');
    const [shelfSearchBarcode, setShelfSearchBarcode] = useState('');
    const [scanningModal, setScanningModal] = useState({ open: false, type: null }); // type: 'product' | 'warehouse' | 'shelf'

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        // Fetch products and warehouses on mount
        // 3. Backend API İstekleri (Veri Çekme)
        const fetchData = async () => {
            try {
                const [prodRes, whRes] = await Promise.all([
                    apiFetch('http://localhost:3000/api/products'),
                    apiFetch('http://localhost:3000/api/warehouses')
                ]);
                const prodData = await prodRes.json();
                const whData = await whRes.json();
                if (Array.isArray(prodData)) setProducts(prodData.filter(p => p.Category !== 'Hammadde'));
                if (Array.isArray(whData)) setWarehouses(whData.filter(w => w.warehouse_type === 'STOK'));
            } catch (err) {
                console.error(err);
                setError('Veriler yüklenirken hata oluştu.');
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!formData.warehouseId) {
            setShelves([]);
            setFormData(prev => ({ ...prev, shelfAllocations: [{ shelfCode: '', quantity: '' }] }));
            return;
        }

        const selectedWh = warehouses.find(w => w.id.toString() === formData.warehouseId.toString());
        if (selectedWh && selectedWh.Shelves) {
            setShelves(selectedWh.Shelves);
            setFormData(prev => {
                const existingCode = prev.shelfAllocations[0]?.shelfCode;
                if (existingCode && selectedWh.Shelves.includes(existingCode)) {
                    return prev;
                }
                if (selectedWh.Shelves.length > 0) {
                    return { ...prev, shelfAllocations: [{ shelfCode: selectedWh.Shelves[0], quantity: '' }] };
                } else {
                    return { ...prev, shelfAllocations: [{ shelfCode: '', quantity: '' }] };
                }
            });
        } else {
            setShelves([]);
            setFormData(prev => ({ ...prev, shelfAllocations: [{ shelfCode: '', quantity: '' }] }));
        }
    }, [formData.warehouseId, warehouses]);

    /**
     * @param {number} warehouse_id 
     * @param {string} shelf_code 
     * Barkod okuyucudan gelen rafı doğrudan state'e ekler (immutability kurallarına uygun).
     */
    const handleShelfFound = (warehouse_id, shelf_code) => {
        setFormData(prev => {
            const newAllocations = [...prev.shelfAllocations];
            if (newAllocations.length > 0) {
                newAllocations[0] = { ...newAllocations[0], shelfCode: shelf_code };
            } else {
                newAllocations.push({ shelfCode: shelf_code, quantity: '' });
            }
            return { ...prev, warehouseId: warehouse_id, shelfAllocations: newAllocations };
        });
    };

    useEffect(() => {
        if (!formData.productId || !formData.warehouseId) {
            setShelfCapacities({});
            return;
        }

        const fetchCapacities = async () => {
            const newCaps = { ...shelfCapacities };
            let hasChanges = false;
            for (const alloc of formData.shelfAllocations) {
                if (alloc.shelfCode) {
                    try {
                        const res = await apiFetch(`http://localhost:3000/api/wms/shelf-capacity?warehouseId=${formData.warehouseId}&shelfCode=${alloc.shelfCode}&productId=${formData.productId}`);
                        const data = await res.json();
                        if (data.success && data.hasVolumeInfo) {
                            if (JSON.stringify(newCaps[alloc.shelfCode]) !== JSON.stringify(data)) {
                                newCaps[alloc.shelfCode] = data;
                                hasChanges = true;
                            }
                        } else {
                            if (newCaps[alloc.shelfCode] !== null) {
                                newCaps[alloc.shelfCode] = null;
                                hasChanges = true;
                            }
                        }
                    } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
                }
            }
            if (hasChanges) {
                setShelfCapacities(newCaps);
            }
        };
        fetchCapacities();
    }, [formData.productId, formData.warehouseId, formData.shelfAllocations]);

    useEffect(() => {
        if (formData.warehouseId && formData.productId) {
            apiFetch(`http://localhost:3000/api/wms/warehouse-capacities?warehouseId=${formData.warehouseId}&productId=${formData.productId}`)
                .then(r => r.json())
                .then(d => {
                    if (d.success) setAllShelvesCapacity(d.data);
                }).catch(e => {});
        } else {
            setAllShelvesCapacity({});
        }
    }, [formData.warehouseId, formData.productId]);

    useEffect(() => {
        if (!shelves || shelves.length === 0 || !allShelvesCapacity || Object.keys(allShelvesCapacity).length === 0) return;

        setFormData(prev => {
            let changed = false;
            const newAllocations = prev.shelfAllocations.map((alloc, index) => {
                const capCurrent = allShelvesCapacity[alloc.shelfCode];
                const isCurrentFull = alloc.shelfCode && capCurrent && (capCurrent.maxItems === 0 || !capCurrent.physicallyFits);

                if (!alloc.shelfCode || isCurrentFull) {
                    const otherSelectedShelves = prev.shelfAllocations.filter((_, i) => i !== index).map(a => a.shelfCode).filter(Boolean);
                    const sortedShelves = [...shelves].sort((a, b) => {
                        const capA = allShelvesCapacity[a];
                        const capB = allShelvesCapacity[b];
                        const isFullA = capA && (capA.maxItems === 0 || !capA.physicallyFits);
                        const isFullB = capB && (capB.maxItems === 0 || !capB.physicallyFits);

                        const usedA = otherSelectedShelves.includes(a);
                        const usedB = otherSelectedShelves.includes(b);
                        if (usedA && !usedB) return 1;
                        if (!usedA && usedB) return -1;

                        if (isFullA && !isFullB) return 1;
                        if (!isFullA && isFullB) return -1;

                        const hasSameA = capA && capA.hasSameProduct;
                        const hasSameB = capB && capB.hasSameProduct;
                        if (hasSameA && !hasSameB) return -1;
                        if (!hasSameA && hasSameB) return 1;

                        const maxA = capA ? (capA.maxItems === Infinity ? 9999999 : capA.maxItems) : 0;
                        const maxB = capB ? (capB.maxItems === Infinity ? 9999999 : capB.maxItems) : 0;
                        if (maxA !== maxB) return maxB - maxA;

                        const effA = capA ? capA.efficiency : 0;
                        const effB = capB ? capB.efficiency : 0;
                        return effB - effA;
                    });

                    const bestShelf = sortedShelves[0];
                    const bestCap = allShelvesCapacity[bestShelf];
                    const isBestFull = bestCap && (bestCap.maxItems === 0 || !bestCap.physicallyFits);

                    if (bestShelf && !isBestFull && alloc.shelfCode !== bestShelf) {
                        changed = true;
                        return { ...alloc, shelfCode: bestShelf };
                    }
                }
                return alloc;
            });
            return changed ? { ...prev, shelfAllocations: newAllocations } : prev;
        });
    }, [allShelvesCapacity, shelves]);

    useEffect(() => {
        if (!formData.productId) {
            setFormData(prev => ({ ...prev, expirationDate: '' }));
            return;
        }

        const selectedProd = products.find(p => p.Id.toString() === formData.productId.toString());
        const shelfLife = parseInt(selectedProd?.shelf_life_months) || 0;

        if (shelfLife > 0) {
            const now = new Date();
            now.setMonth(now.getMonth() + shelfLife);
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            setFormData(prev => ({ ...prev, expirationDate: `${year}-${month}-${day}` }));
        } else {
            setFormData(prev => ({ ...prev, expirationDate: '' }));
        }
    }, [formData.productId, products]);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleAllocationChange = (index, field, value) => {
        const newAllocations = [...formData.shelfAllocations];
        newAllocations[index][field] = value;
        setFormData({ ...formData, shelfAllocations: newAllocations });
        setError(null);
        setSuccess(false);
    };

    const addAllocationField = () => {
        setFormData({
            ...formData,
            shelfAllocations: [...formData.shelfAllocations, { shelfCode: '', quantity: '' }]
        });
    };

    const removeAllocationField = (index) => {
        const newAllocations = formData.shelfAllocations.filter((_, i) => i !== index);
        if (newAllocations.length === 0) newAllocations.push({ shelfCode: '', quantity: '' });
        setFormData({ ...formData, shelfAllocations: newAllocations });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
        setSuccess(false);
    };

    const handleProductBarcodeSearch = (e) => {
        const val = e.target.value;
        setProductSearchBarcode(val);
        if (val.trim() === '') return;
        
        const found = products.find(p => {
            if (!p.Barcode) return false;
            let b = typeof p.Barcode === 'string' ? p.Barcode.replace(/[\[\]"']/g, '') : String(p.Barcode);
            return b === val.trim();
        });
        
        if (found) {
            setFormData(prev => ({ ...prev, productId: found.Id }));
            setScanningModal({ open: false, type: null });
            setProductSearchBarcode('');
        }
    };

    const handleShelfBarcodeSearch = (e) => {
        const val = e.target.value;
        setShelfSearchBarcode(val);
        if (val.trim() === '') return;
        
        const found = shelves.find(s => s.toLowerCase() === val.trim().toLowerCase());
        if (found) {
            setFormData(prev => {
                const newAllocations = [...prev.shelfAllocations];
                // find empty slot
                const emptyIndex = newAllocations.findIndex(a => a.shelfCode === '' || a.quantity === '');
                if (emptyIndex !== -1) {
                    newAllocations[emptyIndex].shelfCode = found;
                } else {
                    newAllocations.push({ shelfCode: found, quantity: '' });
                }
                return { ...prev, shelfAllocations: newAllocations };
            });
            setScanningModal({ open: false, type: null });
            setShelfSearchBarcode('');
        }
    };

    const handleWarehouseBarcodeSearch = (e) => {
        const val = e.target.value;
        setWarehouseSearchBarcode(val);
        if (val.trim() === '') return;
        
        const found = warehouses.find(w => 
            (w.barcode && w.barcode === val.trim()) || 
            (w.name && w.name.toLowerCase() === val.trim().toLowerCase())
        );
        if (found) {
            setFormData(prev => ({ ...prev, warehouseId: found.id }));
            fetchShelves(found.id);
            setScanningModal({ open: false, type: null });
            setWarehouseSearchBarcode('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await apiFetch('http://localhost:3000/api/wms/stock-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
                body: JSON.stringify({
                    productId: formData.productId,
                    warehouseId: formData.warehouseId,
                    shelfAllocations: formData.shelfAllocations.map(a => ({ ...a, quantity: parseInt(a.quantity) })),
                    batchNumber: formData.batchNumber,
                    expirationDate: formData.expirationDate,
                    userId: currentUser?.id,
                    description: formData.description
                })
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                // Sadece miktarı, parti no ve skt'yi sıfırla, diğer seçimler kalsın (hızlı giriş için)
                setFormData(prev => ({ 
                    ...prev, 
                    shelfAllocations: prev.shelfAllocations.map(a => ({ ...a, quantity: '' })), 
                    batchNumber: '', 
                    expirationDate: '', 
                    description: '' 
                }));
                if (onSuccess) {
                    setTimeout(() => onSuccess(), 500);
                } else if (onNavigate) {
                    setTimeout(() => onNavigate('stok-listesi'), 1000);
                }
            } else {
                setError(data.message || 'Hata oluştu');
            }
        } catch (err) {
            console.error(err);
            setError('Sunucu hatası');
        } finally {
            setLoading(false);
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: '#0f172a', margin: 0 }}>Stok Girişi (Mal Kabul)</h2>
            </div>

            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fecaca' }}>{error}</div>}
                {success && <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#10b981', borderRadius: '6px', marginBottom: '20px', border: '1px solid #a7f3d0' }}>Stok girişi başarıyla kaydedildi!</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    


                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Ürün Seçiniz *</label>
                                <button type="button" onClick={() => setScanningModal({ open: true, type: 'product' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }} title="Barkod Okut">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                        <rect width="10" height="10" x="7" y="7" rx="2" />
                                    </svg>
                                </button>
                            </div>
                            <select 
                                name="productId" 
                                value={formData.productId} 
                                onChange={handleChange} 
                                required 
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px', width: '100%', boxSizing: 'border-box' }}
                            >
                                <option value="">-- Ürün Ara veya Seç --</option>
                                {products.map(p => {
                                    const cleanBarcode = p.Barcode ? (typeof p.Barcode === 'string' ? p.Barcode.replace(/[\[\]"']/g, '') : p.Barcode) : 'Barkod Yok';
                                    return (
                                        <option key={p.Id} value={p.Id}>[{cleanBarcode}] {p.ProductName} - Mevcut Genel Stok: {p.StockQuantity}</option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <ShelfBarcodeScanner onShelfFound={handleShelfFound} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Depo Seçiniz *</label>
                                <button type="button" onClick={() => setScanningModal({ open: true, type: 'warehouse' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }} title="Barkod Okut">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                        <rect width="10" height="10" x="7" y="7" rx="2" />
                                    </svg>
                                </button>
                            </div>
                            <select 
                                name="warehouseId" 
                                value={formData.warehouseId} 
                                onChange={handleChange} 
                                required 
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px', width: '100%', boxSizing: 'border-box' }}
                            >
                                <option value="">-- Depo Seç --</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Raf Tahsisleri *</label>
                                <button type="button" onClick={() => setScanningModal({ open: true, type: 'shelf' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }} title="Barkod Okut">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0284c7' }}>
                                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                        <rect width="10" height="10" x="7" y="7" rx="2" />
                                    </svg>
                                </button>
                            </div>
                            <button type="button" onClick={addAllocationField} disabled={!formData.warehouseId || shelves.length === 0} style={{ padding: '6px 12px', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                + Yeni Raf Ekle
                            </button>
                        </div>

                        {formData.shelfAllocations.map((allocation, index) => {
                            const capData = shelfCapacities[allocation.shelfCode];
                            const selectedProduct = products.find(p => p.Id.toString() === formData.productId.toString());

                            return (
                                <div key={index} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                                        <select 
                                            value={allocation.shelfCode} 
                                            onChange={(e) => handleAllocationChange(index, 'shelfCode', e.target.value)} 
                                            required 
                                            disabled={!formData.warehouseId || shelves.length === 0}
                                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: formData.warehouseId ? 'white' : '#f1f5f9', fontSize: '15px' }}
                                        >
                                            <option value="">{shelves.length > 0 ? '-- Raf Seç --' : 'Önce Depo Seçiniz'}</option>
                                            {(() => {
                                                const otherSelectedShelves = formData.shelfAllocations.filter((_, i) => i !== index).map(a => a.shelfCode).filter(Boolean);
                                                const sortedShelves = [...shelves].sort((a, b) => {
                                                    const capA = allShelvesCapacity[a];
                                                    const capB = allShelvesCapacity[b];
                                                    const isFullA = capA && (capA.maxItems === 0 || !capA.physicallyFits);
                                                    const isFullB = capB && (capB.maxItems === 0 || !capB.physicallyFits);
                                                    
                                                    const usedA = otherSelectedShelves.includes(a);
                                                    const usedB = otherSelectedShelves.includes(b);
                                                    if (usedA && !usedB) return 1;
                                                    if (!usedA && usedB) return -1;

                                                    if (isFullA && !isFullB) return 1;
                                                    if (!isFullA && isFullB) return -1;
                                                    
                                                    const hasSameA = capA && capA.hasSameProduct;
                                                    const hasSameB = capB && capB.hasSameProduct;
                                                    if (hasSameA && !hasSameB) return -1;
                                                    if (!hasSameA && hasSameB) return 1;
                                                    
                                                    const maxA = capA ? (capA.maxItems === Infinity ? 9999999 : capA.maxItems) : 0;
                                                    const maxB = capB ? (capB.maxItems === Infinity ? 9999999 : capB.maxItems) : 0;
                                                    if (maxA !== maxB) return maxB - maxA;

                                                    const effA = capA ? capA.efficiency : 0;
                                                    const effB = capB ? capB.efficiency : 0;
                                                    return effB - effA;
                                                });

                                                return sortedShelves.map((s, idx) => {
                                                    const cap = allShelvesCapacity[s];
                                                    const isFull = cap && (cap.maxItems === 0 || !cap.physicallyFits);
                                                    const isRecommended = !isFull && idx === 0 && cap;
                                                    
                                                    let text = s;
                                                    if (isFull) {
                                                        text += ' (Dolu / Sığmıyor)';
                                                    } else if (isRecommended) {
                                                        const tags = [];
                                                        if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                        else if (!cap.hasSameCorridor) tags.push('Risk Dağıtımı (Farklı Koridor)');
                                                        tags.push(`%${cap.efficiency} Verim`);
                                                        
                                                        text = `⭐ ${s} (Önerilen - Maks. ${cap.maxItems} ${selectedProduct?.package_name || 'Kap'}, ${tags.join(', ')})`;
                                                    } else if (cap) {
                                                        const tags = [`%${cap.efficiency} Verim`];
                                                        if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                        
                                                        if (!isFull) {
                                                            text += ` - Maks. ${cap.maxItems} ${selectedProduct?.package_name || 'Kap'} (${tags.join(', ')})`;
                                                        }
                                                    }

                                                    return (
                                                        <option key={idx} value={s} disabled={isFull} style={{ color: isFull ? '#94a3b8' : (isRecommended ? '#047857' : 'inherit'), fontWeight: isRecommended ? 'bold' : 'normal' }}>
                                                            {text}
                                                        </option>
                                                    );
                                                });
                                            })()}
                                        </select>
                                        <input 
                                            type="number" 
                                            value={allocation.quantity} 
                                            onChange={(e) => handleAllocationChange(index, 'quantity', e.target.value)} 
                                            required 
                                            min="1"
                                            placeholder="Giriş Miktarı"
                                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${capData && allocation.quantity && (parseFloat(allocation.quantity) > (capData.maxItems * (parseFloat(selectedProduct?.package_capacity) || 1)) || !capData.physicallyFits) ? '#ef4444' : '#cbd5e1'}`, fontSize: '15px', boxSizing: 'border-box' }} 
                                        />
                                        {formData.shelfAllocations.length > 1 && (
                                            <button type="button" onClick={() => removeAllocationField(index)} style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '47px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Rafı Kaldır">
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {capData ? (
                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#0369a1', fontWeight: '500' }}>
                                            {(() => {
                                                const qty = capData.maxItems * (parseFloat(selectedProduct?.package_capacity) || 1);
                                                const u = selectedProduct?.unit_type || 'Adet';
                                                let formattedQty = `${qty} ${u}`;
                                                if ((u === 'gr' || u === 'ml') && qty >= 1000) {
                                                    formattedQty = `${+(qty / 1000).toFixed(2)} ${u === 'gr' ? 'kg' : 'L'}`;
                                                }
                                                return <>ℹ️ Doluluk: %{capData.fillPercentage} ({capData.currentFilled} / {capData.maxVolume} cm³) · 📦 Boş Hacim: {capData.emptyVolume} cm³ (Maks: {formattedQty} / {capData.maxItems} {selectedProduct?.package_name || 'Kap'} sığar)</>;
                                            })()}
                                        </div>
                                    ) : allocation.shelfCode ? (
                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                                            ℹ️ Hacim bilgisi tanımlanmamış.
                                        </div>
                                    ) : null}
                                    {capData && !capData.physicallyFits && (
                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                                            ⚠️ Ürün bu rafa fiziksel olarak sığmıyor! (Boyut Uyuşmazlığı)
                                        </div>
                                    )}
                                    {capData && capData.physicallyFits && allocation.quantity && parseFloat(allocation.quantity) > (capData.maxItems * (parseFloat(selectedProduct?.package_capacity) || 1)) && (
                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                                            {capData.isStackable === false || (capData.isStackable && capData.maxStackLimit < 999) ? (
                                                `⚠️ Uyarı: Bu ürün ambalaj yapısı gereği üst üste en fazla ${capData.isStackable ? capData.maxStackLimit : 1} kat dizilebilir. Seçilen rafın alanına göre bu rafa maksimum ${capData.maxItems * (parseFloat(selectedProduct?.package_capacity) || 1)} ${selectedProduct?.unit_type || 'Adet'} (${capData.maxItems} ${selectedProduct?.package_name || 'Kap'}) koyabilirsiniz.`
                                            ) : (
                                                `⚠️ Seçilen ürünün boyutlarına göre bu rafa en fazla ${capData.maxItems * (parseFloat(selectedProduct?.package_capacity) || 1)} ${selectedProduct?.unit_type || 'Adet'} (${capData.maxItems} ${selectedProduct?.package_name || 'Kap'}) sığabilir!`
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Parti (Batch) Numarası</label>
                            <input 
                                type="text" 
                                name="batchNumber" 
                                value={formData.batchNumber} 
                                onChange={handleChange} 
                                placeholder="Örn: BATCH-2023-A"
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>Son Kullanma Tarihi (SKT)</span>
                                {(() => {
                                    const selectedProd = products.find(p => p.Id.toString() === formData.productId.toString());
                                    const shelfLife = parseInt(selectedProd?.shelf_life_months) || 0;
                                    if (shelfLife > 0) {
                                        return <span style={{ color: '#059669', fontSize: '12px', fontWeight: 'normal', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>(+{shelfLife} Ay Otomatik)</span>;
                                    }
                                    return null;
                                })()}
                            </label>
                            <input 
                                type="date" 
                                name="expirationDate" 
                                value={formData.expirationDate} 
                                onChange={handleChange}
                                disabled={!!formData.productId}
                                style={{ 
                                    padding: '12px', 
                                    borderRadius: '6px', 
                                    border: '1px solid #cbd5e1', 
                                    fontSize: '15px', 
                                    backgroundColor: formData.productId ? '#f1f5f9' : 'white',
                                    color: formData.productId ? '#475569' : 'inherit',
                                    cursor: formData.productId ? 'not-allowed' : 'text'
                                }} 
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açıklama / İrsaliye No (İsteğe Bağlı)</label>
                            <input 
                                type="text" 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                placeholder="Örn: IRS-2023-1002"
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button type="submit" disabled={loading} style={{ 
                            padding: '12px 30px', 
                            borderRadius: '6px', 
                            backgroundColor: '#10b981', 
                            border: 'none', 
                            color: 'white', 
                            fontWeight: '600', 
                            fontSize: '15px',
                            cursor: loading ? 'not-allowed' : 'pointer', 
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' 
                        }}>
                            {loading ? 'Kaydediliyor...' : 'Stoğa Ekle (Mal Kabul)'}
                        </button>
                    </div>
                </form>
            </div>
            {/* Scanning Modal */}
            {scanningModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>{scanningModal.type === 'product' ? 'Ürün' : (scanningModal.type === 'warehouse' ? 'Depo' : 'Raf')} Barkodu Okut</h3>
                            <button type="button" onClick={() => setScanningModal({ open: false, type: null })} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <input
                            type="text"
                            value={scanningModal.type === 'product' ? productSearchBarcode : (scanningModal.type === 'warehouse' ? warehouseSearchBarcode : shelfSearchBarcode)}
                            onChange={scanningModal.type === 'product' ? handleProductBarcodeSearch : (scanningModal.type === 'warehouse' ? handleWarehouseBarcodeSearch : handleShelfBarcodeSearch)}
                            placeholder="Barkod okuyucuyu kullanın..."
                            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #0284c7', backgroundColor: '#f0f9ff', fontSize: '16px', boxSizing: 'border-box' }}
                            autoFocus
                        />
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>Barkod okutulduğunda otomatik kapanacaktır.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockEntry;

