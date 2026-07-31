/*
 * ÖZET:
 * Bu dosya (CampaignForm.jsx), Kampanya listeleme, ekleme ve düzenleme işlemlerini yöneten bileşenleri içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const CampaignForm = ({ currentUser, campaign, onNavigate }) => {
    const isEdit = Boolean(campaign && campaign.id);

        // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [formData, setFormData] = useState({
        title: campaign?.title || '',
        campaign_type: campaign?.campaign_type || 'buy_x_pay_y',
        discount_rate: campaign?.discount_rate || '',
        min_amount: campaign?.min_amount || '',
        buy_quantity: campaign?.buy_quantity || '',
        pay_quantity: campaign?.pay_quantity || '',
        gift_quantity: campaign?.gift_quantity || '',
        gift_product_name: campaign?.gift_product_name || '',
        target_product_ids: (() => {
            if (Array.isArray(campaign?.target_product_ids)) return campaign.target_product_ids;
            if (typeof campaign?.target_product_ids === 'string') {
                try { return JSON.parse(campaign.target_product_ids); } catch(e) { return []; }
            }
            if (campaign?.target_product_id) return [campaign.target_product_id];
            return [];
        })(),
        target_barcode: campaign?.target_barcode || '',
        start_date: campaign?.start_date ? String(campaign.start_date).split('T')[0] : '',
        end_date: campaign?.end_date ? String(campaign.end_date).split('T')[0] : '',
        status: campaign?.status || 'Aktif',
        description: campaign?.description || '',
        cover_image: null,
        existing_cover_image: campaign?.cover_image_path || null
    });

    const [products, setProducts] = useState([]);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState(
        (campaign?.target_product_ids && campaign.target_product_ids.length > 0) || campaign?.target_product_id 
            ? { type: 'success', message: `Kayıtlı Ürün(ler) Bağlı` } : null
    );
    const [imagePreview, setImagePreview] = useState(campaign?.cover_image_path ? `http://localhost:3000${campaign.cover_image_path}` : null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. Backend'den Veri Çekme (Fetch) İşlemi
    // Tüm kayıtlı ürünleri getir
    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)
    useEffect(() => {
        // 3. Backend API İstekleri (Veri Çekme)
        const fetchProducts = async () => {
            try {
                const res = await apiFetch('http://localhost:3000/api/products');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProducts(data.filter(p => p.Category !== 'Hammadde'));
                }
            } catch (err) {
                console.error('Ürünler getirilemedi:', err);
            }
        };
        fetchProducts();
    }, []);

        // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)
    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            const file = files[0];
            if (file) {
                setFormData(prev => ({ ...prev, cover_image: file }));
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file);
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setFormData(prev => ({
            ...prev,
            campaign_type: newType,
            buy_quantity: newType === 'buy_x_pay_y' ? 2 : (newType === 'gift_product' ? 3 : ''),
            pay_quantity: newType === 'buy_x_pay_y' ? 1 : '',
            min_amount: newType === 'min_amount_discount' ? 12000 : (newType === 'free_shipping' ? 1500 : ''),
            discount_rate: newType === 'min_amount_discount' ? 10 : (newType === 'percentage_discount' ? 20 : ''),
            gift_quantity: newType === 'gift_product' ? 1 : '',
            gift_product_name: newType === 'gift_product' ? (prev.gift_product_name || 'Özel Hediye Paketi') : ''
        }));
    };

    // Kayıtlı ürün seçildiğinde (Açılır menüden)
    const handleProductSelect = (e) => {
        const pId = e.target.value;
        if (!pId) return;
        const selectedProd = products.find(p => String(p.Id) === String(pId));
        if (selectedProd) {
            setFormData(prev => {
                const currentIds = prev.target_product_ids || [];
                if (currentIds.includes(selectedProd.Id)) return prev;
                return {
                    ...prev,
                    target_product_ids: [...currentIds, selectedProd.Id],
                    gift_product_name: prev.campaign_type === 'gift_product' ? selectedProd.ProductName : prev.gift_product_name
                };
            });
            setBarcodeStatus({ type: 'success', message: `Eklendi: ${selectedProd.ProductName} ${selectedProd.Brand ? `[${selectedProd.Brand}]` : ''}` });
        }
    };

    const handleRemoveProduct = (idToRemove) => {
        setFormData(prev => ({
            ...prev,
            target_product_ids: (prev.target_product_ids || []).filter(id => id !== idToRemove)
        }));
    };

    // Barkod tarama veya yazma işlemi
    const handleBarcodeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBarcodeSearch();
        }
    };

    const handleBarcodeSearch = () => {
        if (!scannedBarcode.trim()) return;
        const searchStr = scannedBarcode.trim();
        const found = products.find(p => 
            (p.Barcode && String(p.Barcode).trim() === searchStr) || 
            (p.ProductCode && String(p.ProductCode).trim() === searchStr) ||
            String(p.Id) === searchStr
        );

        if (found) {
            setFormData(prev => {
                const currentIds = prev.target_product_ids || [];
                if (currentIds.includes(found.Id)) return prev;
                return {
                    ...prev,
                    target_product_ids: [...currentIds, found.Id],
                    gift_product_name: prev.campaign_type === 'gift_product' ? found.ProductName : prev.gift_product_name
                };
            });
            setBarcodeStatus({ type: 'success', message: `Barkod Okundu! Eklendi: ${found.ProductName}` });
            setScannedBarcode('');
        } else {
            setBarcodeStatus({ type: 'error', message: `"${searchStr}" barkoduna veya koduna sahip kayıtlı bir ürün bulunamadı!` });
        }
    };

    // 4. Veri Kaydetme / Form Gönderim İşlemi
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.title.trim()) {
            setError('Lütfen bir kampanya başlığı giriniz.');
            setLoading(false);
            return;
        }

        const data = new FormData();
        data.append('title', formData.title);
        data.append('campaign_type', formData.campaign_type);
        if (formData.discount_rate) data.append('discount_rate', formData.discount_rate);
        if (formData.min_amount) data.append('min_amount', formData.min_amount);
        if (formData.buy_quantity) data.append('buy_quantity', formData.buy_quantity);
        if (formData.pay_quantity) data.append('pay_quantity', formData.pay_quantity);
        if (formData.gift_quantity) data.append('gift_quantity', formData.gift_quantity);
        if (formData.gift_product_name) data.append('gift_product_name', formData.gift_product_name);
        if (formData.target_product_ids && formData.target_product_ids.length > 0) {
            data.append('target_product_ids', JSON.stringify(formData.target_product_ids));
        }
        if (formData.target_barcode) data.append('target_barcode', formData.target_barcode);
        if (formData.start_date) data.append('start_date', formData.start_date);
        if (formData.end_date) data.append('end_date', formData.end_date);
        data.append('status', formData.status);
        if (formData.description) data.append('description', formData.description);

        if (formData.cover_image) {
            data.append('cover_image', formData.cover_image);
        } else if (formData.existing_cover_image) {
            data.append('existing_cover_image', formData.existing_cover_image);
        }

        try {
            const url = isEdit ? `http://localhost:3000/api/campaigns/${campaign.id}` : 'http://localhost:3000/api/campaigns';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
                method: method,
                body: data
            });

            const result = await res.json();
            if (result.success) {
                alert(isEdit ? 'Kampanya başarıyla güncellendi!' : 'Yeni kampanya başarıyla oluşturuldu!');
                onNavigate('kampanya-listesi');
            } else {
                setError(result.message || 'Kayıt işlemi başarısız.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası oluştu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // 5. Stil Tanımlamaları (UI Sabitleri)
    // Stil Sabitleri (Minimalist & Kurumsal Palet)
    const cardStyle = {
        backgroundColor: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'border-color 0.2s'
    };

    const sectionTitleStyle = {
        fontSize: '15px',
        fontWeight: '700',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '12px',
        margin: '0'
    };

    const labelStyle = {
        fontSize: '13px',
        fontWeight: '600',
        color: '#334155',
        marginBottom: '6px'
    };

    const inputStyle = {
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        color: '#0f172a',
        backgroundColor: '#ffffff',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box'
    };

        // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '860px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'Inter, sans-serif' }}>
            {/* Üst Başlık Barı */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                    <h1 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '800', margin: '0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '22px', backgroundColor: '#10b981', borderRadius: '4px' }}></span>
                        {isEdit ? 'Kampanya Düzenle' : 'Yeni Kampanya Oluştur'}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 0 18px' }}>
                        İndirim kurgunuzu, geçerli ürün bağlantısını ve kampanya koşullarını aşağıdaki sade modüllerden tanımlayın.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onNavigate('kampanya-listesi')}
                    style={{ padding: '9px 16px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                >
                    &larr; Kampanya Listesine Dön
                </button>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '14px 18px', borderRadius: '8px', color: '#dc2626', marginBottom: '20px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚠️</span> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* BÖLÜM 1: KAMPANYA TÜRÜ VE ADI */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>
                        <span style={{ color: '#10b981' }}>1.</span> Kampanya Türü ve Başlığı
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Kampanya Kurgusu (Tür) <span style={{ color: '#ef4444' }}>*</span></label>
                            <select 
                                name="campaign_type" 
                                value={formData.campaign_type} 
                                onChange={handleTypeChange}
                                style={{ ...inputStyle, fontWeight: '600', backgroundColor: '#f8fafc', borderColor: '#94a3b8', cursor: 'pointer' }}
                            >
                                <option value="buy_x_pay_y">X Al Y Öde (Örn: 2 Al 1 Öde, 3 Al 2 Öde)</option>
                                <option value="min_amount_discount">Sepet Tutarı İndirimi (Örn: 12.000 TL Üzerine %10 İndirim)</option>
                                <option value="gift_product">Hediye Ürün Kampanyası (Örn: X Adet Alana Y Ürün Hediye)</option>
                                <option value="percentage_discount">Net Yüzde İndirimi (Örn: Seçili Ürünlerde Net %25 İndirim)</option>
                                <option value="free_shipping">Ücretsiz Kargo Kampanyası (Örn: 1.500 TL Üzeri Bedava Kargo)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Kampanya Adı / Başlığı <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="text" 
                                name="title" 
                                value={formData.title} 
                                onChange={handleChange} 
                                placeholder="Örn: Büyük Yaz Sezonu: 2 Al 1 Öde Fırsatı!" 
                                required 
                                style={{ ...inputStyle, fontWeight: '600' }} 
                            />
                        </div>
                    </div>
                </div>

                {/* BÖLÜM 2: KAYITLI ÜRÜN BAĞLAMA VE BARKOD OKUYUCU */}
                <div style={{ ...cardStyle, backgroundColor: '#fcfdfe', borderColor: '#cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <h3 style={{ ...sectionTitleStyle, borderBottom: 'none', paddingBottom: '0' }}>
                            <span style={{ color: '#10b981' }}>2.</span> Kayıtlı Ürün Bağlama ve Barkod Okuyucu
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: '600', backgroundColor: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                            Barkod Tabancası Uyumlu
                        </span>
                    </div>
                    
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0', lineHeight: '1.5' }}>
                        Kampanyayı spesifik bir envanter ürününe veya hediye verilecek ürüne bağlamak için barkod okutun ya da listeden seçin.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '4px' }}>
                        {/* Barkod Okuma Kutusu */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Barkodla Ürün Tarama</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                    type="text"
                                    value={scannedBarcode}
                                    onChange={(e) => setScannedBarcode(e.target.value)}
                                    onKeyDown={handleBarcodeKeyDown}
                                    placeholder="Barkod okutun veya yazıp Enter'a basın..."
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button 
                                    type="button" 
                                    onClick={handleBarcodeSearch}
                                    style={{ padding: '10px 18px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#334155'}
                                >
                                    Bul
                                </button>
                            </div>
                        </div>

                        {/* Manuel Ürün Seçimi Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Kayıtlı Ürün Listesi ({products.length} Ürün)</label>
                            <select 
                                value="" 
                                onChange={handleProductSelect}
                                style={{ ...inputStyle, cursor: 'pointer' }}
                            >
                                <option value="">-- Listeden Ürün Seçip Ekleyin --</option>
                                {products.map(p => (
                                    <option key={p.Id} value={p.Id}>
                                        {p.ProductName} {p.Brand ? `[${p.Brand}]` : ''} - Barkod: {p.Barcode || 'Yok'} ({p.SalePrice} TL)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Seçili Ürünlerin Listesi */}
                    {formData.target_product_ids && formData.target_product_ids.length > 0 && (
                        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <label style={{ ...labelStyle, color: '#0f172a' }}>Seçilen Kampanya Ürünleri ({formData.target_product_ids.length} Adet)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                {formData.target_product_ids.map(id => {
                                    const p = products.find(prod => String(prod.Id) === String(id));
                                    if (!p) return null;
                                    return (
                                        <div key={id} style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 12px', backgroundColor: '#ffffff',
                                            border: '1px solid #cbd5e1', borderRadius: '20px',
                                            fontSize: '12px', color: '#334155', fontWeight: '600',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            <span>{p.ProductName}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveProduct(id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '14px', fontWeight: 'bold' }}
                                                title="Listeden Çıkar"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Durum Bildirimi */}
                    {barcodeStatus && (
                        <div style={{ 
                            padding: '10px 14px', 
                            borderRadius: '8px', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            backgroundColor: barcodeStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                            color: barcodeStatus.type === 'success' ? '#065f46' : '#991b1b',
                            border: `1px solid ${barcodeStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>{barcodeStatus.message}</span>
                        </div>
                    )}
                </div>

                {/* BÖLÜM 3: İNDİRİM VE PROMOSYON KOŞULLARI */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>
                        <span style={{ color: '#10b981' }}>3.</span> İndirim ve Promosyon Koşulları
                    </h3>

                    {/* X Al Y Öde */}
                    {formData.campaign_type === 'buy_x_pay_y' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={labelStyle}>Alınması Gereken Adet (X)</label>
                                <input type="number" name="buy_quantity" min="1" value={formData.buy_quantity} onChange={handleChange} placeholder="Örn: 2" style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={labelStyle}>Ödenmesi Gereken Adet (Y)</label>
                                <input type="number" name="pay_quantity" min="1" value={formData.pay_quantity} onChange={handleChange} placeholder="Örn: 1" style={inputStyle} />
                            </div>
                        </div>
                    )}

                    {/* Sepet Tutarı İndirimi */}
                    {formData.campaign_type === 'min_amount_discount' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={labelStyle}>Minimum Sepet Tutarı (TL)</label>
                                <input type="number" step="0.01" name="min_amount" value={formData.min_amount} onChange={handleChange} placeholder="Örn: 12000" style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={labelStyle}>İndirim Oranı (%)</label>
                                <input type="number" step="0.01" max="100" name="discount_rate" value={formData.discount_rate} onChange={handleChange} placeholder="Örn: 10" style={inputStyle} />
                            </div>
                        </div>
                    )}

                    {/* Hediye Ürün Kampanyası */}
                    {formData.campaign_type === 'gift_product' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={labelStyle}>Gereken Alım Adedi</label>
                                <input type="number" name="buy_quantity" min="1" value={formData.buy_quantity} onChange={handleChange} placeholder="Örn: 5" style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={labelStyle}>Hediye Verilecek Adet</label>
                                <input type="number" name="gift_quantity" min="1" value={formData.gift_quantity} onChange={handleChange} placeholder="Örn: 1" style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={labelStyle}>Hediye Ürün Adı / Paketi</label>
                                <input 
                                    type="text" 
                                    name="gift_product_name" 
                                    value={formData.gift_product_name} 
                                    onChange={handleChange} 
                                    placeholder="Ürün adı (Barkod okutulunca otomatik dolar)" 
                                    style={{ 
                                        ...inputStyle, 
                                        backgroundColor: (formData.target_product_ids && formData.target_product_ids.length > 0) ? '#f0fdf4' : '#ffffff', 
                                        borderColor: (formData.target_product_ids && formData.target_product_ids.length > 0) ? '#10b981' : '#cbd5e1' 
                                    }} 
                                />
                            </div>
                        </div>
                    )}

                    {/* Net Yüzde İndirimi */}
                    {formData.campaign_type === 'percentage_discount' && (
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '320px' }}>
                            <label style={labelStyle}>Net İndirim Oranı (%)</label>
                            <input type="number" step="0.01" max="100" name="discount_rate" value={formData.discount_rate} onChange={handleChange} placeholder="Örn: 25" style={inputStyle} />
                        </div>
                    )}

                    {/* Ücretsiz Kargo */}
                    {formData.campaign_type === 'free_shipping' && (
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '320px' }}>
                            <label style={labelStyle}>Kargo Bedava İçin Min. Tutar (TL)</label>
                            <input type="number" step="0.01" name="min_amount" value={formData.min_amount} onChange={handleChange} placeholder="Örn: 1500 (Boşsa tüm siparişlere uygulanır)" style={inputStyle} />
                        </div>
                    )}
                </div>

                {/* BÖLÜM 4: KAPAK RESMİ (BANNER) */}
                <div style={{ ...cardStyle, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                        <h3 style={{ ...sectionTitleStyle, borderBottom: 'none', paddingBottom: '0' }}>
                            <span style={{ color: '#10b981' }}>4.</span> Kampanya Kapak Görseli (Yatay Banner)
                        </h3>
                        <button 
                            type="button" 
                            onClick={() => {
                                const url = prompt('Görsel URL Adresini Girin (Örn: https://.../banner.jpg):');
                                if (url && url.trim()) {
                                    setImagePreview(url.trim());
                                    setFormData(prev => ({ ...prev, existing_cover_image: url.trim(), cover_image: null }));
                                }
                            }}
                            style={{ fontSize: '12px', padding: '6px 14px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#dbeafe'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                        >
                            + URL Ekle
                        </button>
                    </div>
                    
                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', margin: '4px 0 8px 0' }}>
                        Bilgisayardan Dosya Seç veya URL ile Tanımla (Önerilen Boyut: 1080x720 piksel - 16:9 Yatay Afiş)
                    </label>

                    <div 
                        style={{ position: 'relative', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '28px 20px', textAlign: 'center', backgroundColor: '#ffffff', transition: 'all 0.2s', cursor: 'pointer' }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                    >
                        <input type="file" name="cover_image" accept="image/*" onChange={handleChange} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 5 }} />
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e3a8a' }}>Dosyaları buraya sürükleyin veya tıklayarak seçin</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                            {formData.cover_image ? (
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ {formData.cover_image.name} seçildi</span>
                            ) : (
                                'PNG, JPG, JPEG (Max. 10MB)'
                            )}
                        </div>
                    </div>

                    {imagePreview && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ position: 'relative', width: '140px', height: '78px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                                <img src={imagePreview} alt="Önizleme" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button 
                                    type="button" 
                                    onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, cover_image: null, existing_cover_image: null })); }} 
                                    style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '0 0 0 6px', fontSize: '12px', cursor: 'pointer', padding: '2px 6px', fontWeight: 'bold', zIndex: 10 }}
                                    title="Görseli Kaldır"
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={{ fontSize: '13px', color: '#334155' }}>
                                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>🖼️ Seçili Kapak Görseli</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Bu görsel kampanya listesinde ve vitrinde yatay afiş olarak sergilenmektedir.</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* BÖLÜM 5: TARİH VE DURUM */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>
                        <span style={{ color: '#10b981' }}>5.</span> Tarih Aralığı ve Yayın Durumu
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Başlangıç Tarihi</label>
                            <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Bitiş Tarihi</label>
                            <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={labelStyle}>Yayın Durumu</label>
                            <select name="status" value={formData.status} onChange={handleChange} style={{ ...inputStyle, fontWeight: '600' }}>
                                <option value="Aktif">Aktif (Yayında)</option>
                                <option value="Pasif">Pasif (Yayından Kaldırıldı)</option>
                                <option value="Taslak">Taslak</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* BÖLÜM 6: AÇIKLAMA */}
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>
                        <span style={{ color: '#10b981' }}>6.</span> Detaylı Kampanya Açıklaması
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={labelStyle}>Koşullar ve Ek Bilgiler</label>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows="3" 
                            placeholder="Örn: Bu kampanya diğer indirimlerle birleştirilemez. Sepet aşamasında indirim otomatik yansır."
                            style={{ ...inputStyle, resize: 'vertical' }}
                        ></textarea>
                    </div>
                </div>

                {/* ALT BUTON BARI */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button
                        type="button"
                        onClick={() => onNavigate('kampanya-listesi')}
                        style={{ padding: '11px 20px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '11px 28px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseOver={e => !loading && (e.currentTarget.style.backgroundColor = '#059669')}
                        onMouseOut={e => !loading && (e.currentTarget.style.backgroundColor = '#10b981')}
                    >
                        {loading ? 'Kaydediliyor...' : (isEdit ? 'Değişiklikleri Güncelle' : 'Kampanyayı Kaydet')}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CampaignForm;
