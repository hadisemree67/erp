/**
 * ============================================================================
 * BİLEŞEN ADI: BulkEditEmployeeModal
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Personel, İK, maaş, izin ve işten ayrılış işlemlerini barındıran bileşen.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (BulkEditEmployeeModal.jsx), Personel listesi, mesai (overtime) ve izin (leave) yönetim arayüzlerini içerir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState } from 'react';

const BulkEditEmployeeModal = ({ selectedIds, onClose, onSuccess, currentUser }) => {
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [field, setField] = useState('salary');
    
    // Independent states to allow multiple updates
    const [salaryData, setSalaryData] = useState({ actionType: 'percentage', direction: 'increase', numValue: '' });
    const [departmentValue, setDepartmentValue] = useState('');
    const [positionValue, setPositionValue] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const departmentsAndRoles = {
        "Yönetim": ["Genel Müdür", "Operasyon Müdürü", "Bölüm Yöneticisi"],
        "Satış": ["Satış Temsilcisi", "Bölge Sorumlusu", "Mağaza Müdürü"],
        "Pazarlama": ["Pazarlama Uzmanı", "Sosyal Medya Yöneticisi", "Grafik Tasarımcı"],
        "İnsan Kaynakları": ["İK Uzmanı", "İşe Alım Sorumlusu", "Bordro Uzmanı"],
        "Bilgi İşlem": ["Sistem Yöneticisi", "Yazılım Geliştirici", "Destek Uzmanı"],
        "Muhasebe & Finans": ["Muhasebeci", "Finans Analisti", "Veznedar"],
        "Depo & Lojistik": ["Depo Sorumlusu", "Lojistik Uzmanı", "Şoför", "Kurye"],
        "Müşteri Hizmetleri": ["Müşteri Temsilcisi", "Çağrı Merkezi Operatörü", "Destek Lideri"],
        "Hukuk": ["Kurum Avukatı", "Hukuk Müşaviri", "Yasal Uyum Uzmanı"],
        "Diğer": ["Stajyer", "Danışman", "Geçici Personel"]
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const updates = [];

        // Check Salary
        if (salaryData.numValue && !isNaN(salaryData.numValue) && parseFloat(salaryData.numValue) > 0) {
            const parsed = parseFloat(salaryData.numValue);
            updates.push({
                field: 'salary',
                type: salaryData.actionType,
                value: salaryData.direction === 'decrease' ? -parsed : parsed
            });
        }

        // Check Department and Position
        if (departmentValue && positionValue) {
            updates.push({
                field: 'departmentAndPosition',
                type: 'object',
                value: { department: departmentValue, position: positionValue }
            });
        }

        if (updates.length === 0) {
            setError('Lütfen uygulamak istediğiniz en az bir alanı doldurun.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch('http://localhost:3000/api/employees/bulk-edit', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id || ''
                },
                body: JSON.stringify({
                    ids: selectedIds,
                    updates: updates
                })
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
            } else {
                setError(data.message || 'İşlem başarısız oldu.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold' }}>Toplu Düzenleme</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>×</button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
                    
                    <div style={{ marginBottom: '16px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
                        Toplam <strong>{selectedIds.length}</strong> personel düzenlenecek.
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Hangi Alan Değişecek?</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { id: 'salary', label: 'Maaş' },
                                { id: 'departmentAndPosition', label: 'Birim ve Görev' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setField(opt.id)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: field === opt.id ? '2px solid #10b981' : '1px solid #cbd5e1',
                                        backgroundColor: field === opt.id ? '#ecfdf5' : 'white',
                                        color: field === opt.id ? '#047857' : '#475569',
                                        fontWeight: field === opt.id ? '600' : '400',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    {opt.label}
                                    {((opt.id === 'salary' && salaryData.numValue) || 
                                      (opt.id === 'departmentAndPosition' && departmentValue && positionValue)) && (
                                        <span style={{ marginLeft: '6px', color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {field === 'salary' ? (
                        <>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>İşlem</label>
                                    <select value={salaryData.actionType} onChange={e => setSalaryData({...salaryData, actionType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                                        <option value="percentage">Yüzde (%)</option>
                                        <option value="fixed">Tutar (₺)</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Yön</label>
                                    <select value={salaryData.direction} onChange={e => setSalaryData({...salaryData, direction: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                                        <option value="increase">Zam (+)</option>
                                        <option value="decrease">Düşür (-)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                    Değer {salaryData.actionType === 'percentage' ? '(%)' : '(₺)'}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={salaryData.numValue} 
                                    onChange={e => setSalaryData({...salaryData, numValue: e.target.value})} 
                                    placeholder={salaryData.actionType === 'percentage' ? 'Örn: 15 (Maaşı %15 artırır)' : 'Örn: 2000 (Maaşa 2000₺ ekler)'}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                />
                            </div>
                        </>
                    ) : field === 'departmentAndPosition' ? (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                                Yeni Birim ve Görev Seçin
                            </label>
                            
                            <select 
                                value={departmentValue} 
                                onChange={e => {
                                    setDepartmentValue(e.target.value);
                                    setPositionValue(''); // Departman değişince görevi sıfırla
                                }} 
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', marginBottom: '12px' }}
                            >
                                <option value="">Önce Birim Seçiniz</option>
                                {Object.keys(departmentsAndRoles).map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>

                            <select 
                                value={positionValue} 
                                onChange={e => setPositionValue(e.target.value)} 
                                disabled={!departmentValue}
                                style={{ 
                                    width: '100%', 
                                    padding: '10px', 
                                    borderRadius: '6px', 
                                    border: '1px solid #cbd5e1', 
                                    outline: 'none',
                                    backgroundColor: !departmentValue ? '#f8fafc' : 'white',
                                    cursor: !departmentValue ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <option value="">Sonra Görev Seçiniz</option>
                                {departmentValue && departmentsAndRoles[departmentValue].map((role, idx) => (
                                    <option key={idx} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                            İptal
                        </button>
                        <button type="submit" disabled={loading} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Uygulanıyor...' : 'Uygula'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkEditEmployeeModal;

