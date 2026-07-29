const fs = require('fs');
let code = fs.readFileSync('src/components/WMS/InventoryEntry.jsx', 'utf8');

// Replace state variables
code = code.replace(/PurchasePrice: '',/g, "shelf_life_months: '',");
code = code.replace(/ExpirationDate: '',/g, "lead_time_days: '',");

// Replace UI blocks
// 1. Birim Fiyat -> Raf Ömrü (Ay)
const birimFiyatPattern = /<div style=\{\{ display: 'flex', flexDirection: 'column' \}\}>\s*<label style=\{\{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' \}\}>Birim Fiyat \(TL\)<\/label>\s*<input\s*type=\"number\"\s*name=\"PurchasePrice\"\s*value=\{formData\.PurchasePrice\}\s*onChange=\{handleInputChange\}\s*placeholder=\"Örn: 100\.50\"\s*style=\{\{[^\}]+\}\}\s*\/>\s*<\/div>/g;

const shelfLifeReplacement = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Raf Ömrü (Ay)</label>
                                                <input type="number" name="shelf_life_months" value={formData.shelf_life_months} onChange={handleInputChange} placeholder="Örn: 6" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#334155', outline: 'none', transition: 'border-color 0.2s' }} />
                                            </div>`;

code = code.replace(birimFiyatPattern, shelfLifeReplacement);

// 2. SKT -> Tedarik Süresi
const sktPattern = /<div style=\{\{ display: 'flex', flexDirection: 'column' \}\}>\s*<label style=\{\{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' \}\}>Son Kullanma Tarihi \(SKT\)<\/label>\s*<input\s*type=\"date\"\s*name=\"ExpirationDate\"\s*value=\{formData\.ExpirationDate\}\s*onChange=\{handleInputChange\}\s*style=\{\{[^\}]+\}\}\s*\/>\s*<\/div>/g;

const leadTimeReplacement = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Tedarik Süresi (Gün)</label>
                                                <input type="number" name="lead_time_days" value={formData.lead_time_days} onChange={handleInputChange} placeholder="Örn: 7" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#334155', outline: 'none', transition: 'border-color 0.2s' }} />
                                            </div>`;

code = code.replace(sktPattern, leadTimeReplacement);

fs.writeFileSync('src/components/WMS/InventoryEntry.jsx', code);
console.log('Update UI successful');
