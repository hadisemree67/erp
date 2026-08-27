/**
 * ============================================================================
 * BİLEŞEN ADI: ProductionRequests
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Üretim emirleri, makine takibi ve imalat operasyonlarını yöneten arayüz.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ProductionRequests.jsx), Üretim talepleri, makineler, reçete (BOM) tanımları ve aktif üretim süreçlerini içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const ProductionRequests = ({ currentUser, onNavigate }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showManualForm, setShowManualForm] = useState(false);
    
    // Manuel Talep Formu State'i
    const [formData, setFormData] = useState({
        productId: '',
        quantity: '',
        reason: '',
        priority: 'Normal'
    });

    // Kapasite Analizi State'i
    const [capacityData, setCapacityData] = useState(null);
    const [capacityLoading, setCapacityLoading] = useState(false);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/production/requests');
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (err) {
            console.error(err);
            setError('Talepler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/products');
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
            }
        } catch (err) {
            console.error('Products fetch error:', err);
        }
    };

    const fetchCapacityAnalysis = async (productId) => {
        if (!productId) {
            setCapacityData(null);
            return;
        }
        setCapacityLoading(true);
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/production/capacity-analysis/${productId}`);
            const data = await res.json();
            if (data.success) {
                setCapacityData(data.data);
            } else {
                setCapacityData(null);
            }
        } catch (err) {
            console.error('Capacity analysis error:', err);
            setCapacityData(null);
        } finally {
            setCapacityLoading(false);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchRequests();
        fetchProducts();

        // 30 saniyede bir otomatik olarak tabloyu sessizce günceller
        const intervalId = setInterval(() => {
            fetchRequestsSilently();
        }, 30000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchRequestsSilently = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/production/requests');
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (err) {
            console.error('Sessiz güncelleme hatası:', err);
        }
    };

    const handleProductChange = (e) => {
        const productId = e.target.value;
        setFormData({ ...formData, productId });
        fetchCapacityAnalysis(productId);
    };

    const handleCreatePurchaseRequest = async (material, missingQty) => {
        const orderQty = Math.ceil(missingQty * 1.10); // 10% fazlası
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/purchasing/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: material.name,
                    quantity: orderQty,
                    description: `Sistem otomatik üretim malzeme eksiği talebi. Gerekli eksik miktar: ${missingQty} ${material.unit}`
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Satınalma talebi oluşturuldu: ${orderQty} ${material.unit} ${material.name}`);
            } else {
                alert(data.message || 'Satınalma talebi oluşturulamadı.');
            }
        } catch (err) {
            console.error(err);
            alert('Sunucu hatası');
        }
    };

    const handleCreateManualRequest = async (e) => {
        e.preventDefault();
        const qty = parseInt(formData.quantity);
        if (capacityData && capacityData.hasFormula) {
            if (capacityData.capacity.minFromMachine && qty < capacityData.capacity.minFromMachine) {
                return alert(`Hata: Girdiğiniz miktar (${qty}) makine minimum kapasitesinden (${capacityData.capacity.minFromMachine}) düşük olamaz!`);
            }
            if (capacityData.capacity.maxFromMachine && qty > capacityData.capacity.maxFromMachine) {
                return alert(`Hata: Girdiğiniz miktar (${qty}) makine maksimum kapasitesinden (${capacityData.capacity.maxFromMachine}) fazla olamaz!`);
            }
            if (capacityData.capacity.maxFromMaterials !== null && qty > capacityData.capacity.maxFromMaterials) {
                return alert(`Hata: Girdiğiniz miktar için yeterli hammadde yok! (Mevcut stokla maks: ${capacityData.capacity.maxFromMaterials} adet üretilebilir.) Lütfen önce eksik hammaddeler için talep açın.`);
            }
        }
        
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/production/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: formData.productId,
                    quantity: formData.quantity,
                    reason: formData.reason,
                    creator: currentUser?.username || 'Kullanıcı',
                    priority: formData.priority
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowManualForm(false);
                setFormData({ productId: '', quantity: '', reason: '', priority: 'Normal' });
                setCapacityData(null);
                fetchRequests();
            } else {
                alert(data.message || 'Talep oluşturulamadı.');
            }
        } catch (err) {
            console.error(err);
            alert('Sunucu hatası');
        }
    };

    const handleUpdateStatus = async (id, status, product_id, requested_quantity) => {
        if (status === 'Reddedildi') {
            if (!window.confirm('Bu talebi reddetmek istediğinize emin misiniz?')) return;
        }

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/production/requests/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                if (status === 'Onaylandı / Üretime Aktarıldı') {
                    // Send user to "Yeni Üretim" page with prefilled data
                    // We can pass data by storing it in localStorage or state. 
                    // Let's use localStorage for simplicity
                    localStorage.setItem('productionPrefill', JSON.stringify({
                        productId: product_id,
                        targetQuantity: requested_quantity
                    }));
                    onNavigate('uretim-yap');
                } else {
                    fetchRequests();
                }
            }
        } catch (err) {
            console.error(err);
            alert('Durum güncellenemedi.');
        }
    };

    // Kapasite Analiz Kartı Render
    const renderCapacityCard = () => {
        if (capacityLoading) {
            return (
                <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd', marginTop: '16px', textAlign: 'center', color: '#0369a1' }}>
                    ⏳ Kapasite ve hammadde analizi yapılıyor...
                </div>
            );
        }

        if (!capacityData) return null;

        if (!capacityData.hasFormula) {
            return (
                <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: '600', fontSize: '14px' }}>
                        ⚠️ {capacityData.message}
                    </div>
                </div>
            );
        }

        const { capacity, machines, materials } = capacityData;

        return (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Özet Kart */}
                <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 Üretim Kapasite Analizi
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Makine Min. Üretim</div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                                {capacity.minFromMachine !== null ? `${capacity.minFromMachine} Adet` : 'Belirsiz'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Makineler minimum bu kadar üretmeli</div>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Makine Maks. Üretim</div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                                {capacity.maxFromMachine !== null ? `${capacity.maxFromMachine} Adet` : 'Belirsiz'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Tek seferde en fazla bu kadar</div>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hammadde Maks. Yeterlilik</div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: capacity.maxFromMaterials === 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>
                                {capacity.maxFromMaterials !== null ? `${capacity.maxFromMaterials} Adet` : 'Hesaplanamadı'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Mevcut stokla üretilebilir</div>
                        </div>
                        <div style={{ backgroundColor: '#f0f9ff', padding: '14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                            <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💡 Önerilen Aralık</div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0369a1', marginTop: '4px' }}>
                                {capacity.recommendedMin} - {capacity.recommendedMax > 99000 ? '∞' : capacity.recommendedMax}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Optimum talep miktarı</div>
                        </div>
                    </div>
                </div>

                {/* Makine Detayları */}
                {machines.length > 0 && (
                    <div style={{ padding: '16px', backgroundColor: '#faf5ff', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#7c3aed', marginBottom: '10px' }}>🏭 Kullanılacak Makineler</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {machines.map(m => (
                                <div key={m.id} style={{
                                    padding: '8px 14px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #e9d5ff',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ 
                                        width: '8px', height: '8px', borderRadius: '50%', 
                                        backgroundColor: m.status === 'Boş' ? '#22c55e' : m.status === 'Dolu' ? '#ef4444' : '#f59e0b' 
                                    }} />
                                    <span style={{ fontWeight: '600', color: '#334155' }}>{m.name}</span>
                                    <span style={{ color: '#94a3b8' }}>({m.minCapacity} - {m.maxCapacity} kg/L)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Hammadde Detayları */}
                {materials.length > 0 && (
                    <div style={{ padding: '16px', backgroundColor: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#c2410c', marginBottom: '10px' }}>🧪 Hammadde Durumu</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {materials.map((m, idx) => {
                                const qty = parseInt(formData.quantity) || 0;
                                const requiredAmount = qty * m.quantityPerProduct;
                                const missingAmount = Math.max(0, requiredAmount - m.currentStock);
                                const isShort = missingAmount > 0;

                                return (
                                <div key={idx} style={{
                                    padding: '8px 14px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #fed7aa',
                                    fontSize: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ 
                                            width: '6px', height: '6px', borderRadius: '50%', 
                                            backgroundColor: isShort ? '#ef4444' : '#22c55e' 
                                        }} />
                                        <span style={{ fontWeight: '500', color: '#334155' }}>{m.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: '#64748b' }}>1 Ürün: {m.quantityPerProduct} {m.unit}</span>
                                        <span style={{ color: m.currentStock > 0 ? '#059669' : '#dc2626', fontWeight: '600' }}>
                                            Stok: {m.currentStock} {m.unit}
                                        </span>
                                        {isShort ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Eksik: {missingAmount} {m.unit}</span>
                                                <button type="button" onClick={() => handleCreatePurchaseRequest(m, missingAmount)} style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                                                    Talep Aç
                                                </button>
                                            </div>
                                        ) : (
                                            m.maxProducts !== null && (
                                                <span style={{ 
                                                    padding: '2px 8px', 
                                                    borderRadius: '10px', 
                                                    fontSize: '11px', 
                                                    fontWeight: '600',
                                                    backgroundColor: '#dcfce7',
                                                    color: '#166534'
                                                }}>
                                                    Yeterli
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Uyarı (Hammadde yetersizse) */}
                {capacity.maxFromMaterials !== null && capacity.maxFromMaterials === 0 && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🚨 Dikkat: Hammadde stoku yetersiz! Üretim öncesi hammadde tedarik edilmelidir.
                    </div>
                )}
            </div>
        );
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                        Üretim Talepleri
                    </h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>Sistem ve çalışanlar tarafından oluşturulan üretim ihtiyaçları.</p>
                </div>
                <button 
                    onClick={() => { setShowManualForm(!showManualForm); if (showManualForm) { setCapacityData(null); } }}
                    style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {showManualForm ? 'İptal' : '+ Manuel Talep Oluştur'}
                </button>
            </div>

            {showManualForm && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>Yeni Manuel Talep</h3>
                    <form onSubmit={handleCreateManualRequest} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ürün</label>
                            <select 
                                value={formData.productId} 
                                onChange={handleProductChange} 
                                required
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Seçiniz...</option>
                                {products.map(p => (
                                    <option key={p.Id} value={p.Id}>{p.ProductName}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                Miktar
                                {capacityData?.hasFormula && capacityData?.capacity && (
                                    <span style={{ fontWeight: '400', color: '#3b82f6', marginLeft: '6px' }}>
                                        (Önerilen: {capacityData.capacity.recommendedMin} - {capacityData.capacity.recommendedMax > 99000 ? '∞' : capacityData.capacity.recommendedMax})
                                    </span>
                                )}
                            </label>
                            <input 
                                type="number" 
                                value={formData.quantity} 
                                onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                                required 
                                min="1"
                                placeholder={capacityData?.hasFormula ? `Min: ${capacityData.capacity.recommendedMin}` : ''}
                                style={{ 
                                    padding: '10px', 
                                    borderRadius: '6px', 
                                    border: `1px solid ${
                                        formData.quantity && capacityData?.hasFormula 
                                            ? (parseInt(formData.quantity) < capacityData.capacity.recommendedMin ? '#fbbf24' 
                                                : parseInt(formData.quantity) > capacityData.capacity.recommendedMax && capacityData.capacity.recommendedMax < 99000 ? '#ef4444' 
                                                : '#22c55e') 
                                            : '#cbd5e1'
                                    }` 
                                }}
                            />
                            {formData.quantity && capacityData?.hasFormula && parseInt(formData.quantity) < capacityData.capacity.recommendedMin && (
                                <span style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>⚠️ Minimum {capacityData.capacity.recommendedMin} önerilir (makine kapasitesi)</span>
                            )}
                            {formData.quantity && capacityData?.hasFormula && capacityData.capacity.recommendedMax < 99000 && parseInt(formData.quantity) > capacityData.capacity.recommendedMax && (
                                <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>🚨 Maks {capacityData.capacity.recommendedMax} adet üretilebilir (hammadde/makine limiti)</span>
                            )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Aciliyet</label>
                            <select 
                                value={formData.priority} 
                                onChange={(e) => setFormData({...formData, priority: e.target.value})} 
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="Normal">Normal</option>
                                <option value="Acil">Acil</option>
                            </select>
                        </div>
                        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açıklama / Neden</label>
                            <input 
                                type="text" 
                                value={formData.reason} 
                                onChange={(e) => setFormData({...formData, reason: e.target.value})} 
                                required 
                                placeholder="Örn: Acil sipariş..."
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '11px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Kaydet</button>
                    </form>

                    {/* Kapasite Analiz Kartı */}
                    {renderCapacityCard()}
                </div>
            )}

            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
                ) : requests.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Hiç talep bulunmuyor.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Aciliyet</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Kaynak</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Ürün Adı</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>İstenen Miktar</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Oluşturan</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Neden / Açıklama</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests
                                .sort((a, b) => {
                                    if (a.status === 'Bekleyen' && b.status !== 'Bekleyen') return -1;
                                    if (a.status !== 'Bekleyen' && b.status === 'Bekleyen') return 1;
                                    if (a.status === 'Bekleyen' && b.status === 'Bekleyen') {
                                        if (a.priority === 'Acil' && b.priority !== 'Acil') return -1;
                                        if (a.priority !== 'Acil' && b.priority === 'Acil') return 1;
                                    }
                                    return new Date(b.created_at) - new Date(a.created_at);
                                })
                                .map(req => {
                                    const formatName = (name) => {
                                        if (!name || name === 'Sistem (MRP)') return 'Sistem (MRP)';
                                        if (name.toLowerCase() === 'hadisemreylmz') return 'Hadis Emre Yılmaz';
                                        return name.charAt(0).toUpperCase() + name.slice(1);
                                    };
                                    
                                    const isAuto = req.source === 'Otomatik';
                                    const creatorFormatted = isAuto ? 'Sistem (MRP)' : formatName(req.creator);
                                    const initials = isAuto ? '⚙️' : (creatorFormatted === 'Hadis Emre Yılmaz' ? 'HY' : (req.creator ? req.creator.charAt(0).toUpperCase() : '👤'));
                                    const reasonFormatted = req.reason === 'Stok Sorumlusu (Manuel)' ? 'Stok Sorumlusu Talebi' : req.reason;
                                    
                                    return (
                                        <tr key={req.id} className="hover-row req-row-hover" style={{ 
                                            borderBottom: '1px solid #f1f5f9', 
                                            backgroundColor: req.status !== 'Bekleyen' ? '#f8fafc' : 'white',
                                            transition: 'background-color 0.2s',
                                            opacity: req.status !== 'Bekleyen' ? 0.6 : 1
                                        }}>
                                            <td style={{ padding: '16px' }}>
                                                {req.priority === 'Acil' ? (
                                                    <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: '600' }}>
                                                        🔴 Acil
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#3b82f6', fontSize: '12px', fontWeight: '600' }}>
                                                        🔵 Normal
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {isAuto ? '⚙️ Otomatik' : '👤 Manuel'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{req.ProductName}</td>
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a' }}>
                                                <span style={{ fontWeight: '700', color: '#0f172a' }}>{req.requested_quantity}</span> <span style={{ fontSize: '12px', color: '#94a3b8' }}>Adet</span>
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isAuto ? '#e0e7ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: isAuto ? '#4f46e5' : '#64748b' }}>
                                                        {initials}
                                                    </div>
                                                    <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{creatorFormatted}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>{reasonFormatted}</td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                {req.status === 'Bekleyen' ? (
                                                    <div className="action-container" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(req.id, 'Onaylandı / Üretime Aktarıldı', req.product_id, req.requested_quantity)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d1fae5'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ecfdf5'; }}
                                                            title="Onayla ve Üretime Aktar"
                                                        >
                                                            <span>✅</span> <span>Onayla</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(req.id, 'Reddedildi', req.product_id, req.requested_quantity)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', backgroundColor: 'white', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                                                            title="İptal Et"
                                                        >
                                                            <span>❌</span> <span>Red</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ 
                                                        fontSize: '13px', 
                                                        fontWeight: '600', 
                                                        color: req.status === 'Reddedildi' ? '#ef4444' : '#10b981' 
                                                    }}>
                                                        {req.status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ProductionRequests;

