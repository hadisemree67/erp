/*
 * ÖZET:
 * Bu script, form state verilerini (formData) yeni alanlara uyumlu 
 * hale getirmek için gerekli değişken ismi güncellemelerini yapar.
 */
const fs = require('fs');
let code = fs.readFileSync('src/components/WMS/InventoryEntry.jsx', 'utf8');

// 1. formData alanlarını yeniden adlandır
code = code.replace(/expirationDate: batch && batch\.expiration_date \? batch\.expiration_date\.split\('T'\)\[0\] : '',/g, "lead_time_days: editItem ? (editItem.product?.lead_time_days || editItem.lead_time_days || '') : '',");
code = code.replace(/unitPrice: \(batch && batch\.unit_price\) \? batch\.unit_price : \(editItem && editItem\.product \? editItem\.product\.PurchasePrice \|\| '' : ''\),/g, "shelf_life_months: editItem ? (editItem.product?.shelf_life_months || editItem.shelf_life_months || '') : '',");

// Input değerlerindeki formData kullanımını değiştir (1115 ve 1162 satırları)
const unitPriceBlock = /<div style=\{\{ display: 'flex', flexDirection: 'column' \}\}>\s*<label style=\{\{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' \}\}>Birim Fiyat \(TL\)<\/label>\s*<input\s*type=\"number\"\s*name=\"unitPrice\"\s*value=\{formData\.unitPrice\}\s*onChange=\{handleChange\}\s*step=\"0\.01\"\s*min=\"0\"\s*placeholder=\"Örn: 100\.50\"\s*style=\{\{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' \}\}\s*\/>\s*<\/div>/g;

const shelfLifeBlock = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Raf Ömrü (Ay)</label>
                            <input 
                                type="number" 
                                name="shelf_life_months" 
                                value={formData.shelf_life_months} 
                                onChange={handleChange} 
                                step="1"
                                min="0"
                                placeholder="Örn: 6"
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
                            />
                        </div>`;

code = code.replace(unitPriceBlock, shelfLifeBlock);

const sktBlock = /<div style=\{\{ display: 'flex', flexDirection: 'column' \}\}>\s*<label style=\{\{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' \}\}>Son Kullanma Tarihi \(SKT\)<\/label>\s*<input\s*type=\"date\"\s*name=\"expirationDate\"\s*value=\{formData\.expirationDate\}\s*onChange=\{handleChange\}\s*style=\{\{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', backgroundColor: 'white' \}\}\s*\/>/g;

const leadTimeBlock = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Tedarik Süresi (Gün)</label>
                            <input 
                                type="number" 
                                name="lead_time_days" 
                                value={formData.lead_time_days} 
                                onChange={handleChange} 
                                placeholder="Örn: 7"
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px', backgroundColor: 'white' }} 
                            />`;

code = code.replace(sktBlock, leadTimeBlock);

// Form veri gönderimindeki eşleştirmeyi değiştir
// formData.unitPrice'ı formData.shelf_life_months olarak değiştir
code = code.replace(/formData\.unitPrice/g, "formData.shelf_life_months");
code = code.replace(/formData\.expirationDate/g, "formData.lead_time_days");
code = code.replace(/PurchasePrice: formData\.shelf_life_months/g, "shelf_life_months: formData.shelf_life_months");
code = code.replace(/ExpirationDate: formData\.lead_time_days/g, "lead_time_days: formData.lead_time_days");

fs.writeFileSync('src/components/WMS/InventoryEntry.jsx', code);
console.log('Update UI successful');
