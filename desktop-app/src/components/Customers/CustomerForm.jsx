/*
 * ÖZET:
 * Bu dosya (CustomerForm.jsx), Müşteri kayıtlarını, B2B/B2C ayrımını ve müşteri detaylarını yöneten bileşenleri içerir.
 */

import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';

const TURKISH_CITIES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
].sort((a, b) => a.localeCompare(b, 'tr'));

const CustomerForm = ({ customer, onClose, onNavigate }) => {
    const isEditing = !!customer;

    // 1. Durum (State) Tanımlamaları
    const [formData, setFormData] = useState({
        CustomerName: customer?.CustomerName || '',
        Phone: customer?.Phone || '',
        Email: customer?.Email || '',
        Address: customer?.Address || '',
        City: customer?.City || '',
        Gender: customer?.Gender || '',
        BirthDate: customer?.BirthDate || customer?.Age || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

        // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // 3. Veri Kaydetme / Backend API İsteği
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const url = isEditing
            ? `http://localhost:3000/api/customers/${customer.Id}`
            : `http://localhost:3000/api/customers`;

        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                if (onClose) onClose();
                if (onNavigate) onNavigate('musteri-listesi');
            } else {
                setError(data.message || 'Kayıt sırasında bir hata oluştu.');
            }
        } catch (err) {
            setError('Sunucu ile bağlantı kurulamadı: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

        // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                    <h2 style={{ color: '#0f172a', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                        {isEditing ? 'Müşteri Bilgilerini Düzenle' : 'Yeni Müşteri / Cari Tanımla'}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        SQL Veritabanı ile senkronize müşteri iletişim ve cari kart bilgileri
                    </p>
                </div>
                <button 
                    type="button" 
                    onClick={() => { if (onClose) onClose(); if (onNavigate) onNavigate('musteri-listesi'); }} 
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}
                >
                    ✕ İptal
                </button>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            Müşteri Adı / Firma Ünvanı *
                        </label>
                        <input
                            type="text"
                            name="CustomerName"
                            value={formData.CustomerName}
                            onChange={handleChange}
                            placeholder="Örn: ABC Lojistik ve Ticaret A.Ş. veya Ahmet Yılmaz"
                            required
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            Telefon Numarası
                        </label>
                        <input
                            type="text"
                            name="Phone"
                            value={formData.Phone}
                            onChange={handleChange}
                            placeholder="Örn: 0532 123 45 67"
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            E-Posta Adresi
                        </label>
                        <input
                            type="email"
                            name="Email"
                            value={formData.Email}
                            onChange={handleChange}
                            placeholder="Örn: bilgi@abcticaret.com"
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            Şehir
                        </label>
                        <select
                            name="City"
                            value={formData.City}
                            onChange={handleChange}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                        >
                            <option value="">Seçiniz (Örn: İstanbul)</option>
                            {TURKISH_CITIES.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            Cinsiyet
                        </label>
                        <select
                            name="Gender"
                            value={formData.Gender}
                            onChange={handleChange}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
                        >
                            <option value="">Seçiniz</option>
                            <option value="Erkek">Erkek</option>
                            <option value="Kadın">Kadın</option>
                            <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            Doğum Tarihi
                        </label>
                        <input
                            type="date"
                            name="BirthDate"
                            value={formData.BirthDate}
                            onChange={handleChange}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            Açık Adres / Fatura Adresi
                        </label>
                        <textarea
                            name="Address"
                            value={formData.Address}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Müşterinin sevkiyat veya resmi fatura adresi..."
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                        ></textarea>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    <button 
                        type="button" 
                        onClick={() => { if (onClose) onClose(); if (onNavigate) onNavigate('musteri-listesi'); }} 
                        style={{ padding: '10px 22px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                    >
                        İptal
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#10b981', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
                    >
                        {loading ? 'Kaydediliyor...' : isEditing ? 'Değişiklikleri Güncelle' : 'Müşteriyi Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomerForm;
