/**
 * ============================================================================
 * BİLEŞEN ADI: LeaveManagement
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Personel, İK, maaş, izin ve işten ayrılış işlemlerini barındıran bileşen.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (LeaveManagement.jsx), Personel listesi, mesai (overtime) ve izin (leave) yönetim arayüzlerini içerir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState, useEffect } from 'react';

const LeaveManagement = ({ currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [summary, setSummary] = useState({ hakedilen: 0, kullanilan: 0, kalan: 0 });
    const [leaveHistory, setLeaveHistory] = useState([]);
    
    // New Leave Form State
    const [formData, setFormData] = useState({
        leave_type: 'Yıllık İzin',
        payment_status: 'Ücretli',
        start_date: '',
        end_date: '',
        total_days: 1,
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const calculateWorkingDays = (start, end) => {
        if (!start || !end) return 1;
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (startDate > endDate) return 1;

        let count = 0;
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            // 0: Pazar, 6: Cumartesi
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return count;
    };

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            const days = calculateWorkingDays(formData.start_date, formData.end_date);
            if (days !== formData.total_days) {
                setFormData(prev => ({ ...prev, total_days: days }));
            }
        }
    }, [formData.start_date, formData.end_date]);

    const fetchEmployees = async (search = '') => {
        setLoading(true);
        try {
            const url = search ? `http://localhost:3000/api/employees?search=${encodeURIComponent(search)}` : 'http://localhost:3000/api/employees';
            const res = await apiFetch(url);
            const data = await res.json();
            setEmployees(Array.isArray(data) ? data.filter(e => e.is_active !== 0) : []);
        } catch (err) {
            console.error('Personel listesi yüklenemedi', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchEmployees(searchTerm);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const fetchLeaveData = async (employeeId) => {
        try {
            const [summaryRes, historyRes] = await Promise.all([
                apiFetch(`http://localhost:3000/api/employees/${employeeId}/leave-summary`),
                apiFetch(`http://localhost:3000/api/employees/${employeeId}/leaves`)
            ]);
            
            const summaryData = await summaryRes.json();
            const historyData = await historyRes.json();
            
            if (summaryData.success) {
                setSummary({
                    hakedilen: summaryData.hakedilen,
                    kullanilan: summaryData.kullanilan,
                    kalan: summaryData.kalan
                });
            }
            if (historyData.success) {
                setLeaveHistory(historyData.leaves);
            }
        } catch (err) {
            console.error('İzin bilgileri çekilirken hata', err);
        }
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleSelectEmployee = (emp) => {
        setSelectedEmployee(emp);
        fetchLeaveData(emp.id);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return;
        setSubmitting(true);
        
        try {
            const res = await apiFetch(`http://localhost:3000/api/employees/${selectedEmployee.id}/leaves`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                alert('İzin başarıyla eklendi.');
                fetchLeaveData(selectedEmployee.id);
                setFormData({
                    leave_type: 'Yıllık İzin',
                    payment_status: 'Ücretli',
                    start_date: '',
                    end_date: '',
                    total_days: 1,
                    description: ''
                });
            } else {
                alert(data.message || 'Hata oluştu.');
            }
        } catch (err) {
            alert('Sunucu hatası.');
        } finally {
            setSubmitting(false);
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>İzin Yönetimi</h1>
                <p style={{ color: '#64748b', marginTop: '4px' }}>Personel izin girişleri ve bakiye takibi.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Sol Panel: Personel Listesi */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <div style={{ position: 'relative' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }}>
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input 
                                type="text" 
                                placeholder="Personel Ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                            />
                        </div>
                    </div>
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Yükleniyor...</div>
                        ) : employees.map(emp => (
                            <div 
                                key={emp.id}
                                onClick={() => handleSelectEmployee(emp)}
                                style={{ 
                                    padding: '12px 16px', 
                                    borderBottom: '1px solid #f1f5f9', 
                                    cursor: 'pointer',
                                    backgroundColor: selectedEmployee?.id === emp.id ? '#eff6ff' : 'white',
                                    borderLeft: selectedEmployee?.id === emp.id ? '3px solid #3b82f6' : '3px solid transparent',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{emp.full_name}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{emp.department || 'Departmansız'}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sağ Panel: İzin İşlemleri */}
                {selectedEmployee ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Dashboard Özeti */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', borderTop: '4px solid #94a3b8' }}>
                                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Hakedilen (Yıllık)</div>
                                <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{summary.hakedilen}</div>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Gün</div>
                            </div>
                            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Kullanılan (Ücretli)</div>
                                <div style={{ color: '#ef4444', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{summary.kullanilan}</div>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Gün</div>
                            </div>
                            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', borderTop: '4px solid #10b981' }}>
                                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Kalan İzin</div>
                                <div style={{ color: '#10b981', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{summary.kalan}</div>
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Gün</div>
                            </div>
                        </div>

                        {/* Yeni İzin Ekleme Formu */}
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>Yeni İzin Tanımla</h3>
                            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>İzin Tipi</label>
                                    <select name="leave_type" value={formData.leave_type} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        <option value="Yıllık İzin">Yıllık İzin</option>
                                        <option value="Mazeret İzni">Mazeret İzni</option>
                                        <option value="Hastalık Raporu">Hastalık Raporu</option>
                                        <option value="Doğum İzni (Anne)">Doğum İzni (Anne)</option>
                                        <option value="Babalık İzni">Babalık İzni</option>
                                        <option value="Evlilik / Düğün İzni">Evlilik / Düğün İzni</option>
                                        <option value="Ölüm / Vefat İzni">Ölüm / Vefat İzni</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ücret Durumu</label>
                                    <select name="payment_status" value={formData.payment_status} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        <option value="Ücretli">Ücretli İzin (Bakiyeden Düşer)</option>
                                        <option value="Ücretsiz">Ücretsiz İzin</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Toplam Gün</label>
                                    <input type="number" name="total_days" value={formData.total_days} onChange={handleChange} min="1" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Başlangıç Tarihi</label>
                                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Bitiş Tarihi</label>
                                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açıklama (Opsiyonel)</label>
                                    <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Örn: Memleket ziyareti" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button type="submit" disabled={submitting} style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                                        {submitting ? 'Kaydediliyor...' : 'İzni Onayla ve Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* İzin Geçmişi Tablosu */}
                        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>İzin Geçmişi</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '12px', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 24px' }}>Tarih Aralığı</th>
                                        <th style={{ padding: '12px 24px' }}>Gün</th>
                                        <th style={{ padding: '12px 24px' }}>Tip</th>
                                        <th style={{ padding: '12px 24px' }}>Durum</th>
                                        <th style={{ padding: '12px 24px' }}>Açıklama</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaveHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Kayıtlı izin bulunmuyor.</td>
                                        </tr>
                                    ) : leaveHistory.map(leave => (
                                        <tr key={leave.id} className="hover-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                                            <td style={{ padding: '12px 24px', fontSize: '13px', color: '#0f172a' }}>
                                                {new Date(leave.start_date).toLocaleDateString('tr-TR')} - {new Date(leave.end_date).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td style={{ padding: '12px 24px', fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>{leave.total_days} Gün</td>
                                            <td style={{ padding: '12px 24px', fontSize: '13px', color: '#475569' }}>{leave.leave_type}</td>
                                            <td style={{ padding: '12px 24px' }}>
                                                <span style={{ 
                                                    padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                                                    backgroundColor: leave.payment_status === 'Ücretli' ? '#dcfce7' : '#fee2e2',
                                                    color: leave.payment_status === 'Ücretli' ? '#166534' : '#991b1b'
                                                }}>
                                                    {leave.payment_status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 24px', fontSize: '13px', color: '#64748b' }}>{leave.description || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', opacity: 0.8 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: '#94a3b8' }}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Personel Seçin</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>İzin işlemlerini yönetmek için sol menüden bir personel seçmelisiniz.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveManagement;

