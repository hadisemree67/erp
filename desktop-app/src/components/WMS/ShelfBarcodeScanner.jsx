/**
 * ============================================================================
 * DOSYA ADI: ShelfBarcodeScanner.jsx
 * MODÜL: Önyüz Bileşeni - WMS
 * 
 * GÖREV: 
 * Depo raflarına yapıştırılan barkodları okuyarak (Enter tuşu ile) 
 * ilgili depo ve raf bilgisini ebeveyn bileşene (onShelfFound) iletir.
 * ============================================================================
 */
import React from 'react';
import { apiFetch } from '../../utils/api';

/**
 * @param {Object} props
 * @param {Function} props.onShelfFound - (warehouse_id, shelf_code) parametreleriyle çağrılır.
 */
export default function ShelfBarcodeScanner({ onShelfFound }) {
    const handleKeyDown = async (e) => {
        if (e.key === 'Enter' && e.target.value.trim() !== '') {
            e.preventDefault();
            const barcode = e.target.value.trim();
            e.target.value = ''; 
            
            try {
                const res = await apiFetch(`http://localhost:3000/api/wms/shelf-by-barcode?barcode=${barcode}`);
                const data = await res.json();
                if (data.success) {
                    onShelfFound(data.data.warehouse_id, data.data.shelf_code);
                } else {
                    alert(data.message);
                }
            } catch (err) {
                alert('Barkod sorgulanırken hata oluştu.');
            }
        }
    };

    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                Raf Barkodu Okut (Hızlı Seçim)
            </label>
            <input 
                type="text" 
                placeholder="Raf barkodunu okutun..." 
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '2px solid #bae6fd', fontSize: '15px', backgroundColor: '#f0f9ff' }}
                onKeyDown={handleKeyDown}
            />
        </div>
    );
}
