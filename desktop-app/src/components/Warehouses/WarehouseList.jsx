/**
 * ============================================================================
 * DOSYA ADI: WarehouseList.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Depo Tanım Modülü / Depolar ve Lojistik Merkezler Listesi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Şirkete ait tüm depoları, şubeleri ve lojistik merkezleri listeler. Depoların doluluk oranlarını, sorumlu kişileri ve genel durumlarını özetler; depo düzenleme veya raf tasarım sayfalarına geçiş sağlar.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Depo Kartları / Tablosu, Kapasite Göstergeleri, Lucide İkonları
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Depo tanımlama modülünün ana ekranıdır; `/api/warehouses` rotasından aldığı verileri listeler.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const WarehouseList = ({ onNavigate, onEdit }) => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const response = await apiFetch('http://localhost:3000/api/warehouses');
            const data = await response.json();
            if (response.ok) {
                setWarehouses(data);
            } else {
                setError(data.message || 'Depolar getirilemedi.');
            }
        } catch (err) {
            setError('Sunucuya bağlanılamadı.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Bu depoyu ve içindeki tüm rafları silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            const response = await apiFetch(`http://localhost:3000/api/warehouses/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (response.ok) {
                setWarehouses(warehouses.filter(w => w.id !== id));
            } else {
                alert(data.message || 'Silme işlemi başarısız.');
            }
        } catch (err) {
            alert('Sunucu hatası.');
        }
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Depolar ve Raflar</h2>
                <button 
                    onClick={() => { onEdit(null); onNavigate('depo-ekle'); }}
                    style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    + Yeni Depo Ekle
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
            ) : error ? (
                <div style={{ padding: '20px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }}>{error}</div>
            ) : warehouses.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                    Henüz depo eklenmemiş. Yeni depo ekleyerek başlayabilirsiniz.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <style>{`
                        .hover-row .action-container { opacity: 0; transition: opacity 0.2s; }
                        .hover-row:hover .action-container { opacity: 1; }
                    `}</style>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' }}>Depo Adı</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' }}>Tür</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' }}>Lokasyon</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', textAlign: 'center' }}>Raf Sayısı</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouses.map(warehouse => (
                                <tr key={warehouse.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: '600' }}>
                                        {warehouse.name}
                                        {warehouse.address && (
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 'normal' }}>{warehouse.address}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ backgroundColor: warehouse.warehouse_type === 'HAMMADDE' ? '#fef3c7' : '#dcfce3', color: warehouse.warehouse_type === 'HAMMADDE' ? '#d97706' : '#16a34a', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                                            {warehouse.warehouse_type === 'HAMMADDE' ? 'HAMMADDE' : 'STOK'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#334155' }}>{warehouse.location || '-'}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: '600' }}>
                                            {warehouse.Shelves?.length || 0} Raf
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                            <button 
                                                onClick={() => { onEdit(warehouse); onNavigate('depo-ekle'); }}
                                                title="Düzenle" 
                                                style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} 
                                                onMouseOver={e => e.currentTarget.style.color = '#0f172a'} 
                                                onMouseOut={e => e.currentTarget.style.color = '#334155'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(warehouse.id)}
                                                title="Sil" 
                                                style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} 
                                                onMouseOver={e => e.currentTarget.style.color = '#ef4444'} 
                                                onMouseOut={e => e.currentTarget.style.color = '#334155'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WarehouseList;
