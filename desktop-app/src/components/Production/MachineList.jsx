/**
 * ============================================================================
 * BİLEŞEN ADI: MachineList
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Üretim emirleri, makine takibi ve imalat operasyonlarını yöneten arayüz.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (MachineList.jsx), Üretim talepleri, makineler, reçete (BOM) tanımları ve aktif üretim süreçlerini içerir.
 */

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const MachineList = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [machines, setMachines] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [name, setName] = useState('');
    const [machineCode, setMachineCode] = useState('');
    const [maxCapacity, setMaxCapacity] = useState('');
    const [minCapacity, setMinCapacity] = useState('');
    const [prepTime, setPrepTime] = useState('');
    const [lastMaintenance, setLastMaintenance] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [alternativeMachineId, setAlternativeMachineId] = useState('');

    // Yeni bakımcı / satıcı bilgileri
    const [supplierName, setSupplierName] = useState('');
    const [supplierEmail, setSupplierEmail] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [maintenancePeriodMonths, setMaintenancePeriodMonths] = useState(12);

    // Sorun Bildir Modalı
    const [reportingMachine, setReportingMachine] = useState(null);
    const [issueDescription, setIssueDescription] = useState('');
    const [reportingLoading, setReportingLoading] = useState(false);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/production/machines');
            const data = await res.json();
            if (data.success) {
                setMachines(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/categories');
            const data = await res.json();
            if (Array.isArray(data)) {
                setCategories(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchMachines();
        fetchCategories();
    }, []);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleCategoryToggle = (catName) => {
        if (selectedCategories.includes(catName)) {
            setSelectedCategories(selectedCategories.filter(c => c !== catName));
        } else {
            setSelectedCategories([...selectedCategories, catName]);
        }
    };

    const handleEdit = (m) => {
        setEditingId(m.id);
        setName(m.name);
        setMachineCode(m.machine_code || '');
        setMaxCapacity(m.max_capacity || '');
        setMinCapacity(m.min_capacity || '');
        setPrepTime(m.prep_time_minutes || '');
        setLastMaintenance(m.last_maintenance ? m.last_maintenance.split('T')[0] : '');
        setAlternativeMachineId(m.alternative_machine_id || '');
        setSupplierName(m.supplier_name || '');
        setSupplierEmail(m.supplier_email || '');
        setSupplierPhone(m.supplier_phone || '');
        setMaintenancePeriodMonths(m.maintenance_period_months || 12);
        
        let cats = [];
        if (m.allowed_categories) {
            try {
                cats = typeof m.allowed_categories === 'string' ? JSON.parse(m.allowed_categories) : m.allowed_categories;
            } catch (e) { console.warn("Sessiz Hata Yakalandı:", e.message); }
        }
        setSelectedCategories(Array.isArray(cats) ? cats : []);
        
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu makineyi silmek istediğinize emin misiniz?')) return;
        
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/production/machines/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchMachines();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFixMachine = async (id, machineName) => {
        if (!window.confirm(`${machineName} makinesi için arıza giderildi olarak işaretlenip durumu "Boş (Çalışıyor)" yapılsın mı?`)) return;
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/production/machines/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Boş' })
            });
            const data = await res.json();
            if (data.success) {
                fetchMachines();
            } else {
                alert(data.message || 'Hata oluştu.');
            }
        } catch (err) {
            console.error(err);
            alert('Sunucuya bağlanılamadı.');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setMachineCode('');
        setMaxCapacity('');
        setMinCapacity('');
        setPrepTime('');
        setLastMaintenance('');
        setSelectedCategories([]);
        setAlternativeMachineId('');
        setSupplierName('');
        setSupplierEmail('');
        setSupplierPhone('');
        setMaintenancePeriodMonths(12);
        setIsFormOpen(false);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${import.meta.env.VITE_API_URL}/api/production/machines/${editingId}` : import.meta.env.VITE_API_URL + '/api/production/machines';
            
            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    machine_code: machineCode,
                    max_capacity: maxCapacity,
                    min_capacity: minCapacity,
                    prep_time_minutes: prepTime,
                    last_maintenance: lastMaintenance,
                    allowed_categories: selectedCategories,
                    alternative_machine_id: alternativeMachineId || null,
                    supplier_name: supplierName,
                    supplier_email: supplierEmail,
                    supplier_phone: supplierPhone,
                    maintenance_period_months: maintenancePeriodMonths
                })
            });
            const data = await res.json();
            if (data.success) {
                resetForm();
                fetchMachines();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReportIssueSubmit = async (e) => {
        e.preventDefault();
        if (!reportingMachine) return;
        
        setReportingLoading(true);
        try {
            const res = await apiFetch(`${import.meta.env.VITE_API_URL}/api/production/machines/${reportingMachine.id}/report-issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    issue_description: issueDescription,
                    reporter_name: currentUser?.name || 'Üretim Operatörü'
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                setReportingMachine(null);
                setIssueDescription('');
                fetchMachines();
            } else {
                alert(data.message || 'Bir hata oluştu.');
            }
        } catch (err) {
            console.error(err);
            alert('Sunucuya bağlanılamadı.');
        } finally {
            setReportingLoading(false);
        }
    };

    const renderCategories = (catsJson) => {
        if (!catsJson) return '-';
        try {
            let cats = catsJson;
            if (typeof cats === 'string') cats = JSON.parse(cats);
            if (Array.isArray(cats)) return cats.join(', ');
            return '-';
        } catch(e) {
            return '-';
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Makine & Bakım Yönetimi</h2>
                <button 
                    onClick={() => {
                        if (isFormOpen) {
                            resetForm();
                        } else {
                            resetForm();
                            setIsFormOpen(true);
                        }
                    }}
                    style={{ padding: '8px 16px', backgroundColor: isFormOpen ? '#f1f5f9' : '#3b82f6', color: isFormOpen ? '#334155' : 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    {isFormOpen ? 'İptal' : '+ Yeni Makine Ekle'}
                </button>
            </div>
            
            {isFormOpen && (
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Makine / Kazan Adı *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: Mikser Kazan - 01" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Makine Kodu / Tipi</label>
                    <input type="text" value={machineCode} onChange={e => setMachineCode(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: MKS-01" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Maks. Hacim (Litre/Kg) *</label>
                    <input type="number" step="0.01" value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)} required style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: 1000" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Min. Şarj Miktarı *</label>
                    <input type="number" step="0.01" value={minCapacity} onChange={e => setMinCapacity(e.target.value)} required style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: 200" />
                </div>

                {/* Bakımcı ve Satın Alınan Yer Bilgileri */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', paddingTop: '16px', marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Satıcı / Bakımcı Adı Soyadı / Firma</label>
                        <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: Ahmet Yılmaz / Teknik Makine A.Ş." />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Bakımcı E-Posta Adresi</label>
                        <input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: ahmet@teknikmakine.com" />
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>* Arıza bildirimleri ve yaklaşan bakım uyarıları bu adrese otomatik iletilir.</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Bakımcı Telefon Numarası</label>
                        <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: 0532 XXX XX XX" />
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Son Bakım Tarihi</label>
                            <input type="date" value={lastMaintenance} onChange={e => setLastMaintenance(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Bakım Periyodu (Ay)</label>
                            <input type="number" min="1" value={maintenancePeriodMonths} onChange={e => setMaintenancePeriodMonths(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: 12" />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Alternatif Makine (İsteğe Bağlı)</label>
                    <select value={alternativeMachineId} onChange={(e) => setAlternativeMachineId(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        <option value="">Seçiniz...</option>
                        {machines.filter(m => m.id !== editingId).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Bu makine doluysa Job Card üzerinde üretim otomatik olarak alternatif makinede başlatılır.</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Yıkama/Hazırlık Süresi (Dk)</label>
                    <input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} placeholder="Örn: 45" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>İşleyebildiği Ürün Kategorileri</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                        {categories.map(c => (
                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', color: '#0f172a' }}>
                                <input type="checkbox" checked={selectedCategories.includes(c.name)} onChange={() => handleCategoryToggle(c.name)} />
                                {c.name}
                            </label>
                        ))}
                    </div>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {editingId ? 'Değişiklikleri Kaydet' : '+ Makineyi Ekle'}
                    </button>
                </div>
            </form>
            )}

            {loading ? <p>Yükleniyor...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Kodu / Adı</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Kapasite & Hazırlık</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Kategoriler</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Bakımcı & Takvim</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Durum</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>Meşguliyet Bitişi</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#475569' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machines.map(m => {
                            const isBroken = m.status === 'Arızalı';
                            return (
                            <tr key={m.id} className="hover-row" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isBroken ? '#fef2f2' : 'transparent', transition: 'background-color 0.15s' }}>
                                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                                    <div style={{ color: '#0f172a', fontWeight: 'bold' }}>{m.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '12px' }}>{m.machine_code || '-'}</div>
                                </td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>
                                    <div><span style={{ color: '#0f172a', fontWeight: 'bold' }}>{m.max_capacity}</span> <span style={{ color: '#64748b', fontSize: '12px' }}>(Min: {m.min_capacity})</span></div>
                                    <div style={{ color: '#64748b', fontSize: '12px' }}>Hazırlık: {m.prep_time_minutes} Dk</div>
                                </td>
                                <td style={{ padding: '12px', fontSize: '13px', color: '#475569', maxWidth: '180px' }}>{renderCategories(m.allowed_categories)}</td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>
                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{m.supplier_name || 'Belirtilmemiş'}</div>
                                    {m.supplier_phone && <div style={{ fontSize: '12px', color: '#64748b' }}>Tel: {m.supplier_phone}</div>}
                                    {m.next_maintenance ? (
                                        <div style={{ marginTop: '4px', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e2e8f0', display: 'inline-block', color: '#334155' }}>
                                            Sonraki Bakım: <strong>{new Date(m.next_maintenance).toLocaleDateString('tr-TR')}</strong> ({m.maintenance_period_months} Ay)
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Bakım periyodu girilmemiş</div>
                                    )}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ 
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: m.status === 'Boş' ? '#dcfce3' : m.status === 'Arızalı' ? '#fee2e2' : '#fef3c7',
                                        color: m.status === 'Boş' ? '#16a34a' : m.status === 'Arızalı' ? '#dc2626' : '#d97706'
                                    }}>
                                        {m.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px', fontSize: '14px', color: '#64748b' }}>{m.busy_until ? new Date(m.busy_until).toLocaleString('tr-TR') : '-'}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                                        {m.status !== 'Boş' && (
                                            <button 
                                                onClick={() => handleFixMachine(m.id, m.name)} 
                                                style={{ padding: '6px 10px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                title="Arıza giderildiğinde veya bakım bittiğinde makineyi tekrar Boş ve Çalışıyor yap"
                                            >
                                                ✓ Arıza Giderildi (Çalışıyor)
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                setReportingMachine(m);
                                                setIssueDescription('');
                                            }} 
                                            style={{ padding: '6px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            title="Makine arızalandıysa veya sorun varsa bakımcıya acil bildirim gönder"
                                        >
                                            Sorun Bildir
                                        </button>
                                        <button onClick={() => handleEdit(m)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button onClick={() => handleDelete(m.id)} title="Sil" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                        {machines.length === 0 && (
                            <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Makine bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            )}

            {/* Sorun Bildir / Arıza Bildir Modalı */}
            {reportingMachine && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#dc2626' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Makine Arıza & Sorun Bildirimi</h3>
                        </div>
                        
                        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                            <strong>{reportingMachine.name}</strong> makinesinde yaşadığınız sorunu açıklayınız. 
                            {reportingMachine.supplier_email ? (
                                <span style={{ display: 'block', marginTop: '4px', color: '#16a34a', fontWeight: '500' }}>
                                    ✓ Bildirildiğinde bakımcıya ({reportingMachine.supplier_email}) acil arıza e-postası iletilecek ve makine durumu "Arızalı" yapılacaktır.
                                </span>
                            ) : (
                                <span style={{ display: 'block', marginTop: '4px', color: '#d97706', fontWeight: '500' }}>
                                    ⚠️ Bu makinede kayıtlı satıcı/bakımcı e-postası yok. Durum sadece "Arızalı" olarak işaretlenecektir.
                                </span>
                            )}
                        </p>

                        <form onSubmit={handleReportIssueSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Sorun / Arıza Detayı *</label>
                                <textarea 
                                    rows="4" 
                                    required 
                                    value={issueDescription} 
                                    onChange={e => setIssueDescription(e.target.value)} 
                                    placeholder="Örn: Motor aşırı ısındı ve olağandışı sesler çıkararak durdu. Acil kontrol edilmesi gerekiyor." 
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => { setReportingMachine(null); setIssueDescription(''); }}
                                    style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    İptal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={reportingLoading}
                                    style={{ padding: '8px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: reportingLoading ? 0.7 : 1 }}
                                >
                                    {reportingLoading ? 'İletiliyor...' : 'Sorunu Bildir ve Mail At'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MachineList;

