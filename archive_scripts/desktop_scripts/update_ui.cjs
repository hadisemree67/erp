/*
 * ÖZET:
 * Bu script, fiyat ve stok giriş bileşenlerinde "Birim Fiyat" alanını ekler 
 * ve giriş grid'lerini yeniden düzenler.
 */
const fs = require('fs');
let code = fs.readFileSync('src/components/WMS/InventoryEntry.jsx', 'utf8');

// 1. unit_price için başlangıç state'i
code = code.replace(
    /setSuppliersData\(\[\.\.\.suppliersData, \{ supplier_id: '', contract_start_date: '', contract_end_date: '', localId: Math\.random\(\)\.toString\(\) \}\]\)/g,
    "setSuppliersData([...suppliersData, { supplier_id: '', unit_price: '', contract_start_date: '', contract_end_date: '', localId: Math.random().toString() }])"
);

// 2. Arayüze unit_price input alanını ekle
const contractStartDiv = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Sözleşme Başlangıç</label>`;

const unitPriceField = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Birim Fiyat (TL)</label>
                                                <input type="number" step="0.01" value={sup.unit_price || ''} onChange={(e) => setSuppliersData(suppliersData.map(s => s.localId === sup.localId ? { ...s, unit_price: e.target.value } : s))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                            </div>
                                            `;

code = code.replace(contractStartDiv, unitPriceField + contractStartDiv);

// 3. Inputlar için grid sütunlarını değiştir
code = code.replace(
    /<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' \}\}>/g,
    `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>`
);

// 4. Bilgi bloğunu ekle
const headerDiv = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#334155', margin: 0 }}>Tedarikçiler ve Sözleşmeler</h3>`;

const infoBlock = `<div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '13px', color: '#0369a1' }}>
                                    <strong>Bilgi:</strong> 1. sıradaki Ana Tedarikçi (siparişin %80'i), 2. sıradaki Yedek Tedarikçi (%20'si) olarak kabul edilir. 3. ve sonrakilerden sadece fiyat teklifi istenir.
                                </div>`;

code = code.replace(headerDiv, headerDiv + '\n                                ' + infoBlock);

fs.writeFileSync('src/components/WMS/InventoryEntry.jsx', code);
