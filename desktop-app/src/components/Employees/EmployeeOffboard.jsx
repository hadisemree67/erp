/**
 * ============================================================================
 * DOSYA ADI: EmployeeOffboard.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - İnsan Kaynakları / İşten Çıkarma (Offboarding) Yönetimi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Bir çalışanın işten ayrılma sürecini yönetir. Kıdem tazminatı hesaplama, ihbar süresi takibi, zimmetli demirbaşların iadesi ve iş akdi sonlandırma onay işlemlerini gerçekleştiren arayüzdür.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Tarih ve Tazminat Hesaplama Algoritmaları, Lucide-React
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Arkayüzdeki `/api/employees/:id/offboard` rotaları ile çalışarak personelin ilişik kesme sürecini veritabanına işler.
 * ============================================================================
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect } from 'react';

const EmployeeOffboard = ({ currentUser, onClose }) => {
    const [activeTab, setActiveTab] = useState('new'); // 'new' or 'pending'
    const [employees, setEmployees] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const hasPerm = (key) => currentUser?.role === 'admin' || (currentUser?.permissions || []).includes(key);

    const [formData, setFormData] = useState({
        sgk_code: '03',
        end_date: new Date().toISOString().split('T')[0],
        exit_reason: 'İstifa',
        severance_pay: 0
    });

    const sgkCodes = {
        '03': { label: 'Kod 03 (İstifa)', paysSeverance: false },
        '04': { label: 'Kod 04 (İşveren Feshi - Haklı Neden Yok)', paysSeverance: true },
        '08': { label: 'Kod 08 (Emeklilik)', paysSeverance: true },
        '12': { label: 'Kod 12 (Askerlik)', paysSeverance: true },
        '46': { label: 'Kod 46-50 (Ahlak Kurallarına Aykırılık / Devamsızlık)', paysSeverance: false }
    };

    const fetchEmployees = async () => {
        try {
            const res = await apiFetch('http://localhost:3000/api/employees');
            const data = await res.json();
            if (Array.isArray(data)) {
                setEmployees(data.filter(e => e.is_active === 1 && e.offboarding_status !== 'PENDING'));
                setPendingRequests(data.filter(e => e.offboarding_status === 'PENDING'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const selectedEmployee = employees.find(e => e.id.toString() === selectedEmpId);

    // Calculate severance dynamically
    useEffect(() => {
        if (selectedEmployee && selectedEmployee.start_date && selectedEmployee.salary) {
            const codeInfo = sgkCodes[formData.sgk_code];
            if (!codeInfo.paysSeverance) {
                setFormData(prev => ({ ...prev, severance_pay: 0 }));
                return;
            }

            const start = new Date(selectedEmployee.start_date);
            const end = new Date(formData.end_date);
            
            if (end > start) {
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const yearsWorked = diffDays / 365.25;

                if (yearsWorked >= 1) {
                    const severance = yearsWorked * Number(selectedEmployee.salary);
                    setFormData(prev => ({ ...prev, severance_pay: severance.toFixed(2) }));
                } else {
                    setFormData(prev => ({ ...prev, severance_pay: 0 }));
                }
            } else {
                setFormData(prev => ({ ...prev, severance_pay: 0 }));
            }
        }
    }, [selectedEmpId, formData.end_date, formData.sgk_code]);

    const handleNewRequest = async (e) => {
        e.preventDefault();
        if (!selectedEmpId) return setError('Lütfen personel seçin.');

        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch(`http://localhost:3000/api/employees/${selectedEmpId}/offboard-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id },
                body: JSON.stringify({
                    sgk_code: formData.sgk_code,
                    exit_reason: sgkCodes[formData.sgk_code].label,
                    end_date: formData.end_date,
                    severance_pay: formData.severance_pay
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Talebiniz departmanlara iletildi!');
                setSelectedEmpId('');
                fetchEmployees();
                setActiveTab('pending');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (empId, department, currentStatus) => {
        try {
            await apiFetch(`http://localhost:3000/api/employees/${empId}/offboard-approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id },
                body: JSON.stringify({ department, status: !currentStatus })
            });
            fetchEmployees();
        } catch (err) {
            console.error(err);
        }
    };

    const handleFinalize = async (empId, details) => {
        const apps = details.approvals;
        if (!apps.it || !apps.idari || !apps.finans || !apps.hukuk) {
            alert('Tüm departman onayları verilmeden çıkış kesinleştirilemez!');
            return;
        }

        if (window.confirm('Bu personelin şirketle tüm ilişiği kesilecektir. Onaylıyor musunuz?')) {
            try {
                const res = await apiFetch(`http://localhost:3000/api/employees/${empId}/offboard`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id }
                });
                const data = await res.json();
                if (data.success) {
                    alert('Çıkış işlemi başarıyla kesinleşti!');
                    fetchEmployees();
                } else {
                    alert(data.message);
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>Personel Çıkış İşlemleri</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>Kurumsal çıkış akışını (Offboarding Workflow) buradan yönetin.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <button onClick={() => setActiveTab('new')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'new' ? '#0f172a' : 'white', color: activeTab === 'new' ? 'white' : '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    + Yeni Çıkış Talebi
                </button>
                <button onClick={() => setActiveTab('pending')} style={{ padding: '10px 20px', backgroundColor: activeTab === 'pending' ? '#0f172a' : 'white', color: activeTab === 'pending' ? 'white' : '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Açık Talepler (Onay Bekleyenler) 
                    {pendingRequests.length > 0 && <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{pendingRequests.length}</span>}
                </button>
            </div>

            {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

            {activeTab === 'new' && (
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <form onSubmit={handleNewRequest}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Personel *</label>
                                <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                    <option value="">Seçiniz</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.department})</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>SGK Çıkış Kodu *</label>
                                <select value={formData.sgk_code} onChange={(e) => setFormData({...formData, sgk_code: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                    {Object.entries(sgkCodes).map(([code, info]) => (
                                        <option key={code} value={code}>{info.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Çıkış Tarihi *</label>
                                <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Hesaplanan Tazminat (₺)</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="number" step="0.01" value={formData.severance_pay} onChange={(e) => setFormData({...formData, severance_pay: e.target.value})} disabled={!sgkCodes[formData.sgk_code]?.paysSeverance} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, backgroundColor: '#f8fafc', fontWeight: 'bold' }} />
                                    {selectedEmployee && !sgkCodes[formData.sgk_code]?.paysSeverance && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>Tazminat Ödenmez</span>}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" disabled={loading || !selectedEmpId} style={{ padding: '12px 24px', borderRadius: '8px', backgroundColor: '#3b82f6', border: 'none', color: 'white', fontWeight: '600', cursor: (!selectedEmpId || loading) ? 'not-allowed' : 'pointer', opacity: (!selectedEmpId || loading) ? 0.6 : 1 }}>
                                Talep Başlat ve Departmanlara Bildir
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pendingRequests.length === 0 ? (
                        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                            Şu an onay bekleyen herhangi bir çıkış talebi bulunmuyor.
                        </div>
                    ) : (
                        pendingRequests.map(emp => {
                            const details = emp.offboarding_details;
                            const apps = details.approvals;
                            const isAllApproved = apps.it && apps.idari && apps.finans && apps.hukuk;

                            return (
                                <div key={emp.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', borderLeft: isAllApproved ? '6px solid #10b981' : '6px solid #1e3a8a', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{emp.full_name}</h3>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                                SGK Çıkış: <strong>{details.exit_reason}</strong> | Çıkış Tarihi: <strong>{new Date(details.end_date).toLocaleDateString('tr-TR')}</strong>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Tazminat Tutarı</div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{Number(details.severance_pay).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155' }}>Departman Onayları (Checklist)</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: hasPerm('offboard_approve_it') ? 'pointer' : 'not-allowed', padding: '8px', backgroundColor: apps.it ? '#eff6ff' : 'white', border: '1px solid', borderColor: apps.it ? '#3b82f6' : '#cbd5e1', borderRadius: '6px', opacity: hasPerm('offboard_approve_it') ? 1 : 0.6, transition: 'all 0.2s' }} onMouseOver={e => !apps.it && Object.assign(e.currentTarget.style, { borderColor: '#94a3b8' })} onMouseOut={e => !apps.it && Object.assign(e.currentTarget.style, { borderColor: '#cbd5e1' })}>
                                                <input type="checkbox" checked={apps.it} disabled={!hasPerm('offboard_approve_it')} onChange={() => handleApprove(emp.id, 'it', apps.it)} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'inherit' }} />
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: apps.it ? '#1e3a8a' : '#475569', display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', marginRight: '8px', color: apps.it ? '#3b82f6' : '#475569', transition: 'all 0.2s' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                                    </div>
                                                    IT Onayı
                                                </span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: hasPerm('offboard_approve_idari') ? 'pointer' : 'not-allowed', padding: '8px', backgroundColor: apps.idari ? '#eff6ff' : 'white', border: '1px solid', borderColor: apps.idari ? '#3b82f6' : '#cbd5e1', borderRadius: '6px', opacity: hasPerm('offboard_approve_idari') ? 1 : 0.6, transition: 'all 0.2s' }} onMouseOver={e => !apps.idari && Object.assign(e.currentTarget.style, { borderColor: '#94a3b8' })} onMouseOut={e => !apps.idari && Object.assign(e.currentTarget.style, { borderColor: '#cbd5e1' })}>
                                                <input type="checkbox" checked={apps.idari} disabled={!hasPerm('offboard_approve_idari')} onChange={() => handleApprove(emp.id, 'idari', apps.idari)} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'inherit' }} />
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: apps.idari ? '#1e3a8a' : '#475569', display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f5f3ff', marginRight: '8px', color: apps.idari ? '#8b5cf6' : '#475569', transition: 'all 0.2s' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="15" y2="22"></line><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="12" y2="14"></line></svg>
                                                    </div>
                                                    İdari İşler Onayı
                                                </span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: hasPerm('offboard_approve_finance') ? 'pointer' : 'not-allowed', padding: '8px', backgroundColor: apps.finans ? '#eff6ff' : 'white', border: '1px solid', borderColor: apps.finans ? '#3b82f6' : '#cbd5e1', borderRadius: '6px', opacity: hasPerm('offboard_approve_finance') ? 1 : 0.6, transition: 'all 0.2s' }} onMouseOver={e => !apps.finans && Object.assign(e.currentTarget.style, { borderColor: '#94a3b8' })} onMouseOut={e => !apps.finans && Object.assign(e.currentTarget.style, { borderColor: '#cbd5e1' })}>
                                                <input type="checkbox" checked={apps.finans} disabled={!hasPerm('offboard_approve_finance')} onChange={() => handleApprove(emp.id, 'finans', apps.finans)} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'inherit' }} />
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: apps.finans ? '#1e3a8a' : '#475569', display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ecfdf5', marginRight: '8px', color: apps.finans ? '#10b981' : '#475569', transition: 'all 0.2s' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                                    </div>
                                                    Finans Onayı
                                                </span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: hasPerm('offboard_approve_legal') ? 'pointer' : 'not-allowed', padding: '8px', backgroundColor: apps.hukuk ? '#eff6ff' : 'white', border: '1px solid', borderColor: apps.hukuk ? '#3b82f6' : '#cbd5e1', borderRadius: '6px', opacity: hasPerm('offboard_approve_legal') ? 1 : 0.6, transition: 'all 0.2s' }} onMouseOver={e => !apps.hukuk && Object.assign(e.currentTarget.style, { borderColor: '#94a3b8' })} onMouseOut={e => !apps.hukuk && Object.assign(e.currentTarget.style, { borderColor: '#cbd5e1' })}>
                                                <input type="checkbox" checked={apps.hukuk} disabled={!hasPerm('offboard_approve_legal')} onChange={() => handleApprove(emp.id, 'hukuk', apps.hukuk)} style={{ width: '16px', height: '16px', accentColor: '#1e3a8a', cursor: 'inherit' }} />
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: apps.hukuk ? '#1e3a8a' : '#475569', display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fef3c7', marginRight: '8px', color: apps.hukuk ? '#f59e0b' : '#475569', transition: 'all 0.2s' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                                    </div>
                                                    Hukuk/İK Onayı
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleFinalize(emp.id, details)} disabled={!isAllApproved} style={{ padding: '12px 24px', backgroundColor: isAllApproved ? '#10b981' : '#f1f5f9', color: isAllApproved ? 'white' : '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isAllApproved ? 'pointer' : 'not-allowed', boxShadow: isAllApproved ? '0 4px 6px -1px rgba(16, 185, 129, 0.3)' : 'none' }}>
                                            {isAllApproved ? '✓ Çıkışı Tamamla' : 'Tüm Onaylar Bekleniyor...'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeOffboard;
