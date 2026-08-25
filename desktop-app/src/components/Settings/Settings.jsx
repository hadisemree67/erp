/**
 * ============================================================================
 * BİLEŞEN ADI: Settings
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemin genel ayarları ve yapılandırmalarını barındıran panel.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const Settings = ({ currentUser }) => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/settings');
            const data = await res.json();
            if (data.success) {
                setSettings(data.data);
            }
        } catch (err) {
            console.error("Ayarlar çekilemedi:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key) => {
        const newValue = !settings[key];
        
        // Optimistic UI update
        setSettings(prev => ({ ...prev, [key]: newValue }));
        setSaving(true);
        
        try {
            const res = await apiFetch('http://localhost:3000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: { [key]: newValue } })
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Ayar başarıyla güncellendi.' });
            } else {
                setMessage({ type: 'error', text: data.message || 'Ayar güncellenemedi.' });
                // Revert
                setSettings(prev => ({ ...prev, [key]: !newValue }));
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Sunucu hatası.' });
            setSettings(prev => ({ ...prev, [key]: !newValue }));
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (currentUser?.role !== 'Yönetici' && currentUser?.role !== 'Admin' && currentUser?.role !== 'admin' && currentUser?.role !== 'Sistem Yöneticisi') {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                Bu sayfayı görüntüleme yetkiniz yok. Sadece yöneticiler erişebilir.
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#0f172a', fontWeight: 'bold' }}>Sistem Ayarları</h1>
            <p style={{ margin: '0 0 32px 0', color: '#64748b', fontSize: '14px' }}>
                Sistem genelindeki kısıtlamaları ve bakım modlarını buradan yönetebilirsiniz.
            </p>

            {message && (
                <div style={{ padding: '12px', marginBottom: '24px', borderRadius: '8px', backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '14px' }}>
                    {message.text}
                </div>
            )}

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                    Güvenlik ve Bakım Modları
                </h2>

                {loading ? (
                    <div style={{ color: '#64748b' }}>Ayarlar yükleniyor...</div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: settings.system_paused ? '#fef2f2' : '#f8fafc', borderRadius: '8px', border: `1px solid ${settings.system_paused ? '#fecaca' : '#e2e8f0'}` }}>
                        <div>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Tüm Hareketleri Durdur (Sayım/Bakım Modu)</span>
                                {settings.system_paused && <span style={{ padding: '2px 8px', backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', borderRadius: '4px', fontWeight: 'bold' }}>AKTİF</span>}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', maxWidth: '500px' }}>
                                Bu mod aktif edildiğinde sistem "Salt Okunur" (Sadece Görüntüleme) moduna geçer. Depo sayımları veya acil bakımlar sırasında personelin yeni kayıt girmesini (stok, sipariş, finans) engeller.
                            </div>
                        </div>
                        
                        {/* Toggle Switch */}
                        <div 
                            onClick={() => !saving && handleToggle('system_paused')}
                            style={{
                                width: '50px', height: '26px', borderRadius: '26px', 
                                backgroundColor: settings.system_paused ? '#ef4444' : '#cbd5e1', 
                                position: 'relative', cursor: saving ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.3s'
                            }}
                        >
                            <div style={{
                                width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fff',
                                position: 'absolute', top: '2px', left: settings.system_paused ? '26px' : '2px',
                                transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;


