/**
 * ============================================================================
 * BİLEŞEN ADI: CategoryManager
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const API        = 'http://localhost:3000/api/web-categories';
const API_BRANDS = 'http://localhost:3000/api/brands';

/* ─── Açılır/Kapanır Bölüm ─── */
function Section({ title, badge, open, onToggle, children }) {
    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
            <button
                type="button"
                onClick={onToggle}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', background: open ? '#f0fdf4' : '#f8fafc',
                    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>
                    {badge && <span style={{ background: '#10b981', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{badge}</span>}
                    {title}
                </span>
                <span style={{ fontSize: '16px', color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {open && (
                <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

/* ─── Fotoğraf Yükleme Kutusu ─── */
function PhotoSlot({ label, imageUrl, onUpload, uploading, aspect = '16/5', description }) {
    return (
        <div>
            {description && <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px' }}>{description}</p>}
            <div style={{ position: 'relative', width: '100%', aspectRatio: aspect, background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                {imageUrl ? (
                    <img src={`http://localhost:3000${imageUrl}`} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '4px' }}>
                        <span style={{ fontSize: '28px' }}>🖼️</span>
                        <span style={{ fontSize: '12px' }}>Görsel yüklenmedi</span>
                    </div>
                )}
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#f8fafc', color: uploading ? '#94a3b8' : '#475569', fontSize: '13px', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                <span>{uploading ? '⏳' : (imageUrl ? '🔄' : '📤')}</span>
                {uploading ? 'Yükleniyor...' : (imageUrl ? 'Görseli Değiştir' : 'Fotoğraf Yükle')}
                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={uploading}
                    onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); e.target.value = null; }} />
            </label>
        </div>
    );
}

/* ─── Alt Kategori / Başlık kare kutusu ─── */
function ThumbSlot({ item, onUpload, uploading }) {
    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
            <div style={{ width: '100%', aspectRatio: '4/3', background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.image_url
                    ? <img src={`http://localhost:3000${item.image_url}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '20px', opacity: 0.3 }}>📷</span>
                }
            </div>
            <div style={{ padding: '7px 6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: '6px', lineHeight: '1.3' }}>{item.name}</div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px', borderRadius: '5px', border: '1px solid #e2e8f0', background: '#f8fafc', color: uploading ? '#94a3b8' : '#475569', fontSize: '11px', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer' }}>
                    <span>{uploading ? '⏳' : '📤'}</span>
                    {uploading ? '...' : (item.image_url ? 'Değiştir' : 'Yükle')}
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={uploading}
                        onChange={e => { if (e.target.files?.[0]) onUpload(item.id, e.target.files[0]); e.target.value = null; }} />
                </label>
            </div>
        </div>
    );
}

/* ─── Banner Slot (marka bağlantılı) ─── */
function BannerSlot({ slot, banner, categoryId, brands, onUpdate }) {
    const [uploading, setUploading] = useState(false);
    const [selBrand, setSelBrand]   = useState(String(banner?.brand_id || ''));
    const [savingBrand, setSaving]  = useState(false);

    const handleUpload = async (file) => {
        setUploading(true);
        const fd = new FormData(); fd.append('image', file);
        if (selBrand) { fd.append('brand_id', selBrand); const b = brands.find(b => b.id === parseInt(selBrand)); if (b) fd.append('brand_name', b.name); }
        try { const res = await apiFetch(`${API}/banners/${categoryId}/${slot}`, { method: 'PUT', body: fd }); if ((await res.json()).success) onUpdate(); }
        catch { alert('Hata'); } finally { setUploading(false); }
    };
    const handleDelete = async () => {
        if (!confirm('Bannerı kaldır?')) return;
        await apiFetch(`${API}/banners/${categoryId}/${slot}`, { method: 'DELETE' }); onUpdate();
    };
    const handleSaveBrand = async () => {
        setSaving(true);
        const fd = new FormData(); fd.append('brand_id', selBrand || '');
        const b = brands.find(b => b.id === parseInt(selBrand)); fd.append('brand_name', b?.name || '');
        try { const res = await apiFetch(`${API}/banners/${categoryId}/${slot}`, { method: 'PUT', body: fd }); if ((await res.json()).success) onUpdate(); }
        catch {} finally { setSaving(false); }
    };

    return (
        <div style={{ flex: '1 1 0', minWidth: 0, border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
            {/* Görsel */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '3/1.2', background: '#f1f5f9' }}>
                {banner?.image_url
                    ? <img src={`http://localhost:3000${banner.image_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><span style={{ fontSize: '22px' }}>🖼️</span><span style={{ fontSize: '11px' }}>Boş</span></div>
                }
                <div style={{ position: 'absolute', top: 6, left: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px' }}>{slot}. Banner</div>
                {banner?.image_url && <button onClick={handleDelete} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', borderRadius: '5px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px' }}>✕</button>}
            </div>
            {/* Panel */}
            <div style={{ padding: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: uploading ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: '8px' }}>
                    <span>{uploading ? '⏳' : (banner?.image_url ? '🔄' : '📤')}</span>
                    {uploading ? 'Yükleniyor...' : (banner?.image_url ? 'Değiştir' : 'Yükle')}
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={uploading}
                        onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = null; }} />
                </label>
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>Marka Bağla</div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <select value={selBrand} onChange={e => setSelBrand(e.target.value)}
                        style={{ flex: 1, padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', background: '#fff', outline: 'none' }}>
                        <option value="">Yok</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {selBrand !== String(banner?.brand_id || '') && (
                        <button onClick={handleSaveBrand} disabled={savingBrand} style={{ padding: '5px 9px', borderRadius: '5px', background: '#10b981', border: 'none', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                            {savingBrand ? '...' : 'Kaydet'}
                        </button>
                    )}
                </div>
                {banner?.brand_name && <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>✅ {banner.brand_name}</div>}
            </div>
        </div>
    );
}

/* ─── ANA BİLEŞEN ─── */
export default function CategoryManager() {
    const [tree,    setTree]    = useState([]);
    const [brands,  setBrands]  = useState([]);
    const [banners, setBanners] = useState([null, null, null]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    // Seçimler
    const [selMain, setSelMain] = useState('');
    const [selSub,  setSelSub]  = useState('');

    // Upload state'leri
    const [upMain,    setUpMain]    = useState(false);
    const [upSub,     setUpSub]     = useState(null);   // sub.id
    const [upSubBan,  setUpSubBan]  = useState(false);
    const [upTitle,   setUpTitle]   = useState(null);   // title.id
    // Hangi başlığın banner'ı açık — { subId, titleId }
    const [titleBannerOpen, setTitleBannerOpen] = useState(null);
    const [upTitleBan, setUpTitleBan] = useState(false);

    // Accordion açık/kapalı
    const [openSec, setOpenSec] = useState({ mainBanner: true, subPhotos: false, subDetail: false, adBanners: false });
    const toggle = (key) => setOpenSec(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => { Promise.all([fetchTree(), fetchBrands()]); }, []);
    useEffect(() => {
        setBanners([null, null, null]); setSelSub(''); setTitleBannerOpen(null);
        setOpenSec({ mainBanner: true, subPhotos: false, subDetail: false, adBanners: false });
        if (selMain) fetchBanners(selMain);
    }, [selMain]);
    useEffect(() => { setTitleBannerOpen(null); }, [selSub]);

    const fetchTree    = async () => { setLoading(true); try { const r = await apiFetch(`${API}/tree`); const d = await r.json(); if (r.ok) setTree(d); else setError(d.message); } catch { setError('Bağlanılamadı'); } finally { setLoading(false); } };
    const fetchBrands  = async () => { try { const r = await apiFetch(API_BRANDS); const d = await r.json(); if (Array.isArray(d)) setBrands(d); } catch {} };
    const fetchBanners = async (id) => { try { const r = await apiFetch(`${API}/banners?category_id=${id}`); const d = await r.json(); if (Array.isArray(d)) setBanners(d); } catch {} };

    const upload = async (endpoint, file, setLoading) => {
        setLoading(true);
        const fd = new FormData(); fd.append('image', file);
        try { const r = await apiFetch(endpoint, { method: 'PUT', body: fd }); if (r.ok) await fetchTree(); else alert('Yükleme başarısız'); }
        catch { alert('Sunucu hatası'); } finally { setLoading(false); }
    };

    const mainCat  = tree.find(c => c.id === parseInt(selMain));
    const subCat   = mainCat?.subcategories?.find(s => s.id === parseInt(selSub));
    const openTitle = titleBannerOpen ? subCat?.subtitles?.find(t => t.id === titleBannerOpen) : null;

    const sel  = { padding: '11px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff', width: '100%', color: '#0f172a' };
    const lbl  = { fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px', display: 'block' };
    const wrap = { backgroundColor: 'white', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };

    if (loading) return <div style={{ ...wrap, textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Yükleniyor...</div>;

    return (
        <div style={wrap}>
            {/* Başlık */}
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <h2 style={{ color: '#0f172a', margin: '0 0 4px', fontSize: '20px', fontWeight: '700' }}>Kategoriler (Web)</h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Kategori, alt kategori ve başlık fotoğraflarını buradan yönetin.</p>
            </div>

            {error && <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {error}</div>}

            {/* KATEGORİ SEÇİMİ */}
            <div style={{ marginBottom: '20px' }}>
                <label style={lbl}>Ana Kategori</label>
                <select style={sel} value={selMain} onChange={e => setSelMain(e.target.value)}>
                    <option value="">Seçiniz...</option>
                    {tree.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* ACCORDION BÖLÜMLER */}
            {selMain && (
                <>
                    {/* 1. Ana Kategori Banner */}
                    <Section title={`📸 Ana Sayfa Banner — ${mainCat?.name}`} badge="1" open={openSec.mainBanner} onToggle={() => toggle('mainBanner')}>
                        <PhotoSlot
                            label="Ana Banner"
                            imageUrl={mainCat?.image_url}
                            onUpload={f => upload(`${API}/main/${selMain}/image`, f, setUpMain)}
                            uploading={upMain}
                            aspect="16/5"
                            description="Kategoriye tıklandığında sayfanın en üstünde büyük banner olarak gözükür."
                        />
                    </Section>

                    {/* 2. Alt Kategori Fotoğrafları */}
                    {mainCat?.subcategories?.length > 0 && (
                        <Section title="🗂️ Alt Kategori Fotoğrafları" badge="2" open={openSec.subPhotos} onToggle={() => toggle('subPhotos')}>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>Her alt kategorinin sayfa girişindeki kutu fotoğrafı.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                                {mainCat.subcategories.map(sub => (
                                    <ThumbSlot key={sub.id} item={sub}
                                        onUpload={(id, f) => upload(`${API}/sub/${id}/image`, f, v => setUpSub(v ? id : null))}
                                        uploading={upSub === sub.id} />
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* 3. Alt Kategori Detayı (kendi banner + başlıklar) */}
                    {mainCat?.subcategories?.length > 0 && (
                        <Section title="📂 Alt Kategori Detay — Banner & Başlıklar" badge="3" open={openSec.subDetail} onToggle={() => toggle('subDetail')}>
                            <label style={lbl}>Alt Kategori Seçin</label>
                            <select style={{ ...sel, marginBottom: '16px' }} value={selSub} onChange={e => setSelSub(e.target.value)}>
                                <option value="">Seçiniz...</option>
                                {mainCat.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>

                            {selSub && subCat && (
                                <>
                                    {/* Alt kategorinin kendi banner'ı */}
                                    <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>📸 <strong>{subCat.name}</strong> — Sayfa Banner Fotoğrafı</div>
                                        <PhotoSlot
                                            label={subCat.name}
                                            imageUrl={subCat.image_url}
                                            onUpload={f => upload(`${API}/sub/${selSub}/image`, f, setUpSubBan)}
                                            uploading={upSubBan}
                                            aspect="16/5"
                                            description="Bu alt kategoriye girildiğinde sayfanın üstünde gözükür."
                                        />
                                    </div>

                                    {/* Başlıklar */}
                                    {subCat.subtitles?.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>🏷️ Başlıklar</div>
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
                                                Kutu fotoğrafı yüklemek için <strong>📤</strong>'e tıklayın. Başlığın kendi sayfa banner'ı için <strong>"Banner Ekle"</strong> butonuna basın.
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {subCat.subtitles.map(title => (
                                                    <div key={title.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                                        {/* Başlık satırı */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#fff' }}>
                                                            {/* Kutu fotoğrafı */}
                                                            <div style={{ width: '52px', height: '36px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                                                {title.image_url
                                                                    ? <img src={`http://localhost:3000${title.image_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '14px' }}>📷</div>
                                                                }
                                                            </div>
                                                            {/* İsim */}
                                                            <span style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: '#374151' }}>{title.name}</span>
                                                            {/* Kutu foto yükle */}
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: upTitle === title.id ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                                                                <span>{upTitle === title.id ? '⏳' : '📤'}</span>
                                                                {upTitle === title.id ? '...' : 'Kutu Fotoğrafı'}
                                                                <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={upTitle === title.id}
                                                                    onChange={e => { if (e.target.files?.[0]) upload(`${API}/title/${title.id}/image`, e.target.files[0], v => setUpTitle(v ? title.id : null)); e.target.value = null; }} />
                                                            </label>
                                                            {/* Banner aç/kapat */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setTitleBannerOpen(prev => prev === title.id ? null : title.id)}
                                                                style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #e25b8b', background: titleBannerOpen === title.id ? '#e25b8b' : '#fff0f6', color: titleBannerOpen === title.id ? '#fff' : '#e25b8b', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
                                                                {titleBannerOpen === title.id ? '✕ Kapat' : '🖼️ Banner'}
                                                            </button>
                                                        </div>

                                                        {/* Başlık banner yükleme (açıksa) */}
                                                        {titleBannerOpen === title.id && (
                                                            <div style={{ padding: '14px 16px', borderTop: '1px solid #fce7f3', background: '#fff9fc' }}>
                                                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#be185d', marginBottom: '10px' }}>
                                                                    📸 "<strong>{title.name}</strong>" sayfasının banner fotoğrafı
                                                                </div>
                                                                <PhotoSlot
                                                                    label={title.name}
                                                                    imageUrl={title.image_url}
                                                                    onUpload={f => upload(`${API}/title/${title.id}/image`, f, setUpTitleBan)}
                                                                    uploading={upTitleBan}
                                                                    aspect="16/5"
                                                                    description={`"${title.name}" başlığına tıklandığında sayfanın üstünde görünecek banner.`}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </Section>
                    )}

                    {/* 4. Reklam Bannerları */}
                    <Section title="🎯 Reklam Bannerları (3 Slot)" badge="4" open={openSec.adBanners} onToggle={() => toggle('adBanners')}>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>Kategori ürün listesinin üstünde yan yana görünen 3 reklam alanı. İsteğe bağlı marka bağlayabilirsiniz.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {banners.map((banner, i) => (
                                <BannerSlot key={i} slot={i + 1} banner={banner} categoryId={parseInt(selMain)} brands={brands} onUpdate={() => fetchBanners(selMain)} />
                            ))}
                        </div>
                    </Section>
                </>
            )}
        </div>
    );
}


