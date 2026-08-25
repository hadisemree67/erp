/**
 * ============================================================================
 * BİLEŞEN ADI: ProductionOrder
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Üretim emirleri, makine takibi ve imalat operasyonlarını yöneten arayüz.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ProductionOrder.jsx), Üretim talepleri, makineler, reçete (BOM) tanımları ve aktif üretim süreçlerini içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const ProductionOrder = ({ currentUser, onNavigate }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    
    const [formData, setFormData] = useState(() => {
        const prefill = localStorage.getItem('productionPrefill');
        if (prefill) {
            try {
                const parsed = JSON.parse(prefill);
                localStorage.removeItem('productionPrefill');
                return {
                    product_id: parsed.productId || '',
                    planned_quantity: parsed.targetQuantity || '',
                    machine_id: '',
                    assigned_user_id: ''
                };
            } catch (e) {
                console.error('Prefill parse error:', e);
            }
        }
        return {
            product_id: '',
            planned_quantity: '',
            machine_id: '',
            assigned_user_id: ''
        };
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [missingMaterials, setMissingMaterials] = useState([]);
    
    const [matchedMachine, setMatchedMachine] = useState(null);
    const [matchError, setMatchError] = useState('');
    const [maxProducible, setMaxProducible] = useState(null);
    const [limits, setLimits] = useState(null);

    
    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    
    useEffect(() => {
        if (formData.product_id) {
            apiFetch(`http://localhost:3000/api/production/max-quantity/${formData.product_id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.maxQuantity !== undefined) {
                        setMaxProducible(data.maxQuantity);
                        setLimits({ stock: data.stockLimit, machine: data.machineLimit, min_machine: data.minMachineLimit });
                    } else {
                        setMaxProducible(null);
                        setLimits(null);
                    }
                })
                .catch(() => {
                    setMaxProducible(null);
                    setLimits(null);
                });
        } else {
            setMaxProducible(null);
            setLimits(null);
        }
    }, [formData.product_id]);

    useEffect(() => {
        // 3. Backend API İstekleri (Veri Çekme)
        const fetchInitialData = async () => {
            try {
                const [pRes, uRes] = await Promise.all([
                    apiFetch('http://localhost:3000/api/products'),
                    apiFetch('http://localhost:3000/api/production/users')
                ]);
                
                const pData = await pRes.json();
                const uData = await uRes.json();

                if (Array.isArray(pData)) {
                    setProducts(pData.filter(p => p.Formula && p.Formula.length > 5 && p.supply_type !== 'PURCHASE'));
                }
                if (uData.success) setUsers(uData.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchInitialData();
    }, []);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleChange = (e) => {
        let val = e.target.value;
        if (e.target.name === 'planned_quantity' && maxProducible !== null) {
            const numVal = parseFloat(val);
            if (numVal > Math.floor(maxProducible)) {
                val = Math.floor(maxProducible).toString();
            }
        }
        setFormData({ ...formData, [e.target.name]: val });
        if (e.target.name === 'product_id' || e.target.name === 'planned_quantity') {
            setMatchedMachine(null);
            setMatchError('');
            setFormData(prev => ({ ...prev, machine_id: '' }));
        }
    };

    const handleMatchMachine = async () => {
        if (!formData.product_id || !formData.planned_quantity) {
            setMatchError('Lütfen önce ürün ve miktar girin.');
            return;
        }

        setLoading(true);
        setMatchError('');
        try {
            const res = await apiFetch('http://localhost:3000/api/production/orders/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: formData.product_id, planned_quantity: formData.planned_quantity })
            });
            const data = await res.json();
            if (data.success && data.recommended) {
                setMatchedMachine(data.recommended);
                setFormData(prev => ({ ...prev, machine_id: data.recommended.id }));
            } else {
                setMatchError(data.message || 'Uygun makine bulunamadı.');
            }
        } catch (err) {
            setMatchError('Makine aranırken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.machine_id) {
            alert('Lütfen makine eşleştirmesini yapın.');
            return;
        }
        
        setLoading(true);
        setError('');
        setMissingMaterials([]);

        try {
            const res = await apiFetch('http://localhost:3000/api/production/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (data.success) {
                alert('Üretim Emri Başarıyla Oluşturuldu!');
                onNavigate('uretim-listesi');
            } else {
                setError(data.message || 'Hata oluştu');
                if (data.missing) {
                    setMissingMaterials(data.missing);
                }
            }
        } catch (err) {
            setError('Sunucu hatası');
        } finally {
            setLoading(false);
        }
    };

    const [purchasedMaterials, setPurchasedMaterials] = useState({});

    const handleRequestPurchase = async (material) => {
        if (purchasedMaterials[material.name]) return;

        try {
            const res = await apiFetch('http://localhost:3000/api/purchasing/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: currentUser?.id || null,
                    product_name: material.name,
                    quantity: material.missing,
                    description: 'Üretim için otomatik eksik hammadde talebi'
                })
            });
            const data = await res.json();
            if (data.success) {
                setPurchasedMaterials(prev => ({ ...prev, [material.name]: true }));
            } else {
                alert(data.message || 'Satın alma talebi oluşturulamadı.');
            }
        } catch (err) {
            console.error(err);
            alert('Satın alma talebi gönderilirken hata oluştu.');
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '24px' }}>Yeni Üretim Emri Oluştur (Akıllı Eşleştirme)</h2>

            {error && (
                <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #fca5a5' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚠️ {error}</div>
                    {missingMaterials.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {missingMaterials.map((m, i) => (
                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #fca5a5' }}>
                                    <div>
                                        <strong>{m.name}</strong> - Gerekli: {m.original_required ? m.original_required.toFixed(2) : m.required.toFixed(2)} {m.original_unit || m.required_unit} 
                                        {m.original_unit !== m.required_unit && m.required_unit && m.original_unit ? ` (${m.required.toFixed(2)} ${m.required_unit})` : ''}, 
                                        Mevcut: {m.available.toFixed(2)} {m.available_unit} (Eksik: {m.missing.toFixed(2)} {m.required_unit})
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => handleRequestPurchase(m)}
                                        disabled={purchasedMaterials[m.name]}
                                        style={{ 
                                            backgroundColor: purchasedMaterials[m.name] ? '#d1fae5' : '#0284c7', 
                                            color: purchasedMaterials[m.name] ? '#059669' : 'white', 
                                            border: purchasedMaterials[m.name] ? '1px solid #10b981' : 'none', 
                                            padding: '6px 12px', 
                                            borderRadius: '6px', 
                                            cursor: purchasedMaterials[m.name] ? 'default' : 'pointer', 
                                            fontSize: '12px', 
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {purchasedMaterials[m.name] ? '✅ Talebe Gönderildi' : '🛒 Satın Alma Talep Et'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Üretilecek Ürün (Sadece Reçetesi Olanlar) *</label>
                    <select name="product_id" value={formData.product_id} onChange={handleChange} required style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                        <option value="">-- Ürün Seç --</option>
                        {products.map(p => (
                            <option key={p.Id} value={p.Id}>{p.ProductName}</option>
                        ))}
                    </select>
                    {maxProducible !== null && limits && (
                        <div style={{ marginTop: '6px', fontSize: '13px', color: '#0369a1', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#e0f2fe', padding: '10px 12px', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                Tek Seferde Maksimum Üretilebilir: {Math.floor(maxProducible)} adet
                            </div>
                            <div style={{ paddingLeft: '22px', fontSize: '12px', color: '#0284c7' }}>
                                • Hammadde stoğuna göre limit: {Math.floor(limits.stock)} adet<br/>
                                {limits.machine !== null && (
                                    <span>• Makine kapasitesine göre limit: {Math.floor(limits.machine)} adet</span>
                                )}
                            </div>
                        </div>
                    )}
                    {limits && limits.min_machine > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '13px', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#dcfce7', padding: '10px 12px', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                Minimum Üretim Miktarı: {Math.ceil(limits.min_machine)} adet
                            </div>
                            <div style={{ paddingLeft: '22px', fontSize: '12px', color: '#166534' }}>
                                • Makine alt limitine göre (Tüm makinelerin çalışabilmesi için)
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Hedeflenen Üretim Miktarı *</label>
                    <input type="number" step="1" min="1" max={maxProducible ? Math.floor(maxProducible) : undefined} name="planned_quantity" value={formData.planned_quantity} onChange={handleChange} required style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <button type="button" onClick={handleMatchMachine} disabled={loading || !formData.product_id || !formData.planned_quantity} style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        En Uygun Makineyi Bul
                    </button>
                    {matchError && <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>{matchError}</span>}
                </div>

                {matchedMachine && (
                    <div style={{ backgroundColor: matchedMachine.status === 'Boş' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${matchedMachine.status === 'Boş' ? '#bbf7d0' : '#fde68a'}`, padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {matchedMachine.status === 'Boş' ? '🌟 Tavsiye Edilen Makine' : '⏳ Uygun Fakat Meşgul Makine'}
                        </h3>
                        <div style={{ fontSize: '14px', color: '#334155' }}>
                            <strong>{matchedMachine.name}</strong> ({matchedMachine.machine_code || 'Kodsuz'})<br/>
                            Durum: <span style={{ fontWeight: 'bold', color: matchedMachine.status === 'Boş' ? '#16a34a' : '#d97706' }}>{matchedMachine.status}</span><br/>
                            {matchedMachine.status !== 'Boş' && matchedMachine.busy_until && (
                                <span>Meşguliyet Bitişi: {new Date(matchedMachine.busy_until).toLocaleString('tr-TR')} (Kuyruğa Alınacak)</span>
                            )}
                        </div>
                    </div>
                )}

                {matchedMachine && (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Üretimi Yapacak Personel</label>
                            <select name="assigned_user_id" value={formData.assigned_user_id} onChange={handleChange} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                <option value="">-- Personel Seç (İsteğe Bağlı) --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <button type="button" onClick={handleSubmit} disabled={loading} style={{ padding: '14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '16px' }}>
                            {loading ? 'İşleniyor...' : (matchedMachine.status === 'Boş' ? 'Hammadde İhtiyacını Hesapla ve Emri Oluştur' : 'Emri Oluştur ve Sıraya Al')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductionOrder;

