/**
 * ============================================================================
 * BİLEŞEN ADI: ActivityLog
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (ActivityLog.jsx), Uygulamanın arayüz bileşenlerini barındırır.
 */

import { apiFetch } from '../utils/api';
import React, { useState, useEffect } from 'react';

const ActivityLog = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchActivities = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/activities');
            const data = await res.json();
            setActivities(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Hata:', err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchActivities();
    }, []);

    const handleUndo = async (logId) => {
        if (!window.confirm('Bu işlemi geri almak istediğinize emin misiniz?')) return;

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/activities/${logId}/undo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id
                }
            });
            const data = await res.json();
            alert(data.message);
            if (data.success) {
                fetchActivities();
            }
        } catch (err) {
            alert('Sunucu hatası');
        }
    };

    const getActionColor = (actionType) => {
        switch (actionType) {
            case 'INSERT': return { bg: '#d1fae5', text: '#059669', label: 'Ekleme' };
            case 'UPDATE': return { bg: '#dbeafe', text: '#2563eb', label: 'Düzenleme' };
            case 'DELETE': return { bg: '#fee2e2', text: '#dc2626', label: 'Silme' };
            case 'RESTORE': return { bg: '#fef3c7', text: '#d97706', label: 'Geri Alma' };
            default: return { bg: '#f1f5f9', text: '#475569', label: actionType };
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div>
            <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Son Hareketler (Loglar)</h1>
            <p style={{ color: '#64748b', marginTop: '8px', marginBottom: '24px' }}>Sistemdeki en son gerçekleştirilen işlemlerin listesi ve denetim izi.</p>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Tarih / Saat</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Kullanıcı</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Tür</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Açıklama</th>
                            {currentUser?.role === 'admin' && (
                                <th style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>İşlem</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</td></tr>
                        ) : activities.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Kayıtlı hareket bulunmuyor.</td></tr>
                        ) : (
                            activities.map(log => {
                                const style = getActionColor(log.action_type);
                                return (
                                    <tr key={log.id} className="hover-row" style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s' }}>
                                        <td style={{ padding: '16px', color: '#475569', fontSize: '14px' }}>{new Date(log.created_at).toLocaleString('tr-TR')}</td>
                                        <td style={{ padding: '16px', color: '#0f172a', fontWeight: '500' }}>{log.user_name || 'Bilinmeyen'}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ backgroundColor: style.bg, color: style.text, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                                                {style.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', color: '#475569' }}>{log.description}</td>

                                        {currentUser?.role === 'admin' && (
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    {log.action_type === 'RESTORE' ? (
                                                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                                                    ) : log.is_undone === 1 ? (
                                                        <button disabled style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#94a3b8', padding: '6px 12px', borderRadius: '4px', cursor: 'not-allowed', fontWeight: '600', fontSize: '12px' }}>
                                                            Geri Alındı
                                                        </button>
                                                    ) : log.action_type === 'DELETE' ? (
                                                        <button onClick={() => handleUndo(log.id)} style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', color: '#d97706', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                                                            Geri Al
                                                        </button>
                                                    ) : log.action_type === 'UPDATE' ? (
                                                        <button onClick={() => handleUndo(log.id)} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                                                            Eskiye Dön
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleUndo(log.id)} style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                                                            İptal Et
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivityLog;

