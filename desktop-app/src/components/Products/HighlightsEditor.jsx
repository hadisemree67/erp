/**
 * ============================================================================
 * BİLEŞEN ADI: HighlightsEditor
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sistemdeki ürünlerin, varyantların ve stok kartlarının yönetildiği modül.
 * ============================================================================
 */
import React from 'react';
import DOMPurify from 'dompurify';
const availableIcons = [
  { id: 'Damla', name: 'Su/Nem (Damla)', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' },
  { id: 'AlkolYok', name: 'Alkol İçermez', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M9.5 9.5A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 3.5-3.5A3.5 3.5 0 0 0 12 8.5"/></svg>' },
  { id: 'Kalkan', name: 'Koruma (Kalkan)', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  { id: 'Yaprak', name: 'Doğal (Yaprak)', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3c-4.97 4.97-4.97 13.03 0 18 4.97-4.97 4.97-13.03 0-18z"/><path d="M12 3v18"/></svg>' },
  { id: 'Kalp', name: 'Vegan/Dostu (Kalp)', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
  { id: 'Yildiz', name: 'Kalite (Yıldız)', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { id: 'Gunes', name: 'UV/Güneş (Güneş)', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' },
  { id: 'Gulumseme', name: 'Mutlu/Bebek', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
  { id: 'Check', name: 'Onay/Test Edildi', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
  { id: 'Ruzgar', name: 'Ferahlık/Hafif', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>' },
  { id: 'Goz', name: 'Göz Yakmaz', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' },
  { id: 'KimyasalYok', name: 'Paraben/Sülfat Yok', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><line x1="5.52" y1="16" x2="18.48" y2="16"/><line x1="3" y1="3" x2="21" y2="21"/></svg>' },
  { id: 'Enerji', name: 'Güçlü Etki', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
  { id: 'GeriDonusum', name: 'Geri Dönüştürülebilir', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 5.13a9.14 9.14 0 0 1 0 13.74"/><path d="M3.61 18.87a9.14 9.14 0 0 1 0-13.74"/><path d="M12 2A9.95 9.95 0 0 1 22 12"/><path d="M2 12A9.95 9.95 0 0 1 12 2"/></svg>' },
];

export const getHighlightIconSvg = (iconId) => {
  return availableIcons.find(i => i.id === iconId)?.svg || availableIcons[0].svg;
};

const HighlightsEditor = ({ formData, setFormData }) => {
  return (
    <div style={{ marginBottom: '24px', border: '2px solid #bce8d8', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(135deg, #edf6f2, #d8ede5)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d9e82" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1f6b54' }}>Banner İkonları (Sağ Kısım)</span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6bbfa5', background: '#1f6b54', padding: '2px 10px', borderRadius: '20px' }}>Sitede gösterilir</span>
      </div>
      
      <div style={{ padding: '20px', background: 'white' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {formData.Highlights && formData.Highlights.map((hl, idx) => (
            <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', width: '100px', background: '#f8fafc' }}>
              <button type="button" onClick={() => {
                const newH = [...formData.Highlights];
                newH.splice(idx, 1);
                setFormData({...formData, Highlights: newH});
              }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', background: '#ef4444', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>X</button>
              
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', color: '#3d9e82' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getHighlightIconSvg(hl.iconId), { USE_PROFILES: { svg: true } }) }} />
              <textarea value={hl.label} onChange={(e) => {
                const newH = [...formData.Highlights];
                newH[idx].label = e.target.value;
                setFormData({...formData, Highlights: newH});
              }} placeholder="Satır1\nSatır2" rows={2} style={{ width: '100%', padding: '4px', fontSize: '11px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'none' }} />
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '10px' }}>Yeni İkon Ekle (En fazla 4 önerilir)</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {availableIcons.map(icon => (
              <button type="button" key={icon.id} onClick={() => {
                setFormData({...formData, Highlights: [...(formData.Highlights || []), { iconId: icon.id, label: 'Yeni\nÖzellik' }]});
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', color: '#334155' }}>
                <div style={{ color: '#3d9e82' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(icon.svg, { USE_PROFILES: { svg: true } }) }} />
                {icon.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighlightsEditor;


