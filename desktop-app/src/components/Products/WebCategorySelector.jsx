/**
 * ============================================================================
 * BİLEŞEN ADI: WebCategorySelector
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki ürünlerin, varyantların ve stok kartlarının yönetildiği modül.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const API = 'http://localhost:3000/api/web-categories';

// Yeni kayıt eklemek için küçük modal
function AddModal({ title, onSave, onClose }) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        await onSave(name.trim());
        setLoading(false);
        setName('');
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999
        }}>
            <div style={{
                background: '#fff', borderRadius: '10px', padding: '24px',
                width: '360px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>{title}</h3>
                <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="İsim girin..."
                    style={{
                        width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db',
                        borderRadius: '8px', fontSize: '14px', outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px',
                        background: '#fff', cursor: 'pointer', fontSize: '14px'
                    }}>İptal</button>
                    <button onClick={handleSave} disabled={loading || !name.trim()} style={{
                        padding: '8px 20px', border: 'none', borderRadius: '6px',
                        background: '#3b82f6', color: '#fff', cursor: 'pointer',
                        fontSize: '14px', fontWeight: '500', opacity: loading || !name.trim() ? 0.6 : 1
                    }}>{loading ? 'Kaydediliyor...' : 'Ekle'}</button>
                </div>
            </div>
        </div>
    );
}

export default function WebCategorySelector({ value, onChange }) {
    const safeValue = value || {};
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [subtitles, setSubtitles] = useState([]);

    const [selectedCat, setSelectedCat] = useState(safeValue.category_id ? parseInt(safeValue.category_id) : '');
    const [selectedSub, setSelectedSub] = useState(safeValue.subcategory_id ? parseInt(safeValue.subcategory_id) : '');
    const [selectedTitle, setSelectedTitle] = useState(safeValue.subtitle_id ? parseInt(safeValue.subtitle_id) : '');

    const [modal, setModal] = useState(null); // 'cat' | 'sub' | 'title'

    // Ana kategorileri yükle
    useEffect(() => {
        fetchCategories();
    }, []);

    // Alt kategorileri yükle
    useEffect(() => {
        setSelectedSub('');
        setSelectedTitle('');
        setSubcategories([]);
        setSubtitles([]);
        if (selectedCat) fetchSubcategories(selectedCat);
    }, [selectedCat]);

    // Alt başlıkları yükle
    useEffect(() => {
        setSelectedTitle('');
        setSubtitles([]);
        if (selectedSub) fetchSubtitles(selectedSub);
    }, [selectedSub]);

    // Name based auto-selection logic
    useEffect(() => {
        if (categories.length > 0 && safeValue.category_name && !selectedCat) {
            const found = categories.find(c => c.name === safeValue.category_name);
            if (found) setSelectedCat(found.id);
        }
    }, [categories, safeValue.category_name, selectedCat]);

    useEffect(() => {
        if (subcategories.length > 0 && safeValue.subcategory_name && !selectedSub) {
            const found = subcategories.find(c => c.name === safeValue.subcategory_name);
            if (found) setSelectedSub(found.id);
        }
    }, [subcategories, safeValue.subcategory_name, selectedSub]);

    useEffect(() => {
        if (subtitles.length > 0 && safeValue.subtitle_name && !selectedTitle) {
            const found = subtitles.find(c => c.name === safeValue.subtitle_name);
            if (found) setSelectedTitle(found.id);
        }
    }, [subtitles, safeValue.subtitle_name, selectedTitle]);

    // Seçimler değişince parent'a bildir
    useEffect(() => {
        const cat = categories.find(c => c.id === selectedCat);
        const sub = subcategories.find(s => s.id === selectedSub);
        const title = subtitles.find(t => t.id === selectedTitle);
        onChange && onChange({
            category_id: selectedCat || null,
            category_name: cat?.name || safeValue.category_name || '',
            subcategory_id: selectedSub || null,
            subcategory_name: sub?.name || safeValue.subcategory_name || '',
            subtitle_id: selectedTitle || null,
            subtitle_name: title?.name || safeValue.subtitle_name || ''
        });
    }, [selectedCat, selectedSub, selectedTitle]);

    async function fetchCategories() {
        try {
            const res = await apiFetch(API);
            const data = await res.json();
            if (Array.isArray(data)) setCategories(data);
        } catch (e) { console.error('Kategoriler yüklenemedi:', e); }
    }

    async function fetchSubcategories(catId) {
        try {
            const res = await apiFetch(`${API}/subcategories?category_id=${catId}`);
            const data = await res.json();
            if (Array.isArray(data)) setSubcategories(data);
        } catch (e) { console.error('Alt kategoriler yüklenemedi:', e); }
    }

    async function fetchSubtitles(subId) {
        try {
            const res = await apiFetch(`${API}/subtitles?subcategory_id=${subId}`);
            const data = await res.json();
            if (Array.isArray(data)) setSubtitles(data);
        } catch (e) { console.error('Başlıklar yüklenemedi:', e); }
    }

    async function addCategory(name) {
        const res = await apiFetch(API, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.success) {
            await fetchCategories();
            setSelectedCat(data.data.id);
        }
    }

    async function addSubcategory(name) {
        const res = await apiFetch(`${API}/subcategories`, {
            method: 'POST',
            body: JSON.stringify({ category_id: selectedCat, name })
        });
        const data = await res.json();
        if (data.success) {
            await fetchSubcategories(selectedCat);
            setSelectedSub(data.data.id);
        }
    }

    async function addSubtitle(name) {
        const res = await apiFetch(`${API}/subtitles`, {
            method: 'POST',
            body: JSON.stringify({ subcategory_id: selectedSub, name })
        });
        const data = await res.json();
        if (data.success) {
            await fetchSubtitles(selectedSub);
            setSelectedTitle(data.data.id);
        }
    }

    const selectStyle = {
        width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db',
        borderRadius: '8px', fontSize: '14px', background: '#fff',
        outline: 'none', cursor: 'pointer'
    };

    const labelStyle = {
        fontSize: '13px', fontWeight: '600', color: '#475569'
    };

    const addBtnStyle = {
        background: 'none', border: 'none', color: '#3b82f6',
        cursor: 'pointer', fontWeight: '700', fontSize: '20px',
        lineHeight: '1', padding: '0 2px', display: 'flex',
        alignItems: 'center'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* KATEGORİ */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={labelStyle}>Kategori *</label>
                    <button type="button" title="Yeni kategori ekle" style={addBtnStyle} onClick={() => setModal('cat')}>+</button>
                </div>
                <select
                    value={selectedCat}
                    onChange={e => setSelectedCat(e.target.value ? parseInt(e.target.value) : '')}
                    style={selectStyle}
                >
                    <option value="">Seçiniz...</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* ALT KATEGORİ */}
            {selectedCat && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={labelStyle}>Alt Kategori</label>
                        <button type="button" title="Yeni alt kategori ekle" style={addBtnStyle} onClick={() => setModal('sub')}>+</button>
                    </div>
                    <select
                        value={selectedSub}
                        onChange={e => setSelectedSub(e.target.value ? parseInt(e.target.value) : '')}
                        style={selectStyle}
                    >
                        <option value="">Seçiniz...</option>
                        {subcategories.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* BAŞLIK */}
            {selectedSub && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={labelStyle}>Başlık</label>
                        <button type="button" title="Yeni başlık ekle" style={addBtnStyle} onClick={() => setModal('title')}>+</button>
                    </div>
                    <select
                        value={selectedTitle}
                        onChange={e => setSelectedTitle(e.target.value ? parseInt(e.target.value) : '')}
                        style={selectStyle}
                    >
                        <option value="">Seçiniz...</option>
                        {subtitles.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* MODAL */}
            {modal === 'cat' && (
                <AddModal
                    title="Yeni Ana Kategori Ekle"
                    onSave={addCategory}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === 'sub' && (
                <AddModal
                    title="Yeni Alt Kategori Ekle"
                    onSave={addSubcategory}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === 'title' && (
                <AddModal
                    title="Yeni Başlık Ekle"
                    onSave={addSubtitle}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}


