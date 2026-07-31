/*
 * ÖZET:
 * Bu script, "Tedarik Süresi" alanını ana ürün bilgilerinden kaldırıp 
 * tedarikçiler dizisine (suppliers listesine) dahil eder.
 */
const fs = require('fs');
let code = fs.readFileSync('src/components/WMS/InventoryEntry.jsx', 'utf8');

// 1. Tedarik Süresini ana ürün alanlarından kaldır
const leadTimeBlock = /<div style=\{\{ display: 'flex', flexDirection: 'column' \}\}>\s*<label style=\{\{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' \}\}>Tedarik Süresi \(Gün\)<\/label>\s*<input\s*type=\"number\"\s*name=\"lead_time_days\"\s*value=\{formData\.lead_time_days\}\s*onChange=\{handleChange\}\s*placeholder=\"Örn: 7\"\s*style=\{\{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', backgroundColor: 'white' \}\}\s*\/>\s*<\/div>/g;
code = code.replace(leadTimeBlock, '');

// 2. Başlangıç tedarikçi veri bloğuna lead_time_days ekle
code = code.replace(
    /setSuppliersData\(\[\.\.\.suppliersData, \{ supplier_id: '', unit_price: '', contract_start_date: '', contract_end_date: '', localId: Math\.random\(\)\.toString\(\) \}\]\)/g,
    "setSuppliersData([...suppliersData, { supplier_id: '', unit_price: '', lead_time_days: '', contract_start_date: '', contract_end_date: '', localId: Math.random().toString() }])"
);

// 3. Tedarikçi döngüsü içine lead_time_days input alanı ekle
const unitPriceField = /<div style=\{\{ display: 'flex', flexDirection: 'column' \}\}>\s*<label style=\{\{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' \}\}>Birim Fiyat \(TL\)<\/label>\s*<input type=\"number\" step=\"0\.01\" value=\{sup\.unit_price \|\| ''\} onChange=\{\(e\) => setSuppliersData\(suppliersData\.map\(s => s\.localId === sup\.localId \? \{ \.\.\.s, unit_price: e\.target\.value \} : s\)\)\} style=\{\{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' \}\} \/>\s*<\/div>/g;

const leadTimeField = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Tedarik Süresi (Gün)</label>
                                                <input type="number" step="1" value={sup.lead_time_days || ''} onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, lead_time_days: e.target.value } : s))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                            </div>`;

code = code.replace(unitPriceField, leadTimeField + '\n                                            ' + `<div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Birim Fiyat (TL)</label>
                                                <input type="number" step="0.01" value={sup.unit_price || ''} onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, unit_price: e.target.value } : s))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                            </div>`);

// 4. Inputlar için grid sütunlarını değiştir
code = code.replace(
    /<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' \}\}>/g,
    `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>`
);

fs.writeFileSync('src/components/WMS/InventoryEntry.jsx', code);
console.log('Update UI successful');
