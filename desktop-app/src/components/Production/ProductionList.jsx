/**
 * ============================================================================
 * DOSYA ADI: ProductionList.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Üretim Modülü / Üretim Emirleri Listesi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Planlanan, devam eden ve tamamlanan tüm üretim siparişlerini listeler. Sipariş durumu, ürün adı veya tarih aralığına göre filtreleme sunar ve yeni üretim emri oluşturma akışını başlatır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Tablo ve Filtre Yönetimi, Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Üretim modülünün ana panosudur; `/api/production/orders` API uç noktası üzerinden imalat emirlerini çeker.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ProductionList.jsx), Üretim talepleri, makineler, reçete (BOM) tanımları ve aktif üretim süreçlerini içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const ProductionList = ({ currentUser, onNavigate }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/production/orders');
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchOrders();
        fetchWarehouseUsers();
    }, []);

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

    const handleArchive = async (id) => {
        if (!window.confirm('Bu siparişi kapatıp arşivlemek istediğinize emin misiniz?')) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${id}/archive`, { method: 'POST' });
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

    const handleDelete = async (id) => {
        if (!window.confirm('Bu siparişi iptal edip tamamen silmek istediğinize emin misiniz?')) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/production/orders/${id}`, { method: 'DELETE' });
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

    const renderStatusBadge = (status) => {
        let color = '#64748b', bg = '#f1f5f9';
        if (status === 'Toplanıyor') { color = '#d97706'; bg = '#fef3c7'; }
        if (status === 'Üretimde') { color = '#2563eb'; bg = '#dbeafe'; }
        if (status === 'Tamamlandı') { color = '#16a34a'; bg = '#dcfce3'; }
        if (status === 'Onay Bekliyor') { color = '#dc2626'; bg = '#fee2e2'; }
        
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: bg, color: color }}>{status}</span>;
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 1, backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>Üretim Listesi</h2>
                {loading ? <p>Yükleniyor...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Emir No</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Ürün</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Planlanan</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Makine</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Durum</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id} className="hover-row" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'transparent' }}>
                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>#{o.id}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{o.product_name}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#0f172a' }}>{o.planned_quantity}</td>
                                    <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>{o.machine_name}</td>
                                    <td style={{ padding: '12px' }}>{renderStatusBadge(o.status)}</td>
                                    <td style={{ padding: '12px' }}>
                                        <div className="action-container" style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => onNavigate('uretim-detayi', o.id)} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Siparişi Aç</button>
                                        {(o.status === 'Tamamlandı' || o.status === 'Kabul Edildi' || o.status === 'Depo Teslim Bekliyor') && (
                                            <button 
                                                onClick={() => handleArchive(o.id)} 
                                                style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                                                title="Kapat ve Arşivle"
                                            >
                                                ✕
                                            </button>
                                        )}
                                        {o.status === 'Bekliyor' && (
                                            <button 
                                                onClick={() => handleDelete(o.id)} 
                                                style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                                                title="İptal Et ve Sil"
                                            >
                                                ✕
                                            </button>
                                        )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ProductionList;
