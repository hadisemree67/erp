const fs = require('fs');

const missingLines = `    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>Envanter ve Stok Listesi</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Depolardaki ürünleri, raf konumlarını ve bakiye miktarlarını görüntüleyin.</p>
        </div>
        <button 
          onClick={() => setIsEntryVisible(true)}
          style={{
            backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', 
            border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
          }}
        >
          + Yeni Stok Girişi (Mal Kabul)
        </button>
      </div>

      {error && <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {/* Arama Çubuğu */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', maxWidth: '800px', position: 'relative' }}>
          <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', backgroundColor: '#fff', color: '#334155', minWidth: '200px' }}
          >
              <option value="">Tüm Depolar (Hepsi)</option>
              {uniqueWarehouses.map(w => (
                  <option key={w} value={w}>{w}</option>
              ))}
          </select>
          <div style={{ position: 'relative', flex: 1 }}>
              <input 
                  type="text" 
                  placeholder="Ürün Adı, Barkod, Depo veya Raf Ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', paddingRight: '120px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
              />
              <button 
                  onClick={() => { setIsBarcodeModalOpen(true); setTimeout(() => document.getElementById('barcode-input')?.focus(), 100); }}
                  style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', padding: '0 16px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', fontSize: '14px' }}
                  title="Barkod Okuyucu Cihazı ile Tara"
              >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>
                  Okut
              </button>
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
      </div>

      {/* Barkod Okuma Modalı */}
      {isBarcodeModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
              <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', animation: 'pulse 2s infinite' }}><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;

const path = 'C:/Users/dedih/Desktop/stokerpsistemi/desktop-app/src/components/WMS/StockList.jsx';
let content = fs.readFileSync(path, 'utf8');

const returnRegex = /return\s*\(\s*(<h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Lütfen Barkodu Okutun<\/h3>)/m;

if (returnRegex.test(content)) {
    content = content.replace(returnRegex, 'return (\n' + missingLines + '\n$1');
    fs.writeFileSync(path, content);
    console.log("Successfully restored StockList.jsx");
} else {
    console.log("Regex not found in StockList.jsx");
}
