/**
 * ============================================================================
 * BİLEŞEN ADI: PickingCarts
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Depo tanımları, raf krokileri ve fiziki lokasyon yönetim bileşeni.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import BarcodePrintModal from '../Common/BarcodePrintModal';

const PickingCarts = ({ currentUser }) => {
    const [carts, setCarts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBarcodeModalOpen, setSearchBarcodeModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editCartId, setEditCartId] = useState(null);
    const [viewBarcode, setViewBarcode] = useState({ value: '', title: '' });
    const [viewBarcodeOpen, setViewBarcodeOpen] = useState(false);
    const [barcodeModalIndex, setBarcodeModalIndex] = useState(null);
    const [tempBarcode, setTempBarcode] = useState('');
    const [cartBarcodeModalOpen, setCartBarcodeModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        warehouse_id: '',
        section_count: '',
        section_prefix: 'B',
        barcode: '', // Cart barcode
        sections: [] // For edit mode
    });

    const generateRandomBarcode = () => {
        return Math.floor(1000000000000 + Math.random() * 9000000000000).toString(); // 13 digit
    };

    const hasPerm = (key) => currentUser?.role === 'admin' || (currentUser?.permissions || []).includes(key);

    // Auto-generate sections when count/prefix changes for NEW carts
    useEffect(() => {
        if (!editCartId && formData.section_count && formData.section_prefix) {
            const count = parseInt(formData.section_count);
            if (!isNaN(count) && count > 0 && count <= 100) {
                const newSections = Array.from({length: count}).map((_, i) => ({
                    id: null,
                    section_name: `${formData.section_prefix}${i+1}`,
                    barcode: ''
                }));
                // Only overwrite if length changed or prefix changed
                setFormData(prev => ({ ...prev, sections: newSections }));
            }
        }
    }, [formData.section_count, formData.section_prefix, editCartId]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            // Depoları ve Taşıma arabalarını paralel çek
            const [warehousesRes, cartsRes] = await Promise.all([
                apiFetch('http://localhost:3000/api/warehouses'),
                apiFetch('http://localhost:3000/api/picking_carts')
            ]);

            const warehousesData = await warehousesRes.json();
            const cartsData = await cartsRes.json();

            // warehouses endpoint returns an array directly, carts endpoint returns { success: true, data: [...] }
            setWarehouses(Array.isArray(warehousesData) ? warehousesData : (warehousesData.data || []));
            if (cartsData.success) setCarts(cartsData.data || []);
            
            
        } catch (err) {
            console.error('Veri yükleme hatası:', err);
            setError('Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!formData.name || !formData.warehouse_id || (!editCartId && !formData.section_count)) {
            setError('Lütfen zorunlu alanları doldurun.');
            return;
        }

        try {
            const url = editCartId ? `http://localhost:3000/api/picking_carts/${editCartId}` : 'http://localhost:3000/api/picking_carts';
            const method = editCartId ? 'PUT' : 'POST';
            
            const payload = {
                name: formData.name,
                warehouse_id: formData.warehouse_id,
                barcode: formData.barcode,
                sections: formData.sections
            };

            const response = await apiFetch(url, {
                method,
                body: JSON.stringify(payload)
            });
            const res = await response.json();

            if (res.success) {
                setSuccessMessage(editCartId ? 'Taşıma arabası güncellendi.' : 'Taşıma arabası başarıyla oluşturuldu.');
                closeModal();
                fetchData(); // Listeyi yenile
            } else {
                setError(res.message || 'Bir hata oluştu.');
            }
        } catch (err) {
            console.error('İşlem hatası:', err);
            setError('Kayıt yapılamadı.');
        }
    };

    const openEditModal = (cart) => {
        setEditCartId(cart.id);
        setFormData({
            name: cart.name,
            warehouse_id: cart.warehouse_id,
            section_count: '',
            section_prefix: '',
            barcode: cart.barcode || '',
            sections: cart.sections ? cart.sections.map(s => ({ id: s.id, section_name: s.section_name, barcode: s.barcode || '', is_full: s.is_full })) : []
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditCartId(null);
        setFormData({ name: '', warehouse_id: '', section_count: '1', section_prefix: 'B', barcode: '', sections: [{id: null, section_name: 'B1', barcode: ''}] });
    };

    const handleSectionChange = (index, field, val) => {
        const newSections = [...formData.sections];
        newSections[index][field] = val;
        setFormData(prev => ({ ...prev, sections: newSections }));
    };

    const addSectionToEdit = () => {
        setFormData(prev => ({ ...prev, sections: [...prev.sections, { id: null, section_name: '', barcode: '' }] }));
    };

    const removeSectionFromEdit = (index) => {
        const newSections = [...formData.sections];
        newSections.splice(index, 1);
        setFormData(prev => ({ ...prev, sections: newSections }));
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            const response = await apiFetch(`http://localhost:3000/api/picking_carts/${id}/toggle-active`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: !currentStatus })
            });
            const res = await response.json();

            if (res.success) {
                fetchData();
            } else {
                alert(res.message || 'Durum güncellenemedi.');
            }
        } catch (err) {
            console.error('Durum güncelleme hatası:', err);
            alert('Sunucu hatası.');
        }
    };

    const deleteCart = async (id) => {
        if (!window.confirm('Bu taşıma arabasını silmek istediğinize emin misiniz? (Bağlı olan tüm bölümler silinecektir)')) return;
        
        try {
            const response = await apiFetch(`http://localhost:3000/api/picking_carts/${id}`, {
                method: 'DELETE'
            });
            const res = await response.json();

            if (res.success) {
                fetchData();
            } else {
                alert(res.message || 'Silme işlemi başarısız.');
            }
        } catch (err) {
            console.error('Silme hatası:', err);
            alert('Sunucu hatası.');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', color: '#64748b' }}>Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a', fontWeight: '800' }}>Taşıma Arabaları</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Sipariş toplama arabalarını ve bölümlerini yönetin.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input 
                            type="text"
                            placeholder="Ad, Bölüm veya Barkod Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px 14px 10px 44px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '280px', outline: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        />
                        <button 
                            onClick={() => {
                                setSearchBarcodeModalOpen(!searchBarcodeModalOpen);
                                setTimeout(() => document.getElementById('search-barcode-popup-input')?.focus(), 50);
                            }}
                            style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                            title="Barkod Okut"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                        </button>
                        
                        {searchBarcodeModalOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: '0', zIndex: 50, marginTop: '8px', backgroundColor: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Barkod Okutun:</label>
                                <input 
                                    id="search-barcode-popup-input"
                                    type="text" 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setSearchTerm(e.target.value);
                                            setSearchBarcodeModalOpen(false);
                                        }
                                    }}
                                    placeholder="Okutun veya yazın..." 
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #3b82f6', outline: 'none', width: '200px', fontSize: '14px' }} 
                                />
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Okuttuktan sonra otomatik aranır.</div>
                            </div>
                        )}
                    </div>
                    {hasPerm('warehouse_manage') && (
                        <button 
                            onClick={() => { setEditCartId(null); setIsModalOpen(true); }}
                            style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
                        >
                            <span>+</span> Yeni Taşıma Arabası Ekle
                        </button>
                    )}
                </div>
            </div>

            {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}
            {successMessage && <div style={{ padding: '12px', backgroundColor: '#dcfce3', color: '#166534', borderRadius: '8px', marginBottom: '20px' }}>{successMessage}</div>}

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '0', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f1f5f9' }}>
                        <tr>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: '700' }}>ID</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: '700' }}>Araba Adı</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: '700' }}>Bulunduğu Depo</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: '700' }}>Bölüm Sayısı</th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: '700' }}>Bölüm Örnekleri</th>
                            <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#475569', fontWeight: '700' }}>Durum</th>
                            {hasPerm('warehouse_manage') && (
                                <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', color: '#475569', fontWeight: '700' }}>İşlemler</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {carts.filter(cart => {
                            if (!searchTerm) return true;
                            const term = searchTerm.toLowerCase();
                            if (cart.name?.toLowerCase().includes(term)) return true;
                            if (cart.barcode?.toLowerCase().includes(term)) return true;
                            if (cart.sections?.some(s => s.barcode?.toLowerCase().includes(term) || s.section_name?.toLowerCase().includes(term))) return true;
                            return false;
                        }).length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Henüz kayıtlı veya aranan kritere uygun taşıma arabası bulunmuyor.</td>
                            </tr>
                        ) : (
                            carts.filter(cart => {
                                if (!searchTerm) return true;
                                const term = searchTerm.toLowerCase();
                                if (cart.name?.toLowerCase().includes(term)) return true;
                                if (cart.barcode?.toLowerCase().includes(term)) return true;
                                if (cart.sections?.some(s => s.barcode?.toLowerCase().includes(term) || s.section_name?.toLowerCase().includes(term))) return true;
                                return false;
                            }).map((cart, idx, filteredArray) => (
                                <tr key={cart.id} style={{ borderBottom: idx === filteredArray.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '16px', color: '#0f172a', fontWeight: '500' }}>#{cart.id}</td>
                                    <td style={{ padding: '16px', color: '#0f172a', fontWeight: '700' }}>{cart.name}</td>
                                    <td style={{ padding: '16px', color: '#475569' }}>{cart.warehouse_name}</td>
                                    <td style={{ padding: '16px', color: '#475569' }}>
                                        <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>{cart.section_count}</span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>
                                        {cart.sections.slice(0, 3).map(s => s.section_name).join(', ')}
                                        {cart.sections.length > 3 && ' ...'}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: cart.is_active ? '#dcfce3' : '#166534', color: cart.is_active ? '#166534' : '#ffffff', border: cart.is_active ? 'none' : '1px solid #166534' }}>
                                            {cart.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    {hasPerm('warehouse_manage') && (
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <button 
                                                onClick={() => openEditModal(cart)}
                                                style={{ padding: '6px 12px', marginRight: '8px', backgroundColor: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                            >
                                                Düzenle
                                            </button>
                                            <button 
                                                onClick={() => toggleActive(cart.id, cart.is_active)}
                                                style={{ padding: '6px 12px', marginRight: '8px', backgroundColor: 'transparent', color: cart.is_active ? '#f59e0b' : '#10b981', border: `1px solid ${cart.is_active ? '#f59e0b' : '#10b981'}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                            >
                                                {cart.is_active ? 'Devre Dışı Bırak' : 'Aktif Et'}
                                            </button>
                                            <button 
                                                onClick={() => deleteCart(cart.id)}
                                                style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#ef4444', border: 'none', textDecoration: 'underline', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                            >
                                                Sil
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Yeni Ekleme Modalı */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{editCartId ? 'Taşıma Arabasını Düzenle' : 'Yeni Taşıma Arabası Ekle'}</h2>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Araba Adı *</label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Örn: Taşıma Arabası 1"
                                        style={{ width: '100%', height: '42px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', margin: 0 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px', textAlign: 'center' }}>Barkod</label>
                                    <div style={{ position: 'relative', height: '42px', display: 'flex', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (cartBarcodeModalOpen) {
                                                    setCartBarcodeModalOpen(false);
                                                } else {
                                                    setCartBarcodeModalOpen(true);
                                                    setTempBarcode(formData.barcode || '');
                                                    setTimeout(() => document.getElementById('cart-barcode-input')?.focus(), 50);
                                                }
                                            }}
                                            title={formData.barcode ? `Barkod: ${formData.barcode}` : "Barkod ekle"}
                                            style={{
                                                padding: '0',
                                                backgroundColor: formData.barcode ? '#ecfdf5' : 'white',
                                                border: '1px solid #cbd5e1',
                                                borderColor: formData.barcode ? '#10b981' : '#cbd5e1',
                                                color: formData.barcode ? '#10b981' : '#64748b',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '42px',
                                                width: '42px',
                                                boxSizing: 'border-box',
                                                margin: 0
                                            }}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                                        </button>
                                        
                                        {cartBarcodeModalOpen && (
                                            <div style={{ position: 'absolute', top: '100%', right: '0', zIndex: 50, marginTop: '8px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input 
                                                    id="cart-barcode-input"
                                                    type="text" 
                                                    value={tempBarcode} 
                                                    onChange={e => setTempBarcode(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const finalBarcode = e.target.value;
                                                            setFormData(prev => ({ ...prev, barcode: finalBarcode }));
                                                            setCartBarcodeModalOpen(false);
                                                        }
                                                    }}
                                                    placeholder="Okutun veya yazın..." 
                                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #3b82f6', outline: 'none', width: '150px', fontSize: '14px' }} 
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setTempBarcode(generateRandomBarcode())}
                                                    style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                                >
                                                    Oluştur
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, barcode: tempBarcode }));
                                                        setCartBarcodeModalOpen(false);
                                                    }}
                                                    style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    Kaydet
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {formData.barcode && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>Araba Barkodu:</span>
                                        <span style={{ fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap' }}>{formData.barcode}</span>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setViewBarcode({ value: formData.barcode, title: `Araba: ${formData.name || 'Yeni Araba'}` });
                                                setViewBarcodeOpen(true);
                                            }}
                                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center' }} title="Barkodu Görüntüle / Yazdır"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Bulunduğu Depo *</label>
                                <select 
                                    name="warehouse_id"
                                    value={formData.warehouse_id}
                                    onChange={handleInputChange}
                                    required
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                                >
                                    <option value="">Depo Seçiniz...</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            {!editCartId && (
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Bölüm Sayısı *</label>
                                        <input 
                                            type="number" 
                                            name="section_count"
                                            min="1"
                                            max="50"
                                            value={formData.section_count}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Örn: 6"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Bölüm Öneki (Harf)</label>
                                        <input 
                                            type="text" 
                                            name="section_prefix"
                                            value={formData.section_prefix}
                                            onChange={handleInputChange}
                                            placeholder="Örn: B"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', margin: 0 }}>Araba Bölümleri</label>
                                        <button type="button" onClick={addSectionToEdit} style={{ padding: '4px 10px', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ Yeni Ekle</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                                        {formData.sections.map((sec, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'white', padding: '0', borderRadius: '8px' }}>
                                                <input 
                                                    type="text"
                                                    value={sec.section_name}
                                                    onChange={(e) => handleSectionChange(index, 'section_name', e.target.value)}
                                                    required
                                                    placeholder="Örn: B1"
                                                    title="Bölüm Adı"
                                                    style={{ width: '130px', flexShrink: 0, height: '42px', padding: '0 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', margin: 0 }}
                                                />
                                                
                                                {editCartId && (
                                                    <span style={{ 
                                                        backgroundColor: sec.is_full ? '#fef3c7' : '#f1f5f9', 
                                                        color: sec.is_full ? '#d97706' : '#64748b', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '6px', 
                                                        fontSize: '12px', 
                                                        fontWeight: 'bold',
                                                        marginLeft: '-4px' 
                                                    }}>
                                                        {sec.is_full ? 'Dolu' : 'Boş'}
                                                    </span>
                                                )}

                                                <div style={{ position: 'relative', flexShrink: 0, height: '42px', display: 'flex', alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (barcodeModalIndex === index) {
                                                                setBarcodeModalIndex(null);
                                                            } else {
                                                                setBarcodeModalIndex(index);
                                                                setTempBarcode(sec.barcode || '');
                                                                setTimeout(() => document.getElementById(`section-barcode-${index}`)?.focus(), 50);
                                                            }
                                                        }}
                                                        title={sec.barcode ? `Barkod: ${sec.barcode}` : "Barkod ekle"}
                                                        style={{
                                                            padding: '0',
                                                            backgroundColor: sec.barcode ? '#ecfdf5' : 'white',
                                                            border: '1px solid #cbd5e1',
                                                            borderColor: sec.barcode ? '#10b981' : '#cbd5e1',
                                                            color: sec.barcode ? '#10b981' : '#64748b',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '42px',
                                                            width: '42px',
                                                            boxSizing: 'border-box',
                                                            margin: 0
                                                        }}
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                                                    </button>
                                                    
                                                    {barcodeModalIndex === index && (
                                                        <div style={{ position: 'absolute', top: '100%', right: '0', zIndex: 50, marginTop: '8px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                                                            <input 
                                                                id={`section-barcode-${index}`}
                                                                type="text" 
                                                                value={tempBarcode} 
                                                                onChange={e => setTempBarcode(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        const finalBarcode = e.target.value;
                                                                        handleSectionChange(index, 'barcode', finalBarcode);
                                                                        setBarcodeModalIndex(null);
                                                                    }
                                                                }}
                                                                placeholder="Okutun veya yazın..." 
                                                                style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #3b82f6', outline: 'none', width: '150px', fontSize: '14px' }} 
                                                            />
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setTempBarcode(generateRandomBarcode())}
                                                                style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                                            >
                                                                Oluştur
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    handleSectionChange(index, 'barcode', tempBarcode);
                                                                    setBarcodeModalIndex(null);
                                                                }}
                                                                style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                Kaydet
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {sec.barcode && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', flexShrink: 0 }}>
                                                        <span style={{ fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', width: '120px', display: 'inline-block' }}>{sec.barcode}</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setViewBarcode({ value: sec.barcode, title: `Bölüm: ${sec.section_name}` });
                                                                setViewBarcodeOpen(true);
                                                            }}
                                                            style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', width: '42px', boxSizing: 'border-box', margin: 0 }} title="Barkodu Görüntüle / Yazdır"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                                        </button>
                                                    </div>
                                                )}
                                                <button type="button" onClick={() => removeSectionFromEdit(index)} style={{ height: '42px', width: '42px', flexShrink: 0, padding: '0', backgroundColor: 'transparent', color: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', margin: 0 }} title="Sil">
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                        {formData.sections.length === 0 && (
                                            <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Hiç bölüm eklenmemiş. Yeni bölüm eklemek için yukarıdaki butonu kullanın.</div>
                                        )}
                                    </div>
                                </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                    İptal
                                </button>
                                <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <BarcodePrintModal 
                isOpen={viewBarcodeOpen}
                onClose={() => setViewBarcodeOpen(false)}
                barcodeValue={viewBarcode?.value}
                title={viewBarcode?.title}
            />
        </div>
    );
};

export default PickingCarts;


