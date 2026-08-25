/**
 * ============================================================================
 * BİLEŞEN ADI: SupplierList
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Tedarikçi firmaların ve hammadde alım anlaşmalarının yönetildiği ekran.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (SupplierList.jsx), Tedarikçi firmaların, anlaşma tarihlerinin ve fason üretici detaylarının listelendiği bileşenleri içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const SupplierList = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({
        SupplierName: '',
        ContactPerson: '',
        Phone: '',
        Email: '',
        Address: '',
        supplier_type: 'Tedarikçi'
    });

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchSuppliers();
    }, []);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/suppliers');
            const data = await res.json();
            if (data.success) {
                setSuppliers(data.data || []);
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Tedarikçiler getirilirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const url = editingSupplier 
                ? `http://localhost:3000/api/suppliers/${editingSupplier.Id}`
                : 'http://localhost:3000/api/suppliers';
                
            const method = editingSupplier ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            
            if (data.success) {
                setShowModal(false);
                setEditingSupplier(null);
                setFormData({ SupplierName: '', ContactPerson: '', Phone: '', Email: '', Address: '', supplier_type: 'Tedarikçi' });
                fetchSuppliers();
            } else {
                alert(data.message || 'Bir hata oluştu.');
            }
        } catch (error) {
            alert('Sunucu ile iletişim kurulamadı.');
        }
    };

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            SupplierName: supplier.SupplierName,
            ContactPerson: supplier.ContactPerson || '',
            Phone: supplier.Phone || '',
            Email: supplier.Email || '',
            Address: supplier.Address || '',
            supplier_type: supplier.supplier_type || 'Tedarikçi'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
        
        try {
            const res = await apiFetch(`http://localhost:3000/api/suppliers/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            
            if (data.success) {
                fetchSuppliers();
            } else {
                alert(data.message || 'Silme işlemi başarısız.');
            }
        } catch (error) {
            alert('Sunucu ile iletişim kurulamadı.');
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Tedarikçi Yönetimi</h1>
                <button
                    onClick={() => {
                        setEditingSupplier(null);
                        setFormData({ SupplierName: '', ContactPerson: '', Phone: '', Email: '', Address: '', supplier_type: 'Tedarikçi' });
                        setShowModal(true);
                    }}
                    style={{
                        padding: '10px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    + Yeni Tedarikçi
                </button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600', fontSize: '14px' }}>Tedarikçi Adı</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600', fontSize: '14px' }}>Yetkili Kişi</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600', fontSize: '14px' }}>Telefon</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600', fontSize: '14px' }}>E-posta</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600', fontSize: '14px' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Yükleniyor...</td></tr>
                        ) : suppliers.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Kayıtlı tedarikçi bulunamadı.</td></tr>
                        ) : (
                            suppliers.map(supplier => (
                                <tr key={supplier.Id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                                    <td style={{ padding: '16px', color: '#1e293b', fontWeight: '500' }}>
                                        {supplier.SupplierName}
                                        <span style={{ 
                                            marginLeft: '8px', 
                                            padding: '2px 8px', 
                                            borderRadius: '12px', 
                                            fontSize: '11px', 
                                            fontWeight: '600', 
                                            backgroundColor: supplier.supplier_type === 'Fason' ? '#ffedd5' : '#dbeafe', 
                                            color: supplier.supplier_type === 'Fason' ? '#9a3412' : '#1e40af' 
                                        }}>
                                            {supplier.supplier_type || 'Tedarikçi'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>{supplier.ContactPerson || '-'}</td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>{supplier.Phone || '-'}</td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>{supplier.Email || '-'}</td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                                            <button onClick={() => handleEdit(supplier)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button onClick={() => handleDelete(supplier.Id)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
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

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ margin: '0 0 24px 0', color: '#1e293b', fontSize: '20px' }}>
                            {editingSupplier ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}
                        </h2>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>Tedarikçi Adı *</label>
                                <input
                                    type="text"
                                    name="SupplierName"
                                    value={formData.SupplierName}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>Yetkili Kişi</label>
                                <input
                                    type="text"
                                    name="ContactPerson"
                                    value={formData.ContactPerson}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>Firma Tipi</label>
                                <select 
                                    name="supplier_type" 
                                    value={formData.supplier_type} 
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white' }}
                                >
                                    <option value="Tedarikçi">Tedarikçi (Ticari Mal / Hammadde)</option>
                                    <option value="Fason">Fason Üretici</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>Telefon</label>
                                    <input
                                        type="text"
                                        name="Phone"
                                        value={formData.Phone}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>E-posta</label>
                                    <input
                                        type="email"
                                        name="Email"
                                        value={formData.Email}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>Adres</label>
                                <textarea
                                    name="Address"
                                    value={formData.Address}
                                    onChange={handleInputChange}
                                    rows="3"
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierList;

