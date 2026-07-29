/**
 * ============================================================================
 * DOSYA ADI: CampaignList.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Kampanya ve Promosyon Listesi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemde tanımlı olan tüm indirim ve promosyon kampanyalarını listeler.
 *   Yatay kapak resümlerini görsel olarak sunar, kampanya türüne göre
 *   sadeleştirilmiş ve modern kurumsal rozetler gösterir. Yeni kampanya
 *   ekleme butonunu barındırır, silme ve aktif-pasif işlemlerini yönetir.
 * 
 * TASARIM VE ESTETİK İLKELERİ:
 *   - Renk cümbüşü azaltılmış, koyu lacivert başlıklar (#0f172a) ve nane yeşili
 *     (#10b981) vurgularıyla minimalist, temiz ve profesyonel arayüz.
 *   - Yüksek kontrast, dengeli beyaz alanlar ve modern tipografi.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React (useState, useEffect), Fetch API Wrapper (apiFetch)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import CampaignForm from './CampaignForm';

const CampaignList = ({ currentUser, onNavigate }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);

    const fetchCampaigns = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch(`http://localhost:3000/api/campaigns?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`);
            const data = await res.json();
            if (data.success) {
                setCampaigns(data.data);
            } else {
                setError(data.message || 'Kampanyalar yüklenemedi.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, [statusFilter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchCampaigns();
    };

    const handleToggleStatus = async (camp) => {
        const campId = camp.id || camp.Id;
        const newStatus = camp.status === 'Aktif' ? 'Pasif' : 'Aktif';
        try {
            const res = await apiFetch(`http://localhost:3000/api/campaigns/${campId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                setCampaigns(prev => prev.map(c => (c.id === campId || c.Id === campId) ? { ...c, status: newStatus } : c));
                fetchCampaigns();
            } else {
                alert(data.message || 'Durum güncellenemedi.');
            }
        } catch (err) {
            alert('Durum güncellenirken hata oluştu: ' + (err.message || err));
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`"${title}" kampanyasını silmek istediğinize emin misiniz?`)) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/campaigns/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setCampaigns(prev => prev.filter(c => c.id !== id && c.Id !== id));
                fetchCampaigns();
            } else {
                alert(data.message || 'Silme işlemi başarısız.');
            }
        } catch (err) {
            alert('Sunucu hatası: ' + (err.message || err));
        }
    };

    // Minimalist ve Dengeli Renk Rozetleri
    const getCampaignTypeBadge = (type) => {
        switch (type) {
            case 'buy_x_pay_y':
                return { label: 'X Al Y Öde', color: '#0f172a', bg: '#f1f5f9', bannerBg: 'linear-gradient(135deg, #1e293b, #334155)' };
            case 'min_amount_discount':
                return { label: 'Sepet Tutarı İndirimi', color: '#047857', bg: '#ecfdf5', bannerBg: 'linear-gradient(135deg, #065f46, #059669)' };
            case 'gift_product':
                return { label: 'Hediye Ürün', color: '#0369a1', bg: '#f0f9ff', bannerBg: 'linear-gradient(135deg, #0c4a6e, #0284c7)' };
            case 'percentage_discount':
                return { label: 'Net Yüzde İndirimi', color: '#4338ca', bg: '#eef2ff', bannerBg: 'linear-gradient(135deg, #312e81, #4f46e5)' };
            case 'free_shipping':
                return { label: 'Ücretsiz Kargo', color: '#475569', bg: '#f8fafc', bannerBg: 'linear-gradient(135deg, #334155, #64748b)' };
            default:
                return { label: 'Genel Kampanya', color: '#475569', bg: '#f8fafc', bannerBg: 'linear-gradient(135deg, #1e293b, #475569)' };
        }
    };

    return (
        <div style={{ animation: 'fadeIn 0.25s ease', fontFamily: 'Inter, sans-serif' }}>
            {/* Üst Başlık ve Aksiyon Barı */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                    <h1 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '800', margin: '0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '22px', backgroundColor: '#10b981', borderRadius: '4px' }}></span>
                        Kampanya ve Promosyon Yönetimi
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 0 18px' }}>
                        Sitenizde yayınlanan aktif indirimleri, kapak görsellerini ve barkodlu envanter bağlantılarını buradan yönetin.
                    </p>
                </div>
                
                <button 
                    onClick={() => {
                        setEditingCampaign(null);
                        setIsModalOpen(true);
                    }}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = '#059669'; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#10b981'; }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Yeni Kampanya Ekle
                </button>
            </div>

            {/* Arama ve Filtreleme Modülü */}
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '300px' }}>
                    <div style={{ position: 'relative', flex: '1' }}>
                        <input 
                            type="text" 
                            placeholder="Kampanya adı veya açıklamaya göre ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '9px 14px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                    </div>
                    <button type="submit" style={{ padding: '9px 18px', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                        Ara
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '6px' }}>
                    {['All', 'Aktif', 'Pasif'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                backgroundColor: statusFilter === st ? '#0f172a' : '#ffffff',
                                color: statusFilter === st ? '#ffffff' : '#475569',
                                transition: 'all 0.2s'
                            }}
                        >
                            {st === 'All' ? 'Tümü' : st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Liste İçeriği */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                    ⏳ Kampanya verileri yükleniyor...
                </div>
            ) : error ? (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '10px', color: '#dc2626', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>
                    ⚠️ {error}
                </div>
            ) : campaigns.length === 0 ? (
                <div style={{ backgroundColor: '#ffffff', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.6 }}>🏷️</div>
                    <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px', margin: '0 0 6px 0' }}>Kayıtlı Kampanya Bulunmadı</h3>
                    <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '380px', margin: '0 auto 18px auto', lineHeight: '1.4' }}>
                        Sitenize yeni bir indirim kurgusu veya yatay reklam görseli eklemek için sağ üstteki butona tıklayın.
                    </p>
                    <button 
                        onClick={() => {
                            setEditingCampaign(null);
                            setIsModalOpen(true);
                        }}
                        style={{ padding: '9px 18px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                    >
                        İlk Kampanyayı Oluştur
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    {campaigns.map(camp => {
                        const badge = getCampaignTypeBadge(camp.campaign_type);
                        return (
                            <div 
                                key={camp.id} 
                                style={{ 
                                    backgroundColor: '#ffffff', 
                                    borderRadius: '12px', 
                                    overflow: 'hidden', 
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    opacity: camp.status === 'Aktif' ? 1 : 0.65
                                }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                                {/* YATAY BANNER ALANI (Sade & Kurumsal) */}
                                <div style={{ 
                                    height: '160px', 
                                    width: '100%', 
                                    background: camp.cover_image_path ? `url(http://localhost:3000${camp.cover_image_path}) center/cover no-repeat` : badge.bannerBg,
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    padding: '16px',
                                    boxSizing: 'border-box'
                                }}>
                                    {/* Durum Etiketi */}
                                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', 
                                            borderRadius: '6px', 
                                            fontSize: '11px', 
                                            fontWeight: '700', 
                                            backgroundColor: camp.status === 'Aktif' ? '#10b981' : '#475569', 
                                            color: 'white',
                                            letterSpacing: '0.3px'
                                        }}>
                                            {camp.status === 'Aktif' ? 'YAYINDA' : 'PASİF'}
                                        </span>
                                    </div>

                                    {!camp.cover_image_path && (
                                        <div style={{ color: 'white', width: '100%' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                                                {badge.label}
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: '800', lineHeight: '1.3', marginTop: '2px' }}>
                                                {camp.title}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Kart İçerik Detayları */}
                                <div style={{ padding: '18px', flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        {/* Tür Rozeti */}
                                        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: badge.bg, color: badge.color, marginBottom: '10px' }}>
                                            {badge.label}
                                        </div>

                                        {/* Başlık */}
                                        <h3 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '700', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                                            {camp.title}
                                        </h3>

                                        {/* Açıklama */}
                                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', lineHeight: '1.4' }}>
                                            {camp.description || 'Bu kampanya için açıklama belirtilmemiştir.'}
                                        </div>

                                        {/* Koşullar Kutu (Minimalist ve Yüksek Kontrast) */}
                                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '14px', fontSize: '13px', color: '#334155' }}>
                                            {camp.campaign_type === 'buy_x_pay_y' && (
                                                <div style={{ fontWeight: '600' }}>
                                                    🎯 Koşul: {camp.buy_quantity} Adet Alımda {camp.pay_quantity} Adet Ödenir.
                                                </div>
                                            )}
                                            {camp.campaign_type === 'min_amount_discount' && (
                                                <div style={{ fontWeight: '600' }}>
                                                    💰 Koşul: {Number(camp.min_amount).toLocaleString('tr-TR')} TL Üzerine %{camp.discount_rate} İndirim.
                                                </div>
                                            )}
                                            {camp.campaign_type === 'gift_product' && (
                                                <div style={{ fontWeight: '600' }}>
                                                    🎁 Koşul: {camp.buy_quantity} Adet Alana +{camp.gift_quantity} Adet {camp.gift_product_name || 'Hediye'}.
                                                </div>
                                            )}
                                            {camp.campaign_type === 'percentage_discount' && (
                                                <div style={{ fontWeight: '600' }}>
                                                    ⚡ Koşul: Seçili Ürünlerde Net %{camp.discount_rate} İndirim.
                                                </div>
                                            )}
                                            {camp.campaign_type === 'free_shipping' && (
                                                <div style={{ fontWeight: '600' }}>
                                                    🚚 Koşul: {camp.min_amount ? `${Number(camp.min_amount).toLocaleString('tr-TR')} TL Üzeri` : 'Tüm Siparişlerde'} Bedava Kargo.
                                                </div>
                                            )}

                                            {/* Bağlı Ürün / Barkod Rozeti */}
                                            {(camp.target_product_ids || camp.target_product_id || camp.target_barcode) && (
                                                <div style={{ color: '#0f172a', fontSize: '11px', marginTop: '8px', padding: '5px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>📦 Bağlı Ürün: {
                                                        (() => {
                                                            try {
                                                                let arr = camp.target_product_ids;
                                                                if (typeof arr === 'string') arr = JSON.parse(arr);
                                                                if (Array.isArray(arr) && arr.length > 0) return `${arr.length} Adet`;
                                                                if (camp.target_product_id) return `#${camp.target_product_id}`;
                                                                return 'Seçildi';
                                                            } catch(e) { return 'Bağlı'; }
                                                        })()
                                                    }</span>
                                                </div>
                                            )}

                                            {/* Tarih Aralığı */}
                                            {(camp.start_date || camp.end_date) && (
                                                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>📅 Geçerlilik:</span>
                                                    <span>{camp.start_date ? new Date(camp.start_date).toLocaleDateString('tr-TR') : 'Hemen'} - {camp.end_date ? new Date(camp.end_date).toLocaleDateString('tr-TR') : 'Süresiz'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Aksiyon Butonları (Temiz Gri & Zümrüt Yeşili) */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '4px' }}>
                                        <button
                                            onClick={() => handleToggleStatus(camp)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                backgroundColor: '#ffffff',
                                                color: camp.status === 'Aktif' ? '#475569' : '#10b981',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                                        >
                                            {camp.status === 'Aktif' ? 'Duraklat' : 'Yayına Al'}
                                        </button>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                title="Düzenle" 
                                                onClick={() => {
                                                    setEditingCampaign(camp);
                                                    setIsModalOpen(true);
                                                }}
                                                style={{ padding: '6px 12px', backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            >
                                                Düzenle
                                            </button>
                                            <button
                                                onClick={() => handleDelete(camp.id, camp.title)}
                                                style={{ padding: '6px 10px', backgroundColor: '#ffffff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                title="Kampanyayı Sil"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* MODAL - KAMPANYA EKLE / DÜZENLE */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <button 
                            onClick={() => setIsModalOpen(false)} 
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8', zIndex: 10 }}
                        >&times;</button>
                        <div style={{ padding: '20px' }}>
                            <CampaignForm 
                                currentUser={currentUser} 
                                campaign={editingCampaign} 
                                onNavigate={(dest) => { 
                                    if (dest === 'kampanya-listesi') {
                                        setIsModalOpen(false);
                                        fetchCampaigns();
                                    } else {
                                        onNavigate(dest);
                                    }
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignList;
