/**
 * ============================================================================
 * DOSYA ADI: ProductionRequests.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Üretim Modülü / Üretim Talepleri ve Onay Ekranı
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Satış veya stok departmanlarından gelen üretim taleplerini (imalat ihtiyaçlarını) inceler; yöneticilerin bu talepleri onaylayarak doğrudan üretim emrine dönüştürmesini sağlar.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Talep Onay İş Akışı (Workflow), Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/production/requests` uç noktasıyla haberleşerek departmanlar arası üretim koordinasyonunu sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ProductionRequests.jsx), Üretim talepleri, makineler, reçete (BOM) tanımları ve aktif üretim süreçlerini içerir.
 */

import React, { useState, useEffect } from 'react';

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

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/production/requests');
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
            const res = await fetch('http://localhost:3000/api/products');
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
            }
        } catch (err) {
            console.error('Products fetch error:', err);
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
            const res = await fetch('http://localhost:3000/api/production/requests');
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (err) {
            console.error('Sessiz güncelleme hatası:', err);
        }
    };

    const handleCreateManualRequest = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:3000/api/production/requests', {
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
                setFormData({ productId: '', quantity: '', reason: '' });
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
            const res = await fetch(`http://localhost:3000/api/production/requests/${id}/status`, {
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
                    onClick={() => setShowManualForm(!showManualForm)}
                    style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {showManualForm ? 'İptal' : '+ Manuel Talep Oluştur'}
                </button>
            </div>

            {showManualForm && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>Yeni Manuel Talep</h3>
                    <form onSubmit={handleCreateManualRequest} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ürün</label>
                            <select 
                                value={formData.productId} 
                                onChange={(e) => setFormData({...formData, productId: e.target.value})} 
                                required
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Seçiniz...</option>
                                {products.map(p => (
                                    <option key={p.Id} value={p.Id}>{p.ProductName}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Miktar</label>
                            <input 
                                type="number" 
                                value={formData.quantity} 
                                onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                                required 
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                        <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
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
