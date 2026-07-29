import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const OvertimeManagement = ({ currentUser }) => {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [overtimeDate, setOvertimeDate] = useState(new Date().toISOString().split('T')[0]);
    const [hours, setHours] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSalaries();
    }, [month, year]);

    const fetchSalaries = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`http://localhost:3000/api/employees/salaries?month=${month}&year=${year}`);
            const data = await res.json();
            if (data.success) {
                setSalaries(data.data);
            } else {
                alert(data.message || 'Maaş verileri alınamadı.');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Sunucuya bağlanılamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddOvertime = async (e) => {
        e.preventDefault();
        if (selectedEmployees.length === 0) {
            return alert('Lütfen en az bir personel seçin.');
        }
        if (!overtimeDate || !hours) {
            return alert('Tarih ve saat zorunludur.');
        }

        setSubmitting(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/employees/overtimes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id
                },
                body: JSON.stringify({
                    employee_ids: selectedEmployees,
                    overtime_date: overtimeDate,
                    hours: parseFloat(hours),
                    month,
                    year
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                setHours('');
                setSelectedEmployees([]);
                fetchSalaries();
            } else {
                alert(data.message || 'Mesai eklenemedi.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('Sunucu hatası.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleEmployeeSelection = (id) => {
        if (selectedEmployees.includes(id)) {
            setSelectedEmployees(selectedEmployees.filter(eId => eId !== id));
        } else {
            setSelectedEmployees([...selectedEmployees, id]);
        }
    };

    const selectAllEmployees = () => {
        if (selectedEmployees.length === salaries.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(salaries.map(s => s.id));
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0);
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f1f5f9', minHeight: 'calc(100vh - 80px)', color: '#0f172a' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: '#0f172a', margin: 0 }}>Mesai ve Maaş Yönetimi</h2>
                <button 
                    onClick={() => setShowModal(true)}
                    style={{
                        backgroundColor: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', 
                        border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                    }}
                >
                    + Mesai Ekle
                </button>
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <label style={{ fontWeight: 'bold', color: '#1e293b' }}>Dönem Seçimi:</label>
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#0f172a' }}>
                    <option value={1}>Ocak</option>
                    <option value={2}>Şubat</option>
                    <option value={3}>Mart</option>
                    <option value={4}>Nisan</option>
                    <option value={5}>Mayıs</option>
                    <option value={6}>Haziran</option>
                    <option value={7}>Temmuz</option>
                    <option value={8}>Ağustos</option>
                    <option value={9}>Eylül</option>
                    <option value={10}>Ekim</option>
                    <option value={11}>Kasım</option>
                    <option value={12}>Aralık</option>
                </select>
                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personel</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Departman</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sabit Maaş</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Bu Ayki Mesai Saati</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Mesai Ücreti</th>
                                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Toplam Ödenecek Maaş</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salaries.map((emp) => (
                                <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{emp.full_name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{emp.position || 'Pozisyon Belirtilmedi'}</div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#334155', fontSize: '14px' }}>{emp.department || '-'}</td>
                                    <td style={{ padding: '16px 24px', color: '#334155', fontSize: '14px', fontWeight: '500' }}>{formatCurrency(emp.base_salary)}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        <span style={{ backgroundColor: emp.total_overtime_hours > 0 ? '#dcfce3' : '#f1f5f9', color: emp.total_overtime_hours > 0 ? '#16a34a' : '#64748b', padding: '4px 10px', borderRadius: '12px', fontWeight: '600', fontSize: '12px' }}>
                                            {emp.total_overtime_hours} Saat
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: '#10b981', fontWeight: '600', fontSize: '14px' }}>+{formatCurrency(emp.total_overtime_pay)}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '15px', fontWeight: '700', color: '#0369a1' }}>{formatCurrency(emp.total_salary)}</td>
                                </tr>
                            ))}
                            {salaries.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Bu dönem için personel/maaş kaydı bulunamadı.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>Mesai Ekle</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        
                        <form onSubmit={handleAddOvertime}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tarih</label>
                                <input 
                                    type="date" 
                                    value={overtimeDate} 
                                    onChange={(e) => setOvertimeDate(e.target.value)}
                                    required 
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Mesai Saati</label>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    min="0.1"
                                    value={hours} 
                                    onChange={(e) => setHours(e.target.value)}
                                    placeholder="Örn: 2.5"
                                    required 
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                                <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>* Yasal standartlarda 1 saatlik mesai = (Maaş / 225) * 1.5 üzerinden hesaplanarak otomatik maaşa eklenir.</small>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '500' }}>
                                    Personel Seçimi 
                                    <button type="button" onClick={selectAllEmployees} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px' }}>
                                        {selectedEmployees.length === salaries.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                    </button>
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Personel ara..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', marginBottom: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                />
                                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                                    {salaries.filter(emp => emp.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                                        <label key={emp.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedEmployees.includes(emp.id)}
                                                onChange={() => toggleEmployeeSelection(emp.id)}
                                                style={{ marginRight: '10px', width: '16px', height: '16px' }}
                                            />
                                            {emp.full_name} ({emp.department || '-'})
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="btn-secondary" style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', cursor: 'pointer' }} onClick={() => setShowModal(false)} disabled={submitting}>İptal</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? 'Kaydediliyor...' : 'Kaydet ve Hesapla'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OvertimeManagement;
