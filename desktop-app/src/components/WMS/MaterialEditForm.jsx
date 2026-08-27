/**
 * ============================================================================
 * BİLEŞEN ADI: MaterialEditForm
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depo (WMS), stok giriş-çıkış, envanter ve raf işlemlerini yöneten ekran.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (MaterialEditForm.jsx), Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const MaterialEditForm = ({ product, onClose, currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [formData, setFormData] = useState({
        materialName: '',
        brand: '',
        unit_type: 'Adet',
        package_name: '',
        package_capacity: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        if (product) {
            setFormData({
                materialName: product.ProductName || '',
                brand: product.Brand || '',
                unit_type: product.unit_type || 'Adet',
                package_name: product.package_name || '',
                package_capacity: product.package_capacity || ''
            });
        }
    }, [product]);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.materialName.trim()) {
            setError('Lütfen bir malzeme adı giriniz.');
            setLoading(false);
            return;
        }

        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/products/' + product.Id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
                body: JSON.stringify({
                    ProductName: formData.materialName.trim(),
                    Category: 'Hammadde',
                    Brand: formData.brand.trim(),
                    unit_type: formData.unit_type,
                    package_name: formData.package_name,
                    package_capacity: formData.package_capacity || 1
                })
            });
            const data = await res.json();
            
            if (data.success) {
                onClose(true);
            } else {
                setError(data.message || 'Güncelleme başarısız.');
            }
        } catch (err) {
            setError('Sunucu hatası.');
        } finally {
            setLoading(false);
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ padding: '32px', width: '100%', maxWidth: '500px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>Malzeme Düzenle</h2>
                    <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                </div>

                {error && <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', marginBottom: '20px', border: '1px solid #fecaca' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Malzeme Adı *</label>
                        <input 
                            type="text"
                            name="materialName" 
                            value={formData.materialName} 
                            onChange={handleChange} 
                            required 
                            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Marka (İsteğe Bağlı)</label>
                        <input 
                            type="text"
                            name="brand" 
                            value={formData.brand} 
                            onChange={handleChange} 
                            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Birim Türü</label>
                            <select 
                                name="unit_type" 
                                value={formData.unit_type} 
                                onChange={handleChange} 
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                            >
                                <option value="Adet">Adet</option>
                                <option value="Litre">Litre (L)</option>
                                <option value="Kg">Kg</option>
                                <option value="Gram">Gram</option>
                                <option value="Metre">Metre</option>
                                <option value="Koli">Koli</option>
                                <option value="Paket">Paket</option>
                                <option value="Çuval">Çuval</option>
                                <option value="Ton">Ton</option>
                                <option value="m²">m²</option>
                                <option value="m³">m³</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ambalaj Kapasitesi</label>
                            <input 
                                type="number" 
                                name="package_capacity" 
                                value={formData.package_capacity} 
                                onChange={handleChange} 
                                min="0.001" step="any" placeholder="Örn: 1"
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                        <button type="button" onClick={() => onClose(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>İptal</button>
                        <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#3b82f6', border: 'none', color: 'white', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MaterialEditForm;

