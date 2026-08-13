/**
 * ============================================================================
 * DOSYA ADI: EmployeeList.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - İnsan Kaynakları / Çalışan Listesi ve Yönetimi
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Şirket bünyesindeki tüm çalışanları (personelleri) tablo halinde listeler. Departman, durum (aktif/pasif) veya isme göre arama/filtreleme sağlar; yeni çalışan ekleme, düzenleme, toplu işlem veya işten çıkarma modallarını tetikler.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Lucide-React, Tablo Veri Yönetimi, Filtreleme Mantığı
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - İnsan Kaynakları modülünün ana ekranıdır; `/api/employees` rotasından verileri çeker ve alt modalları yönetir.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (EmployeeList.jsx), Personel listesi, mesai (overtime) ve izin (leave) yönetim arayüzlerini içerir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect } from 'react';
import EmployeeForm from './EmployeeForm';
import BulkEditEmployeeModal from './BulkEditEmployeeModal';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            // 5. Arayüz (UI) Çizimi ve Render Edilmesi
            return (
                <div style={{ padding: '20px', backgroundColor: 'white', color: 'red', borderRadius: '8px' }}>
                    <h2>Bir Hata Oluştu</h2>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px', color: '#666' }}>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px' }}>Sayfayı Yenile</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const EmployeeList = ({ currentUser, onNavigate }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBulkEditVisible, setIsBulkEditVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'alumni'
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const hasPerm = (key) => currentUser?.role === 'admin' || (currentUser?.permissions || []).includes(key);

    // Modal state
    const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
    const [selectedEmployeeDocs, setSelectedEmployeeDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);

    const fetchEmployees = async (search = '') => {
        setLoading(true);
        try {
            const url = search ? `http://localhost:3000/api/employees?search=${encodeURIComponent(search)}` : 'http://localhost:3000/api/employees';
            const res = await apiFetch(url);
            const data = await res.json();
            if (Array.isArray(data)) {
                setEmployees(data);
            } else {
                setError(data.message || 'Personeller yüklenemedi.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchEmployees(searchTerm);
        }, 300); // 300ms debounce
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleDelete = async (id) => {
        if (!window.confirm('Bu personeli listeden çıkarmak istediğinize emin misiniz?')) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/employees/${id}`, {
                method: 'DELETE',
                headers: { 'X-User-Id': currentUser?.id }
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(employees.filter(e => e.id !== id));
            } else {
                alert(data.message || 'Hata oluştu.');
            }
        } catch (err) {
            alert('Sunucu bağlantı hatası.');
        }
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setIsFormVisible(true);
    };

    const handleAddNew = () => {
        if (onNavigate) {
            onNavigate('personel-kaydi');
        } else {
            setEditingEmployee(null);
            setIsFormVisible(true);
        }
    };

    const handleCloseForm = (shouldRefresh) => {
        setIsFormVisible(false);
        setEditingEmployee(null);
        if (shouldRefresh) fetchEmployees();
    };

    const handleOpenDocuments = async (employeeId) => {
        setDocumentsModalOpen(true);
        setDocsLoading(true);
        try {
            const res = await apiFetch(`http://localhost:3000/api/employees/${employeeId}/documents`);
            const data = await res.json();
            if (data.success) {
                setSelectedEmployeeDocs(data.documents);
            } else {
                setSelectedEmployeeDocs([]);
            }
        } catch (err) {
            console.error('Belgeler yüklenemedi', err);
            setSelectedEmployeeDocs([]);
        } finally {
            setDocsLoading(false);
        }
    };

    // Sekme değiştiğinde seçimleri sıfırla
    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab]);

    if (isFormVisible) {
        return (
            <ErrorBoundary>
                <EmployeeForm employee={editingEmployee} onClose={handleCloseForm} currentUser={currentUser} />
            </ErrorBoundary>
        );
    }

    const activeEmployees = employees.filter(e => e.is_active !== 0 && e.work_status !== 'İşten Ayrıldı');
    const alumniEmployees = employees.filter(e => e.is_active === 0 || e.work_status === 'İşten Ayrıldı');
    const displayedEmployees = activeTab === 'active' ? activeEmployees : alumniEmployees;

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(displayedEmployees.map(emp => emp.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length > 10) {
            alert('Güvenlik nedeniyle tek seferde en fazla 10 personel silebilirsiniz.');
            return;
        }
        if (!window.confirm(`${selectedIds.length} personeli kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
        
        try {
            const response = await apiFetch('http://localhost:3000/api/employees/bulk', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id || ''
                },
                body: JSON.stringify({ ids: selectedIds })
            });
            const data = await response.json();
            if (data.success) {
                setSelectedIds([]);
                fetchEmployees();
            } else {
                alert(data.message || 'Silme başarısız oldu.');
            }
        } catch (err) {
            alert('Sunucu hatası.');
        }
    };

    const handleBulkAction = () => {
        setIsBulkEditVisible(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>İnsan Kaynakları</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>Şirketinizde çalışan veya çalışmış personellerin listesi.</p>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)', color: '#475569' }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Personel Ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 8px 8px 24px', border: 'none', borderBottom: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'transparent', fontSize: '14px', color: '#0f172a', width: '200px', transition: 'border-color 0.2s' }}
                            onFocus={e => e.currentTarget.style.borderBottomColor = '#3b82f6'}
                            onBlur={e => e.currentTarget.style.borderBottomColor = '#cbd5e1'}
                        />
                    </div>
                    {hasPerm('employee_add') && (
                    <button 
                        onClick={handleAddNew}
                        style={{
                            backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', 
                            border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        + Yeni Personel Kaydı
                    </button>
                    )}
                </div>
            </div>

            {/* Sekmeler (Tabs) */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <button 
                    onClick={() => setActiveTab('active')}
                    style={{ 
                        background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', fontSize: '15px', fontWeight: '600',
                        color: activeTab === 'active' ? '#3b82f6' : '#64748b',
                        borderBottom: activeTab === 'active' ? '2px solid #3b82f6' : '2px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    Aktif Personeller ({activeEmployees.length})
                </button>
                <button 
                    onClick={() => setActiveTab('alumni')}
                    style={{ 
                        background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', fontSize: '15px', fontWeight: '600',
                        color: activeTab === 'alumni' ? '#64748b' : '#94a3b8',
                        borderBottom: activeTab === 'alumni' ? '2px solid #64748b' : '2px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    Eski Çalışanlar (Arşiv) ({alumniEmployees.length})
                </button>
            </div>

            {error && <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

            {selectedIds.length > 0 && (
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.2s ease-in-out' }}>
                    <div style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '14px' }}>
                        <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', marginRight: '8px' }}>{selectedIds.length}</span>
                        personel seçildi
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {hasPerm('employee_edit') && (
                        <button 
                            onClick={handleBulkAction}
                            style={{ padding: '8px 16px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Seçili Personelleri Düzenle
                        </button>
                        )}
                        {currentUser?.role === 'admin' && (
                        <button 
                            onClick={handleBulkDelete}
                            style={{ padding: '8px 16px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Sil
                        </button>
                        )}
                    </div>
                </div>
            )}

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
                ) : displayedEmployees.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Bu listede personel bulunmuyor.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={displayedEmployees.length > 0 && selectedIds.length === displayedEmployees.length}
                                        onChange={handleSelectAll}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                    />
                                </th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personel</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Görev & Departman</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>İletişim</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kan Grubu</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedEmployees.map(emp => (
                                <tr key={emp.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', backgroundColor: selectedIds.includes(emp.id) ? '#f0f9ff' : (emp.is_on_leave ? '#f1f5f9' : 'transparent') }} onMouseOver={e => e.currentTarget.style.backgroundColor = selectedIds.includes(emp.id) ? '#f0f9ff' : (emp.is_on_leave ? '#e2e8f0' : '#f8fafc')} onMouseOut={e => e.currentTarget.style.backgroundColor = selectedIds.includes(emp.id) ? '#f0f9ff' : (emp.is_on_leave ? '#f1f5f9' : 'transparent')}>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(emp.id)}
                                            onChange={() => handleSelectOne(emp.id)}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {emp.photo_path ? (
                                                <img src={`http://localhost:3000${emp.photo_path}`} alt={emp.full_name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0', filter: activeTab === 'alumni' ? 'grayscale(100%)' : 'none' }} />
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
                                                    {emp.full_name ? emp.full_name.substring(0, 2).toUpperCase() : '??'}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ color: '#0f172a', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    {emp.full_name}
                                                    {activeTab === 'alumni' && <span style={{ padding: '2px 8px', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '10px', borderRadius: '12px', fontWeight: 'bold', letterSpacing: '0.05em' }}>AYRILDI</span>}
                                                    {emp.is_on_leave && activeTab !== 'alumni' && (
                                                        <span style={{ padding: '3px 10px', backgroundColor: '#64748b', color: 'white', fontSize: '11px', borderRadius: '12px', fontWeight: 'bold', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                            {emp.active_leave_type ? `İZİNLİ / RAPORLU (${emp.active_leave_type})` : 'İZİNLİ / RAPORLU'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>TC: {emp.tckn || '-'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ color: '#1e293b', fontWeight: '500', fontSize: '14px' }}>{emp.position || '-'}</div>
                                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{emp.department || '-'}</div>
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ color: '#1e293b', fontSize: '14px' }}>{emp.phone || '-'}</div>
                                        {emp.email && <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{emp.email}</div>}
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        {emp.blood_type ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px', fontSize: '13px', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                                                {emp.blood_type}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                                        <div className="action-container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                            <button onClick={() => handleOpenDocuments(emp.id)} title="Belgeler" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#3b82f6'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                            </button>
                                            
                                            {activeTab === 'active' ? (
                                                <>
                                                    {hasPerm('employee_edit') && (
                                                    <button onClick={() => handleEdit(emp)} title="Düzenle" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#0f172a'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                    )}
                                                    {currentUser?.role === 'admin' && (
                                                    <button onClick={() => handleDelete(emp.id)} title="Çıkar" style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#334155'}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                    )}
                                                </>
                                            ) : (
                                                <button disabled style={{ padding: '6px 16px', backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'not-allowed', fontWeight: '600', fontSize: '13px' }}>Arşivlendi</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Belgeler Modalı */}
            {documentsModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Özlük Dosyaları</h2>
                            <button onClick={() => setDocumentsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        
                        {docsLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Dosyalar yükleniyor...</div>
                        ) : selectedEmployeeDocs.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>Bu personele ait yüklenmiş herhangi bir belge bulunmamaktadır.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {selectedEmployeeDocs.map(doc => (
                                    <a key={doc.id} href={`http://localhost:3000${doc.file_path}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', border: '1px solid #e2e8f0', transition: 'all 0.2s' }} onMouseOver={e => Object.assign(e.currentTarget.style, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' })} onMouseOut={e => Object.assign(e.currentTarget.style, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' })}>
                                        <span style={{ fontSize: '20px' }}>📄</span>
                                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500', fontSize: '14px' }}>
                                            {doc.file_name}
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>Aç &rarr;</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {isBulkEditVisible && (
                <BulkEditEmployeeModal
                    selectedIds={selectedIds}
                    currentUser={currentUser}
                    onClose={() => setIsBulkEditVisible(false)}
                    onSuccess={() => {
                        setIsBulkEditVisible(false);
                        setSelectedIds([]);
                        fetchEmployees();
                    }}
                />
            )}
        </div>
    );
};

export default EmployeeList;
