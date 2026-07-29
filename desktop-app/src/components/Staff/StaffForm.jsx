/**
 * ============================================================================
 * DOSYA ADI: StaffForm.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Sistem Kullanıcıları Modülü / Kullanıcı ve Yetki Tanımlama Formu
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   ERP sistemine giriş yapacak yeni bir kullanıcı hesabı oluşturmak veya mevcut kullanıcının şifresini, rolünü (yönetici, personel, depo sorumlusu vb.) ve modül bazlı ince yetkilerini (permissions) yapılandırmak için kullanılan form arayüzüdür.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Yetki Checkbox Ağacı, Şifre ve Rol Yönetimi
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Arkayüzdeki `/api/users` rotası ile etkileşim kurarak sistem güvenlik ve yetkilendirme altyapısını yönetir.
 * ============================================================================
 */

import { apiFetch } from '../../utils/api';
/**
 * Dosya: StaffForm.jsx
 * Sayfa: Personel Ekleme / Düzenleme
 * Ne İşe Yarar: Personel bilgilerini ve yetkilerini belirlemeyi sağlayan form ekranı.
 */
import React, { useState, useEffect } from 'react';

const StaffForm = ({ staff, onClose, currentUser }) => {
    const isEditing = !!staff;

    const [formData, setFormData] = useState({
        username: staff?.username || '',
        name: staff?.name || '',
        email: staff?.email || '',
        password: '',
        role: staff?.role || 'manager'
    });

    const [allPermissions, setAllPermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState(staff?.permissions || []);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const res = await apiFetch('http://localhost:3000/api/users/permissions');
                const data = await res.json();
                if (Array.isArray(data)) setAllPermissions(data);
            } catch (err) {
                console.error('Yetkiler yüklenemedi:', err);
            }
        };
        const fetchEmployees = async () => {
            try {
                const res = await apiFetch('http://localhost:3000/api/employees');
                const data = await res.json();
                if (Array.isArray(data)) setEmployees(data.filter(e => e.is_active !== 0 && e.work_status !== 'İşten Ayrıldı'));
            } catch (err) {
                console.error('Personeller yüklenemedi:', err);
            }
        };
        fetchPermissions();
        if (!isEditing) fetchEmployees();
    }, [isEditing]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handlePermissionToggle = (key) => {
        if (selectedPermissions.includes(key)) {
            setSelectedPermissions(selectedPermissions.filter(p => p !== key));
        } else {
            setSelectedPermissions([...selectedPermissions, key]);
        }
    };

    const handleEmployeeSelect = (e) => {
        const empId = e.target.value;
        setSelectedEmployeeId(empId);
        const emp = employees.find(e => e.id.toString() === empId);
        if (emp) {
            setFormData({ ...formData, name: emp.full_name, email: emp.email || 'tanimsiz@email.com' });
        } else {
            setFormData({ ...formData, name: '', email: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!isEditing && !formData.password) {
            setError('Şifre alanı zorunludur.');
            setLoading(false);
            return;
        }

        if (!isEditing && !selectedEmployeeId) {
            setError('Lütfen bir personel seçin.');
            setLoading(false);
            return;
        }

        const url = isEditing ? `http://localhost:3000/api/users/${staff.id}` : 'http://localhost:3000/api/users';
        const method = isEditing ? 'PUT' : 'POST';

        const payload = {
            ...formData,
            permissions: selectedPermissions
        };

        try {
            const res = await apiFetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser?.id
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                onClose(true);
            } else {
                setError(data.message || 'Bir hata oluştu.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: '#0f172a', margin: 0 }}>{isEditing ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</h2>
                <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>✕ İptal</button>
            </div>

            {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    
                    {!isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>İlgili Personel *</label>
                            <select value={selectedEmployeeId} onChange={handleEmployeeSelect} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                                <option value="">Sistemde kayıtlı personel seçiniz</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.department})</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Personel Adı</label>
                            <input type="text" value={formData.name} disabled style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#64748b' }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Kullanıcı Adı *</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Unvan (Sadece Gösterim İçin) *</label>
                        <select name="role" value={formData.role} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                            <option value="admin">Sistem Yöneticisi (Tüm Yetkiler)</option>
                            <option value="hr">İnsan Kaynakları Uzmanı (Personel Yönetimi)</option>
                            <option value="erp">ERP Uzmanı (Stok Yönetimi)</option>
                            <option value="legal">Hukuk Yetkilisi (Sadece Hukuk Çıkış Onayı)</option>
                            <option value="finance">Finans Yetkilisi (Sadece Finans Çıkış Onayı)</option>
                            <option value="idari">İdari İşler Sorumlusu (Sadece İdari Onay)</option>
                            <option value="manager">Alt Yönetici (Sadece Görüntüleme)</option>
                        </select>
                    </div>

                    {!isEditing && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Şifre *</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        </div>
                    )}
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', color: '#0f172a', marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>Özel Alt Yetkiler (İsteğe Bağlı)</h3>
                    
                    {(() => {
                        const categories = {
                            'Genel Sistem': ['view_dashboard', 'view_activity_log'],
                            'Ürün ve Stok (ERP)': ['view_products', 'product_add', 'product_edit', 'product_delete', 'category_manage', 'formula_manage', 'supplier_manage', 'box_manage', 'stock_entry', 'inventory_view'],
                            'Sipariş ve Kampanya': ['view_orders', 'order_create', 'order_approve', 'order_prepare', 'order_ship', 'order_cancel', 'view_campaigns', 'campaign_manage'],
                            'Üretim Yönetimi': ['view_production', 'production_manage'],
                            'Satın Alma': ['view_procurement', 'procurement_request', 'procurement_order'],
                            'Depo (WMS)': ['view_wms', 'wms_transfer', 'wms_location'],
                            'Müşteri İlişkileri (CRM)': ['view_crm', 'crm_customer_add', 'crm_tickets'],
                            'Finans & Muhasebe': ['view_finance', 'finance_add_transaction', 'finance_invoices', 'view_reports'],
                            'İnsan Kaynakları': ['view_employees', 'employee_add', 'employee_edit', 'employee_delete', 'view_leaves', 'manage_leaves'],
                            'Çıkış İşlemleri ve Departman Onayları': ['view_offboarding', 'offboard_approve_it', 'offboard_approve_idari', 'offboard_approve_finance', 'offboard_approve_legal'],
                            'Sistem Kullanıcıları': ['view_staff', 'staff_manage']
                        };

                        const renderedGroups = Object.entries(categories).map(([catName, keys]) => {
                            const permsInCat = allPermissions.filter(p => keys.includes(p.permission_key));
                            // Sıralamayı keys array'ine göre yap
                            permsInCat.sort((a, b) => keys.indexOf(a.permission_key) - keys.indexOf(b.permission_key));

                            if (permsInCat.length === 0) return null;

                            return (
                                <div key={catName} style={{ marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '13px', color: '#1e293b', marginTop: 0, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>{catName}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', paddingLeft: '8px' }}>
                                        {permsInCat.map(perm => (
                                            <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedPermissions.includes(perm.permission_key)} 
                                                    onChange={() => handlePermissionToggle(perm.permission_key)}
                                                    style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                                                />
                                                <span>{perm.description}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        });

                        const otherPerms = allPermissions.filter(p => !Object.values(categories).flat().includes(p.permission_key));
                        
                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                {renderedGroups}
                                {otherPerms.length > 0 && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ fontSize: '13px', color: '#1e293b', marginTop: 0, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Diğer</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', paddingLeft: '8px' }}>
                                            {otherPerms.map(perm => (
                                                <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedPermissions.includes(perm.permission_key)} 
                                                        onChange={() => handlePermissionToggle(perm.permission_key)}
                                                        style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                                                    />
                                                    <span>{perm.description}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={() => onClose(false)} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>İptal</button>
                    <button type="submit" disabled={loading} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#10b981', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}>
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffForm;
