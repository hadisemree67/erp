/**
 * ============================================================================
 * BİLEŞEN ADI: EmployeeForm
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Personel, İK, maaş, izin ve işten ayrılış işlemlerini barındıran bileşen.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (EmployeeForm.jsx), Personel listesi, mesai (overtime) ve izin (leave) yönetim arayüzlerini içerir.
 */

import { apiFetch } from '../../utils/api';
import React, { useState } from 'react';

const EmployeeForm = ({ employee, onClose, currentUser }) => {
    const isEditing = !!employee;

    const departmentsAndRoles = {
        "Yönetim": ["Genel Müdür", "Operasyon Müdürü", "Bölüm Yöneticisi"],
        "İnsan Kaynakları": ["İK Müdürü", "İşe Alım Uzmanı", "Bordro Uzmanı"],
        "Finans ve Muhasebe": ["Finans Müdürü", "Muhasebeci", "Finansal Analist", "Ön Muhasebe"],
        "Depo ve Lojistik": ["Depo Şefi", "Depo Görevlisi", "Forklift Operatörü", "Sevkiyat Sorumlusu", "Şoför", "Paketleme Görevlisi"],
        "Satın Alma": ["Satın Alma Müdürü", "Tedarik Zinciri Uzmanı", "Satın Alma Sorumlusu"],
        "Satış ve Pazarlama": ["Satış Müdürü", "Pazarlama Uzmanı", "Saha Satış Temsilcisi", "Dijital Pazarlama"],
        "E-Ticaret ve Operasyon": ["E-Ticaret Yöneticisi", "İçerik ve Katalog Uzmanı", "Sipariş Takip Sorumlusu"],
        "Müşteri Hizmetleri": ["Çağrı Merkezi Şefi", "Müşteri Temsilcisi", "İade Sorumlusu"],
        "Bilgi İşlem": ["Sistem Yöneticisi", "Yazılım Geliştirici", "IT Destek Uzmanı"],
        "Destek ve İdari İşler": ["Güvenlik Görevlisi", "Temizlik Personeli", "Çay ve Mutfak Görevlisi", "Sekreter"],
        "Hukuk": ["Kurum Avukatı", "Hukuk Müşaviri", "Yasal Uyum Uzmanı"]
    };

    // 1. Durum (State) Tanımlamaları ve Hook'lar

    const [formData, setFormData] = useState({
        full_name: employee?.full_name || '',
        department: employee?.department || '',
        position: employee?.position || '',
        phone: employee?.phone || '',
        email: employee?.email || '',
        start_date: employee?.start_date ? String(employee.start_date).split('T')[0] : '',
        salary: employee?.salary || '',
        tckn: employee?.tckn || '',
        address: employee?.address || '',
        blood_type: employee?.blood_type || '',
        emergency_contact: employee?.emergency_contact || '',
        work_status: employee?.work_status || 'Aktif',
        photo: null,
        documents: null
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [existingDocuments, setExistingDocuments] = useState([]);

    React.useEffect(() => {
        if (isEditing && employee?.id) {
            const fetchDocuments = async () => {
                try {
                    const res = await apiFetch(`http://localhost:3000/api/employees/${employee.id}/documents`);
                    const data = await res.json();
                    if (data.success) {
                        setExistingDocuments(data.documents);
                    }
                } catch (err) {
                    console.error('Mevcut belgeler yüklenemedi:', err);
                }
            };
            fetchDocuments();
        }
    }, [isEditing, employee]);

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            if (name === 'documents') {
                const newFiles = Array.from(files);
                const currentDocs = Array.isArray(formData.documents) ? formData.documents : (formData.documents ? Array.from(formData.documents) : []);
                setFormData({ ...formData, documents: [...currentDocs, ...newFiles] });
                // Aynı dosyayı tekrar seçebilmek için input'u temizle
                e.target.value = '';
            } else {
                setFormData({ ...formData, [name]: files[0] });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleRemovePendingDocument = (index) => {
        const newDocs = [...formData.documents];
        newDocs.splice(index, 1);
        setFormData({ ...formData, documents: newDocs });
    };

    const handleDeleteExistingDocument = async (docId) => {
        if (!window.confirm('Bu belgeyi kalıcı olarak silmek istediğinize emin misiniz?')) return;
        
        try {
            const res = await apiFetch(`http://localhost:3000/api/employees/documents/${docId}`, {
                method: 'DELETE',
                headers: { 'X-User-Id': currentUser?.id }
            });
            const data = await res.json();
            if (data.success) {
                setExistingDocuments(prev => prev.filter(doc => doc.id !== docId));
            } else {
                alert(data.message || 'Belge silinemedi.');
            }
        } catch (err) {
            console.error(err);
            alert('Belge silinirken hata oluştu.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const url = isEditing ? `http://localhost:3000/api/employees/${employee.id}` : 'http://localhost:3000/api/employees';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const submitData = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'documents' && formData.documents) {
                    Array.from(formData.documents).forEach(file => {
                        submitData.append('documents', file);
                    });
                } else if (formData[key] !== null && formData[key] !== undefined) {
                    submitData.append(key, formData[key]);
                }
            });

            const res = await apiFetch(url, {
                method,
                headers: { 
                    'X-User-Id': currentUser?.id
                },
                body: submitData
            });
            const data = await res.json();

            if (data.success) {
                onClose(true);
            } else {
                setError(data.message || 'Bir hata oluştu.');
            }
        } catch (err) {
            console.error('Frontend Error:', err);
            setError('Bağlantı hatası: ' + (err.message || 'Bilinmeyen hata'));
        } finally {
            setLoading(false);
        }
    };

    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    const handlePreviewLocalFile = (file) => {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (isImage || isPdf) {
            window.open(URL.createObjectURL(file), '_blank');
        } else {
            alert('Güvenlik nedeniyle bu dosya türünün (HTML, JS, EXE vb.) yerel önizlemesi desteklenmiyor.');
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ color: '#0f172a', margin: 0 }}>{isEditing ? 'Personel Bilgilerini Düzenle' : 'Yeni Personel Kaydı'}</h2>
                    <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Bu alana sisteme girmesine gerek olmayan, şirkette çalışan kişilerin bilgilerini kaydedebilirsiniz.</p>
                </div>
                <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>✕ İptal</button>
            </div>

            {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

            <form onSubmit={handleSubmit} encType="multipart/form-data">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Personel Fotoğrafı</label>
                        <input type="file" name="photo" accept="image/*" onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }} />
                        {isEditing && employee.photo_path && <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981' }}>Mevcut fotoğraf var. Yeni seçilmezse eski fotoğraf korunur.</div>}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Ad Soyad *</label>
                        <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required placeholder="Örn: Ahmet Yılmaz" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Çalıştığı Birim (Departman)</label>
                        <select name="department" value={formData.department} onChange={(e) => { handleChange(e); setFormData(prev => ({...prev, department: e.target.value, position: ''})) }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                            <option value="">Departman Seçiniz</option>
                            {Object.keys(departmentsAndRoles).map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Görevi (Alt Birim)</label>
                        <select name="position" value={formData.position} onChange={handleChange} disabled={!formData.department} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: formData.department ? 'white' : '#f8fafc' }}>
                            <option value="">Görev Seçiniz</option>
                            {formData.department && departmentsAndRoles[formData.department] ? departmentsAndRoles[formData.department].map(role => (
                                <option key={role} value={role}>{role}</option>
                            )) : (
                                employee?.position && !departmentsAndRoles[formData.department] ? <option value={employee.position}>{employee.position}</option> : null
                            )}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Telefon Numarası</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Örn: 0555 555 55 55" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>E-Posta Adresi</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Örn: ahmet@sirket.com" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>İşe Giriş Tarihi</label>
                        <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Çalışma / İzin Durumu</label>
                        <select name="work_status" value={formData.work_status} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                            <option value="Aktif">Aktif Çalışıyor</option>
                            <option value="İzinli / Raporlu">İzinli / Raporlu</option>
                            <option value="Ücretsiz İzinli">Ücretsiz İzinli</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>TC Kimlik No</label>
                        <input type="text" name="tckn" value={formData.tckn} onChange={handleChange} maxLength="11" placeholder="11 Haneli TCKN" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Maaş (₺)</label>
                        <input type="number" name="salary" value={formData.salary} onChange={handleChange} placeholder="Örn: 25000" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Kan Grubu</label>
                        <select name="blood_type" value={formData.blood_type} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                            <option value="">Seçiniz</option>
                            <option value="0-">0-</option>
                            <option value="0+">0+</option>
                            <option value="A-">A-</option>
                            <option value="A+">A+</option>
                            <option value="B-">B-</option>
                            <option value="B+">B+</option>
                            <option value="AB-">AB-</option>
                            <option value="AB+">AB+</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Acil Durum Kişisi ve İletişim</label>
                        <input type="text" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="Örn: Eşi - 0555 555 55 55" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açık Adres</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} rows="3" placeholder="Personelin ikametgah adresi" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Özlük Dosyaları (Sicil, Kimlik, Diploma, Sözleşme vb.)</label>
                        <input type="file" name="documents" multiple onChange={handleChange} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>Birden fazla dosya (PDF, Word, JPG) seçebilirsiniz. Maksimum 10 dosya.</div>
                        
                        {formData.documents && formData.documents.length > 0 && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>Yeni Eklenecek Belgeler (Henüz Kaydedilmedi):</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {formData.documents.map((file, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0f172a', padding: '8px 12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                            📄 <span style={{ fontWeight: '500' }}>{file.name}</span>
                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                                                <button type="button" onClick={() => handlePreviewLocalFile(file)} style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}>Aç</button>
                                                <button type="button" onClick={() => handleRemovePendingDocument(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}>Sil</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isEditing && existingDocuments.length > 0 && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>Daha Önce Yüklenen Belgeler:</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {existingDocuments.map(doc => (
                                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0f172a', textDecoration: 'none', padding: '8px 12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #cbd5e1', transition: 'all 0.2s' }} onMouseOver={e => Object.assign(e.currentTarget.style, { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' })} onMouseOut={e => Object.assign(e.currentTarget.style, { borderColor: '#cbd5e1', backgroundColor: 'white' })}>
                                            📄 <span style={{ fontWeight: '500' }}>{doc.file_name}</span> 
                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                                                <a href={`http://localhost:3000${doc.file_path}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>Görüntüle</a>
                                                <button type="button" onClick={() => handleDeleteExistingDocument(doc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}>Sil</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

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

export default EmployeeForm;

