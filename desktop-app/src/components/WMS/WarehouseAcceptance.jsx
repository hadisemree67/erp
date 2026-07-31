/**
 * ============================================================================
 * DOSYA ADI: WarehouseAcceptance.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - WMS Operasyonları / Gelişmiş Depo Kabul ve Kalite Kontrol
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Gelen sevkiyatların detaylı kabulünü, kalite kontrol (QC) süreçlerini, karantina alanına alımını ve onaylanan ürünlerin nihai depolama raflarına yerleştirme (put-away) akışını yöneten gelişmiş kabul ekranıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Adım Adım Kabul Akışı (Workflow), CSS Modülasyonu (WarehouseAcceptance.css)
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/wms/acceptance` ve kalite kontrol API rotalarıyla tam entegreli çalışan lojistik kabul panelidir.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (WarehouseAcceptance.jsx), Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.
 */

import React, { useState, useEffect } from 'react';
import './WarehouseAcceptance.css';
import { apiFetch } from '../../utils/api';

const WarehouseAcceptance = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [shelfCapacities, setShelfCapacities] = useState(null);
    const [bestShelf, setBestShelf] = useState(null);
    
    // Modals state
    const [entryOrder, setEntryOrder] = useState(null);
    const [allocations, setAllocations] = useState([{ warehouseId: '', shelfCode: '', quantity: '' }]);
    const [batchNumber, setBatchNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');

    const [defectOrder, setDefectOrder] = useState(null);
    const [defectQty, setDefectQty] = useState('');
    const [defectReason, setDefectReason] = useState('');

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/production/warehouse-acceptances');
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (err) {
            console.error(err);
            setError('Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/warehouses');
            const data = await res.json();
            if (Array.isArray(data)) {
                setWarehouses(data.filter(w => w.warehouse_type === 'STOK'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const [warehouseCapacities, setWarehouseCapacities] = useState({});

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        if (!entryOrder) {
            setWarehouseCapacities({});
            return;
        }
        allocations.forEach(async (alloc) => {
            const whId = alloc.warehouseId;
            if (whId && !warehouseCapacities[whId]) {
                try {
                    const res = await apiFetch(`http://localhost:3000/api/wms/warehouse-capacities?warehouseId=${whId}&productId=${entryOrder.product_id}`);
                    const data = await res.json();
                    if (data.success) {
                        setWarehouseCapacities(prev => ({ ...prev, [whId]: data.data }));
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    }, [allocations, entryOrder]);

    useEffect(() => {
        if (!entryOrder || Object.keys(warehouseCapacities).length === 0) return;

        setAllocations(prevAllocs => {
            let changed = false;
            const newAllocs = prevAllocs.map((alloc, index) => {
                const whId = alloc.warehouseId;
                if (!whId) return alloc;
                
                const selectedWh = warehouses.find(w => w.id.toString() === whId.toString());
                const shelves = selectedWh && selectedWh.Shelves ? selectedWh.Shelves : [];
                
                const allShelvesCapacity = warehouseCapacities[whId];
                if (!allShelvesCapacity) return alloc;
                
                const capCurrent = allShelvesCapacity[alloc.shelfCode];
                const isCurrentFull = alloc.shelfCode && capCurrent && (capCurrent.maxItems === 0 || !capCurrent.physicallyFits);

                if (!alloc.shelfCode || isCurrentFull) {
                    const otherSelectedShelves = prevAllocs.filter((_, i) => i !== index).map(a => a.shelfCode).filter(Boolean);
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
                    const bestShelfCap = allShelvesCapacity[bestShelf];
                    const isBestFull = bestShelfCap && (bestShelfCap.maxItems === 0 || !bestShelfCap.physicallyFits);

                    if (bestShelf && !isBestFull && alloc.shelfCode !== bestShelf) {
                        changed = true;
                        return { ...alloc, shelfCode: bestShelf };
                    }
                }
                return alloc;
            });
            return changed ? newAllocs : prevAllocs;
        });
    }, [warehouseCapacities, entryOrder, warehouses]);

    useEffect(() => {
        fetchOrders();
        fetchWarehouses();

        // 30 saniyede bir otomatik olarak tabloyu sessizce günceller
        const intervalId = setInterval(() => {
            fetchOrdersSilently();
        }, 30000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchOrdersSilently = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/production/warehouse-acceptances');
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (err) {
            console.error('Sessiz güncelleme hatası:', err);
        }
    };

    const getShelvesForWarehouse = (whId) => {
        if (!whId) return [];
        const selectedWh = warehouses.find(w => w.id.toString() === whId.toString());
        return selectedWh && selectedWh.Shelves ? selectedWh.Shelves : [];
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleAllocationChange = (index, field, value) => {
        const newAllocs = [...allocations];
        newAllocs[index][field] = value;
        if (field === 'warehouseId') {
            const shelves = getShelvesForWarehouse(value);
            newAllocs[index].shelfCode = shelves.length > 0 ? shelves[0] : '';
        }
        setAllocations(newAllocs);
    };

    const addAllocation = () => {
        const remaining = entryOrder ? Math.max(0, parseFloat(entryOrder.actual_quantity) - allocations.reduce((sum, a) => sum + (parseFloat(a.quantity) || 0), 0)) : '';
        const whId = warehouses.length > 0 ? warehouses[0].id : '';
        setAllocations([...allocations, { warehouseId: whId, shelfCode: '', quantity: remaining }]);
    };

    const removeAllocation = (index) => {
        setAllocations(allocations.filter((_, i) => i !== index));
    };

    const openDefectModal = (order) => {
        setDefectOrder(order);
        setDefectQty(order.actual_quantity);
        setDefectReason('');
    };

    const closeDefectModal = () => {
        setDefectOrder(null);
        setDefectQty('');
        setDefectReason('');
    };

    const handleReportDefect = async (e) => {
        e.preventDefault();
        if (!defectOrder || !defectQty) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${defectOrder.id}/report-defect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ received_quantity: defectQty, reason: defectReason })
            });
            const data = await res.json();
            if (data.success) {
                closeDefectModal();
                fetchOrders();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Sunucu hatası.');
        }
    };

    const handleAcceptDelivery = async (orderId) => {
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${orderId}/accept-delivery`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                fetchOrders();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Sunucu hatası.');
        }
    };

    const openEntryModal = (order) => {
        setEntryOrder(order);
        setBatchNumber('');
        
        const shelfLife = parseInt(order.shelf_life_months) || 0;
        if (shelfLife > 0) {
            const now = new Date();
            now.setMonth(now.getMonth() + shelfLife);
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            setExpirationDate(`${year}-${month}-${day}`);
        } else {
            setExpirationDate('');
        }
        
        const whId = warehouses.length > 0 ? warehouses[0].id : '';
        setAllocations([{ warehouseId: whId, shelfCode: '', quantity: order.actual_quantity }]);
    };

    const closeEntryModal = () => {
        setEntryOrder(null);
    };

    const handleStockEntry = async (e) => {
        e.preventDefault();
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${entryOrder.id}/warehouse-stock-entry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shelfAllocations: allocations.map(a => ({
                        warehouseId: a.warehouseId,
                        shelfCode: a.shelfCode,
                        quantity: parseFloat(a.quantity) || 0
                    })),
                    batch_number: batchNumber,
                    expiration_date: expirationDate || null
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Stok girişi başarılı.');
                closeEntryModal();
                fetchOrders();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Sunucu hatası.');
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div className="depo-kabulleri-container">
            <div className="page-header">
                <div className="header-title">
                    <h2>Depo Kabulleri</h2>
                    <span className="badge-count">{orders.length} Bekleyen</span>
                </div>
                <div className="header-actions">
                    <input type="text" placeholder="Emir no veya ürün ara..." className="search-input" />
                </div>
            </div>

            {loading ? (
                <div>Yükleniyor...</div>
            ) : error ? (
                <div style={{ color: 'red' }}>{error}</div>
            ) : (
                <div className="kabul-grid">
                    {orders.length === 0 ? (
                        <p style={{ color: '#64748b' }}>Bekleyen depo kabul işlemi bulunmuyor.</p>
                    ) : orders.map(order => (
                        <div key={order.id} className="kabul-card">
                            <div className={`card-status-bar ${order.status === 'Kabul Edildi' ? 'status-accepted' : 'status-waiting'}`}></div>
                            
                            <div className="card-body">
                                <div className="card-top">
                                    <span className="emir-no">EMİR #{order.id}</span>
                                    <span className={`status-text ${order.status === 'Kabul Edildi' ? 'text-accepted' : 'text-waiting'}`}>
                                        • {order.status}
                                    </span>
                                </div>

                                <h3 className="product-name">{order.product_name}</h3>
                                <p className="category-name">{order.product_category}</p>

                                <div className="card-details-grid">
                                    <div className="detail-item">
                                        <span className="label">Gerçekleşen Üretim</span>
                                        <span className="value-highlight">{order.actual_quantity} Adet</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Teslim Eden Kişi</span>
                                        <span className="value">{order.delivered_user_name || 'Bilinmiyor'}</span>
                                    </div>
                                </div>

                                <div className="card-footer">
                                    {order.status === 'Depo Teslim Bekliyor' && (
                                        <>
                                            <button className="wa-btn-danger" onClick={() => openDefectModal(order)}>
                                                Hatalı/Eksik Bildir
                                            </button>
                                            <button className="wa-btn-primary" onClick={() => handleAcceptDelivery(order.id)}>
                                                Teslim Aldım
                                            </button>
                                        </>
                                    )}
                                    {order.status === 'Kabul Edildi' && (
                                        <button className="wa-btn-success" onClick={() => openEntryModal(order)}>
                                            Stok Girişi Yap
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {entryOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '520px', maxWidth: '95%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>Depoya Stok Girişi</h2>
                            <button onClick={closeEntryModal} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>
                        
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
                            {/* Rozet Kartı */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>
                                    📦 {entryOrder.product_name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#475569' }}>Toplam Miktar: {parseFloat(entryOrder.actual_quantity)} Adet</span>
                                    <span style={{ color: '#cbd5e1' }}>•</span>
                                    {(() => {
                                        const remaining = Math.max(0, parseFloat(entryOrder.actual_quantity) - allocations.reduce((sum, a) => sum + (parseFloat(a.quantity) || 0), 0));
                                        return (
                                            <span style={{ 
                                                backgroundColor: remaining === 0 ? '#dcfce7' : '#e0f2fe', 
                                                color: remaining === 0 ? '#166534' : '#0369a1', 
                                                padding: '4px 8px', borderRadius: '6px', fontWeight: '600' 
                                            }}>
                                                {remaining === 0 ? '🟢 Tümü Tahsis Edildi (0 Kalan)' : `🔵 Dağıtılacak Kalan: ${remaining} Adet`}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            <form onSubmit={handleStockEntry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {allocations.map((alloc, index) => {
                                        const shelves = getShelvesForWarehouse(alloc.warehouseId);
                                        const allShelvesCapacity = (alloc.warehouseId && warehouseCapacities[alloc.warehouseId]) || {};
                                        return (
                                            <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', backgroundColor: '#fff', paddingBottom: index < allocations.length - 1 ? '16px' : '0' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Depo Seçin <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <select value={alloc.warehouseId} onChange={e => handleAllocationChange(index, 'warehouseId', e.target.value)} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}>
                                                        <option value="">Seçiniz...</option>
                                                        {warehouses.map(w => (
                                                            <option key={w.id} value={w.id}>{w.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Raf Seçin <span style={{ color: '#ef4444' }}>*</span></label>
                                                        {index === allocations.length - 1 && (
                                                            <button type="button" onClick={addAllocation} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                                                                (+ Yeni Raf)
                                                            </button>
                                                        )}
                                                    </div>
                                                    <select value={alloc.shelfCode} onChange={e => handleAllocationChange(index, 'shelfCode', e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}>
                                                        <option value="">Rafa atama yapma</option>
                                                        {(() => {
                                                            const otherSelectedShelves = allocations.filter((_, i) => i !== index).map(a => a.shelfCode).filter(Boolean);
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

                                                            return sortedShelves.map((s, shelfIdx) => {
                                                                const cap = allShelvesCapacity[s];
                                                                const isFull = cap && (cap.maxItems === 0 || !cap.physicallyFits);
                                                                const isRecommended = !isFull && shelfIdx === 0 && cap && (cap.efficiency > 0 || cap.hasSameProduct);
                                                                
                                                                let text = s;
                                                                if (isFull) {
                                                                    text = `🔴 ${s}`;
                                                                } else if (isRecommended) {
                                                                    const tags = [];
                                                                    if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                                    else if (!cap.hasSameCorridor) tags.push('Risk Dağıtımı (Farklı Koridor)');
                                                                    tags.push(`%${cap.efficiency} Verim`);
                                                                    text = `⭐ ${s} (Önerilen - Maks. ${cap.maxItems} Adet, ${tags.join(', ')})`;
                                                                } else if (cap) {
                                                                    const tags = [`%${cap.efficiency} Verim`];
                                                                    if (cap.hasSameProduct) tags.push('Ürün Zaten Var');
                                                                    text += ` - Maks. ${cap.maxItems} Adet (${tags.join(', ')})`;
                                                                }

                                                                return (
                                                                    <option key={s} value={s} disabled={isFull} style={{ color: isFull ? '#94a3b8' : (isRecommended ? '#047857' : 'inherit'), fontWeight: isRecommended ? 'bold' : 'normal' }}>
                                                                        {text}
                                                                    </option>
                                                                );
                                                            });
                                                        })()}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Miktar <span style={{ color: '#ef4444' }}>*</span></label>
                                                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                                        <input type="number" step="0.01" min="0.01" value={alloc.quantity} onChange={e => handleAllocationChange(index, 'quantity', e.target.value)} required style={{ padding: '10px', border: 'none', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                                                        <span style={{ padding: '0 12px', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderLeft: '1px solid #cbd5e1', height: '100%', display: 'flex', alignItems: 'center' }}>Adet</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Raf İşlemi</label>
                                                    {allocations.length > 1 ? (
                                                        <button type="button" onClick={() => removeAllocation(index)} style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}>
                                                            Sil
                                                        </button>
                                                    ) : (
                                                        <div style={{ padding: '10px', color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', height: '100%', boxSizing: 'border-box' }}>
                                                            Tek Raf
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Parti (Batch) No</label>
                                        <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} placeholder="Örn: 1241253535" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>SKT (Son Kullanma)</span>
                                            {(() => {
                                                const shelfLife = parseInt(entryOrder?.shelf_life_months) || 0;
                                                if (shelfLife > 0) return <span style={{ color: '#059669', fontSize: '11px', fontWeight: 'normal', backgroundColor: '#ecfdf5', padding: '2px 4px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>(+{shelfLife} Ay Otomatik)</span>;
                                                return null;
                                            })()}
                                        </label>
                                        <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} disabled={true} style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%', boxSizing: 'border-box', backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexShrink: 0, paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                    <button type="button" onClick={closeEntryModal} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>
                                        İptal
                                    </button>
                                    <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                        Stoğa Ekle
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {defectOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '400px', maxWidth: '95%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>Hatalı/Eksik Sipariş Bildirimi</h2>
                            <button onClick={closeDefectModal} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleReportDefect}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Gerçekte Gelen Sağlam Miktar</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={defectQty} 
                                        onChange={(e) => setDefectQty(e.target.value)} 
                                        max={defectOrder.actual_quantity}
                                        required 
                                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    />
                                    <small style={{ color: '#64748b', fontSize: '12px' }}>Bildirilen üretim: {defectOrder.actual_quantity}</small>
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Açıklama / Hata Nedeni</label>
                                    <textarea 
                                        value={defectReason}
                                        onChange={(e) => setDefectReason(e.target.value)}
                                        rows="3"
                                        placeholder="Örn: Nakliyede 2 tanesi dökülmüş"
                                        required
                                        style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }}
                                    ></textarea>
                                </div>
                            </div>
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc' }}>
                                <button type="button" onClick={closeDefectModal} style={{ padding: '10px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>İptal</button>
                                <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Bildir ve Teslim Al</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseAcceptance;
