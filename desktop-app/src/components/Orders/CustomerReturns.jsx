/**
 * ============================================================================
 * BİLEŞEN ADI: CustomerReturns
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Müşteri siparişleri, paketleme, kargo ve iade işlemlerini kapsayan ekran.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const CustomerReturns = ({ currentUser }) => {
    const hasPerm = (key) => currentUser?.role === 'admin' || (currentUser?.permissions || []).includes(key);
    
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Beklemede');

    useEffect(() => {
        fetchReturns();
    }, []);

    const fetchReturns = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/orders/returns');
            const data = await res.json();
            if (data.success) {
                setReturns(data.returns || []);
            }
        } catch (error) {
            console.error('İade talepleri yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        if (!window.confirm(`Talebi '${newStatus}' olarak güncellemek istediğinize emin misiniz?`)) return;

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/orders/returns/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                fetchReturns();
            } else {
                alert(data.message || 'Güncellenemedi.');
            }
        } catch (error) {
            console.error('Durum güncelleme hatası:', error);
            alert('Sunucu bağlantı hatası.');
        }
    };

    const filteredReturns = returns.filter(r => {
        const matchesStatus = statusFilter === 'Tümü' || r.status === statusFilter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            r.orders?.OrderNumber?.toLowerCase().includes(searchLower) ||
            r.customers?.CustomerName?.toLowerCase().includes(searchLower) ||
            r.reason?.toLowerCase().includes(searchLower);
        return matchesStatus && matchesSearch;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Onaylandı': return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
            case 'Reddedildi': return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
            case 'İptal': return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
            default: return { bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
        }
    };

    // İstatistikler
    const pendingCount = returns.filter(r => r.status === 'Beklemede').length;
    const approvedCount = returns.filter(r => r.status === 'Onaylandı').length;
    const rejectedCount = returns.filter(r => r.status === 'Reddedildi').length;

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
            {/* Üst Bilgi Paneli */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#1e293b', fontWeight: '600' }}>İade ve Talepler</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Müşterilerden gelen iptal, iade ve değişim taleplerini yönetin.</p>
                </div>
                <button 
                    onClick={fetchReturns}
                    style={{ 
                        background: '#ffffff', 
                        color: '#475569', 
                        border: '1px solid #cbd5e1', 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                >
                    <span style={{ fontSize: '14px' }}>⟳</span> Yenile
                </button>
            </div>

            {/* İstatistik Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Bekleyen Talepler</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>{pendingCount}</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Onaylananlar</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>{approvedCount}</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Reddedilenler</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>{rejectedCount}</div>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Toplam Talep</div>
                    <div style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>{returns.length}</div>
                </div>
            </div>

            {/* Ana Liste Alanı */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {/* Filtre Barı */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', background: '#f8fafc', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Sipariş no, müşteri veya neden ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: 'white' }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', backgroundColor: 'white', cursor: 'pointer', minWidth: '160px' }}
                    >
                        <option value="Tümü">Tüm Durumlar</option>
                        <option value="Beklemede">Bekleyenler</option>
                        <option value="Onaylandı">Onaylananlar</option>
                        <option value="Reddedildi">Reddedilenler</option>
                    </select>
                </div>

                {/* Tablo */}
                <div style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Yükleniyor...</div>
                    ) : filteredReturns.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '16px' }}>Kayıt Bulunamadı</h3>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Arama kriterlerine uygun iade talebi yok.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>MÜŞTERİ / SİPARİŞ</th>
                                    <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>TALEP DETAYI</th>
                                    <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>İADE EDİLEN ÜRÜNLER</th>
                                    <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>DURUM</th>
                                    <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', textAlign: 'right' }}>İŞLEMLER</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReturns.map((r, idx) => {
                                    let items = [];
                                    try { items = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : (r.items_json || []); } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
                                    const style = getStatusStyle(r.status);
                                    
                                    return (
                                        <tr key={r.id} style={{ borderBottom: idx === filteredReturns.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                                                        {r.customers?.CustomerName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px', marginBottom: '2px' }}>{r.customers?.CustomerName}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Sipariş: <span style={{ color: '#475569' }}>#{r.orders?.OrderNumber}</span></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                                <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: r.request_type === 'iade' ? '#f3e8ff' : r.request_type === 'iptal' ? '#fee2e2' : '#e0f2fe', color: r.request_type === 'iade' ? '#7e22ce' : r.request_type === 'iptal' ? '#991b1b' : '#0369a1', fontSize: '11px', fontWeight: '500', marginBottom: '6px' }}>
                                                    {r.request_type === 'iade' ? 'İade Talebi' : r.request_type === 'iptal' ? 'İptal Talebi' : 'Değişim Talebi'}
                                                </div>
                                                <div style={{ fontWeight: '500', color: '#334155', fontSize: '13px', marginBottom: '2px' }}>Neden: {r.reason}</div>
                                                {r.description && (
                                                    <div style={{ marginTop: '4px', marginBottom: '6px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', borderLeft: '2px solid #cbd5e1', fontSize: '12px', color: '#64748b' }}>
                                                        {r.description}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {items.map((it, i) => {
                                                        const qty = it.quantity || it.Quantity;
                                                        const name = it.product_name || it.ProductName;
                                                        const price = it.price || it.UnitPrice;
                                                        
                                                        let parsedImagePath = '';
                                                        if (it.image_path) {
                                                            try {
                                                                const parsed = JSON.parse(it.image_path);
                                                                parsedImagePath = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
                                                            } catch (e) {
                                                                parsedImagePath = it.image_path;
                                                            }
                                                        }
                                                        const imgSrc = parsedImagePath ? (parsedImagePath.startsWith('http') ? parsedImagePath : `${import.meta.env.VITE_API_URL}${parsedImagePath}`) : '';

                                                        return (
                                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                                                                {imgSrc ? (
                                                                    <img 
                                                                        src={imgSrc} 
                                                                        alt={name} 
                                                                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} 
                                                                    />
                                                                ) : (
                                                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                                                                )}
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{name}</div>
                                                                    <div style={{ display: 'flex', gap: '12px', marginTop: '2px', fontSize: '12px' }}>
                                                                        <span><span style={{ fontWeight: '600', color: '#334155' }}>Adet:</span> {qty}</span>
                                                                        {price && (
                                                                            <span><span style={{ fontWeight: '600', color: '#334155' }}>Fiyat:</span> {Number(price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}`, fontSize: '12px', fontWeight: '500' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: style.color }}></div>
                                                    {r.status}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px', verticalAlign: 'top', textAlign: 'right' }}>
                                                {(hasPerm('edit_orders') || currentUser?.role === 'admin') && r.status === 'Beklemede' ? (
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(r.id, 'Onaylandı')}
                                                            style={{ padding: '6px 12px', borderRadius: '6px', background: '#ffffff', color: '#059669', border: '1px solid #a7f3d0', fontSize: '12px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                                            onMouseOver={(e) => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.borderColor = '#34d399'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#a7f3d0'; }}
                                                        >
                                                            ✓ Onayla
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(r.id, 'Reddedildi')}
                                                            style={{ padding: '6px 12px', borderRadius: '6px', background: '#ffffff', color: '#dc2626', border: '1px solid #fecaca', fontSize: '12px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                                            onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#fecaca'; }}
                                                        >
                                                            ✕ Reddet
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>İşlem Tamam</span>
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
        </div>
    );
};

export default CustomerReturns;


