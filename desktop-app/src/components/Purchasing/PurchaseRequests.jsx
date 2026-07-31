/**
 * ============================================================================
 * DOSYA ADI: PurchaseRequests.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Satınalma Modülü / Satınalma Talepleri ve Onay Akışı
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Şirket içi departmanların veya stok uyarı sisteminin oluşturduğu malzeme satın alma taleplerini listeler; satınalma yöneticilerinin bu talepleri inceleyip onaylamasına, reddetmesine veya doğrudan tedarikçi siparişine dönüştürmesine olanak tanır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Onay Akışı (Approval Workflow), Talep Durum Yönetimi
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - `/api/purchasing/requests` rotası ile haberleşerek şirket içi talep ve tedarik koordinasyonunu sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (PurchaseRequests.jsx), Satın alma talepleri, onay süreçleri ve satın alma siparişlerinin takibini içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const PurchaseRequests = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showManualForm, setShowManualForm] = useState(false);
    
    // Manuel Talep Formu State'i
    const [formData, setFormData] = useState({
        product_name: '',
        quantity: '',
        description: '',
        supplier_id: ''
    });

    const [orderModal, setOrderModal] = useState({ isOpen: false, request: null, quantity: '', description: '', supplier_email: '', supplier_id: '' });

    const [isSupplierLocked, setIsSupplierLocked] = useState(false);

    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchMaterialsAndSuppliers = async () => {
        try {
            const [matRes, supRes] = await Promise.all([
                apiFetch('http://localhost:3000/api/products'),
                apiFetch('http://localhost:3000/api/suppliers')
            ]);
            const matData = await matRes.json();
            const supData = await supRes.json();
            
            if (Array.isArray(matData)) {
                setMaterials(matData.filter(p => p.Category === 'Hammadde'));
            }
            if (supData && Array.isArray(supData.data)) {
                setSuppliers(supData.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/purchasing/requests');
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (err) {
            console.error(err);
            setError('Satın alma talepleri yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRequestsSilently = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/purchasing/requests');
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (err) {
            console.error('Sessiz güncelleme hatası:', err);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchRequests();
        fetchMaterialsAndSuppliers();

        // 30 saniyede bir otomatik olarak tabloyu sessizce günceller
        const intervalId = setInterval(() => {
            fetchRequestsSilently();
        }, 30000);

        return () => clearInterval(intervalId);
    }, []);

    const handleCreateManualRequest = async (e) => {
        e.preventDefault();
        try {
            const res = await apiFetch('http://localhost:3000/api/purchasing/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: currentUser?.id || null,
                    product_name: formData.product_name,
                    quantity: formData.quantity,
                    description: formData.description,
                    supplier_id: formData.supplier_id || null
                })
            });
            const data = await res.json();
            if (data.success) {
                if (formData.supplier_id) {
                    const selectedSupplier = suppliers.find(s => String(s.id || s.Id) === String(formData.supplier_id));
                    if (selectedSupplier && (selectedSupplier.Email || selectedSupplier.email)) {
                        const sEmail = selectedSupplier.Email || selectedSupplier.email;
                        try {
                            const mailRes = await apiFetch(`http://localhost:3000/api/purchasing/requests/${data.id}/send-order`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    quantity: formData.quantity, 
                                    description: formData.description,
                                    supplier_id: formData.supplier_id,
                                    supplier_email: sEmail,
                                    product_name: formData.product_name
                                })
                            });
                            const mailData = await mailRes.json();
                            if (mailData.success) {
                                alert("Talep oluşturuldu ve tedarikçiye e-posta başarıyla gönderildi (Sipariş geçildi)!");
                            } else {
                                alert("Talep oluşturuldu ancak e-posta gönderilemedi: " + (mailData.message || ''));
                            }
                        } catch(e) {
                            console.error(e);
                            alert("Talep oluşturuldu ancak e-posta gönderilirken ağ hatası oluştu.");
                        }
                    } else {
                        alert("Talep oluşturuldu ancak seçilen tedarikçinin kayıtlı e-posta adresi bulunamadı. E-posta manuel gönderilmelidir.");
                    }
                }

                setShowManualForm(false);
                setFormData({ product_name: '', quantity: '', description: '', supplier_id: '' });
                setIsSupplierLocked(false);
                fetchRequests();
            } else {
                alert(data.message || 'Talep oluşturulamadı.');
            }
        } catch (err) {
            console.error(err);
            alert('Sunucu hatası');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        if (status === 'Reddedildi') {
            if (!window.confirm('Bu satın alma talebini reddetmek istediğinize emin misiniz?')) return;
        }

        try {
            const res = await apiFetch(`http://localhost:3000/api/purchasing/requests/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                fetchRequests();
            } else {
                alert(data.message || 'Durum güncellenemedi.');
            }
        } catch (err) {
            console.error(err);
            alert('Durum güncellenemedi.');
        }
    };

    const handleSendOrder = async (e) => {
        e.preventDefault();
        if (!orderModal.quantity || !orderModal.supplier_email || !orderModal.supplier_id) {
            alert("Lütfen miktar ve tedarikçi e-postasını girdiğinizden emin olun.");
            return;
        }
        
        try {
            const res = await apiFetch(`http://localhost:3000/api/purchasing/requests/${orderModal.request.id}/send-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    quantity: orderModal.quantity, 
                    description: orderModal.description,
                    supplier_id: orderModal.supplier_id,
                    supplier_email: orderModal.supplier_email,
                    product_name: orderModal.request.product_name
                })
            });
            const data = await res.json();
            if (data.success) {
                setOrderModal({ isOpen: false, request: null, quantity: '', description: '', supplier_email: '', supplier_id: '' });
                fetchRequests();
                alert("Mail başarıyla gönderildi ve tedarik siparişlerine düşüldü!");
            } else {
                alert(data.message || 'Sipariş gönderilemedi.');
            }
        } catch (err) {
            console.error(err);
            alert('Sipariş gönderilirken hata oluştu.');
        }
    };

    const formatName = (name) => {
        if (!name) return 'Sistem / Bilinmeyen';
        if (name.toLowerCase() === 'hadisemreylmz') return 'Hadis Emre Yılmaz';
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                        Satın Alma Talepleri
                    </h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px' }}>Üretim eksiklikleri ve manuel isteklerden gelen satın alma gereksinimleri.</p>
                </div>
                <button 
                    onClick={() => setShowManualForm(!showManualForm)}
                    style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {showManualForm ? 'İptal' : '+ Manuel Talep Oluştur'}
                </button>
            </div>

            {showManualForm && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>Yeni Satın Alma Talebi</h3>
                    <form onSubmit={handleCreateManualRequest} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Malzeme Adı *</label>
                            <input 
                                type="text"
                                list="material-list"
                                value={formData.product_name}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const selectedMat = materials.find(m => m.ProductName === val);
                                    let locked = false;
                                    
                                    const primarySupplier = selectedMat?.suppliers?.find(s => s.is_primary === 1) || selectedMat?.suppliers?.[0];
                                    const supplierIdToUse = primarySupplier ? primarySupplier.supplier_id : selectedMat?.supplier_id;
                                    const contractEndDateToUse = primarySupplier ? primarySupplier.contract_end_date : selectedMat?.contract_end_date;

                                    if (selectedMat && supplierIdToUse) {
                                        if (contractEndDateToUse) {
                                            const endDate = new Date(contractEndDateToUse);
                                            const now = new Date();
                                            // Sözleşme bitiş tarihi kıyaslamasında saati yoksay
                                            now.setHours(0, 0, 0, 0);
                                            if (endDate >= now) {
                                                locked = true;
                                            }
                                        }
                                        setFormData({...formData, product_name: val, supplier_id: String(supplierIdToUse)});
                                    } else {
                                        setFormData({...formData, product_name: val, supplier_id: ''});
                                    }
                                    setIsSupplierLocked(locked);
                                }}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                placeholder="Örn: Un, Şeker, Etiket..."
                            />
                            <datalist id="material-list">
                                {materials.map(m => (
                                    <option key={m.Id} value={m.ProductName} />
                                ))}
                            </datalist>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>
                                Tedarikçi (Opsiyonel) {isSupplierLocked && <span style={{ color: '#059669', fontSize: '11px', marginLeft: '4px' }}>🔒 Sözleşmeli</span>}
                            </label>
                            <select 
                                value={formData.supplier_id}
                                onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                                disabled={isSupplierLocked}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: isSupplierLocked ? '#f1f5f9' : 'white', cursor: isSupplierLocked ? 'not-allowed' : 'auto' }}
                            >
                                <option value="">Tedarikçi Seçilmedi</option>
                                {suppliers.map(s => (
                                    <option key={s.id || s.Id} value={s.id || s.Id}>{s.SupplierName}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ width: '150px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Miktar *</label>
                            <input 
                                type="number"
                                min="0.1"
                                step="any"
                                value={formData.quantity}
                                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                required
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                placeholder="Miktar"
                            />
                        </div>
                        <div style={{ flex: 2, minWidth: '250px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Açıklama (Opsiyonel)</label>
                            <input 
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                placeholder="Neden talep ediliyor?"
                            />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '11px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Gönder
                        </button>
                    </form>
                </div>
            )}

            {error && (
                <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                {loading && requests.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
                ) : requests.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Henüz satın alma talebi bulunmuyor.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tarih</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Malzeme</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Tedarikçi</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Miktar</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Talep Eden</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Açıklama</th>
                                <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>İşlemler / Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => {
                                const creatorFormatted = formatName(req.employee_name);
                                const initials = creatorFormatted === 'Hadis Emre Yılmaz' ? 'HY' : (creatorFormatted === 'Sistem / Bilinmeyen' ? '⚙️' : creatorFormatted.charAt(0).toUpperCase());
                                const isSystem = !req.employee_id;
                                
                                return (
                                    <tr key={req.id} className="hover-row req-row-hover" style={{ 
                                        borderBottom: '1px solid #f1f5f9', 
                                        backgroundColor: req.status !== 'Bekliyor' ? '#f8fafc' : 'white',
                                        transition: 'background-color 0.2s',
                                        opacity: req.status !== 'Bekliyor' ? 0.6 : 1
                                    }}>
                                        <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
                                            {new Date(req.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>{req.product_name}</td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>{req.supplier_name || '-'}</td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#0f172a' }}>
                                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{req.quantity}</span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isSystem ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: isSystem ? '#ef4444' : '#64748b' }}>
                                                    {initials}
                                                </div>
                                                <span style={{ fontWeight: '500' }}>{isSystem ? 'Sistem (Üretim)' : creatorFormatted}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>{req.description || '-'}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            {req.status === 'Bekliyor' ? (
                                                <div className="action-container" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button 
                                                        onClick={() => setOrderModal({ 
                                                            isOpen: true, 
                                                            request: req, 
                                                            quantity: req.quantity || '', 
                                                            description: '', 
                                                            supplier_email: req.supplier_email || '', 
                                                            supplier_id: req.supplier_id || '' 
                                                        })}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }}
                                                        title="Satın Almayı Onayla"
                                                    >
                                                        <span>✔ </span> <span>Onayla</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(req.id, 'Reddedildi')}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', backgroundColor: 'white', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s' }}
                                                        title="Talebi Reddet"
                                                    >
                                                        <span>❌</span> <span>Red</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ 
                                                    fontSize: '13px', 
                                                    fontWeight: '600', 
                                                    color: req.status === 'Reddedildi' ? '#ef4444' : '#10b981' 
                                                }}>
                                                    {req.status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {orderModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
                        <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            Siparişi Onayla ve Mail Gönder
                        </h3>
                        <form onSubmit={handleSendOrder}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Sipariş Miktarı *</label>
                                <input 
                                    type="number"
                                    required
                                    value={orderModal.quantity}
                                    onChange={(e) => setOrderModal({...orderModal, quantity: e.target.value})}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Tedarikçi E-posta *</label>
                                <input 
                                    type="email"
                                    required
                                    value={orderModal.supplier_email}
                                    onChange={(e) => setOrderModal({...orderModal, supplier_email: e.target.value})}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                    placeholder="Tedarikçi Mail Adresi"
                                />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px', fontWeight: '500' }}>Ek Açıklama (Opsiyonel)</label>
                                <textarea 
                                    value={orderModal.description}
                                    onChange={(e) => setOrderModal({...orderModal, description: e.target.value})}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '80px', resize: 'vertical' }}
                                    placeholder="Tedarikçiye iletilecek ek mesaj"
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setOrderModal({ isOpen: false, request: null, quantity: '', description: '', supplier_email: '', supplier_id: '' })}
                                    style={{ padding: '10px 16px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
                                >
                                    İptal
                                </button>
                                <button 
                                    type="submit"
                                    style={{ padding: '10px 16px', backgroundColor: '#0284c7', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    Tedarikçiye Mail Gönder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseRequests;
