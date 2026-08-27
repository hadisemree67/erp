/**
 * ============================================================================
 * BİLEŞEN ADI: GoodsReceipt
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depo (WMS), stok giriş-çıkış, envanter ve raf işlemlerini yöneten ekran.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (GoodsReceipt.jsx), Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const GoodsReceipt = () => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [orders, setOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [locations, setLocations] = useState([]);
    const [allShelvesCapacity, setAllShelvesCapacity] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [modal, setModal] = useState({
        isOpen: false,
        order: null,
        received_quantity: '',
        warehouse_id: '',
        location_id: '',
        batch_number: '',
        expiration_date: ''
    });

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, whRes] = await Promise.all([
                apiFetch(import.meta.env.VITE_API_URL + '/api/purchasing/orders'),
                apiFetch(import.meta.env.VITE_API_URL + '/api/warehouses')
            ]);
            
            const ordersData = await ordersRes.json();
            const whData = await whRes.json();
            console.log('Orders:', ordersData);
            console.log('Warehouses:', whData);
            
            if (ordersData.success) {
                // Sadece depo kabul bekleyenleri göster
                setOrders(ordersData.data.filter(o => o.status === 'Depo Kabul Bekliyor'));
            }
            if (Array.isArray(whData)) {
                console.log('Setting warehouses:', whData.length);
                setWarehouses(whData);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = (warehouseId, currentWarehouses = warehouses) => {
        const wh = currentWarehouses.find(w => String(w.id) === String(warehouseId));
        if (wh) {
            const shelfList = wh.Shelves_Details || (wh.Shelves ? wh.Shelves.map(s => typeof s === 'string' ? { shelfCode: s } : s) : []);
            setLocations(shelfList);
        } else {
            setLocations([]);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        if (!modal.isOpen || !modal.warehouse_id || !modal.order) {
            setAllShelvesCapacity({});
            return;
        }
        apiFetch(`${import.meta.env.VITE_API_URL}/api/wms/warehouse-capacities?warehouseId=${modal.warehouse_id}&productId=${modal.order.product_id}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setAllShelvesCapacity(data.data);
                }
            })
            .catch(err => console.error('Capacity fetch error:', err));
    }, [modal.isOpen, modal.warehouse_id, modal.order]);

    useEffect(() => {
        if (!modal.isOpen || !locations || locations.length === 0 || !allShelvesCapacity || Object.keys(allShelvesCapacity).length === 0) return;

        const allocs = modal.allocations || [{ shelf_code: modal.location_id || '', quantity: modal.received_quantity || '' }];
        let changed = false;
        const usedShelves = allocs.map(a => a.shelf_code).filter(Boolean);

        const newAllocs = allocs.map((alloc) => {
            const capCurrent = allShelvesCapacity[alloc.shelf_code];
            const isCurrentFull = alloc.shelf_code && capCurrent && (capCurrent.maxItems === 0 || !capCurrent.physicallyFits);

            if (!alloc.shelf_code || isCurrentFull) {
                const sortedShelves = [...locations].sort((aObj, bObj) => {
                    const a = typeof aObj === 'string' ? aObj : aObj.shelfCode;
                    const b = typeof bObj === 'string' ? bObj : bObj.shelfCode;
                    const capA = allShelvesCapacity[a];
                    const capB = allShelvesCapacity[b];
                    const isFullA = capA && (capA.maxItems === 0 || !capA.physicallyFits);
                    const isFullB = capB && (capB.maxItems === 0 || !capB.physicallyFits);
                    
                    const usedA = usedShelves.includes(a);
                    const usedB = usedShelves.includes(b);
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

                for (const item of sortedShelves) {
                    const bestShelf = typeof item === 'string' ? item : item.shelfCode;
                    const bestCap = allShelvesCapacity[bestShelf];
                    const isBestFull = bestCap && (bestCap.maxItems === 0 || !bestCap.physicallyFits);

                    if (bestShelf && !isBestFull && !usedShelves.includes(bestShelf)) {
                        usedShelves.push(bestShelf);
                        changed = true;
                        return { ...alloc, shelf_code: bestShelf };
                    }
                }
            }
            return alloc;
        });

        if (changed) {
            setModal(prev => ({ 
                ...prev, 
                allocations: newAllocs,
                location_id: newAllocs[0]?.shelf_code || prev.location_id
            }));
        }
    }, [allShelvesCapacity, locations, modal.isOpen]);

    useEffect(() => {
        fetchData();
        
        // 10 saniyede bir sessiz güncelle
        const intervalId = setInterval(async () => {
            try {
                const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/purchasing/orders');
                const data = await res.json();
                if (data.success) {
                    setOrders(data.data.filter(o => o.status === 'Depo Kabul Bekliyor'));
                }
            } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
        }, 10000);
        
        return () => clearInterval(intervalId);
    }, []);

    const openModal = async (order) => {
        let currentWarehouses = warehouses;
        
        // Failsafe: Eğer depolar henüz yüklenmemişse popup açılırken çek
        if (currentWarehouses.length === 0) {
            try {
                const whRes = await apiFetch(import.meta.env.VITE_API_URL + '/api/warehouses');
                const whData = await whRes.json();
                if (Array.isArray(whData)) {
                    setWarehouses(whData);
                    currentWarehouses = whData;
                }
            } catch (e) {
                console.error("Popup açılırken depo çekilemedi:", e);
            }
        }

        const shelfLife = parseInt(order.shelf_life_months) || 0;
        let expDate = '';
        if (shelfLife > 0) {
            const now = new Date();
            now.setMonth(now.getMonth() + shelfLife);
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            expDate = `${year}-${month}-${day}`;
        }

        const remQty = Math.max(0, (parseFloat(order.quantity) || 0) - (parseFloat(order.received_quantity) || 0));
        setModal({
            isOpen: true,
            order,
            received_quantity: remQty,
            warehouse_id: currentWarehouses.length > 0 ? currentWarehouses[0].id : '',
            location_id: '',
            allocations: [{ shelf_code: '', quantity: remQty }],
            batch_number: '',
            expiration_date: expDate
        });
        
        if (currentWarehouses.length > 0) {
            fetchLocations(currentWarehouses[0].id, currentWarehouses);
        }
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleWarehouseChange = (e) => {
        const whId = e.target.value;
        const remQty = Math.max(0, (parseFloat(modal.order?.quantity) || 0) - (parseFloat(modal.order?.received_quantity) || 0));
        setModal({ 
            ...modal, 
            warehouse_id: whId, 
            location_id: '',
            allocations: [{ shelf_code: '', quantity: remQty || '' }]
        });
        fetchLocations(whId);
    };

    const addAllocation = () => {
        setModal(prev => {
            const allocs = prev.allocations || [{ shelf_code: prev.location_id || '', quantity: prev.received_quantity || '' }];
            const totalAllocated = allocs.reduce((sum, a) => sum + (parseFloat(a.quantity) || 0), 0);
            const remOrderQty = Math.max(0, (parseFloat(prev.order?.quantity) || 0) - (parseFloat(prev.order?.received_quantity) || 0));
            const remaining = Math.max(0, remOrderQty - totalAllocated);

            const usedShelves = allocs.map(a => a.shelf_code).filter(Boolean);
            let nextBestShelf = '';
            if (locations && allShelvesCapacity) {
                const sortedShelves = [...locations].sort((aObj, bObj) => {
                    const a = typeof aObj === 'string' ? aObj : aObj.shelfCode;
                    const b = typeof bObj === 'string' ? bObj : bObj.shelfCode;
                    const capA = allShelvesCapacity[a];
                    const capB = allShelvesCapacity[b];
                    const isFullA = capA && (capA.maxItems === 0 || !capA.physicallyFits);
                    const isFullB = capB && (capB.maxItems === 0 || !capB.physicallyFits);
                    
                    const usedA = usedShelves.includes(a);
                    const usedB = usedShelves.includes(b);
                    if (usedA && !usedB) return 1;
                    if (!usedA && usedB) return -1;

                    if (isFullA && !isFullB) return 1;
                    if (!isFullA && isFullB) return -1;
                    
                    const maxA = capA ? (capA.maxItems === Infinity ? 9999999 : capA.maxItems) : 0;
                    const maxB = capB ? (capB.maxItems === Infinity ? 9999999 : capB.maxItems) : 0;
                    if (maxA !== maxB) return maxB - maxA;

                    const effA = capA ? capA.efficiency : 0;
                    const effB = capB ? capB.efficiency : 0;
                    return effB - effA;
                });
                for (const item of sortedShelves) {
                    const code = typeof item === 'string' ? item : item.shelfCode;
                    const cap = allShelvesCapacity[code];
                    const isFull = cap && (cap.maxItems === 0 || !cap.physicallyFits);
                    if (!usedShelves.includes(code) && !isFull) {
                        nextBestShelf = code;
                        break;
                    }
                }
            }

            return {
                ...prev,
                allocations: [...allocs, { shelf_code: nextBestShelf, quantity: remaining > 0 ? remaining : '' }]
            };
        });
    };

    const removeAllocation = (index) => {
        setModal(prev => {
            const allocs = prev.allocations || [{ shelf_code: prev.location_id || '', quantity: prev.received_quantity || '' }];
            return {
                ...prev,
                allocations: allocs.filter((_, i) => i !== index)
            };
        });
    };

    const handleAllocationChange = (index, field, value) => {
        setModal(prev => {
            const allocs = prev.allocations || [{ shelf_code: prev.location_id || '', quantity: prev.received_quantity || '' }];
            const newAllocs = allocs.map((a, i) => {
                if (i === index) {
                    return { ...a, [field]: value };
                }
                return a;
            });
            return { 
                ...prev, 
                allocations: newAllocs,
                location_id: newAllocs[0]?.shelf_code || prev.location_id,
                received_quantity: newAllocs[0]?.quantity || prev.received_quantity
            };
        });
    };

    const handleReceive = async (e) => {
        e.preventDefault();
        try {
            const allocs = modal.allocations || [{ shelf_code: modal.location_id, quantity: modal.received_quantity }];
            const totalQty = allocs.reduce((sum, a) => sum + (parseFloat(a.quantity) || 0), 0);
            const remOrderQty = Math.max(0, (parseFloat(modal.order?.quantity) || 0) - (parseFloat(modal.order?.received_quantity) || 0));

            if (totalQty > remOrderQty) {
                alert(`Hata: Girdiğiniz toplam miktar (${totalQty} Adet), kalan sipariş miktarını (${remOrderQty} Adet) aşamaz! Lütfen miktarları kontrol ediniz.`);
                return;
            }

            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/purchasing/orders/${modal.order.id}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity: Number(totalQty || modal.received_quantity),
                    warehouse_id: modal.warehouse_id,
                    location_id: allocs[0]?.shelf_code || modal.location_id, // fallback
                    shelf_code: allocs[0]?.shelf_code || modal.location_id, // fallback
                    shelfAllocations: allocs.map(a => ({
                        warehouse_id: modal.warehouse_id,
                        shelf_code: a.shelf_code,
                        quantity: parseFloat(a.quantity) || 0
                    })),
                    batch_number: modal.batch_number,
                    expiration_date: modal.expiration_date || null
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Mal kabul işlemi başarıyla tamamlandı!');
                setModal({ isOpen: false, order: null });
                fetchData();
            } else {
                alert(data.message || 'Mal kabul yapılamadı.');
            }
        } catch (err) {
            console.error(err);
            alert('Ağ hatası oluştu.');
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                        Mal Kabul (Depo Onayı)
                    </h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>Satın almadan gelen ve depoya girmesi beklenen malzemeler.</p>
                </div>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                {loading && orders.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
                ) : orders.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '48px', marginBottom: '16px' }}>📦</span>
                        <span>Şu an depoya girmesi beklenen (Mal Kabul) bir malzeme bulunmuyor.</span>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tarih</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Malzeme</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tedarikçi</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Beklenen Miktar</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
                                        {new Date(order.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{order.product_name}</td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>{order.supplier_name || '-'}</td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a' }}>
                                        <span style={{ fontWeight: '700', color: '#d97706', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
                                            {order.quantity}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => openModal(order)}
                                                style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                                            >
                                                Depoya Al
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {modal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Mal Kabul İşlemi</h3>
                            <button type="button" onClick={() => setModal({ ...modal, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <form onSubmit={handleReceive} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>Gelen Malzeme</p>
                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{modal.order?.product_name}</p>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Depo *</label>
                                    <select 
                                        value={modal.warehouse_id} 
                                        onChange={handleWarehouseChange} 
                                        required 
                                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                    >
                                        <option value="">Seçiniz</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {(() => {
                                    const allocs = modal.allocations || [{ shelf_code: modal.location_id, quantity: modal.received_quantity }];
                                    const totalAllocated = allocs.reduce((sum, a) => sum + (parseFloat(a.quantity) || 0), 0);
                                    const alreadyRec = parseFloat(modal.order?.received_quantity) || 0;
                                    const remOrderQty = Math.max(0, (parseFloat(modal.order?.quantity) || 0) - alreadyRec);
                                    const remaining = Math.max(0, remOrderQty - totalAllocated);
                                    const isExcess = totalAllocated > remOrderQty;
                                    return (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExcess ? '#fee2e2' : remaining === 0 ? '#dcfce7' : '#e0f2fe', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${isExcess ? '#fecaca' : remaining === 0 ? '#bbf7d0' : '#bae6fd'}` }}>
                                            <span style={{ fontSize: '13px', color: isExcess ? '#dc2626' : remaining === 0 ? '#166534' : '#0369a1', fontWeight: '600' }}>
                                                {isExcess ? `🔴 HATA: Kalan miktardan ${totalAllocated - remOrderQty} Adet fazla girdiniz!` : remaining === 0 ? '🟢 Tümü Tahsis Edildi (0 Kalan)' : `🔵 Dağıtılacak Kalan: ${remaining} Adet`}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#475569' }}>
                                                {alreadyRec > 0 ? (
                                                    <span>Önceki Alınan: <strong style={{color: '#059669'}}>{alreadyRec}</strong> / Toplam: <strong>{modal.order?.quantity} Adet</strong></span>
                                                ) : (
                                                    <span>Toplam Sipariş: <strong>{modal.order?.quantity} Adet</strong></span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })()}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {(modal.allocations || [{ shelf_code: modal.location_id, quantity: modal.received_quantity }]).map((alloc, idx, arr) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: arr.length > 1 ? '1fr 120px 40px' : '1fr 120px', gap: '10px', alignItems: 'flex-end', backgroundColor: idx > 0 ? '#f8fafc' : 'transparent', padding: idx > 0 ? '10px' : '0', borderRadius: '8px', border: idx > 0 ? '1px dashed #cbd5e1' : 'none' }}>
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                                                        Raf / Lokasyon {arr.length > 1 ? `#${idx + 1}` : ''} *
                                                    </label>
                                                    {idx === arr.length - 1 && (
                                                        <button type="button" onClick={addAllocation} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '700', cursor: 'pointer', padding: 0 }}>
                                                            (+ Raf Ekle)
                                                        </button>
                                                    )}
                                                </div>
                                                <select 
                                                    value={alloc.shelf_code} 
                                                    onChange={(e) => handleAllocationChange(idx, 'shelf_code', e.target.value)} 
                                                    required 
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                                >
                                                    <option value="">Seçiniz...</option>
                                                    {(() => {
                                                        const otherSelectedShelves = arr.filter((_, i) => i !== idx).map(a => a.shelf_code).filter(Boolean);
                                                        const sortedShelves = [...locations].sort((aObj, bObj) => {
                                                            const a = typeof aObj === 'string' ? aObj : aObj.shelfCode;
                                                            const b = typeof bObj === 'string' ? bObj : bObj.shelfCode;
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

                                                        return sortedShelves.map((l, shelfIdx) => {
                                                            const s = typeof l === 'string' ? l : l.shelfCode;
                                                            const cap = allShelvesCapacity[s];
                                                            const isFull = cap && (cap.maxItems === 0 || !cap.physicallyFits);
                                                            const isRecommended = !isFull && shelfIdx === 0 && cap && (cap.efficiency > 0 || cap.hasSameProduct || cap.maxItems > 0);
                                                            
                                                            let text = s;
                                                            if (isFull) {
                                                                text = `🔴 ${s} (Dolu veya Sığmaz)`;
                                                            } else if (isRecommended) {
                                                                const tags = [];
                                                                if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                                tags.push(`Maks. ${cap.maxItems} Adet`);
                                                                text = `⭐ ${s} (Önerilen - ${tags.join(', ')})`;
                                                            } else if (cap) {
                                                                const tags = [`Maks. ${cap.maxItems} Adet`];
                                                                if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                                text = `${s} (${tags.join(', ')})`;
                                                            }
                                                            return (
                                                                <option key={s} value={s} disabled={isFull} style={{ color: isFull ? '#ef4444' : isRecommended ? '#15803d' : 'inherit', fontWeight: isRecommended ? 'bold' : 'normal' }}>
                                                                    {text}
                                                                </option>
                                                            );
                                                        });
                                                    })()}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Miktar *</label>
                                                <input 
                                                    type="number" 
                                                    value={alloc.quantity} 
                                                    onChange={(e) => handleAllocationChange(idx, 'quantity', e.target.value)} 
                                                    required 
                                                    min="0.01" 
                                                    step="0.01"
                                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} 
                                                />
                                            </div>
                                            {arr.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeAllocation(idx)} 
                                                    title="Bu rafı sil"
                                                    style={{ height: '38px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Parti (Batch) No</label>
                                        <input 
                                            type="text" 
                                            value={modal.batch_number} 
                                            onChange={(e) => setModal({ ...modal, batch_number: e.target.value })} 
                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>
                                            <span>SKT (Son Kullanma)</span>
                                            {(() => {
                                                const shelfLife = parseInt(modal.order?.shelf_life_months) || 0;
                                                if (shelfLife > 0) return <span style={{ color: '#059669', fontSize: '11px', fontWeight: 'normal', backgroundColor: '#ecfdf5', padding: '2px 4px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>(+{shelfLife} Ay Otomatik)</span>;
                                                return null;
                                            })()}
                                        </label>
                                        <input 
                                            type="date" 
                                            value={modal.expiration_date} 
                                            onChange={(e) => setModal({ ...modal, expiration_date: e.target.value })} 
                                            disabled={true}
                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed', boxSizing: 'border-box' }} 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0 }}>
                                <button type="button" onClick={() => setModal({ ...modal, isOpen: false })} style={{ padding: '10px 16px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
                                    İptal
                                </button>
                                {(() => {
                                    const allocs = modal.allocations || [{ shelf_code: modal.location_id, quantity: modal.received_quantity }];
                                    const totalAllocated = allocs.reduce((sum, a) => sum + (parseFloat(a.quantity) || 0), 0);
                                    const remOrderQty = Math.max(0, (parseFloat(modal.order?.quantity) || 0) - (parseFloat(modal.order?.received_quantity) || 0));
                                    const isExcess = totalAllocated > remOrderQty;
                                    return (
                                        <button 
                                            type="submit" 
                                            disabled={isExcess}
                                            style={{ 
                                                padding: '10px 16px', 
                                                backgroundColor: isExcess ? '#ef4444' : '#059669', 
                                                color: 'white', 
                                                border: 'none', 
                                                borderRadius: '8px', 
                                                cursor: isExcess ? 'not-allowed' : 'pointer', 
                                                fontWeight: '600',
                                                opacity: isExcess ? 0.8 : 1
                                            }}
                                            title={isExcess ? `Kalan sipariş miktarından (${remOrderQty} Adet) fazla ürün eklenemez!` : ''}
                                        >
                                            {isExcess ? '❌ Kalan Miktardan Fazla Girildi (Engellendi)' : 'Onayla ve Envantere Ekle'}
                                        </button>
                                    );
                                })()}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoodsReceipt;

