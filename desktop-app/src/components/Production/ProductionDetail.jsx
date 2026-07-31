/**
 * ============================================================================
 * DOSYA ADI: ProductionDetail.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Üretim Modülü / Üretim Siparişi Detay ve Süreç Ekranı
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Seçilen bir üretim siparişinin detaylı aşamalarını (kesim, montaj, kalite kontrol vb.), kullanılan hammaddeleri (reçete tüketimi) ve fire oranlarını gösteren, aşama tamamladıkça stoktan otomatik hammadde düşümünü tetikleyen detay ekranıdır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Adım Takip Göstergeleri (Stepper), Dinamik Stok Tüketim Hesaplama
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/production/orders/:id` rotası ile haberleşerek imalat sürecinin canlı takibini sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ProductionDetail.jsx), Üretim talepleri, makineler, reçete (BOM) tanımları ve aktif üretim süreçlerini içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const ProductionDetail = ({ currentUser, orderId, onNavigate }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [steps, setSteps] = useState([]);

    // For Step Verification Modal
    const [activeVerifyStep, setActiveVerifyStep] = useState(null);
    const [verifyBarcode, setVerifyBarcode] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [verifiedMaterialsLocal, setVerifiedMaterialsLocal] = useState({}); // { stepId: [mat1, mat2] }

    // For Barcode Pick Modal
    const [activePickMaterial, setActivePickMaterial] = useState(null);
    const [pickBarcode, setPickBarcode] = useState('');
    const [pickQuantity, setPickQuantity] = useState('');
    const [barcodeMatched, setBarcodeMatched] = useState(false);
    const [pickError, setPickError] = useState('');

    // For Complete Production Modal
    const [isCompleting, setIsCompleting] = useState(false);
    const [actualQuantity, setActualQuantity] = useState('');
    const [wasteReason, setWasteReason] = useState('');
    const [managerExplanation, setManagerExplanation] = useState('');
    const [requiresManager, setRequiresManager] = useState(false);
    const [requiresReason, setRequiresReason] = useState(false);
    const [completionError, setCompletionError] = useState('');
    
    // For Delivery
    const [warehouseUsers, setWarehouseUsers] = useState([]);
    const [deliveredToUserId, setDeliveredToUserId] = useState('');

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        if (orderId) {
            handleViewOrder(orderId);
            fetchWarehouseUsers();
        } else {
            onNavigate('uretim-listesi');
        }
    }, [orderId]);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchWarehouseUsers = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/production/warehouse-users');
            const data = await res.json();
            if (data.success) {
                setWarehouseUsers(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleViewOrder = async (id, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${id}`);
            const data = await res.json();
            if (data.success) {
                setOrder(data.order);
                setMaterials(data.materials || []);
                setSteps(data.steps || []);
            } else {
                alert(data.message || 'Sipariş bulunamadı');
                onNavigate('uretim-listesi');
            }
        } catch (err) {
            console.error(err);
            onNavigate('uretim-listesi');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const openPickModal = (material) => {
        setActivePickMaterial(material);
        setPickBarcode('');
        setPickQuantity('');
        setBarcodeMatched(false);
        setPickError('');
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleBarcodeChange = (e) => {
        const val = e.target.value;
        setPickBarcode(val);
        setPickError('');
        
        let dbBarcodes = [];
        try {
            if (activePickMaterial && activePickMaterial.barcode) {
                const parsed = JSON.parse(activePickMaterial.barcode);
                if (Array.isArray(parsed)) {
                    dbBarcodes = parsed.map(b => String(b).trim());
                } else {
                    dbBarcodes = [String(activePickMaterial.barcode).trim()];
                }
            }
        } catch(e) {
            if (activePickMaterial && activePickMaterial.barcode) {
                dbBarcodes = [String(activePickMaterial.barcode).trim()];
            }
        }

        const isMatch = activePickMaterial && dbBarcodes.includes(String(val).trim());
        
        if (isMatch) {
            setBarcodeMatched(true);
            setPickQuantity(activePickMaterial.required_quantity);
        } else {
            setBarcodeMatched(false);
        }
    };

    const handlePickSubmit = async (e) => {
        e.preventDefault();
        if (!barcodeMatched) {
            setPickError('Lütfen önce doğru barkodu okutunuz.');
            return;
        }

        const qty = parseFloat(pickQuantity);
        const targetQty = parseFloat(activePickMaterial.required_quantity);
        
        if (isNaN(qty) || qty <= 0) {
            setPickError('Lütfen geçerli bir miktar giriniz.');
            return;
        }

        // Tolerance check (10%)
        const diffPercent = Math.abs(qty - targetQty) / targetQty * 100;
        if (diffPercent > 10) {
            const confirmed = window.confirm(`Uyarı: Reçetedeki miktar ${targetQty} ancak siz ${qty} girdiniz. Tolerans sınırları (%10) dışında! Yine de onaylamak istiyor musunuz?`);
            if (!confirmed) return;
        }

        try {
            // Optimistic update
            setMaterials(prev => prev.map(m => m.id === activePickMaterial.id ? { ...m, is_picked: true, actual_quantity: qty } : m));
            
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${order.id}/pick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ material_id: activePickMaterial.id, actual_quantity: qty })
            });
            
            const data = await res.json();
            if (data.success) {
                setActivePickMaterial(null);
                handleViewOrder(order.id, true);
            } else {
                setPickError(data.message || 'Hata oluştu');
                handleViewOrder(order.id, true);
            }
        } catch (err) {
            console.error(err);
            setPickError('Sunucu hatası');
            handleViewOrder(order.id, true);
        }
    };

    const handleStartProduction = async () => {
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${order.id}/start`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                handleViewOrder(order.id, true);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const startStepRequest = async (stepId) => {
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${order.id}/steps/${stepId}/start`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setActiveVerifyStep(null);
                handleViewOrder(order.id, true);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleStartStepClick = (step, idx) => {
        let formula = [];
        try { if (order.product_formula) formula = JSON.parse(order.product_formula); } catch(e){}
        const stepFormula = formula[idx] || {};
        const reqMaterials = stepFormula.materials || [];
        
        let verified = [];
        try { if (step.verified_materials) verified = JSON.parse(step.verified_materials); } catch(e){}

        if (reqMaterials.length > 0) {
            setActiveVerifyStep({
                ...step,
                index: idx,
                required_materials: reqMaterials,
                verified_materials: verified
            });
            setVerifyBarcode('');
            setVerifyError('');
        } else {
            startStepRequest(step.id);
        }
    };

    const handleVerifyBarcodeChange = async (e) => {
        const val = e.target.value;
        setVerifyBarcode(val);
        setVerifyError('');

        if (!activeVerifyStep) return;

        // Bulunan barkodun hangi hammaddeye ait olduğunu bulalım
        // Önce tüm materials içinde bu barkodu arayalım
        let matchedMaterial = null;
        for (const m of materials) {
            let dbBarcodes = [];
            try {
                if (m.barcode) {
                    const parsed = JSON.parse(m.barcode);
                    if (Array.isArray(parsed)) {
                        dbBarcodes = parsed.map(b => String(b).trim());
                    } else {
                        dbBarcodes = [String(m.barcode).trim()];
                    }
                }
            } catch(ex) {
                if (m.barcode) dbBarcodes = [String(m.barcode).trim()];
            }
            if (dbBarcodes.includes(String(val).trim())) {
                matchedMaterial = m;
                break;
            }
        }

        if (matchedMaterial) {
            // Reçetede var mı?
            const reqMat = activeVerifyStep.required_materials.find(rm => rm.material === matchedMaterial.material_name);
            if (reqMat) {
                // Daha önce okutulmuş mu?
                if (activeVerifyStep.verified_materials.includes(matchedMaterial.material_name)) {
                    setVerifyError('Bu malzeme zaten okutuldu!');
                } else {
                    // Eşleşti, backend'e bildir
                    setVerifyBarcode('');
                    setVerifyError('');
                    try {
                        const res = await apiFetch(`http://localhost:3000/api/production/orders/${order.id}/steps/${activeVerifyStep.id}/verify-material`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ material_name: matchedMaterial.material_name })
                        });
                        const data = await res.json();
                        if (data.success) {
                            setActiveVerifyStep(prev => ({
                                ...prev,
                                verified_materials: data.verified_materials
                            }));
                            // update steps state optimistically
                            setSteps(prev => prev.map(s => s.id === activeVerifyStep.id ? { ...s, verified_materials: JSON.stringify(data.verified_materials) } : s));
                        }
                    } catch (err) {
                        setVerifyError('Sunucu hatası oluştu');
                    }
                }
            } else {
                setVerifyError('Yanlış Malzeme! Bu adıma ait değil.');
            }
        }
    };

    const handleCompleteStep = async (stepId) => {
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${order.id}/steps/${stepId}/complete`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                handleViewOrder(order.id, true);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCompleteSubmit = async (e) => {
        e.preventDefault();
        setCompletionError('');
        try {
            const payload = { 
                actual_quantity: actualQuantity, 
                waste_reason: wasteReason, 
                manager_explanation: managerExplanation,
                is_manager_approval: requiresManager,
                delivered_to_user_id: deliveredToUserId
            };

            const res = await apiFetch(`http://localhost:3000/api/production/orders/${order.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                if (data.requireManager) {
                    setRequiresManager(true);
                    setCompletionError('Fire oranı %30 üzerinde! Yönetici onayı (açıklaması) gerekiyor.');
                } else {
                    alert(data.message);
                    setIsCompleting(false);
                    setRequiresManager(false);
                    setRequiresReason(false);
                    setDeliveredToUserId('');
                    handleViewOrder(order.id);
                }
            } else {
                setCompletionError(data.message);
                if (data.requireReason) {
                    setRequiresReason(true);
                }
            }
        } catch (err) {
            console.error(err);
            setCompletionError('Sunucu hatası');
        }
    };

    const renderStatusBadge = (status) => {
        let color = '#64748b', bg = '#f1f5f9';
        if (status === 'Toplanıyor') { color = '#d97706'; bg = '#fef3c7'; }
        if (status === 'Üretimde') { color = '#2563eb'; bg = '#dbeafe'; }
        if (status === 'Tamamlandı') { color = '#16a34a'; bg = '#dcfce3'; }
        if (status === 'Onay Bekliyor') { color = '#dc2626'; bg = '#fee2e2'; }
        
        return <span style={{ padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', backgroundColor: bg, color: color }}>{status}</span>;
    };

    if (loading || !order) {
        return <div style={{ padding: '24px', fontSize: '16px', color: '#64748b' }}>Yükleniyor...</div>;
    }

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Üst Kısım / Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => onNavigate('uretim-listesi')} 
                        style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        ← Geri Dön
                    </button>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Emir #{order.id} Detayı</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{order.product_name}</p>
                    </div>
                </div>
                <div>
                    {renderStatusBadge(order.status)}
                </div>
            </div>

            {/* Bilgi Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Makine</div>
                    <div style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{order.machine_name}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Sorumlu Personel</div>
                    <div style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{order.user_name || '-'}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Planlanan Hedef</div>
                    <div style={{ color: '#0f172a', fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{order.planned_quantity} Adet</div>
                </div>
                {order.status === 'Tamamlandı' && (
                    <div style={{ backgroundColor: '#dcfce3', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ color: '#166534', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Gerçekleşen / Fire</div>
                        <div style={{ color: '#15803d', fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{order.actual_quantity} Adet (%{parseFloat(order.waste_percentage).toFixed(1)})</div>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '12px' }}>
                
                {/* Sol Kısım: Depodan Toplanacaklar */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Depodan Toplanacaklar</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {materials.map(m => {
                                const isUsedInAnyStartedStep = steps.some(s => {
                                    if (s.status === 'Bekliyor') return false; // Sadece çalışıyor veya tamamlandı olan adımlar
                                    let v = [];
                                    try { if (s.verified_materials) v = JSON.parse(s.verified_materials); } catch(e){}
                                    return v.includes(m.material_name);
                                });
                                return (
                                    <div key={m.id} style={{ padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: isUsedInAnyStartedStep ? '#f1f5f9' : (m.is_picked ? '#f0fdf4' : '#fff'), opacity: isUsedInAnyStartedStep ? 0.7 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '15px', color: isUsedInAnyStartedStep ? '#94a3b8' : '#0f172a', textDecoration: isUsedInAnyStartedStep ? 'line-through' : 'none' }}>{m.material_name || 'Bilinmeyen Ürün'}</div>
                                            <div style={{ fontSize: '14px', color: '#334155', marginTop: '6px' }}>
                                                <strong>Miktar:</strong> {parseFloat(parseFloat(m.required_quantity).toFixed(4))} {m.unit_type || 'Adet'}
                                                {(m.unit_type || '').toLowerCase() === 'litre' && (
                                                    <span style={{ marginLeft: '4px', color: '#64748b' }}>
                                                        ({(parseFloat(m.required_quantity) * 1000).toLocaleString('tr-TR')} ml)
                                                    </span>
                                                )}
                                                {(m.unit_type || '').toLowerCase() === 'kg' && (
                                                    <span style={{ marginLeft: '4px', color: '#64748b' }}>
                                                        ({(parseFloat(m.required_quantity) * 1000).toLocaleString('tr-TR')} gr)
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>📍 Depo: {m.warehouse_name} | Raf: {m.shelf_code}</div>
                                        </div>
                                        <div>
                                            {isUsedInAnyStartedStep ? (
                                                <div style={{ backgroundColor: '#64748b', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>✓ Makinede</div>
                                            ) : m.is_picked ? (
                                                <div style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>✓ Toplandı ({m.actual_quantity !== null && m.actual_quantity !== undefined ? parseFloat(m.actual_quantity).toLocaleString('tr-TR') : parseFloat(m.required_quantity).toLocaleString('tr-TR')} {m.unit_type})</div>
                                            ) : (
                                                <button 
                                                    onClick={() => openPickModal(m)}
                                                    disabled={order.status !== 'Bekliyor' && order.status !== 'Toplanıyor' && order.status !== 'Üretimde'}
                                                    style={{ padding: '8px 16px', backgroundColor: (order.status !== 'Bekliyor' && order.status !== 'Toplanıyor' && order.status !== 'Üretimde') ? '#cbd5e1' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: (order.status !== 'Bekliyor' && order.status !== 'Toplanıyor' && order.status !== 'Üretimde') ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="8" y="8" width="8" height="8" rx="1"></rect></svg> Barkod Okut
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                        })}
                    </div>

                    {(order.status === 'Bekliyor' || order.status === 'Toplanıyor') && materials.every(m => m.is_picked) && (
                        <button 
                            onClick={handleStartProduction} 
                            style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '24px', fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.4)' }}
                        >
                            🚀 Üretime Başla
                        </button>
                    )}
                </div>

                {/* Sağ Kısım: Üretim Adımları / Makine Detayı */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>Üretim Adımları / Makine Detayı</h3>
                    
                    {order.status === 'Bekliyor' || order.status === 'Toplanıyor' ? (
                        <div style={{ backgroundColor: '#f1f5f9', padding: '32px', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚙️</div>
                            Tüm materyaller toplanıp üretime başlandığında bu alanda makineye eklenecek malzemeler ve süreler görünecektir.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {steps.map((step, idx) => (
                                <div key={step.id} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>{step.step_number}. {step.operation_name}</div>
                                        <div>
                                            {step.status === 'Bekliyor' && <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>Bekliyor</span>}
                                            {step.status === 'Çalışıyor' && <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: 'bold' }}>Çalışıyor...</span>}
                                            {step.status === 'Tamamlandı' && <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 'bold' }}>✓ Tamamlandı</span>}
                                        </div>
                                    </div>
                                    
                                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', color: '#334155' }}>
                                        <div><strong>Makine:</strong> {step.machine_name || 'Yok'}</div>
                                        <div style={{ marginTop: '4px' }}><strong>Süre:</strong> {step.duration_minutes} dk İşlem</div>
                                    </div>

                                    {/* Adım Aksiyonları */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {step.status === 'Bekliyor' && (
                                            <button onClick={() => handleStartStepClick(step, idx)} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                Adımı Başlat
                                            </button>
                                        )}
                                        {step.status === 'Çalışıyor' && (
                                            <button onClick={() => handleCompleteStep(step.id)} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                Adımı Tamamla
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Üretim Bitirme Aksiyonu */}
                            {steps.length > 0 && steps.every(s => s.status === 'Tamamlandı') && order.status !== 'Tamamlandı' && order.status !== 'Onay Bekliyor' && (
                                <button onClick={() => setIsCompleting(true)} style={{ padding: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '16px', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.4)' }}>
                                    Üretimi Bitir ve Depoya Gönder
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tamamlama Modalı (Eskisiyle birebir aynı mantık, ufak stil rütuşları) */}
            {isCompleting && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px', color: '#0f172a' }}>Üretimi Tamamla</h3>
                        <form onSubmit={handleCompleteSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Gerçekleşen Üretim Miktarı (Adet)</label>
                                <input type="number" step="0.01" value={actualQuantity} onChange={(e) => setActualQuantity(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Planlanan: {order.planned_quantity}</div>
                            </div>
                            
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>Depo Teslim Alıcısı</label>
                                <select value={deliveredToUserId} onChange={(e) => setDeliveredToUserId(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                    <option value="">-- Depo Görevlisi Seçin --</option>
                                    {warehouseUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            {requiresReason && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#dc2626' }}>Fire Sebebi Açıklaması (Zorunlu)</label>
                                    <textarea value={wasteReason} onChange={(e) => setWasteReason(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5' }} rows={3} placeholder="Beklenenden fazla veya az üretim yapıldı, sebebi nedir?" />
                                </div>
                            )}

                            {requiresManager && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#dc2626' }}>Yönetici Onay Kodu / Açıklama</label>
                                    <input type="text" value={managerExplanation} onChange={(e) => setManagerExplanation(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5' }} placeholder="Yönetici onayı gerekiyor..." />
                                </div>
                            )}

                            {completionError && (
                                <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                                    {completionError}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => { setIsCompleting(false); setRequiresReason(false); setRequiresManager(false); setCompletionError(''); }} style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>İptal</button>
                                <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Tamamla</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Adım Yükleme Doğrulama Modal'ı */}
            {activeVerifyStep && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}}><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="8" y="8" width="8" height="8" rx="1"></rect></svg>
                                MAKİNEYE YÜKLEME DOĞRULAMASI
                            </h3>
                            <button type="button" onClick={() => setActiveVerifyStep(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>
                        
                        <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Adım: {activeVerifyStep.operation_name}</div>
                            <div style={{ fontSize: '13px', color: '#475569' }}>Lütfen bu adıma ait aşağıdaki hammaddelerin barkodlarını tek tek okutarak makineye yükleyin.</div>
                        </div>

                        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activeVerifyStep.required_materials.map((rm, i) => {
                                const isVerified = activeVerifyStep.verified_materials.includes(rm.material);
                                return (
                                    <div key={i} style={{ padding: '12px', borderRadius: '6px', border: `1px solid ${isVerified ? '#86efac' : '#cbd5e1'}`, backgroundColor: isVerified ? '#f0fdf4' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: isVerified ? '#166534' : '#334155', textDecoration: isVerified ? 'line-through' : 'none' }}>{rm.material}</div>
                                        {isVerified ? (
                                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Okutuldu</span>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Okutulmadı</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {activeVerifyStep.verified_materials.length < activeVerifyStep.required_materials.length ? (
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>BARKOD OKUTUN:</label>
                                <input 
                                    type="text" 
                                    value={verifyBarcode} 
                                    onChange={handleVerifyBarcodeChange}
                                    placeholder="Barkod okuyucu ile sıradaki malzemeyi okutun..."
                                    autoFocus
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #cbd5e1', fontSize: '16px', outline: 'none' }}
                                />
                                {verifyError && <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '13px', marginTop: '8px' }}>❌ {verifyError}</div>}
                            </div>
                        ) : (
                            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', color: '#065f46', fontWeight: 'bold', textAlign: 'center' }}>
                                🎉 Tüm malzemeler başarıyla doğrulandı!
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" onClick={() => setActiveVerifyStep(null)} style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Kapat
                            </button>
                            <button 
                                type="button" 
                                onClick={() => startStepRequest(activeVerifyStep.id)}
                                disabled={activeVerifyStep.verified_materials.length < activeVerifyStep.required_materials.length} 
                                style={{ padding: '10px 20px', backgroundColor: activeVerifyStep.verified_materials.length < activeVerifyStep.required_materials.length ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: activeVerifyStep.verified_materials.length < activeVerifyStep.required_materials.length ? 'not-allowed' : 'pointer' }}
                            >
                                Üretime Başla
                            </button>
                        </div>
                    </div>
                </div>
            )}
    
            {/* Barkod Doğrulama Modal'ı */}
            {activePickMaterial && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}}><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="8" y="8" width="8" height="8" rx="1"></rect></svg> HAMMADDE DOĞRULAMA</h3>
                            <button type="button" onClick={() => setActivePickMaterial(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>
                        
                        <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a', marginBottom: '8px' }}>📦 Ürün: {activePickMaterial.material_name}</div>
                            <div style={{ fontSize: '14px', color: '#475569' }}>📍 Konum: {activePickMaterial.warehouse_name} | Raf: {activePickMaterial.shelf_code}</div>
                        </div>

                        <form onSubmit={handlePickSubmit}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>1️⃣ BARKOD OKUTUN:</label>
                                <input 
                                    type="text" 
                                    value={pickBarcode} 
                                    onChange={handleBarcodeChange}
                                    placeholder="Barkod okuyucu ile okutun..."
                                    autoFocus
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #cbd5e1', fontSize: '16px', outline: 'none', borderColor: barcodeMatched ? '#10b981' : '#cbd5e1' }}
                                />
                                {barcodeMatched && (
                                    <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '14px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🟢 Barkod Eşleşti! (Doğru Ürün)
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '24px', opacity: barcodeMatched ? 1 : 0.5, pointerEvents: barcodeMatched ? 'auto' : 'none' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>2️⃣ TARTILAN / ALINAN MİKTAR:</label>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                                    Reçetedeki Miktar: {parseFloat(activePickMaterial.required_quantity).toLocaleString('tr-TR')} {activePickMaterial.unit_type}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input 
                                        type="number" 
                                        step="0.0001"
                                        value={pickQuantity}
                                        onChange={(e) => {
                                            setPickQuantity(e.target.value);
                                            const qty = parseFloat(e.target.value);
                                            const targetQty = parseFloat(activePickMaterial.required_quantity);
                                            if (!isNaN(qty) && !isNaN(targetQty)) {
                                                const diffPercent = Math.abs(qty - targetQty) / targetQty * 100;
                                                if (diffPercent > 10) {
                                                    setPickError(`Uyarı: Reçetedeki miktar ${targetQty} ancak siz ${qty} girdiniz. Tolerans sınırları dışında!`);
                                                } else {
                                                    setPickError('');
                                                }
                                            }
                                        }}
                                        required
                                        disabled={!barcodeMatched}
                                        style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px' }}
                                    />
                                    <button 
                                        type="button"
                                        disabled={!barcodeMatched}
                                        title="Tartıdan Barkod Okut (Yakında eklenecek)"
                                        style={{ 
                                            padding: '10px', 
                                            backgroundColor: '#f1f5f9', 
                                            border: '1px solid #cbd5e1', 
                                            borderRadius: '6px', 
                                            cursor: barcodeMatched ? 'pointer' : 'not-allowed', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center' 
                                        }}
                                        onClick={() => {}}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="8" y="8" width="8" height="8" rx="1"></rect></svg>
                                    </button>
                                    <span style={{ fontWeight: 'bold', color: '#475569' }}>{activePickMaterial.unit_type}</span>
                                </div>
                                {pickError && <div style={{ color: '#d97706', fontSize: '13px', fontWeight: 'bold', marginTop: '8px' }}>⚠️ {pickError}</div>}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setActivePickMaterial(null)} style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    ❌ İptal
                                </button>
                                <button type="submit" disabled={!barcodeMatched} style={{ padding: '10px 20px', backgroundColor: barcodeMatched ? '#10b981' : '#cbd5e1', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: barcodeMatched ? 'pointer' : 'not-allowed' }}>
                                    ✅ Onayla
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionDetail;
