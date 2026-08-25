/**
 * ============================================================================
 * BİLEŞEN ADI: OutsourcedProducts
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki ürünlerin, varyantların ve stok kartlarının yönetildiği modül.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu dosya (OutsourcedProducts.jsx), Ürün katalogu, fason/satın alma detayları, barkod işlemleri ve toplu ürün güncelleme araçlarını içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const OutsourcedProducts = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [orderModal, setOrderModal] = useState({
        isOpen: false,
        product: null,
        quantity: '',
        description: 'Fason Üretim Siparişi'
    });

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await apiFetch('http://localhost:3000/api/products', {
                headers: { 'X-User-Id': currentUser?.id }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                // Sadece fason (OUTSOURCED) üretimi filtrele
                const outsourced = data.filter(p => p.supply_type === 'OUTSOURCED');
                setProducts(outsourced);
            }
        } catch (error) {
            console.error('Ürünler getirilemedi:', error);
            alert('Ürünler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleOrderSubmit = async (e) => {
        e.preventDefault();
        if (!orderModal.quantity || orderModal.quantity <= 0) {
            return alert('Geçerli bir miktar giriniz.');
        }

        try {
            const reqBody = {
                employee_id: currentUser?.id,
                product_name: orderModal.product.ProductName,
                quantity: parseFloat(orderModal.quantity),
                description: orderModal.description,
                supplier_id: orderModal.product.supplier_id || null
            };

            const res = await apiFetch('http://localhost:3000/api/purchasing/requests', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id
                },
                body: JSON.stringify(reqBody)
            });

            const data = await res.json();
            if (data.success) {
                alert('Sipariş başarıyla Satın Alma birimine iletildi!');
                setOrderModal({ isOpen: false, product: null, quantity: '', description: '' });
                fetchProducts();
            } else {
                alert(data.message || 'Sipariş oluşturulamadı.');
            }
        } catch (error) {
            console.error('Sipariş hatası:', error);
            alert('Sunucu ile iletişim kurulamadı.');
        }
    };

    const openOrderModal = (product) => {
        // Eğer stok kritik seviyenin altındaysa, aradaki farkı öner. Aksi halde 1 öner.
        const currentStock = parseFloat(product.StockQuantity) || 0;
        const criticalLimit = parseFloat(product.critical_stock_level) || 0;
        let suggestedQty = 1;
        
        if (currentStock < criticalLimit) {
            suggestedQty = criticalLimit - currentStock;
            // Eğer sipariş paketi kapasitesi varsa ona yuvarlayabiliriz ama basit tutalım.
        }

        setOrderModal({
            isOpen: true,
            product,
            quantity: suggestedQty,
            description: 'Fason Üretim Siparişi'
        });
    };

    const filteredProducts = products.filter(p => 
        p.ProductName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.Barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.Brand?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Fason Ürünler</h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>Dışarıdan (Fason) üretilen ürünlerin stok takibini yapın ve sipariş verin.</p>
                </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '10px' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                            type="text" 
                            placeholder="Ürün adı, barkod veya marka ara..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <style>{`
                            .hover-row .action-container { opacity: 0; transition: opacity 0.2s; }
                            .hover-row:hover .action-container { opacity: 1; }
                        `}</style>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>ÜRÜN & BARKOD</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: '600', fontSize: '13px' }}>TEDARİKÇİ</th>
                                    <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>DEPO & RAF</th>
                                    <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>TOPLAM STOK</th>
                                    <th style={{ padding: '16px', width: '160px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length === 0 ? (
                                    <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Fason ürün bulunamadı.</td></tr>
                                ) : filteredProducts.map(product => {
                                    const isLowStock = product.StockQuantity <= (product.critical_stock_level || 0);
                                    
                                    let displayBarcode = product.Barcode;
                                    if (displayBarcode?.startsWith('[')) {
                                        try { displayBarcode = JSON.parse(displayBarcode)[0] || ''; } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
                                    }

                                    return (
                                        <tr key={product.Id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s', backgroundColor: 'white' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', marginBottom: '2px' }}>{product.ProductName}</div>
                                                <div style={{ color: '#64748b', fontSize: '12px' }}>{displayBarcode || 'Barkod Yok'}</div>
                                            </td>
                                            <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>
                                                {(() => {
                                                    const suppliers = [...new Set((product.suppliers || []).map(s => s.SupplierName).filter(Boolean))];
                                                    if (suppliers.length === 0) return '-';
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {suppliers.map((s, idx) => (
                                                                <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                                                                    {suppliers.length > 1 ? `${idx + 1}. ` : ''}{s}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: '16px', fontSize: '13px' }}>
                                                {product.locations && product.locations.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {product.locations.map((loc, idx) => (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontWeight: '600', color: '#334155' }}>{loc.warehouse_name || 'Bilinmeyen Depo'}</span>
                                                                <span style={{ color: '#cbd5e1' }}>|</span>
                                                                <span style={{ color: '#0369a1', fontWeight: '500' }}>Raf: {loc.shelf_code}</span>
                                                                <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>({loc.quantity} {product.unit_type || 'Adet'})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Stokta Yok / Raf Atanmamış</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: 'bold', color: '#0f172a', fontSize: '15px', textAlign: 'center' }}>
                                                <div>
                                                    <span style={{ color: '#0369a1' }}>{product.StockQuantity} {product.unit_type || 'Adet'}</span>
                                                </div>
                                                <div style={{ display: 'inline-block', marginTop: '6px' }}>
                                                    {isLowStock ? (
                                                        <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }}></span> Yetersiz Stok
                                                        </span>
                                                    ) : (
                                                        <span style={{ backgroundColor: '#dcfce3', color: '#16a34a', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span> Yeterli Stok
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); openOrderModal(product); }}
                                                        style={{ 
                                                            padding: '8px 16px', 
                                                            backgroundColor: 'white', 
                                                            color: '#2563eb', 
                                                            border: '1px solid #bfdbfe', 
                                                            borderRadius: '6px', 
                                                            fontWeight: '600', 
                                                            fontSize: '13px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                        }}
                                                    >
                                                        Sipariş Ver <span style={{fontSize: '16px'}}>➔</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sipariş Modal */}
            {orderModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Fason Sipariş Talebi</h2>
                            <button onClick={() => setOrderModal({ ...orderModal, isOpen: false })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleOrderSubmit} style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Ürün</label>
                                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '500' }}>
                                    {orderModal.product?.ProductName}
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Sipariş Miktarı ({orderModal.product?.unit_type || 'Adet'})</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    step="1"
                                    required
                                    value={orderModal.quantity}
                                    onChange={(e) => setOrderModal({ ...orderModal, quantity: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Mevcut: {orderModal.product?.StockQuantity}, Kritik: {orderModal.product?.critical_stock_level}</div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Açıklama (Satın Alma Birimi İçin)</label>
                                <textarea 
                                    rows="2"
                                    value={orderModal.description}
                                    onChange={(e) => setOrderModal({ ...orderModal, description: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setOrderModal({ ...orderModal, isOpen: false })} style={{ flex: 1, padding: '10px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>İptal</button>
                                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Satın Almaya İlet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OutsourcedProducts;


