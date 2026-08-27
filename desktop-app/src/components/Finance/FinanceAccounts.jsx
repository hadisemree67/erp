/**
 * ============================================================================
 * BİLEŞEN ADI: FinanceAccounts
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Finansal işlemler, gelir-gider takibi ve cari hesap yönetimi ekranı.
 * ============================================================================
 */
/*
 * ÖZET:
 * Bu dosya (FinanceAccounts.jsx), Finansal hesaplar, e-fatura modalları ve genel bütçe göstergelerini içerir.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../utils/api';
import './FinanceAccounts.css';
import EInvoiceModal from './EInvoiceModal';

// Minimalist Monokrom SVG Çizgi İkonlar (Lucide / Tabler stili 1.5px stroke)
const SvgIcon = ({ name }) => {
    switch (name) {
        case 'wallet':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                </svg>
            );
        case 'trending-down':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                    <polyline points="16 17 22 17 22 11" />
                </svg>
            );
        case 'trending-up':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                </svg>
            );
        case 'users':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );
        case 'package':
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 0L2.6 6.67a1.78 1.78 0 0 0 0 2.5l8.95 5.16a1.78 1.78 0 0 0 2.5 0l2.45-1.42" />
                    <path d="M12 22v-9" />
                    <path d="m22.8 17.58-10.3 5.95a1.78 1.78 0 0 1-1.78 0L.42 17.58" />
                    <path d="m22.8 6.42-10.3 5.95a1.78 1.78 0 0 1-1.78 0L.42 6.42" />
                </svg>
            );
        case 'search':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
            );
        case 'plus':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            );
        case 'trash':
            return (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            );
        case 'close':
            return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            );
        case 'external-link':
            return (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            );
        default:
            return null;
    }
};

const FinanceAccounts = ({ onNavigate }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [activeTab, setActiveTab] = useState('GİDER'); // 'GİDER' veya 'GELİR'
    const [activePeriod, setActivePeriod] = useState('this_month'); // Dönem filtresi
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [accountsData, setAccountsData] = useState([]);
    const [summary, setSummary] = useState({
        totalExpense: 0,
        manualTotal: 0,
        salaryTotal: 0,
        procurementTotal: 0,
        totalIncome: 0,
        netBalance: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Tümü');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        category: 'Kira / Ofis Kirası',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
    });

    const giderKategorileri = [
        'Kira / Ofis Kirası',
        'Elektrik Faturası',
        'Su Faturası',
        'Doğalgaz Faturası',
        'İnternet & Telekom Faturası',
        'Bakım & Onarım Giderleri',
        'Lojistik & Nakliye Giderleri',
        'Pazarlama & Reklam',
        'Vergi & Yasal Harçlar',
        'Ofis ve Kırtasiye Malzemeleri',
        'Diğer Giderler'
    ];

    const gelirKategorileri = [
        'Ürün Satış Geliri',
        'Hizmet Bedeli',
        'Danışmanlık Geliri',
        'Yatırım & Faiz Geliri',
        'Diğer Gelirler'
    ];

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/finance/accounts?tab=${activeTab}&period=${activePeriod}`);
            const data = await res.json();
            if (data.success) {
                setAccountsData(data.data || []);
                if (data.summary) {
                    setSummary(data.summary);
                }
            } else {
                console.error('Finans verisi alınamadı:', data.message);
            }
        } catch (error) {
            console.error('API bağlantı hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchAccounts();
        setFilterCategory('Tümü');
        setSearchTerm('');
    }, [activeTab, activePeriod]);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleOpenModal = () => {
        setFormData({
            category: activeTab === 'GİDER' ? 'Kira / Ofis Kirası' : 'Ürün Satış Geliri',
            amount: '',
            description: '',
            transaction_date: new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleQuickAddAmount = (addVal) => {
        const current = Number(formData.amount) || 0;
        setFormData(prev => ({ ...prev, amount: String(current + addVal) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || Number(formData.amount) <= 0) {
            alert('Lütfen geçerli bir tutar (TL) giriniz.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/finance/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: activeTab,
                    category: formData.category,
                    amount: Number(formData.amount),
                    description: formData.description || formData.category,
                    transaction_date: formData.transaction_date
                })
            });
            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                fetchAccounts();
            } else {
                alert(data.message || 'İşlem eklenemedi.');
            }
        } catch (error) {
            console.error('Kayıt hatası:', error);
            alert('Sunucuyla iletişim kurulurken bir hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (item) => {
        if (!item.is_manual) {
            if (item.type === 'SALARY') {
                if (window.confirm('Bu gider kalemi İnsan Kaynakları modülündeki personel maaşlarından otomatik hesaplanmaktadır. Personel listesi ekranına giderek maaş bilgisini düzenlemek ister misiniz?')) {
                    if (onNavigate) onNavigate('insan-kaynaklari');
                }
                return;
            }
            if (item.type === 'PROCUREMENT') {
                if (window.confirm('Bu gider kalemi Satınalma / WMS tedarik siparişlerinden otomatik hesaplanmaktadır. Tedarik siparişleri ekranına gitmek ister misiniz?')) {
                    if (onNavigate) onNavigate('tedarik-siparisleri');
                }
                return;
            }
            alert('Bu işlem otomatik entegre edilmiştir. Sadece kendi modülünden yönetilebilir.');
            return;
        }
        if (!window.confirm(`"${item.title}" kalemi sistemden silinecek. Onaylıyor musunuz?`)) return;

        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/finance/transactions/${item.raw_id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchAccounts();
            } else {
                alert(data.message || 'Silme işlemi başarısız.');
            }
        } catch (error) {
            console.error('Silme hatası:', error);
        }
    };

    // Arama ve Kategori filtrelemesi
    const filteredAccounts = useMemo(() => {
        return accountsData.filter(item => {
            const matchesSearch = searchTerm === '' || 
                (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesCategory = filterCategory === 'Tümü' || 
                (filterCategory === 'Personel Maaşı' && item.type === 'SALARY') ||
                (filterCategory === 'Malzeme Tedariki' && item.type === 'PROCUREMENT') ||
                (filterCategory === 'Manuel Giderler' && item.type === 'MANUAL') ||
                (filterCategory === item.category);

            return matchesSearch && matchesCategory;
        });
    }, [accountsData, searchTerm, filterCategory]);

    const formatTL = (val) => {
        return Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
    };

    const getDotColor = (type) => {
        switch (type) {
            case 'SALARY':
                return '#93c5fd'; // Soft pastel mavi nokta
            case 'PROCUREMENT':
                return '#fcd34d'; // Soft pastel sarı/kehribar nokta
            case 'MANUAL':
                return '#cbd5e1'; // Soft pastel gri nokta
            default:
                return '#94a3b8';
        }
    };

    const cleanBadgeText = (badgeStr, category) => {
        if (!badgeStr) return category || 'Genel İşlem';
        // Emojileri ve gereksiz ekleri temizle
        return badgeStr
            .replace(/[👥📦🏭💰⚠️📉📈📌🟢]/g, '')
            .replace(/^[\s-]+|[\s-]+$/g, '') || category;
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div className="finance-accounts-container">
            {/* Üst Başlık ve Sekme Anahtarı */}
            <div className="finance-header-section">
                <div className="finance-title-area">
                    <h1>Gelir & Gider Hesapları</h1>
                    <p>Kiralar, faturalar, İK personel maaşları ve WMS birim maliyetli malzeme siparişlerinin merkezi defteri.</p>
                </div>
                <div className="finance-tab-switch">
                    <button 
                        className={`finance-tab-btn ${activeTab === 'GİDER' ? 'active-gider' : ''}`}
                        onClick={() => setActiveTab('GİDER')}
                    >
                        <SvgIcon name="trending-down" />
                        Gider Hesapları
                    </button>
                    <button 
                        className={`finance-tab-btn ${activeTab === 'GELİR' ? 'active-gelir' : ''}`}
                        onClick={() => setActiveTab('GELİR')}
                    >
                        <SvgIcon name="trending-up" />
                        Gelir Hesapları
                    </button>
                </div>
                <div>
                    {activeTab === 'GİDER' ? (
                        <button className="add-expense-btn" onClick={handleOpenModal}>
                            <SvgIcon name="plus" />
                            Gider Ekle (Kira, Fatura, vb.)
                        </button>
                    ) : (
                        <button className="add-income-btn" onClick={handleOpenModal}>
                            <SvgIcon name="plus" />
                            Gelir Ekle
                        </button>
                    )}
                </div>
            </div>

            {/* Finansal Özet Kartları (Sade, ikonsuz, 2 satırlı minimalist yapı) */}
            <div className="finance-summary-cards">
                <div className="f-card" title="Toplam Gelir eksi Toplam Gider (Gelir - Gider) arasındaki net finansal kâr">
                    <div className="f-card-header">
                        <span className="f-card-title">NET FİNANSAL DURUM (Gelir - Gider)</span>
                    </div>
                    <div className={`f-card-value ${summary.netBalance < 0 ? 'negative' : ''}`}>
                        {formatTL(summary.netBalance)}
                    </div>
                </div>

                <div className="f-card" title="Tüm sistemdeki maaş, malzeme tedariği, kira ve fatura giderleri toplamı">
                    <div className="f-card-header">
                        <span className="f-card-title">TOPLAM GİDERLER</span>
                    </div>
                    <div className="f-card-value">
                        {formatTL(summary.totalExpense)}
                    </div>
                </div>

                <div className="f-card" title="İK modülündeki aktif çalışanların aylık maaş toplamı">
                    <div className="f-card-header">
                        <span className="f-card-title">İK PERSONEL MAAŞ YÜKÜ</span>
                    </div>
                    <div className="f-card-value">
                        {formatTL(summary.salaryTotal)}
                    </div>
                </div>

                <div className="f-card" title="Satınalma siparişleri ve WMS depolarına giren hammadde birim maliyet çarpımları">
                    <div className="f-card-header">
                        <span className="f-card-title">MALZEME & TEDARİK MALİYETİ</span>
                    </div>
                    <div className="f-card-value">
                        {formatTL(summary.procurementTotal)}
                    </div>
                </div>
            </div>

            {/* Arama, Kategori Filtreleri */}
            <div className="finance-toolbar">
                <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                    <div className="f-search-box" style={{ flex: 1, minWidth: '200px' }}>
                        <SvgIcon name="search" />
                        <input 
                            type="text" 
                            className="f-search-input" 
                            placeholder="Kalem adı, tedarikçi veya açıklama ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        style={{ height: '40px', padding: '0 32px 0 16px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#f8fafc', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")' }}
                        value={activePeriod}
                        onChange={(e) => setActivePeriod(e.target.value)}
                        title="Dönem Seçimi"
                    >
                        <option value="this_month">Bu Ay</option>
                        <option value="last_3_months">Son 3 Ay (Çeyrek)</option>
                        <option value="last_6_months">Son 6 Ay</option>
                        <option value="this_year">Bu Yıl</option>
                        <option value="all">Tüm Zamanlar</option>
                    </select>
                </div>

                <div className="f-filter-pills">
                    <button 
                        className={`f-pill ${filterCategory === 'Tümü' ? 'active' : ''}`}
                        onClick={() => setFilterCategory('Tümü')}
                    >
                        Tümü
                    </button>
                    {activeTab === 'GİDER' && (
                        <>
                            <button 
                                className={`f-pill ${filterCategory === 'Personel Maaşı' ? 'active' : ''}`}
                                onClick={() => setFilterCategory('Personel Maaşı')}
                            >
                                Personel Maaşları
                            </button>
                            <button 
                                className={`f-pill ${filterCategory === 'Malzeme Tedariki' ? 'active' : ''}`}
                                onClick={() => setFilterCategory('Malzeme Tedariki')}
                            >
                                Malzeme Tedariki
                            </button>
                            <button 
                                className={`f-pill ${filterCategory === 'Manuel Giderler' ? 'active' : ''}`}
                                onClick={() => setFilterCategory('Manuel Giderler')}
                            >
                                Kira & Faturalar
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tablo Alanı (Koyu tema, sıfır gürültü) */}
            <div className="finance-table-card">
                {loading && accountsData.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                        Finansal hesaplar yükleniyor...
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '8px', opacity: 0.4 }}>📂</div>
                        <h3 style={{ fontSize: '1rem', color: '#94a3b8', margin: '0 0 4px 0', fontWeight: 500 }}>Kayıt Bulunamadı</h3>
                        <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.7 }}>Bu sekmede seçili filtreye uygun finansal işlem bulunamadı.</p>
                    </div>
                ) : (
                    <table className="f-table">
                        <thead>
                            <tr>
                                <th style={{ width: '130px' }}>TARİH</th>
                                <th style={{ width: '220px' }}>KATEGORİ</th>
                                <th>İŞLEM BAŞLIĞI</th>
                                <th style={{ width: '170px', textAlign: 'right' }}>TUTAR</th>
                                <th style={{ width: '70px', textAlign: 'center' }}>İŞLEM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAccounts.map((item) => (
                                <tr key={item.id} className="hover-row">
                                    <td style={{ fontWeight: 500, color: '#64748b' }}>
                                        {item.date ? new Date(item.date).toLocaleDateString('tr-TR') : 'Tarih Yok'}
                                    </td>
                                    <td>
                                        <span className="f-badge-minimal">
                                            <span className="f-dot" style={{ background: getDotColor(item.type) }}></span>
                                            {cleanBadgeText(item.badge, item.category)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="f-item-title">{item.title}</div>
                                        {item.subtitle && (
                                            <div className="f-item-subtitle">
                                                {item.subtitle}
                                            </div>
                                        )}
                                    </td>
                                    <td className="f-amount">
                                        {activeTab === 'GİDER' ? '-' : '+'}{formatTL(item.amount)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
                                            <button 
                                                className="f-action-btn"
                                                onClick={() => setSelectedInvoice(item)}
                                                title="e-Fatura / Malzeme Kabul İrsaliyesi Çıktısı Al"
                                                style={{ color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
                                            >
                                                📄
                                            </button>
                                            <button 
                                                className="f-action-btn"
                                                onClick={() => handleDelete(item)}
                                                title={item.is_manual ? 'Bu manuel kalemi sil' : (item.type === 'SALARY' ? 'Personel listesine gidip maaşı düzenle' : 'Tedarik modülüne gidip siparişi düzenle')}
                                                style={{ opacity: item.is_manual ? 1 : 0.7 }}
                                            >
                                                <SvgIcon name={item.is_manual ? 'trash' : 'external-link'} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Yeni Gider / Gelir Ekleme Modalı */}
            {isModalOpen && (
                <div className="finance-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="finance-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="finance-modal-header">
                            <h3>
                                {activeTab === 'GİDER' ? 'Yeni Gider Kalemi Ekle' : 'Yeni Gelir Kalemi Ekle'}
                            </h3>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                                <SvgIcon name="close" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="finance-modal-body">
                                <div className="f-form-group">
                                    <label>Kategori Seçimi</label>
                                    <select 
                                        className="f-form-select"
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    >
                                        {(activeTab === 'GİDER' ? giderKategorileri : gelirKategorileri).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="f-form-group">
                                    <label>Tutar (TL)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="f-form-input" 
                                        placeholder="0.00 ₺"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        required
                                    />
                                    <div className="f-quick-chips">
                                        <span className="f-chip" onClick={() => handleQuickAddAmount(1000)}>+1.000 ₺</span>
                                        <span className="f-chip" onClick={() => handleQuickAddAmount(5000)}>+5.000 ₺</span>
                                        <span className="f-chip" onClick={() => handleQuickAddAmount(10000)}>+10.000 ₺</span>
                                        <span className="f-chip" onClick={() => handleQuickAddAmount(25000)}>+25.000 ₺</span>
                                        <span className="f-chip" onClick={() => handleQuickAddAmount(50000)}>+50.000 ₺</span>
                                    </div>
                                </div>

                                <div className="f-form-group">
                                    <label>Açıklama / Başlık</label>
                                    <input 
                                        type="text" 
                                        className="f-form-input"
                                        placeholder="İşlem detayını veya faturanın aidiyetini belirtin..."
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>

                                <div className="f-form-group">
                                    <label>İşlem Tarihi</label>
                                    <input 
                                        type="date" 
                                        className="f-form-input"
                                        value={formData.transaction_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="finance-modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                                    Vazgeç
                                </button>
                                <button type="submit" className={activeTab === 'GİDER' ? 'btn-submit-gider' : 'btn-submit-gelir'} disabled={submitting}>
                                    {submitting ? 'Kaydediliyor...' : 'Kalemi Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <EInvoiceModal 
                isOpen={!!selectedInvoice} 
                onClose={() => setSelectedInvoice(null)} 
                invoiceData={selectedInvoice} 
            />
        </div>
    );
};

export default FinanceAccounts;


