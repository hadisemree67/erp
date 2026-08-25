/**
 * ============================================================================
 * BİLEŞEN ADI: CourierDelivery
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Müşteri siparişleri, paketleme, kargo ve iade işlemlerini kapsayan ekran.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu dosya (CourierDelivery.jsx), Müşteri siparişleri, kargo takibi ve siparişlerin paketlenmesi aşamalarını içerir.
 */

import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';

const CourierDelivery = () => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [barcode, setBarcode] = useState('');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // 1. Barkod İle Kargo Arama İşlemi
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!barcode.trim()) return;
        
        setLoading(true);
        setOrder(null);
        setStatusMessage('');
        setIsSuccess(false);
        
        try {
            const res = await apiFetch(`http://localhost:3000/api/orders/by-cargo/${barcode.trim()}`);
            const data = await res.json();
            
            if (data.success) {
                if (data.data.OrderStatus !== 'Hazırlandı') {
                    setStatusMessage(`Uyarı: Bu siparişin durumu "${data.data.OrderStatus}". Sadece "Hazırlandı" olanlar kargoya verilebilir.`);
                    // Yine de gösterebiliriz ama butonu devre dışı bırakırız veya doğrudan engelleriz. Şimdilik gösterelim.
                }
                setOrder(data.data);
            } else {
                setStatusMessage(data.message || 'Sipariş bulunamadı.');
            }
        } catch (error) {
            console.error('Arama hatası:', error);
            setStatusMessage('Sunucu hatası.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Siparişi "Kargoya Verildi" Olarak İşaretleme İşlemi
    const handleShip = async () => {
        if (!order) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/orders/${order.Id}/ship`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setIsSuccess(true);
                setStatusMessage('Sipariş Kargoya Verildi!');
                setTimeout(() => {
                    setOrder(null);
                    setBarcode('');
                    setStatusMessage('');
                    setIsSuccess(false);
                }, 3000);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error('Kargo hatası:', err);
        }
    };

        // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: `'Inter', sans-serif` }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: '10px' }}>
                    Kurye / Kargo Teslimatı
                </h1>
                <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px' }}>
                    Hazırlanan paketlerin kargoya veya kuryeye teslim işlemlerini buradan yapabilirsiniz.
                </p>

                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px' }}>
                        <input 
                            type="text" 
                            value={barcode} 
                            onChange={(e) => setBarcode(e.target.value)} 
                            placeholder="Kargo Barkodunu Okutun..." 
                            style={{ flex: 1, padding: '16px', fontSize: '18px', borderRadius: '8px', border: '2px solid #cbd5e1' }}
                            autoFocus
                        />
                        <button type="submit" disabled={loading} style={{ padding: '0 30px', fontSize: '16px', fontWeight: '700', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            {loading ? 'Aranıyor...' : 'Sorgula'}
                        </button>
                    </form>
                </div>

                {statusMessage && (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px', fontWeight: '700', borderRadius: '8px', marginBottom: '24px', backgroundColor: isSuccess ? '#dcfce3' : '#fee2e2', color: isSuccess ? '#16a34a' : '#ef4444' }}>
                        {statusMessage}
                    </div>
                )}

                {order && (
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '2px solid #e2e8f0' }}>
                        
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Sipariş Numarası</div>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>{order.OrderNumber}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '30px' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Alıcı Adı Soyadı</div>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{order.CustomerName}</div>
                                
                                <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Telefon</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{order.CustomerPhone || '-'}</div>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Teslimat Adresi</div>
                                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', lineHeight: '1.5' }}>
                                    {order.ShippingAddress || 'Adres bilgisi girilmemiş.'}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Kutu</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700' }}>
                                        {order.packaging_info ? (() => {
                                            try {
                                                return JSON.parse(order.packaging_info).map(b => b.name).join(' + ');
                                            } catch { return '-'; }
                                        })() : '-'}
                                    </div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>Ağırlık</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700' }}>{order.TotalWeight ? `${order.TotalWeight} kg` : '-'}</div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleShip}
                            disabled={order.OrderStatus !== 'Hazırlandı'}
                            style={{ 
                                width: '100%', padding: '20px', fontSize: '20px', fontWeight: '800', 
                                backgroundColor: order.OrderStatus === 'Hazırlandı' ? '#2563eb' : '#cbd5e1', 
                                color: 'white', border: 'none', borderRadius: '12px', cursor: order.OrderStatus === 'Hazırlandı' ? 'pointer' : 'not-allowed',
                                boxShadow: order.OrderStatus === 'Hazırlandı' ? '0 4px 15px rgba(37, 99, 235, 0.3)' : 'none'
                            }}
                        >
                            Kargoya Verildi Olarak İşaretle
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourierDelivery;


