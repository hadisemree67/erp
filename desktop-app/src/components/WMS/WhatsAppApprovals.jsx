import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const WhatsAppApprovals = ({ currentUser }) => {
    const [entries, setEntries] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState(null);
    const [selectedApprover, setSelectedApprover] = useState('');

    const fetchEntries = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/whatsapp-entries');
            const data = await res.json();
            if (data.success) {
                setEntries(data.data);
            }
        } catch (e) {
            console.error('WhatsApp girişleri çekilemedi:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/users');
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
                if (data.length > 0) setSelectedApprover(data[0].name);
            }
        } catch (e) {
            console.error('Kullanıcılar çekilemedi:', e);
        }
    };

    useEffect(() => {
        fetchEntries();
        fetchUsers();
        const interval = setInterval(fetchEntries, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleApproveClick = (id) => {
        setSelectedEntryId(id);
        setShowModal(true);
    };

    const confirmApprove = async () => {
        if (!selectedApprover) return;
        setShowModal(false);
        setActionLoading(selectedEntryId);
        try {
            const res = await apiFetch(`http://localhost:3000/api/whatsapp-entries/${selectedEntryId}/approve`, {
                method: 'POST',
                headers: { 
                    'x-user-id': currentUser?.id,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ approverName: selectedApprover })
            });
            const data = await res.json();
            
            if (data.success) {
                alert(data.message);
                fetchEntries();
            } else {
                alert('Hata: ' + data.message);
            }
        } catch (e) {
            alert('Sunucu ile bağlantı hatası.');
        } finally {
            setActionLoading(null);
            setSelectedEntryId(null);
        }
    };

    const handleAction = async (id, action) => {
        if (action === 'approve') {
            handleApproveClick(id);
            return;
        }

        if (!window.confirm(`Bu işlemi REDDETMEK istediğinize emin misiniz?`)) return;
        
        setActionLoading(id);
        try {
            const res = await apiFetch(`http://localhost:3000/api/whatsapp-entries/${id}/${action}`, {
                method: 'POST',
                headers: { 'x-user-id': currentUser?.id }
            });
            const data = await res.json();
            
            if (data.success) {
                alert(data.message);
                fetchEntries();
            } else {
                alert('Hata: ' + data.message);
            }
        } catch (e) {
            alert('Sunucu ile bağlantı hatası.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div style={{ padding: '32px', textAlign: 'center' }}>Yükleniyor...</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>WhatsApp Stok Giriş Onayları</h1>
                <p style={{ color: '#64748b', margin: 0 }}>Personellerin WhatsApp bot üzerinden gönderdiği stok giriş taleplerini buradan inceleyip onaylayabilirsiniz.</p>
            </div>
            
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px', width: '60px' }}>TÜR</th>
                            <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>GÖNDEREN</th>
                            <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>ÜRÜN BARKODU</th>
                            <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>HEDEF DEPO & RAF</th>
                            <th style={{ padding: '16px', color: '#475569', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>MİKTAR</th>
                            <th style={{ padding: '16px', width: '220px', textAlign: 'right' }}>İŞLEMLER</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    Şu an onay bekleyen herhangi bir işlem bulunmuyor.
                                </td>
                            </tr>
                        ) : (
                            entries.map(entry => (
                                <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px' }}>
                                        {entry.photo_url ? (
                                            <div style={{ width: '40px', height: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }} title="Fotoğraflı Giriş">📷</div>
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }} title="Metin Girişi">📝</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ color: '#0f172a', fontWeight: '600' }}>{entry.sender_name || 'Bilinmeyen Personel'}</div>
                                        <div style={{ color: '#64748b', fontSize: '12px' }}>{entry.phone_number}</div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#0f172a', fontWeight: '500' }}>
                                        {entry.product_barcode}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {entry.quantity < 0 ? (
                                            <div style={{ color: '#ef4444', fontWeight: '600', backgroundColor: '#fee2e2', display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '13px' }}>Stoktan Çıkarılacak</div>
                                        ) : (
                                            <>
                                                <div style={{ color: '#0f172a', fontWeight: '500' }}>{entry.warehouse_name}</div>
                                                <div style={{ color: '#64748b', fontSize: '12px' }}>Raf: {entry.shelf_barcode}</div>
                                            </>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        {entry.quantity < 0 ? (
                                            <div style={{ display: 'inline-block', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 12px', borderRadius: '999px', fontSize: '14px', fontWeight: '600' }}>
                                                - {Math.abs(entry.quantity)}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'inline-block', backgroundColor: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '999px', fontSize: '14px', fontWeight: '600' }}>
                                                + {entry.quantity}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => handleAction(entry.id, 'reject')}
                                                disabled={actionLoading === entry.id}
                                                style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                                                Reddet
                                            </button>
                                            <button 
                                                onClick={() => handleApproveClick(entry.id)}
                                                disabled={actionLoading === entry.id}
                                                style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', boxShadow: '0 1px 2px rgba(16,185,129,0.2)' }}>
                                                {actionLoading === entry.id ? 'İşleniyor...' : 'Onayla'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Onaylayan ERP Sorumlusu</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Lütfen bu işlemi onaylayan sorumlu olarak kendi adınızı seçin. Bu bilgi geçmiş hareketlere kaydedilecektir.</p>
                        
                        <select 
                            value={selectedApprover}
                            onChange={(e) => setSelectedApprover(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '24px', fontSize: '15px' }}
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                        </select>
                        
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setShowModal(false)}
                                style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >
                                İptal
                            </button>
                            <button 
                                onClick={confirmApprove}
                                style={{ padding: '10px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Onayla ve Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppApprovals;
