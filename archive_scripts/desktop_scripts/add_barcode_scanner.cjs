/*
 * ÖZET:
 * Bu script, stok girişi ve düzenleme bileşenlerine (InventoryEntry ve InventoryEdit) 
 * barkod okuyucu alanını ve ilgili useEffect güncellemelerini ekler.
 */
const fs = require('fs');

function updateEntryFile(filename) {
    if (!fs.existsSync(filename)) return;
    let content = fs.readFileSync(filename, 'utf8');

    // Eğer seçilen yeni deponun rafları arasında mevcut raf varsa, shelfCode değerini koruyacak şekilde useEffect'i düzelt
    const useEffectSearchStr = `        const selectedWh = warehouses.find(w => w.id.toString() === formData.warehouseId.toString());
        if (selectedWh && selectedWh.Shelves) {
            setShelves(selectedWh.Shelves);
            if (selectedWh.Shelves.length > 0) {
                setFormData(prev => ({ ...prev, shelfAllocations: [{ shelfCode: selectedWh.Shelves[0], quantity: '' }] }));
            } else {
                setFormData(prev => ({ ...prev, shelfAllocations: [{ shelfCode: '', quantity: '' }] }));
            }
        } else {`;
    
    const useEffectReplaceStr = `        const selectedWh = warehouses.find(w => w.id.toString() === formData.warehouseId.toString());
        if (selectedWh && selectedWh.Shelves) {
            setShelves(selectedWh.Shelves);
            setFormData(prev => {
                const existingCode = prev.shelfAllocations[0]?.shelfCode;
                if (existingCode && selectedWh.Shelves.includes(existingCode)) {
                    return prev;
                }
                if (selectedWh.Shelves.length > 0) {
                    return { ...prev, shelfAllocations: [{ shelfCode: selectedWh.Shelves[0], quantity: '' }] };
                } else {
                    return { ...prev, shelfAllocations: [{ shelfCode: '', quantity: '' }] };
                }
            });
        } else {`;
    
    if (content.includes(useEffectSearchStr)) {
        content = content.replace(useEffectSearchStr, useEffectReplaceStr);
    }

    // Depo Seçiniz alanının üstüne barkod okuyucu arayüzünü ekle
    const uiSearchStr = `<div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Depo Seçiniz *</label>`;
    
    const uiReplaceStr = `<div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                            Raf Barkodu Okut (Hızlı Seçim)
                        </label>
                        <input 
                            type="text" 
                            placeholder="Raf barkodunu okutun..." 
                            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '2px solid #bae6fd', fontSize: '15px', backgroundColor: '#f0f9ff' }}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter' && e.target.value.trim() !== '') {
                                    e.preventDefault();
                                    const barcode = e.target.value.trim();
                                    e.target.value = ''; 
                                    
                                    try {
                                        // apiFetch zaten bu dosyalarda kullanıldığı için ek import gerektirmez
                                        const res = await fetch(\`http://localhost:3000/api/wms/shelf-by-barcode?barcode=\${barcode}\`, {
                                            headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            const { warehouse_id, shelf_code } = data.data;
                                            
                                            setFormData(prev => {
                                                const newAllocations = [...prev.shelfAllocations];
                                                if (newAllocations.length > 0) {
                                                    newAllocations[0].shelfCode = shelf_code;
                                                    // isteğe bağlı olarak miktarı sıfırla
                                                    // newAllocations[0].quantity = '';
                                                } else {
                                                    newAllocations.push({ shelfCode: shelf_code, quantity: '' });
                                                }
                                                return { ...prev, warehouseId: warehouse_id, shelfAllocations: newAllocations };
                                            });
                                        } else {
                                            alert(data.message);
                                        }
                                    } catch (err) {
                                        alert('Barkod sorgulanırken hata oluştu.');
                                    }
                                }
                            }}
                        />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Depo Seçiniz *</label>`;

    if (content.includes(uiSearchStr)) {
        content = content.replace(uiSearchStr, uiReplaceStr);
    } else {
        console.log('Could not find UI search string in', filename);
    }

    fs.writeFileSync(filename, content);
    console.log('Updated', filename);
}

updateEntryFile('src/components/WMS/InventoryEntry.jsx');
updateEntryFile('src/components/WMS/StockEntry.jsx');
