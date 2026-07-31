/*
 * ÖZET:
 * Bu script, InventoryEntry'deki UI elemanlarını (Kritik Stok vb.) 
 * tekrar düzenleyerek grid içindeki sıralama hatalarını düzeltir.
 */
const fs = require('fs');

const FILE_PATH = 'src/components/WMS/InventoryEntry.jsx';
let code = fs.readFileSync(FILE_PATH, 'utf8');

const uiReplacement = `
                        {/* MULTIPLE SUPPLIERS SECTION */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#334155', margin: 0 }}>Tedarikçiler ve Sözleşmeler</h3>
                                <button 
                                    type="button" 
                                    onClick={() => setSuppliersData([...suppliersData, { supplier_id: '', contract_start_date: '', contract_end_date: '', localId: Math.random().toString() }])}
                                    style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span style={{ fontSize: '16px' }}>+</span> Tedarikçi Ekle
                                </button>
                            </div>
                            
                            {suppliersData.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px', backgroundColor: 'white', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                    Henüz tedarikçi eklenmedi. Yeni bir tedarikçi eklemek için yukarıdaki butonu kullanın.
                                </div>
                            )}

                            {suppliersData.map((sup, index) => {
                                const hasActiveContract = sup.contract_start_date && sup.contract_end_date && new Date(sup.contract_end_date) >= new Date();
                                const hasExistingContract = sup.contract_file && !sup.remove_contract;
                                
                                return (
                                    <div key={sup.localId} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '15px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', position: 'relative' }}>
                                        <button 
                                            type="button"
                                            onClick={() => setSuppliersData(suppliersData.filter(s => s.localId !== sup.localId))}
                                            style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                                            title="Tedarikçiyi Sil"
                                        >
                                            ×
                                        </button>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '30px' }}>
                                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tedarikçi Seçimi *</label>
                                            <select 
                                                value={sup.supplier_id} 
                                                onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, supplier_id: e.target.value } : s))}
                                                required
                                                disabled={hasActiveContract && !sup.isNew}
                                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (hasActiveContract && !sup.isNew) ? '#f1f5f9' : 'white', fontSize: '14px' }}
                                            >
                                                <option value="">-- Tedarikçi Seç --</option>
                                                {suppliers.map(s => (
                                                    <option key={s.Id} value={s.Id}>{s.SupplierName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Başlangıç</label>
                                                <input 
                                                    type="date" 
                                                    value={sup.contract_start_date}
                                                    onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, contract_start_date: e.target.value } : s))}
                                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Bitiş</label>
                                                <input 
                                                    type="date" 
                                                    value={sup.contract_end_date}
                                                    onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, contract_end_date: e.target.value } : s))}
                                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Dosyası (İsteğe Bağlı PDF/Dosya)</label>
                                            
                                            <input 
                                                type="file" 
                                                onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, fileObject: e.target.files[0], remove_contract: false } : s))}
                                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '13px' }} 
                                            />
                                            
                                            {hasExistingContract && !sup.fileObject && (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', marginTop: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '14px' }}>📄</span>
                                                        <a href={\`http://localhost:3000\${sup.contract_file}\`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontWeight: '500', fontSize: '13px' }}>
                                                            Mevcut Sözleşmeyi Görüntüle
                                                        </a>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, remove_contract: true } : s))}
                                                        style={{ padding: '4px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                                                    >
                                                        Dosyayı Kaldır
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {sup.fileObject && (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', marginTop: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '14px' }}>📁</span>
                                                        <span style={{ color: '#1d4ed8', fontSize: '13px', fontWeight: '500' }}>
                                                            {sup.fileObject.name}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, fileObject: null } : s));
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* END MULTIPLE SUPPLIERS SECTION */}
`;

if (!code.includes('MULTIPLE SUPPLIERS SECTION')) {
    const tedarikIdx = code.indexOf('Tedarik');
    if (tedarikIdx !== -1) {
        // Bu etiketten önceki başlangıç grid div'ini bul
        const gridStartIdx = code.lastIndexOf('<div style={{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'15px\' }}>', tedarikIdx);
        
        if (gridStartIdx !== -1) {
            // Bu bloğun sonunu bul. "Kritik Stok Seviyesi" etiketinden hemen önce biter.
            const kritikIdx = code.indexOf('Kritik Stok Seviyesi', gridStartIdx);
            if (kritikIdx !== -1) {
                // Kritik stok seviyesi etiketini içeren div'i bul
                const kritikDivIdx = code.lastIndexOf('<div style={{ display: \'flex\', flexDirection: \'column\' }}>', kritikIdx);
                if (kritikDivIdx !== -1) {
                    // gridStartIdx'ten kritikDivIdx'e kadar olan kısmı değiştir (tedarikçi bölümünün kapanış </div> etiketinin hemen sonrası)
                    code = code.substring(0, gridStartIdx) + uiReplacement + "\n                        " + code.substring(kritikDivIdx);
                    fs.writeFileSync(FILE_PATH, code);
                    console.log('UI Replaced successfully!');
                }
            }
        }
    }
} else {
    console.log('Multiple suppliers section already exists!');
}
