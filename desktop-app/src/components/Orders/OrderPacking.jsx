/**
 * ============================================================================
 * BİLEŞEN ADI: OrderPacking
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Müşteri siparişleri, paketleme, kargo ve iade işlemlerini kapsayan ekran.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu dosya (OrderPacking.jsx), Müşteri siparişleri, kargo takibi ve siparişlerin paketlenmesi aşamalarını içerir.
 */

import React, { useState, useRef } from 'react';
import { apiFetch } from '../../utils/api';

const OrderPacking = () => {
    // 1. Durum (State) Tanımlamaları
    const [barcode, setBarcode] = useState('');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Paketleme Süreci Durumları
    const [scannedProducts, setScannedProducts] = useState({});
    const [productBarcode, setProductBarcode] = useState('');
    const [statusColor, setStatusColor] = useState('white'); // 'white', 'green', 'red'
    const [statusMessage, setStatusMessage] = useState('');
    
    const productInputRef = useRef(null);

    // 2. Kargo Barkodu ile Sipariş Arama İşlemi
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!barcode.trim()) return;
        
        setLoading(true);
        setOrder(null);
        setScannedProducts({});
        setStatusColor('white');
        setStatusMessage('');
        
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/orders/by-cargo/${barcode.trim()}`);
            const data = await res.json();
            
            if (data.success) {
                if (data.data.OrderStatus !== 'Onaylandı' && data.data.OrderStatus !== 'Hazırlanıyor') {
                    setStatusColor('red');
                    setStatusMessage(`Bu siparişin durumu: ${data.data.OrderStatus}. Paketleme yapılamaz.`);
                    return;
                }
                
                setOrder(data.data);
                
                // Ürün okutma sayılarını sıfırla
                const initialScans = {};
                if (data.data.items) {
                    data.data.items.forEach(item => {
                        initialScans[item.ProductCode] = 0;
                    });
                }
                setScannedProducts(initialScans);
                
                // Barkod okuyucu girişine odaklan (Focus)
                setTimeout(() => {
                    if (productInputRef.current) productInputRef.current.focus();
                }, 100);
            } else {
                setStatusColor('red');
                setStatusMessage(data.message || 'Sipariş bulunamadı.');
            }
        } catch (error) {
            console.error('Arama hatası:', error);
            setStatusColor('red');
            setStatusMessage('Sunucu hatası.');
        } finally {
            setLoading(false);
        }
    };

        // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)
    const handleProductScan = (e) => {
        e.preventDefault();
        const code = productBarcode.trim();
        if (!code || !order) return;

        // Bulunan kalemi kontrol et
        const item = order.items.find(i => i.ProductCode === code);
        
        if (!item) {
            setStatusColor('#fee2e2'); // kırmızı (hata)
            setStatusMessage(`HATA: "${code}" barkodlu ürün bu siparişte yok!`);
            setProductBarcode('');
            return;
        }
        
        const currentScanned = scannedProducts[code] || 0;
        if (currentScanned >= item.Quantity) {
            setStatusColor('#fee2e2');
            setStatusMessage(`HATA: Bu üründen zaten yeterli sayıda (${item.Quantity}) okutuldu! Fazla ürün.`);
            setProductBarcode('');
            return;
        }
        
        // Başarılı okuma
        setScannedProducts(prev => ({ ...prev, [code]: currentScanned + 1 }));
        setStatusColor('#dcfce3'); // yeşil (başarılı)
        setStatusMessage(`Doğru Ürün! (${item.ProductName}) Kutuya At!`);
        setProductBarcode('');
    };

    // 4. Siparişi Tamamlama İşlemi
    const handleComplete = async () => {
        // Kontrol et: eksik var mı?
        const isComplete = order.items.every(item => (scannedProducts[item.ProductCode] || 0) === item.Quantity);
        
        if (!isComplete) {
            if (!window.confirm('Bazı ürünler eksik görünüyor! Yine de siparişi "Hazırlandı" olarak işaretlemek istiyor musunuz?')) {
                return;
            }
        }

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/orders/${order.Id}/pack`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setStatusColor('#dcfce3');
                setStatusMessage('Tebrikler! Sipariş başarıyla Hazırlandı statüsüne alındı.');
                setTimeout(() => {
                    setOrder(null);
                    setBarcode('');
                    setStatusColor('white');
                    setStatusMessage('');
                }, 3000);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error('Tamamlama hatası:', err);
        }
    };

    const isAllComplete = order && order.items && order.items.every(item => (scannedProducts[item.ProductCode] || 0) === item.Quantity);

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div style={{ padding: '24px', backgroundColor: statusColor !== 'white' ? statusColor : '#f8fafc', minHeight: '100vh', fontFamily: `'Inter', sans-serif`, transition: 'background-color 0.3s ease' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: '30px' }}>
                    Sipariş Paketleme (Hata Önleyici)
                </h1>

                {/* Kargo Barkodu Arama */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '15px' }}>
                        <input 
                            type="text" 
                            value={barcode} 
                            onChange={(e) => setBarcode(e.target.value)} 
                            placeholder="Kargo Barkodunu Okutun (Örn: CRG-102-1234)" 
                            style={{ flex: 1, padding: '16px', fontSize: '18px', borderRadius: '8px', border: '2px solid #cbd5e1' }}
                            autoFocus
                        />
                        <button type="submit" disabled={loading} style={{ padding: '0 30px', fontSize: '16px', fontWeight: '700', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                            {loading ? 'Bulunuyor...' : 'Getir'}
                        </button>
                    </form>
                </div>

                {/* Uyarı Mesajı */}
                {statusMessage && (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '20px', fontWeight: '800', borderRadius: '8px', marginBottom: '24px', backgroundColor: statusColor === '#fee2e2' ? '#ef4444' : statusColor === '#dcfce3' ? '#22c55e' : '#e2e8f0', color: statusColor === 'white' ? '#000' : '#fff' }}>
                        {statusMessage}
                    </div>
                )}

                {/* Sipariş Detayları ve Okutma Ekranı */}
                {order && (
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                        
                        {/* Sol: Ürün Listesi */}
                        <div style={{ flex: 2, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Ürün Listesi</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {order.items.map((item, idx) => {
                                    const scanned = scannedProducts[item.ProductCode] || 0;
                                    const complete = scanned === item.Quantity;
                                    return (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', backgroundColor: complete ? '#dcfce3' : '#f8fafc', border: `1px solid ${complete ? '#86efac' : '#e2e8f0'}` }}>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '15px' }}>{item.ProductName}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Barkod: {item.ProductCode}</div>
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: '800', color: complete ? '#16a34a' : '#0f172a' }}>
                                                {scanned} / {item.Quantity}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Sağ: Barkod Okuyucu ve Özet */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <h2 style={{ fontSize: '16px', marginTop: 0, marginBottom: '15px' }}>Ürün Okut</h2>
                                <form onSubmit={handleProductScan}>
                                    <input 
                                        type="text" 
                                        ref={productInputRef}
                                        value={productBarcode} 
                                        onChange={(e) => setProductBarcode(e.target.value)} 
                                        placeholder="Ürün barkodu..." 
                                        style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '2px solid #3b82f6', marginBottom: '10px' }}
                                    />
                                    <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>
                                        Okut
                                    </button>
                                </form>
                            </div>

                            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Sipariş No</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>{order.OrderNumber}</div>
                                
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Müşteri</div>
                                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>{order.CustomerName}</div>
                                
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Önerilen Paketleme</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
                                    {order.packaging_info ? (() => {
                                        try {
                                            const boxes = JSON.parse(order.packaging_info);
                                            return boxes.map(b => b.name).join(' + ');
                                        } catch {
                                            return 'Bilgi yok';
                                        }
                                    })() : 'Bilgi yok'}
                                </div>
                            </div>

                            <button 
                                onClick={handleComplete}
                                style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: '800', backgroundColor: isAllComplete ? '#16a34a' : '#f59e0b', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            >
                                {isAllComplete ? 'Paketlemeyi Tamamla' : 'Eksik Tamamla'}
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderPacking;


