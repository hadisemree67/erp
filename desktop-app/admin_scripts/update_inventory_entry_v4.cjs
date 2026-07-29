const fs = require('fs');
let code = fs.readFileSync('src/components/WMS/InventoryEntry.jsx', 'utf8');

const strStart = `<div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Kritik Stok Seviyesi (Otomatik E-posta)</label>`;

const strEnd = `{!isAddStock && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Açıklama / İrsaliye No (İsteğe Bağlı)</label>`;

let startIndex = code.indexOf(strStart);
let endIndex = code.indexOf(strEnd);

if (startIndex !== -1 && endIndex !== -1) {
    const oldBlock = code.substring(startIndex, endIndex);

    const newBlock = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Kritik Stok Seviyesi (Otomatik E-posta)</label>
                                <input 
                                    type="number" 
                                    name="critical_stock_level" 
                                    value={formData.critical_stock_level} 
                                    onChange={handleChange} 
                                    title="Stok bu seviyenin altına düştüğünde tedarikçiye otomatik e-posta gönderilir" 
                                    placeholder="Örn: 50" 
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
                                />
                            </div>
                            {!isAddStock && (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px', marginBottom: '15px' }}>
                            {!isEditProduct && (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Parti (Batch) Numarası</label>
                                    <input 
                                        type="text" 
                                        name="batchNumber" 
                                        value={formData.batchNumber} 
                                        onChange={handleChange} 
                                        placeholder="Örn: BATCH-2023-A"
                                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }} 
                                    />
                                </div>
                            )}
                            {!isAddStock && (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Birim Türü</label>
                                    <select 
                                        name="unitType" 
                                        value={formData.unitType} 
                                        onChange={handleChange} 
                                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '15px' }}
                                    >
                                        <option value="Adet">Adet</option>
                                        <option value="Kg">Kg</option>
                                        <option value="Gram">Gram</option>
                                        <option value="Litre">Litre</option>
                                        <option value="Koli">Koli</option>
                                        <option value="Paket">Paket</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        `;

    code = code.replace(oldBlock, newBlock);
    fs.writeFileSync('src/components/WMS/InventoryEntry.jsx', code);
    console.log('Update layout successful');
} else {
    console.log('Could not find block. startIndex:', startIndex, 'endIndex:', endIndex);
}
