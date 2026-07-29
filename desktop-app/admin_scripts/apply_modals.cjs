const fs = require('fs');

function applyToStockList() {
    const file = 'C:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src/components/WMS/StockList.jsx';
    let content = fs.readFileSync(file, 'utf8');

    // Add button
    const btnSearch = `<button style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                    Detay Gör ➔
                                </button>`;
    const btnReplace = `<div style={{ display: 'flex', gap: '8px' }}>
                                    {group.category !== 'Hammadde' && (
                                        <button onClick={(e) => { e.stopPropagation(); setProductionRequestProduct(group); }} style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                            🛠️ Üretim Talebi
                                        </button>
                                    )}
                                    <button style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                        Detay Gör ➔
                                    </button>
                                </div>`;
    if (content.includes(btnSearch) && !content.includes('setProductionRequestProduct(')) {
        content = content.replace(btnSearch, btnReplace);
    }

    // Add modal at the end before final </div>
    const modalAdd = `{productionRequestProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 'bold' }}>Manuel Üretim Talebi</h3>
                            <button onClick={() => setProductionRequestProduct(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ marginBottom: '16px', color: '#475569', fontSize: '14px' }}>
                            <strong>Ürün:</strong> {productionRequestProduct.product_name}
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const res = await fetch('http://localhost:3000/api/production/requests', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        productId: productionRequestProduct.product_id,
                                        quantity: e.target.qty.value,
                                        reason: 'Stok Sorumlusu (Manuel)',
                                        creator: currentUser?.username || 'Kullanıcı',
                                        priority: e.target.priority.value
                                    })
                                });
                                const data = await res.json();
                                if(data.success) {
                                    alert('Talep oluşturuldu!');
                                    setProductionRequestProduct(null);
                                } else {
                                    alert('Talep oluşturulamadı');
                                }
                            } catch(err) { console.error(err); }
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Miktar</label>
                                <input name="qty" type="number" required defaultValue="100" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Aciliyet</label>
                                <select name="priority" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                    <option value="Normal">Normal</option>
                                    <option value="Acil">Acil</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setProductionRequestProduct(null)} style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>İptal</button>
                                <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Talep Gönder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
    </div>
  );
};`;
    if (!content.includes('Manuel Üretim Talebi')) {
        content = content.replace(/    <\/div>\s*< \/div>\s*\);\s*};\s*export default StockList;/, ''); // clear end
        content = content.replace(/    <\/div>\s*\);\s*};\s*export default StockList;/, ''); // clear end
        content += '\n' + modalAdd + '\nexport default StockList;';
    }

    // Add sort logic
    const sortSearch = `    const groupedItems = Object.values(filteredItems.reduce((acc, item) => {`;
    const sortReplace = `    const groupedItems = Object.values(filteredItems.reduce((acc, item) => {`;
    
    // Actually we sort AFTER grouping:
    const mapEndSearch = `        return group;
    });`;
    const mapEndReplace = `        return group;
    }).sort((a, b) => {
        if (sortBy === 'enAz') return a.total_quantity - b.total_quantity;
        if (sortBy === 'enCok') return b.total_quantity - a.total_quantity;
        return a.product_name.localeCompare(b.product_name);
    });`;
    if (content.includes(mapEndSearch) && !content.includes('sortBy === \'enAz\'')) {
        content = content.replace(mapEndSearch, mapEndReplace);
    }

    fs.writeFileSync(file, content);
}

function applyToInventoryList() {
    const file = 'C:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src/components/WMS/InventoryList.jsx';
    let content = fs.readFileSync(file, 'utf8');

    // Add states
    if (!content.includes('productionRequestProduct')) {
        content = content.replace(
            `    const [searchTerm, setSearchTerm] = useState('');`,
            `    const [searchTerm, setSearchTerm] = useState('');\n    const [sortBy, setSortBy] = useState('isim');\n    const [productionRequestProduct, setProductionRequestProduct] = useState(null);`
        );
    }

    // Add sorting UI
    const uiSearch = `          <div style={{ position: 'relative', flex: 1 }}>
              <input 
                  type="text" 
                  placeholder="Ürün Adı, Barkod, Depo veya Raf Ara..." 
                  value={searchTerm}`;
    const uiReplace = `          <div style={{ position: 'relative', flex: 1 }}>
              <input 
                  type="text" 
                  placeholder="Ürün Adı, Barkod, Depo veya Raf Ara..." 
                  value={searchTerm}`;
    if (content.includes(uiSearch) && !content.includes('value={sortBy}')) {
        const fullDivSearch = `              </button>
          </div>
      </div>`;
        const fullDivReplace = `              </button>
          </div>
          <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', backgroundColor: 'white', color: '#334155', cursor: 'pointer', minWidth: '160px' }}
          >
              <option value="isim">İsme Göre (A-Z)</option>
              <option value="enAz">Miktar: En Az</option>
              <option value="enCok">Miktar: En Çok</option>
          </select>
      </div>`;
        content = content.replace(fullDivSearch, fullDivReplace);
    }

    // Sort grouped items
    const groupSortSearch = `        return matchesSearch && matchesWarehouse;
    });`;
    const groupSortReplace = `        return matchesSearch && matchesWarehouse;
    }).sort((a, b) => {
        if (sortBy === 'enAz') return a.total_quantity - b.total_quantity;
        if (sortBy === 'enCok') return b.total_quantity - a.total_quantity;
        return a.product_name.localeCompare(b.product_name);
    });`;
    if (content.includes(groupSortSearch) && !content.includes('sortBy === \'enAz\'')) {
        content = content.replace(groupSortSearch, groupSortReplace);
    }

    // Add button
    const btnSearch = `<button style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                Detay Gör ➔
                            </button>`;
    const btnReplace = `<div style={{ display: 'flex', gap: '8px' }}>
                                {group.product?.Category !== 'Hammadde' && (
                                    <button onClick={(e) => { e.stopPropagation(); setProductionRequestProduct(group); }} style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                        🛠️ Üretim Talebi
                                    </button>
                                )}
                                <button style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#3b82f6', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                    Detay Gör ➔
                                </button>
                            </div>`;
    if (content.includes(btnSearch) && !content.includes('setProductionRequestProduct(')) {
        content = content.replace(btnSearch, btnReplace);
    }

    // Add Modal
    const modalAdd = `{productionRequestProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 'bold' }}>Manuel Üretim Talebi</h3>
                            <button onClick={() => setProductionRequestProduct(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ marginBottom: '16px', color: '#475569', fontSize: '14px' }}>
                            <strong>Ürün:</strong> {productionRequestProduct.product_name}
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const res = await fetch('http://localhost:3000/api/production/requests', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        productId: productionRequestProduct.product_id,
                                        quantity: e.target.qty.value,
                                        reason: 'Depo Sorumlusu (Manuel)',
                                        creator: currentUser?.username || 'Kullanıcı',
                                        priority: e.target.priority.value
                                    })
                                });
                                const data = await res.json();
                                if(data.success) {
                                    alert('Talep oluşturuldu!');
                                    setProductionRequestProduct(null);
                                } else {
                                    alert('Talep oluşturulamadı');
                                }
                            } catch(err) { console.error(err); }
                        }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Miktar</label>
                                <input name="qty" type="number" required defaultValue="100" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Aciliyet</label>
                                <select name="priority" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                    <option value="Normal">Normal</option>
                                    <option value="Acil">Acil</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setProductionRequestProduct(null)} style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>İptal</button>
                                <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Talep Gönder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
    </div>
  );
};`;
    if (!content.includes('Manuel Üretim Talebi')) {
        content = content.replace(/    <\/div>\s*\);\s*};\s*export default InventoryList;/, ''); // clear end
        content += '\n' + modalAdd + '\nexport default InventoryList;';
    }

    fs.writeFileSync(file, content);
}

try {
    applyToStockList();
    applyToInventoryList();
    console.log('Fixed buttons and modals.');
} catch (e) {
    console.error(e);
}
