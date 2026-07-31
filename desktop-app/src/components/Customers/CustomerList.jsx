/*
 * ÖZET:
 * Bu dosya (CustomerList.jsx), Müşteri kayıtlarını, B2B/B2C ayrımını ve müşteri detaylarını yöneten bileşenleri içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const CustomerList = ({ currentUser, onNavigate, onEdit }) => {
    // 1. Durum (State) Tanımlamaları
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

        // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)
    useEffect(() => {
        fetchCustomers();
    }, []);

        // 3. Backend API İstekleri (Veri Çekme)
    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/customers');
            const data = await res.json();
            if (data.success) {
                setCustomers(data.data || []);
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Müşteriler getirilirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    // 4. Müşteri Silme İşlemi
    const handleDelete = async (id, name) => {
        if (!window.confirm(`"${name}" isimli müşteriyi silmek istediğinize emin misiniz?`)) return;

        try {
            const res = await apiFetch(`http://localhost:3000/api/customers/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setCustomers(prev => prev.filter(c => c.Id !== id));
            } else {
                alert(data.message || 'Silme işlemi başarısız.');
            }
        } catch (error) {
            alert('Sunucu hatası: ' + error.message);
        }
    };

        // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)
    const handleEditClick = (customer) => {
        if (onEdit) onEdit(customer);
        if (onNavigate) onNavigate('musteri-ekle');
    };

    const handleAddClick = () => {
        if (onEdit) onEdit(null);
        if (onNavigate) onNavigate('musteri-ekle');
    };

    const filteredCustomers = customers.filter(c => 
        (c.CustomerName && c.CustomerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.Phone && c.Phone.includes(searchTerm)) ||
        (c.Email && c.Email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

        // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                    <h2 style={{ color: '#0f172a', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                        Müşteri Listesi & Cari Rehberi
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Kayıtlı toplam <strong>{customers.length}</strong> müşteri kartı veritabanında listeleniyor
                    </p>
                </div>
                <button
                    onClick={handleAddClick}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <span>+</span> Yeni Müşteri Ekle
                </button>
            </div>

            {/* Arama Alanı */}
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Müşteri adı, telefon veya e-posta adresi ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
            </div>

            {/* Kenarlıksız, Şık Tablo */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '600', fontSize: '13px', width: '60px' }}>ID</th>
                            <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Müşteri / Firma Ünvanı</th>
                            <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Telefon</th>
                            <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>E-Posta</th>
                            <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Adres</th>
                            <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '600', fontSize: '13px', textAlign: 'right' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                                    Müşteri verileri SQL'den yükleniyor...
                                </td>
                            </tr>
                        ) : filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                    {searchTerm ? 'Aramanızla eşleşen müşteri bulunamadı.' : 'Henüz veritabanında kayıtlı bir müşteri bulunmuyor.'}
                                </td>
                            </tr>
                        ) : (
                            filteredCustomers.map(c => (
                                <tr key={c.Id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>#{c.Id}</td>
                                    <td style={{ padding: '16px', color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>{c.CustomerName}</td>
                                    <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{c.Phone || '—'}</td>
                                    <td style={{ padding: '16px', color: '#3b82f6', fontSize: '14px' }}>{c.Email || '—'}</td>
                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '13px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.Address || '—'}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                            <button onClick={() => handleEditClick(c)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button onClick={() => handleDelete(c.Id, c.CustomerName)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomerList;
