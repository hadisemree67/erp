/**
 * ============================================================================
 * BİLEŞEN ADI: CampaignsPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Aktif indirim kampanyalarını ve fırsatları müşteriye sunan sayfa.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CampaignsPage.module.css';

const API_BASE = import.meta.env.VITE_API_URL;

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (!selectedCampaign) {
      setActiveProduct(null);
      return;
    }

    if (selectedCampaign.target_product) {
      setActiveProduct(selectedCampaign.target_product);
      return;
    }

    let isMounted = true;
    const loadTargetProduct = async () => {
      try {
        // 1. target_product_ids varsa doğrudan ID ile ürünü çek
        if (selectedCampaign.target_product_ids && selectedCampaign.target_product_ids.length > 0) {
          const res = await fetch(`${API_BASE}/api/products/public/${selectedCampaign.target_product_ids[0]}`);
          const json = await res.json();
          if (isMounted && json.success && json.data) {
            setActiveProduct(json.data);
            return;
          }
        }

        // 2. target_barcode veya ürün kodu varsa arama yap
        const barcode = selectedCampaign.target_barcode;
        if (barcode) {
          const res = await fetch(`${API_BASE}/api/products/public?q=${encodeURIComponent(barcode)}`);
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
            setActiveProduct(json.data[0]);
            return;
          }
        }
      } catch (err) {
        console.error('Kampanya hedef ürünü yüklenemedi:', err);
      }
    };

    loadTargetProduct();

    return () => {
      isMounted = false;
    };
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/campaigns/public`);
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.data);
      } else {
        setError('Kampanyalar yüklenirken bir hata oluştu.');
      }
    } catch (err) {
      setError('Sunucu bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path) => {
    if (!path || path === 'null') return 'https://via.placeholder.com/600x300?text=Görsel+Yok';
    if (path.startsWith('http')) return path;
    return `${API_BASE}/${path.replace(/^\//, '')}`;
  };

  const getProductImageUrl = (imgPath) => {
    if (!imgPath || imgPath === 'null') return 'https://via.placeholder.com/300x300?text=Ürün+Görseli';
    let clean = imgPath;
    try {
      if (typeof clean === 'string' && (clean.startsWith('[') || clean.startsWith('{'))) {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed) && parsed.length > 0) clean = parsed[0];
      }
    } catch (e) {}
    if (typeof clean === 'string' && clean.includes(',')) {
      clean = clean.split(',')[0].trim();
    }
    if (typeof clean !== 'string' || !clean) return 'https://via.placeholder.com/300x300?text=Ürün+Görseli';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    const prefix = clean.startsWith('/') ? '' : '/';
    return `${API_BASE}${prefix}${clean}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getCampaignRuleText = (campaign) => {
    switch (campaign.campaign_type) {
      case '2_al_1_ode':
      case '3_al_2_ode':
        return `${campaign.buy_quantity} Al ${campaign.pay_quantity} Öde!`;
      case 'yuzde_indirim':
        return `%${campaign.discount_rate} İndirim`;
      case 'tutar_indirimi':
        return `${campaign.discount_rate} TL İndirim`;
      case 'hediye_urun':
        return `${campaign.gift_quantity} Adet ${campaign.gift_product_name || 'Hediye Ürün'}!`;
      default:
        return 'Özel Fırsat';
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Sayfa Başlığı */}
      <div className={styles.header}>
        <h1 className={styles.title}>Kampanyalar</h1>
        <p className={styles.subtitle}>Güncel fırsatları buradan takip edebilirsiniz.</p>
      </div>

      {loading ? (
        <div className={styles.loading}>Kampanyalar yükleniyor...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : campaigns.length === 0 ? (
        <div className={styles.empty}>Şu anda aktif bir kampanya bulunmuyor.</div>
      ) : (
        <div className={styles.grid}>
          {campaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className={styles.card}
              onClick={() => setSelectedCampaign(campaign)}
            >
              <div className={styles.imageWrapper}>
                <img 
                  src={getImageUrl(campaign.cover_image_path)} 
                  alt={campaign.title} 
                  className={styles.image} 
                />
                <div className={styles.badge}>
                  {getCampaignRuleText(campaign)}
                </div>
              </div>
              <div className={styles.content}>
                <h3 className={styles.cardTitle}>{campaign.title}</h3>
                <p className={styles.cardDesc}>
                  {campaign.description && campaign.description.length > 80
                    ? `${campaign.description.substring(0, 80)}...`
                    : campaign.description || 'Detaylar için tıklayın.'}
                </p>
                <div className={styles.cardFooter}>
                  {campaign.end_date && (
                    <span className={styles.date}>Son Gün: {formatDate(campaign.end_date)}</span>
                  )}
                  <button className={styles.viewBtn}>İncele →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kampanya Detay Modalı */}
      {selectedCampaign && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCampaign(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedCampaign(null)}>✕</button>
            
            <img 
              src={getImageUrl(selectedCampaign.cover_image_path)} 
              alt={selectedCampaign.title} 
              className={styles.modalImage} 
            />
            
            <div className={styles.modalBody}>
              <div className={styles.modalBadge}>
                {getCampaignRuleText(selectedCampaign)}
              </div>
              
              <h2 className={styles.modalTitle}>{selectedCampaign.title}</h2>
              
              {(selectedCampaign.start_date || selectedCampaign.end_date) && (
                <div className={styles.modalDates}>
                  🕒 Geçerlilik: {selectedCampaign.start_date ? formatDate(selectedCampaign.start_date) : 'Hemen'} - {selectedCampaign.end_date ? formatDate(selectedCampaign.end_date) : 'Süresiz'}
                </div>
              )}
              
              <div className={styles.modalDescription}>
                <h4 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '15px' }}>Kampanya Detayları</h4>
                <p style={{ whiteSpace: 'pre-line', color: '#475569', lineHeight: '1.6' }}>
                  {selectedCampaign.description || 'Bu kampanya için ek bir detay girilmemiştir.'}
                </p>
              </div>

              {selectedCampaign.min_amount > 0 && (
                <div className={styles.modalRule}>
                  ℹ️ Minimum Sepet Tutarı: <strong>{selectedCampaign.min_amount} TL</strong>
                </div>
              )}
              
              {/* Kampanyaya Dahil / Hedef Ürün Kartı */}
              {(activeProduct || selectedCampaign.target_barcode) && (
                <div 
                  className={styles.targetProductCard}
                  onClick={() => {
                    if (activeProduct?.Id) {
                      navigate(`/product/${activeProduct.Id}`);
                      setSelectedCampaign(null);
                    }
                  }}
                  style={{ cursor: activeProduct?.Id ? 'pointer' : 'default' }}
                >
                  <div className={styles.targetProductImageWrapper}>
                    {activeProduct && (activeProduct.ImagePath || activeProduct.images?.[0]) ? (
                      <img 
                        src={getProductImageUrl(activeProduct.ImagePath || activeProduct.images?.[0])} 
                        alt={activeProduct.ProductName || 'Kampanyalı Ürün'}
                      />
                    ) : (
                      <div className={styles.productIconFallback}>🛍️</div>
                    )}
                  </div>
                  <div className={styles.targetProductInfo}>
                    <div className={styles.targetProductHeaderRow}>
                      <span className={styles.targetProductBadge}>Kampanyalı Ürün</span>
                      {(activeProduct?.ProductCode || activeProduct?.Barcode || selectedCampaign.target_barcode) && (
                        <span className={styles.targetProductCode}>
                          Ürün Kodu: <strong>{activeProduct?.ProductCode || activeProduct?.Barcode || selectedCampaign.target_barcode}</strong>
                        </span>
                      )}
                    </div>
                    <div className={styles.targetProductName}>
                      {activeProduct?.ProductName || selectedCampaign.gift_product_name || 'Kampanyaya Dahil Ürün'}
                    </div>
                    {activeProduct?.SalePrice ? (
                      <div className={styles.targetProductPrice}>
                        {Number(activeProduct.SalePrice).toLocaleString('tr-TR')} TL
                      </div>
                    ) : null}
                  </div>
                  {activeProduct?.Id && (
                    <div className={styles.targetProductArrow} title="Ürüne Git">→</div>
                  )}
                </div>
              )}

              <button 
                className={styles.actionBtn}
                onClick={() => setSelectedCampaign(null)}
              >
                Fırsatlardan Yararlanmak İçin Alışverişe Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;


