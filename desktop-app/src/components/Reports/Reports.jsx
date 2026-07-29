import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

function Reports({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('degerli'); // 'degerli', 'kritik'

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('http://localhost:3000/api/reports/summary');
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        setError('Rapor verileri alınamadı.');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Hacim formatlayıcı (cm3 -> m3 çevirimi ile birlikte)
  const formatVolume = (cm3) => {
    if (!cm3 || cm3 === 0) return '0 cm³';
    const val = Number(cm3);
    if (val >= 1000000) {
      const m3 = (val / 1000000).toFixed(2);
      return `${val.toLocaleString('tr-TR')} cm³ (${m3} m³)`;
    }
    return `${val.toLocaleString('tr-TR')} cm³`;
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
        Veriler yükleniyor...
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#ef4444', borderRadius: '12px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ fontWeight: '500', fontSize: '14px', margin: '0 0 12px 0' }}>{error || 'Veri bulunamadı.'}</p>
        <button onClick={fetchReports} style={{ padding: '8px 16px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>
          Yeniden Dene
        </button>
      </div>
    );
  }

  const { stats, occupancy, categoryBreakdown, lowStockProducts, topValuationProducts } = reportData;

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1e293b' }}>
      
      {/* Üst Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: '600' }}>
            Raporlar ve Depo Analizi
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            Hacimsel depo doluluk oranları, kategori bazlı stok dağılımları ve envanter durumu
          </p>
        </div>
        <button 
          onClick={fetchReports} 
          style={{ padding: '8px 14px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', cursor: 'pointer', fontWeight: '500', fontSize: '13px', transition: 'all 0.2s' }}
        >
          Verileri Yenile
        </button>
      </div>

      {/* KPI Kartları - Kurumsal & Minimalist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Genel Depo Doluluk</div>
          <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: '700', marginTop: '6px' }}>
            %{occupancy.overallPercentage}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Toplam hacim kullanım oranı</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Fiziksel Yapı</div>
          <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: '700', marginTop: '6px' }}>
            {stats.totalWarehouses} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Depo</span> / {stats.totalShelves} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Raf</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Sistemde kayıtlı alanlar</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Toplam Ürün Çeşidi</div>
          <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: '700', marginTop: '6px' }}>
            {stats.totalProducts} <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Çeşit</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Kayıtlı aktif ürünler</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Envanter Değeri</div>
          <div style={{ fontSize: '22px', color: '#0f172a', fontWeight: '700', marginTop: '8px' }}>
            {formatCurrency(stats.totalInventoryValue)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Alış fiyatları üzerinden tahmini</div>
        </div>
      </div>

      {/* 1. BÖLÜM: DEPO DOLULUK ORANLARI (Sadeleştirilmiş UI) */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '28px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>Depo Doluluk Oranları</h2>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>
              Raflarda tanımlı maksimum kapasiteye karşılık ürünlerin hacimsel (cm³) doluluk durumu
            </p>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
            Toplam Kapasite: <strong style={{ color: '#0f172a' }}>{formatVolume(occupancy.totalMaxVolume)}</strong>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
            {occupancy.warehouses.map(w => {
              const isOverflown = w.percentage > 100;
              const isHigh = w.percentage > 85 && w.percentage <= 100;
              // Nötr / sade tonlar
              const barColor = isOverflown ? '#f87171' : isHigh ? '#fbbf24' : '#94a3b8';
              const displayPercent = Math.min(w.percentage, 100);

              return (
                <div key={w.id} style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  
                  {/* Başlık ve Yüzde */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{w.name}</h4>
                      <span style={{ 
                        backgroundColor: w.type === 'HAMMADDE' ? '#fffbeb' : '#ecfdf5', 
                        color: w.type === 'HAMMADDE' ? '#b45309' : '#047857', 
                        border: `1px solid ${w.type === 'HAMMADDE' ? '#fde68a' : '#a7f3d0'}`, 
                        fontSize: '11px', 
                        fontWeight: '500', 
                        padding: '1px 8px', 
                        borderRadius: '999px' 
                      }}>
                        {w.type === 'HAMMADDE' ? 'Hammadde' : 'Stok'}
                      </span>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: isOverflown ? '#dc2626' : '#334155' }}>
                      %{w.percentage}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '6px', borderRadius: '999px', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${displayPercent}%`, 
                      height: '100%', 
                      backgroundColor: barColor, 
                      borderRadius: '999px',
                      transition: 'width 0.5s ease' 
                    }} />
                  </div>

                  {/* Detay Bilgileri - 3'lü Izgara Düzeni, Gri arka plan kaldırıldı */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', color: '#475569' }}>
                    <div>
                      <span style={{ display: 'block', color: '#94a3b8', fontWeight: '500', fontSize: '11px', marginBottom: '2px' }}>Dolu Hacim</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{formatVolume(w.usedVolume)}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: '#94a3b8', fontWeight: '500', fontSize: '11px', marginBottom: '2px' }}>Kapasite</span>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{formatVolume(w.maxVolume)}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {isOverflown ? (
                        <>
                          <span style={{ display: 'block', color: '#ef4444', fontWeight: '600', fontSize: '11px', marginBottom: '2px' }}>Kapasite Aşımı</span>
                          <span style={{ fontWeight: '600', color: '#dc2626' }}>+{formatVolume(w.overflowVolume)}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ display: 'block', color: '#94a3b8', fontWeight: '500', fontSize: '11px', marginBottom: '2px' }}>Boş Alan</span>
                          <span style={{ fontWeight: '600', color: '#334155' }}>{formatVolume(w.emptyVolume)}</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. BÖLÜM: KATEGORİ DAĞILIMI VE DEĞERLİ / KRİTİK ÜRÜNLER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Sol Kolon: Kategori Bazlı Stok */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>
            Kategori Bazlı Stok Dağılımı
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  <th style={{ padding: '8px 4px', fontWeight: '600' }}>Kategori</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '600' }}>Çeşit</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '600' }}>Stok Miktarı</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '600' }}>Maliyet / Değer</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((cat, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 4px', fontWeight: '500', color: '#1e293b' }}>{cat.category}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569', fontWeight: '500', fontSize: '11px' }}>
                        {cat.productCount}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: '500', color: '#475569' }}>
                      {cat.totalStock.toLocaleString('tr-TR')}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                      {formatCurrency(cat.totalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sağ Kolon: En Değerli Ürünler & Kritik Stoklar */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>
              {activeTab === 'degerli' ? 'En Yüksek Değerli Ürünler' : 'Kritik Stok Uyarıları'}
            </h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setActiveTab('degerli')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'degerli' ? '#0f172a' : '#f1f5f9', color: activeTab === 'degerli' ? '#ffffff' : '#64748b', fontWeight: '500', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                En Değerliler
              </button>
              <button 
                onClick={() => setActiveTab('kritik')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: activeTab === 'kritik' ? '#ef4444' : '#f1f5f9', color: activeTab === 'kritik' ? '#ffffff' : '#64748b', fontWeight: '500', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Kritik Stok ({lowStockProducts.length})
              </button>
            </div>
          </div>

          {activeTab === 'degerli' ? (
            <div>
              {topValuationProducts.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Veri bulunamadı.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topValuationProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '13px' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{p.brand || 'Markasız'} • {p.category || 'Kategori Yok'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{formatCurrency(p.totalValue)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.quantity} {p.unit} × {formatCurrency(p.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {lowStockProducts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '13px' }}>
                  Kritik stok seviyesinin altında ürün bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lowStockProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #f87171' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '13px' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.brand || 'Markasız'} • Kritik Sınır: <strong style={{ color: '#ef4444' }}>{p.criticalLevel} {p.unit}</strong></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {/* Soft kırmızı pastel badge */}
                        <span style={{ padding: '2px 8px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: '500', fontSize: '11px' }}>
                          Mevcut: {p.quantity} {p.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default Reports;
