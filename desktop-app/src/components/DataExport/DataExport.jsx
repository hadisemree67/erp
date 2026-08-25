/**
 * ============================================================================
 * BİLEŞEN ADI: DataExport
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki verileri Excel/PDF formatında dışa aktarma modülü.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const TURKISH_CITIES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
].sort((a, b) => a.localeCompare(b, 'tr'));

const DataExport = ({ currentUser }) => {
    const [selectedModule, setSelectedModule] = useState('orders');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'Tümü',
        warehouse: 'Tümü',
        category: 'Tümü',
        brand: 'Tümü',
        department: 'Tümü',
        city: 'Tümü',
        gender: 'Tümü',
        ageGroup: 'Tümü'
    });
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [resWh, resCat, resBrand] = await Promise.all([
                    apiFetch('http://localhost:3000/api/warehouses'),
                    apiFetch('http://localhost:3000/api/categories'),
                    apiFetch('http://localhost:3000/api/brands')
                ]);
                
                const dataWh = await resWh.json();
                const dataCat = await resCat.json();
                const dataBrand = await resBrand.json();

                if (Array.isArray(dataWh)) setWarehouses(dataWh);
                else if (dataWh.success) setWarehouses(dataWh.data);
                
                if (Array.isArray(dataCat)) setCategories(dataCat);
                else if (dataCat.success) setCategories(dataCat.data);
                
                if (Array.isArray(dataBrand)) setBrands(dataBrand);
                else if (dataBrand.success) setBrands(dataBrand.data);
            } catch (err) {
                console.error("Filtre verileri çekilemedi:", err);
            }
        };
        fetchFilters();
    }, []);

    useEffect(() => {
        setFilters({
            status: 'Tümü',
            warehouse: 'Tümü',
            category: 'Tümü',
            brand: 'Tümü',
            department: 'Tümü',
            city: 'Tümü',
            gender: 'Tümü',
            ageGroup: 'Tümü'
        });
    }, [selectedModule]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                module: selectedModule,
                status: filters.status,
                warehouse: filters.warehouse,
                category: filters.category,
                brand: filters.brand,
                department: filters.department,
                city: filters.city,
                gender: filters.gender,
                ageGroup: filters.ageGroup
            }).toString();

            const res = await apiFetch(`http://localhost:3000/api/data-export?${query}`);
            const result = await res.json();

            if (result.success) {
                if (!result.data || result.data.length === 0) {
                    alert('Aktarılacak veri bulunamadı.');
                    setLoading(false);
                    return;
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet("Rapor");
                
                // Sütun başlıklarını ayarla
                const keys = Object.keys(result.data[0]);
                worksheet.columns = keys.map(key => ({
                    header: key,
                    key: key,
                    width: 20
                }));
                
                // Verileri ekle
                worksheet.addRows(result.data);
                
                // Dosyayı oluştur ve indir
                const buffer = await workbook.xlsx.writeBuffer();
                const fileName = `Rapor_${selectedModule}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
                saveAs(new Blob([buffer]), fileName);
            } else {
                alert('Hata: ' + result.message);
            }
        } catch (error) {
            console.error('Export Error:', error);
            alert('Rapor oluşturulurken sunucu hatası meydana geldi.');
        } finally {
            setLoading(false);
        }
    };

    const modules = [
        { id: 'orders', label: 'Siparişler (Tüm Detaylarıyla)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
        { id: 'customers', label: 'Müşteriler (Adres ve İletişim Bilgileri)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
        { id: 'stock', label: 'Depo ve Stok Bakiyeleri', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg> },
        { id: 'products', label: 'Satıştaki Ürün Listesi', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> },
        { id: 'raw_materials', label: 'Hammadde ve Tedarik Listesi', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> },
        { id: 'employees', label: 'Personel Listesi (İK)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
        { id: 'users', label: 'Sistem Kullanıcıları', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20v-2a4 4 0 0 1 4-4h4"></path><circle cx="8" cy="8" r="4"></circle><rect x="14" y="14" width="8" height="6" rx="1" ry="1"></rect><path d="M16 14v-2a2 2 0 0 1 4 0v2"></path></svg> }
    ];

    const currentModuleObj = modules.find(m => m.id === selectedModule);

    return (
        <div style={{ padding: '40px', backgroundColor: '#fafafa', minHeight: '100vh', fontFamily: `'Inter', sans-serif`, display: 'flex', justifyContent: 'center' }} onClick={() => setIsDropdownOpen(false)}>
            <div style={{ width: '100%', maxWidth: '750px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div style={{ padding: '32px 32px 24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#334155', margin: '0 0 6px 0' }}>
                            Veri Aktar (Kurumsal Raporlama Merkezi)
                        </h1>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                            Tüm modüllerden detaylı ve birleştirilmiş verileri saniyeler içinde Excel olarak dışa aktarabilirsiniz.
                        </p>
                    </div>
                </div>

                {/* Form Content */}
                <div style={{ padding: '32px', flex: 1 }}>
                    {/* Module Selection */}
                    <div style={{ marginBottom: '24px', position: 'relative' }}>
                        <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Raporlanacak Veri Modülünü Seçin</label>
                        
                        <div 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{ 
                                width: '100%', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', 
                                fontSize: '15px', color: '#334155', backgroundColor: '#ffffff', cursor: 'pointer',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                transition: 'border-color 0.2s',
                                borderColor: isDropdownOpen ? '#cbd5e1' : '#e2e8f0'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: '#475569', display: 'flex' }}>
                                    {currentModuleObj?.icon}
                                </div>
                                {currentModuleObj?.label}
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>

                        {isDropdownOpen && (
                            <div style={{ 
                                position: 'absolute', top: '100%', left: 0, right: 0, 
                                backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', 
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                marginTop: '4px', zIndex: 50, overflow: 'hidden'
                            }}>
                                {modules.map(mod => (
                                    <div 
                                        key={mod.id}
                                        onClick={() => { setSelectedModule(mod.id); setIsDropdownOpen(false); }}
                                        style={{ 
                                            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', 
                                            cursor: 'pointer', transition: 'background-color 0.2s',
                                            backgroundColor: selectedModule === mod.id ? '#f8fafc' : 'white',
                                            borderBottom: '1px solid #f1f5f9'
                                        }}
                                        onMouseEnter={(e) => { if(selectedModule !== mod.id) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                                        onMouseLeave={(e) => { if(selectedModule !== mod.id) e.currentTarget.style.backgroundColor = 'white' }}
                                    >
                                        <div style={{ color: selectedModule === mod.id ? '#3b82f6' : '#475569', display: 'flex' }}>
                                            {mod.icon}
                                        </div>
                                        <span style={{ color: selectedModule === mod.id ? '#3b82f6' : '#334155', fontWeight: selectedModule === mod.id ? '500' : '400' }}>
                                            {mod.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dynamic Filter Section */}
                    {selectedModule === 'orders' && (
                        <div style={{ marginBottom: '28px' }}>
                            <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Sipariş Durumu Filtresi</label>
                            <select 
                                value={filters.status} 
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                            >
                                <option value="Tümü">Tümü (Tüm Siparişleri İndir)</option>
                                <option value="Beklemede">Beklemede (Yeni)</option>
                                <option value="Onaylandı">Onaylandı</option>
                                <option value="Hazırlanıyor">Hazırlanıyor</option>
                                <option value="Toplamada">Toplamada</option>
                                <option value="Hazır">Hazır (Toplandı)</option>
                                <option value="Paketleniyor">Paketleniyor</option>
                                <option value="Paketlendi">Paketlendi</option>
                                <option value="Kargoya Verildi">Kargoya Verildi</option>
                                <option value="Teslim Edildi">Teslim Edildi</option>
                                <option value="İptal Edildi">İptal Edildi</option>
                            </select>
                        </div>
                    )}

                    {(selectedModule === 'orders' || selectedModule === 'customers') && (
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Şehir Filtresi</label>
                                <select 
                                    value={filters.city} 
                                    onChange={(e) => handleFilterChange('city', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                >
                                    <option value="Tümü">Tüm Şehirler</option>
                                    {TURKISH_CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Cinsiyet Filtresi</label>
                                <select 
                                    value={filters.gender} 
                                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                >
                                    <option value="Tümü">Tüm Cinsiyetler</option>
                                    <option value="Erkek">Erkek</option>
                                    <option value="Kadın">Kadın</option>
                                </select>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Yaş Grubu Filtresi</label>
                                <select 
                                    value={filters.ageGroup} 
                                    onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                >
                                    <option value="Tümü">Tüm Yaş Grupları</option>
                                    <option value="18-">18 Yaş Altı</option>
                                    <option value="18-25">18 - 25 Yaş</option>
                                    <option value="26-35">26 - 35 Yaş</option>
                                    <option value="36-45">36 - 45 Yaş</option>
                                    <option value="45+">45 Yaş Üstü</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {(selectedModule === 'stock' || selectedModule === 'products' || selectedModule === 'raw_materials') && (
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
                            {(selectedModule === 'stock' || selectedModule === 'products') && (
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Depo Filtresi</label>
                                    <select 
                                        value={filters.warehouse} 
                                        onChange={(e) => handleFilterChange('warehouse', e.target.value)}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                    >
                                        <option value="Tümü">Tüm Depolar</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.name}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Kategori Filtresi</label>
                                <select 
                                    value={filters.category} 
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                >
                                    <option value="Tümü">Tüm Kategoriler</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Marka Filtresi</label>
                                <select 
                                    value={filters.brand} 
                                    onChange={(e) => handleFilterChange('brand', e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                >
                                    <option value="Tümü">Tüm Markalar</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {selectedModule === 'employees' && (
                        <div style={{ marginBottom: '28px' }}>
                            <label style={{ display: 'block', fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '14px' }}>Departman Filtresi</label>
                            <select 
                                value={filters.department} 
                                onChange={(e) => handleFilterChange('department', e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', backgroundColor: '#ffffff', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                            >
                                <option value="Tümü">Tüm Departmanlar</option>
                                <option value="Üretim">Üretim</option>
                                <option value="Depo">Depo</option>
                                <option value="Yönetim">Yönetim</option>
                                <option value="Satış">Satış</option>
                            </select>
                        </div>
                    )}

                    {/* Export Button */}
                    <button 
                        onClick={handleExport}
                        disabled={loading}
                        style={{ 
                            width: '100%', 
                            padding: '14px', 
                            backgroundColor: loading ? '#94a3b8' : '#475569', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '6px', 
                            fontSize: '15px', 
                            fontWeight: '600', 
                            cursor: loading ? 'not-allowed' : 'pointer', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '10px', 
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {loading ? (
                            <span>Rapor Hazırlanıyor, Lütfen Bekleyin...</span>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                Raporu Excel Olarak İndir
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa', borderRadius: '0 0 8px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>İndirilen raporlar Excel formatında sunulur ve anlık verileri içerir.</span>
                </div>
            </div>
        </div>
    );
};

export default DataExport;


