/**
 * ============================================================================
 * BİLEŞEN ADI: StaffList
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Kullanıcı yetkilendirme ve sisteme giriş yapan personelleri yönetme ekranı.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (StaffList.jsx), Sistem kullanıcılarının yetkilendirmesi, şifre sıfırlama ve personel giriş bilgilerini yönetir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect } from 'react';

const StaffList = ({ onEdit, onAdd, currentUser }) => {
    // 1. Durum (State) Tanımlamaları
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

        // 3. Backend API İstekleri (Veri Çekme)
    const fetchStaff = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/users');
            const data = await res.json();
            setStaff(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Personeller getirilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

        // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)
    useEffect(() => {
        fetchStaff();
    }, []);

    // 4. Rol İsimlendirme Sabitleri
    const roleNameMap = {
        admin: 'Sistem Yöneticisi',
        hr: 'İnsan Kaynakları',
        erp: 'ERP Uzmanı',
        legal: 'Hukuk Yetkilisi',
        finance: 'Finans Yetkilisi',
        idari: 'İdari İşler',
        manager: 'Alt Yönetici'
    };

    // 5. Personel Hesabını Silme İşlemi
    const handleDelete = async (id) => {
        if (!window.confirm('Bu personeli silmek istediğinize emin misiniz?')) return;
        
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/users/${id}`, { 
                method: 'DELETE',
                headers: {
                    'X-User-Id': currentUser?.id
                }
            });
            const data = await res.json();
            if (data.success) {
                fetchStaff();
            } else {
                alert(data.message || 'Silinemedi');
            }
        } catch (err) {
            alert('Sunucu hatası');
        }
    };

    const handleToggleStatus = async (user) => {
        const newStatus = !user.is_active;
        const confirmMsg = newStatus 
            ? `${user.name} adlı kullanıcıyı aktif etmek istediğinize emin misiniz?`
            : `${user.name} adlı kullanıcıyı pasif (yasaklı) duruma getirmek istediğinize emin misiniz?`;
            
        if (!window.confirm(confirmMsg)) return;

        // Optimistic UI update
        setStaff(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id
                },
                body: JSON.stringify({ is_active: newStatus })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Durum güncellenemedi');
                // Revert
                setStaff(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !newStatus } : u));
            }
        } catch (err) {
            alert('Sunucu hatası');
            setStaff(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !newStatus } : u));
        }
    };

        // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Personel Yönetimi</h1>
                    <p style={{ color: '#64748b', marginTop: '8px', margin: 0 }}>Sistemdeki çalışanları ve yetkilerini buradan yönetin.</p>
                </div>
                <button 
                    onClick={onAdd}
                    style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                >
                    + Yeni Personel Ekle
                </button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Ad Soyad</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Kullanıcı Adı</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>E-Posta</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Rol</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Durum</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '13px', fontWeight: '600' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Yükleniyor...</td></tr>
                        ) : staff.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Henüz kayıtlı personel yok.</td></tr>
                        ) : (
                            staff.map(user => (
                                <tr key={user.id} className="hover-row" style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '16px', color: '#0f172a', fontWeight: '500' }}>{user.name}</td>
                                    <td style={{ padding: '16px', color: '#475569' }}>
                                        {user.username ? user.username : <span style={{ color: '#94a3b8' }}>-</span>}
                                    </td>
                                    <td style={{ padding: '16px', color: '#475569' }}>
                                        {user.email ? user.email : <span style={{ color: '#94a3b8' }}>Belirtilmemiş</span>}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                                            backgroundColor: user.role === 'admin' ? '#fee2e2' : '#f1f5f9',
                                            color: user.role === 'admin' ? '#991b1b' : '#475569',
                                            border: `1px solid ${user.role === 'admin' ? '#fecaca' : '#e2e8f0'}`
                                        }}>
                                            {roleNameMap[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <button 
                                            onClick={() => handleToggleStatus(user)}
                                            style={{
                                                background: user.is_active ? '#dcfce7' : '#fee2e2',
                                                border: `1px solid ${user.is_active ? '#bbf7d0' : '#fecaca'}`,
                                                color: user.is_active ? '#166534' : '#991b1b',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                width: '70px'
                                            }}
                                        >
                                            {user.is_active ? 'Aktif' : 'Pasif'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                            <button onClick={() => onEdit(user)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
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

export default StaffList;

