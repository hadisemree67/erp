/**
 * ============================================================================
 * BİLEŞEN ADI: BulkEditModal
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki ürünlerin, varyantların ve stok kartlarının yönetildiği modül.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (BulkEditModal.jsx), Ürün katalogu, fason/satın alma detayları, barkod işlemleri ve toplu ürün güncelleme araçlarını içerir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect } from 'react';
import WebCategorySelector from './WebCategorySelector';

const BulkEditModal = ({ selectedIds, onClose, onSuccess, currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [field, setField] = useState('SalePrice');
    
    // Çoklu güncellemeyi desteklemek için her alana bağımsız state'ler ayarla
    const [salePriceData, setSalePriceData] = useState({ actionType: 'percentage', direction: 'decrease', numValue: '' });
    const [purchasePriceData, setPurchasePriceData] = useState({ actionType: 'percentage', direction: 'decrease', numValue: '' });
    const [categoryValue, setCategoryValue] = useState('');
    const [brandValue, setBrandValue] = useState('');
    const [isActiveValue, setIsActiveValue] = useState('');

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    
    // Web category states
    const [selectedWebCategories, setSelectedWebCategories] = useState([]);
    const [selectedWebSubcategories, setSelectedWebSubcategories] = useState([]);
    const [selectedWebSubtitles, setSelectedWebSubtitles] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        // Modal açıldığında kategori ve markaları getir
        // 3. Backend API İstekleri (Veri Çekme)
        const fetchData = async () => {
            try {
                const [catRes, brandRes] = await Promise.all([
                    apiFetch(import.meta.env.VITE_API_URL + '/api/categories'),
                    apiFetch(import.meta.env.VITE_API_URL + '/api/brands')
                ]);
                if (catRes.ok) setCategories(await catRes.json());
                if (brandRes.ok) setBrands(await brandRes.json());
            } catch (err) {
                console.error("Kategori/Marka çekilirken hata:", err);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const updates = [];

        // Satış fiyatını (SalePrice) kontrol et
        if (salePriceData.numValue && !isNaN(salePriceData.numValue) && parseFloat(salePriceData.numValue) > 0) {
            const parsed = parseFloat(salePriceData.numValue);
            updates.push({ 
                field: 'SalePrice', 
                type: salePriceData.actionType, 
                value: salePriceData.direction === 'decrease' ? -parsed : parsed 
            });
        }

        // Alış fiyatını (PurchasePrice) kontrol et
        if (purchasePriceData.numValue && !isNaN(purchasePriceData.numValue) && parseFloat(purchasePriceData.numValue) > 0) {
            const parsed = parseFloat(purchasePriceData.numValue);
            updates.push({ 
                field: 'PurchasePrice', 
                type: purchasePriceData.actionType, 
                value: purchasePriceData.direction === 'decrease' ? -parsed : parsed 
            });
        }


        // Markayı kontrol et
        if (brandValue) {
            updates.push({ field: 'Brand', type: 'string', value: brandValue });
        }

        // Durumu kontrol et
        if (isActiveValue) {
            updates.push({ field: 'is_active', type: 'string', value: isActiveValue === 'Aktif' ? 1 : 0 });
        }

        // Web kategorileri kontrol et
        if (field === 'WebCategories') {
            updates.push({ field: 'web_categories', type: 'json', value: selectedWebCategories });
            updates.push({ field: 'web_subcategories', type: 'json', value: selectedWebSubcategories });
            updates.push({ field: 'web_subtitles', type: 'json', value: selectedWebSubtitles });
        }

        if (updates.length === 0) {
            setError('Lütfen uygulamak istediğiniz en az bir alanı doldurun.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch(import.meta.env.VITE_API_URL + '/api/products/bulk-edit', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id || ''
                },
                body: JSON.stringify({
                    ids: selectedIds,
                    updates: updates
                })
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
            } else {
                setError(data.message || 'İşlem başarısız oldu.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    const isNumericField = ['SalePrice', 'PurchasePrice'].includes(field);

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>Toplu Düzenleme</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
                    
                    <div style={{ marginBottom: '16px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                        Toplam <strong>{selectedIds.length}</strong> ürün düzenlenecek.
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Hangi Alan Değişecek?</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { id: 'SalePrice', label: 'Satış Fiyatı' },
                                { id: 'PurchasePrice', label: 'Alış Fiyatı' },
                                { id: 'Brand', label: 'Marka' },
                                { id: 'is_active', label: 'Durum' },
                                { id: 'WebCategories', label: 'Kategori' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setField(opt.id)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: field === opt.id ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                        backgroundColor: field === opt.id ? '#eff6ff' : 'white',
                                        color: field === opt.id ? '#1d4ed8' : '#475569',
                                        fontWeight: field === opt.id ? '600' : '400',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    {opt.label}
                                    {((opt.id === 'SalePrice' && salePriceData.numValue) || 
                                      (opt.id === 'PurchasePrice' && purchasePriceData.numValue) || 
                                      (opt.id === 'Brand' && brandValue) ||
                                      (opt.id === 'is_active' && isActiveValue) ||
                                      (opt.id === 'WebCategories' && (selectedWebCategories.length > 0 || selectedWebSubcategories.length > 0 || selectedWebSubtitles.length > 0))) && (
                                        <span style={{ marginLeft: '6px', color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isNumericField ? (
                        <>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>İşlem</label>
                                    <select 
                                        value={field === 'SalePrice' ? salePriceData.actionType : purchasePriceData.actionType} 
                                        onChange={e => field === 'SalePrice' ? setSalePriceData({...salePriceData, actionType: e.target.value}) : setPurchasePriceData({...purchasePriceData, actionType: e.target.value})} 
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    >
                                        <option value="percentage">Yüzde (%)</option>
                                        <option value="fixed">Tutar (₺)</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Yön</label>
                                    <select 
                                        value={field === 'SalePrice' ? salePriceData.direction : purchasePriceData.direction} 
                                        onChange={e => field === 'SalePrice' ? setSalePriceData({...salePriceData, direction: e.target.value}) : setPurchasePriceData({...purchasePriceData, direction: e.target.value})} 
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    >
                                        <option value="decrease">Düşür (-)</option>
                                        <option value="increase">Artır (+)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                    Değer {(field === 'SalePrice' ? salePriceData.actionType : purchasePriceData.actionType) === 'percentage' ? '(%)' : '(₺)'}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={field === 'SalePrice' ? salePriceData.numValue : purchasePriceData.numValue} 
                                    onChange={e => field === 'SalePrice' ? setSalePriceData({...salePriceData, numValue: e.target.value}) : setPurchasePriceData({...purchasePriceData, numValue: e.target.value})} 
                                    placeholder={(field === 'SalePrice' ? salePriceData.actionType : purchasePriceData.actionType) === 'percentage' ? 'Örn: 20' : 'Örn: 50'}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                />
                                </div>
                            </>
                        ) : field === 'WebCategories' ? (
                            <div style={{ marginBottom: '24px' }}>
                                <WebCategorySelector 
                                    value={{
                                        category_name: selectedWebCategories[0] || '',
                                        subcategory_name: selectedWebSubcategories[0] || '',
                                        subtitle_name: selectedWebSubtitles[0] || ''
                                    }}
                                    onChange={(selection) => {
                                        setSelectedWebCategories(selection.category_name ? [selection.category_name] : []);
                                        setSelectedWebSubcategories(selection.subcategory_name ? [selection.subcategory_name] : []);
                                        setSelectedWebSubtitles(selection.subtitle_name ? [selection.subtitle_name] : []);
                                    }}
                                />
                            </div>
                        ) : field === 'is_active' ? (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                Yeni Durum Seçin
                            </label>
                            <select 
                                value={isActiveValue} 
                                onChange={e => setIsActiveValue(e.target.value)} 
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                            >
                                <option value="">Seçiniz...</option>
                                <option value="Aktif">Aktif (Satışa Açık)</option>
                                <option value="Pasif">Pasif (Satışa Kapalı)</option>
                            </select>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                Yeni Marka Seçin
                            </label>
                            <select 
                                value={brandValue} 
                                onChange={e => setBrandValue(e.target.value)} 
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                            >
                                <option value="">Seçiniz...</option>
                                {brands.map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                            İptal
                        </button>
                        <button type="submit" disabled={loading} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Uygulanıyor...' : 'Uygula'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkEditModal;

