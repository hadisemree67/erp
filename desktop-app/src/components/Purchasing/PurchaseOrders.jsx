/**
 * ============================================================================
 * DOSYA ADI: PurchaseOrders.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Satınalma Modülü / Satınalma Siparişleri Listesi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Tedarikçi firmalara verilen mal ve hizmet siparişlerinin (Purchase Orders) listelendiği, sipariş durumlarının (beklemede, onaylandı, yolda, teslim alındı) takip edildiği ve yeni sipariş oluşturulduğu yönetim ekrandır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Sipariş Durum Takip Mantığı, Tablo Listeleme, Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/purchasing/orders` uç noktası üzerinden tedarikçi sipariş süreçlerini veritabanı ile senkronize eder.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (PurchaseOrders.jsx), Satın alma talepleri, onay süreçleri ve satın alma siparişlerinin takibini içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import EInvoiceModal from '../Finance/EInvoiceModal';

const PurchaseOrders = () => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [orders, setOrders] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/purchasing/orders');
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (err) {
            console.error(err);
            setError('Tedarik siparişleri yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdersSilently = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/purchasing/orders');
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchOrders();
        
        // 10 saniyede bir tabloyu sessizce günceller (tedarikçi mailden tıklayınca ekran anında güncellensin diye)
        const intervalId = setInterval(() => {
            fetchOrdersSilently();
        }, 10000);
        
        return () => clearInterval(intervalId);
    }, []);

    const handleUpdateStatus = async (id, status) => {
        try {
            const res = await apiFetch(`http://localhost:3000/api/purchasing/orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                fetchOrders();
            } else {
                alert(data.message || 'Durum güncellenemedi.');
            }
        } catch (err) {
            console.error(err);
            alert('Durum güncellenemedi.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Bekliyor': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
            case 'Onaylandı': return { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' };
            case 'Hazırlanıyor': return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' };
            case 'Hazırlandı': return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
            case 'Kargoya Verildi': return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
            case 'Depo Kabul Bekliyor': return { bg: '#fdf4ff', color: '#c026d3', border: '#f5d0fe' };
            case 'Depoya Alındı': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
            case 'Teslim Edildi': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
            case 'İptal': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
            default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                        Tedarik Siparişleri
                    </h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>Onaylanıp tedarikçiye iletilen siparişlerin takibi.</p>
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
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Henüz tedarik siparişi bulunmuyor.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tarih</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Malzeme</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tedarikçi</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Miktar</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Durum</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const colors = getStatusColor(order.status);
                                return (
                                    <tr key={order.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                        <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
                                            {new Date(order.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{order.product_name}</td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>{order.supplier_name || '-'}</td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a' }}>
                                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{order.quantity}</span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{ 
                                                backgroundColor: colors.bg, 
                                                color: colors.color, 
                                                border: `1px solid ${colors.border}`,
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <div className="action-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => setSelectedInvoice(order)}
                                                    title="GİB e-Fatura / Malzeme Kabul İrsaliyesi Çıktısı Al"
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #bfdbfe',
                                                        backgroundColor: '#eff6ff',
                                                        color: '#2563eb',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    📄 İrsaliye
                                                </button>
                                                {order.status !== 'İptal' && order.status !== 'Depoya Alındı' && order.status !== 'Depo Kabul Bekliyor' && order.status !== 'Teslim Edildi' && (
                                                    <select 
                                                        value={order.status}
                                                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', cursor: 'pointer', outline: 'none' }}
                                                    >
                                                        <option value="Bekliyor">Bekliyor</option>
                                                        <option value="Onaylandı">Onaylandı</option>
                                                        <option value="Hazırlanıyor">Hazırlanıyor</option>
                                                        <option value="Hazırlandı">Hazırlandı</option>
                                                        <option value="Kargoya Verildi">Kargoya Verildi</option>
                                                        <option value="Depo Kabul Bekliyor">Depo Onayına Gönder</option>
                                                        <option value="Teslim Edildi">Teslim Edildi (Manuel Kapat)</option>
                                                        <option value="İptal">İptal</option>
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <EInvoiceModal 
                isOpen={!!selectedInvoice} 
                onClose={() => setSelectedInvoice(null)} 
                invoiceData={selectedInvoice} 
            />
        </div>
    );
};

export default PurchaseOrders;
