/**
 * ============================================================================
 * BİLEŞEN ADI: Coupons
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   İndirim kampanyaları ve kupon yönetimi işlemlerini sağlayan ekran.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const Coupons = ({ currentUser }) => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form veri yönetimi (State)
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'Percentage',
        discount_value: '',
        minimum_order_amount: '',
        maximum_discount_amount: '',
        buy_quantity: '',
        free_quantity: '',
        gift_product_id: '',
        target_category: '',
        target_product_id: '',
        usage_limit: '',
        start_date: '',
        end_date: '',
        is_active: true,
        target_audience: 'all',
        target_customer_ids: []
    });

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        fetchCoupons();
        fetchProductsAndCategories();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/coupons');
            const data = await res.json();
            if (data.success) {
                setCoupons(data.coupons);
            } else {
                setError(data.message || 'Kuponlar alınamadı.');
            }
        } catch (err) {
            setError('Sunucu hatası oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsAndCategories = async () => {
        try {
            const [prodRes, custRes] = await Promise.all([
                apiFetch('http://localhost:3000/api/products'),
                apiFetch('http://localhost:3000/api/customers')
            ]);
            
            if (prodRes.ok) {
                const pData = await prodRes.json();
                const filteredProducts = pData.filter(p => !p.Category || p.Category.trim().toLowerCase() !== 'hammadde');
                setProducts(filteredProducts);
                // Sadece benzersiz (unique) kategorileri ayıkla
                const uniqueCategories = [...new Set(filteredProducts.map(p => p.Category).filter(Boolean))];
                setCategories(uniqueCategories);
            }

            if (custRes.ok) {
                const cData = await custRes.json();
                setCustomers(cData.customers || []);
            }
        } catch (error) {
            console.error('Veriler çekilirken hata:', error);
        }
    };

    const openModal = (coupon = null) => {
        if (coupon) {
            setEditingId(coupon.id);
            setFormData({
                code: coupon.code || '',
                discount_type: coupon.discount_type || 'Percentage',
                discount_value: coupon.discount_value || '',
                minimum_order_amount: coupon.minimum_order_amount || '',
                maximum_discount_amount: coupon.maximum_discount_amount || '',
                buy_quantity: coupon.buy_quantity || '',
                free_quantity: coupon.free_quantity || '',
                gift_product_id: coupon.gift_product_id || '',
                target_category: coupon.target_category || '',
                target_product_id: coupon.target_product_id || '',
                usage_limit: coupon.usage_limit || '',
                start_date: coupon.start_date ? coupon.start_date.split('T')[0] : '',
                end_date: coupon.end_date ? coupon.end_date.split('T')[0] : '',
                is_active: coupon.is_active !== false,
                target_audience: coupon.target_audience || 'all',
                target_customer_ids: (typeof coupon.target_customer_ids === 'string' ? JSON.parse(coupon.target_customer_ids) : coupon.target_customer_ids) || []
            });
        } else {
            setEditingId(null);
            setFormData({
                code: '',
                discount_type: 'Percentage',
                discount_value: '',
                minimum_order_amount: '',
                maximum_discount_amount: '',
                buy_quantity: '',
                free_quantity: '',
                gift_product_id: '',
                target_category: '',
                target_product_id: '',
                usage_limit: '',
                start_date: '',
                end_date: '',
                is_active: true,
                target_audience: 'all',
                target_customer_ids: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId 
                ? `http://localhost:3000/api/coupons/${editingId}`
                : 'http://localhost:3000/api/coupons';

            const res = await apiFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                fetchCoupons();
            } else {
                alert(data.message || 'Hata oluştu.');
            }
        } catch (error) {
            console.error(error);
            alert('Sunucu hatası.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/coupons/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchCoupons();
            } else {
                alert(data.message || 'Silinemedi.');
            }
        } catch (error) {
            alert('Hata oluştu.');
        }
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>İndirim Kuponları</h1>
                <button 
                    onClick={() => openModal()}
                    style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                    + Yeni Kupon
                </button>
            </div>

            {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}

            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Kupon Kodu</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Tip</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Değer</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Kullanım / Limit</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Durum</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>Yükleniyor...</td></tr>
                        ) : coupons.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Kayıtlı kupon bulunmamaktadır.</td></tr>
                        ) : coupons.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{c.code}</td>
                                <td style={{ padding: '12px', color: '#334155' }}>
                                    {c.discount_type === 'Percentage' ? 'Yüzde İndirim' : 
                                     c.discount_type === 'FixedAmount' ? 'Sabit İndirim' : 
                                     c.discount_type === 'BuyXGetY' ? 'X Al Y Öde' : 
                                     c.discount_type === 'GiftProduct' ? 'Hediye Ürün' : 
                                     c.discount_type === 'FreeShipping' ? 'Kargo Bedava' : c.discount_type}
                                </td>
                                <td style={{ padding: '12px', color: '#334155' }}>{c.discount_value ? (c.discount_type === 'Percentage' ? `%${c.discount_value}` : `${c.discount_value} TL`) : '-'}</td>
                                <td style={{ padding: '12px', color: '#334155' }}>{c.used_count || 0} / {c.usage_limit || 'Sınırsız'}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: c.is_active ? '#dcfce7' : '#fee2e2', color: c.is_active ? '#166534' : '#991b1b', fontSize: '12px', fontWeight: '600' }}>
                                        {c.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <button onClick={() => openModal(c)} style={{ marginRight: '8px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Düzenle</button>
                                    <button onClick={() => handleDelete(c.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Sil</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', color: '#0f172a', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>{editingId ? 'Kupon Düzenle' : 'Yeni Kupon'}</h2>
                        <form onSubmit={handleSave} style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Kupon Kodu *</label>
                                <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Kupon Tipi *</label>
                                <select required value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }}>
                                    <option value="Percentage">Yüzde İndirim</option>
                                    <option value="FixedAmount">Sabit Tutar İndirim</option>
                                    <option value="BuyXGetY">X Al Y Öde (Bedava)</option>
                                    <option value="GiftProduct">Hediye Ürün</option>
                                    <option value="FreeShipping">Kargo Bedava</option>
                                </select>
                            </div>

                            {(formData.discount_type === 'Percentage' || formData.discount_type === 'FixedAmount') && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>İndirim Değeri (Yüzde veya TL) *</label>
                                    <input type="number" required value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                                </div>
                            )}

                            {formData.discount_type === 'BuyXGetY' && (
                                <>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Alınması Gereken Adet (X) *</label>
                                        <input type="number" required value={formData.buy_quantity} onChange={e => setFormData({...formData, buy_quantity: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Bedava Verilecek Adet (Y) *</label>
                                        <input type="number" required value={formData.free_quantity} onChange={e => setFormData({...formData, free_quantity: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                                    </div>
                                </>
                            )}

                            {formData.discount_type === 'GiftProduct' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Hediye Edilecek Ürün *</label>
                                    <select required value={formData.gift_product_id} onChange={e => setFormData({...formData, gift_product_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }}>
                                        <option value="">-- Ürün Seçiniz --</option>
                                        {products.map(p => <option key={p.Id} value={p.Id}>{p.ProductName}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Minimum Sipariş Tutarı</label>
                                <input type="number" value={formData.minimum_order_amount} onChange={e => setFormData({...formData, minimum_order_amount: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Maksimum İndirim Tutarı</label>
                                <input type="number" value={formData.maximum_discount_amount} onChange={e => setFormData({...formData, maximum_discount_amount: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Sadece Belirli Kategori</label>
                                <select value={formData.target_category} onChange={e => setFormData({...formData, target_category: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }}>
                                    <option value="">Tümü</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Sadece Belirli Ürün</label>
                                <select value={formData.target_product_id} onChange={e => setFormData({...formData, target_product_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }}>
                                    <option value="">Tümü</option>
                                    {products.map(p => <option key={p.Id} value={p.Id}>{p.ProductName}</option>)}
                                </select>
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Hedef Kitle (Kime Özel?)</label>
                                <select required value={formData.target_audience} onChange={e => setFormData({...formData, target_audience: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }}>
                                    <option value="all">Herkese Açık (Genel Kampanya)</option>
                                    <option value="specific">Belirli Müşterilere Özel</option>
                                </select>
                            </div>

                            {formData.target_audience === 'specific' && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Müşterileri Seçin (Çoklu Seçim)</label>
                                    <select 
                                        multiple 
                                        value={formData.target_customer_ids} 
                                        onChange={e => {
                                            const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                            setFormData({...formData, target_customer_ids: selectedOptions});
                                        }} 
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white', minHeight: '120px' }}
                                    >
                                        {customers.map(c => <option key={c.Id} value={c.Id}>{c.CustomerName} ({c.Email || c.Phone})</option>)}
                                    </select>
                                    <small style={{ color: '#64748b' }}>Birden fazla seçmek için CTRL (veya CMD) tuşuna basılı tutarak tıklayın.</small>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Kullanım Limiti (Adet)</label>
                                <input type="number" value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Durum</label>
                                <select value={formData.is_active ? 'true' : 'false'} onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }}>
                                    <option value="true">Aktif</option>
                                    <option value="false">Pasif</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Başlangıç Tarihi</label>
                                <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Bitiş Tarihi</label>
                                <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: 'white' }} />
                            </div>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>İptal</button>
                                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Coupons;

