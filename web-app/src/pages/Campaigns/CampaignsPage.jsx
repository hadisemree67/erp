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

const API_BASE = 'http://localhost:3000';

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

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
    if (!path) return 'https://via.placeholder.com/600x300?text=Görsel+Yok';
    if (path.startsWith('http')) return path;
    return `${API_BASE}/${path.replace(/^\//, '')}`;
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
        <h1 className={styles.title}>🎁 Aktif Kampanyalar</h1>
        <p className={styles.subtitle}>En güncel fırsatlarımızı kaçırmayın!</p>
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
              
              {selectedCampaign.target_product ? (
                <div 
                  className={styles.targetProductCard}
                  onClick={() => {
                    navigate(`/product/${selectedCampaign.target_product.Id}`);
                    setSelectedCampaign(null);
                  }}
                >
                  <div className={styles.targetProductImageWrapper}>
                    <img 
                      src={getImageUrl(selectedCampaign.target_product.ImagePath?.split(',')[0])} 
                      alt={selectedCampaign.target_product.ProductName}
                    />
                  </div>
                  <div className={styles.targetProductInfo}>
                    <div className={styles.targetProductName}>
                      {selectedCampaign.target_product.ProductName}
                    </div>
                    <div className={styles.targetProductPrice}>
                      {selectedCampaign.target_product.SalePrice} TL
                    </div>
                  </div>
                  <div className={styles.targetProductArrow}>→</div>
                </div>
              ) : selectedCampaign.target_barcode ? (
                <div className={styles.modalRule}>
                  ℹ️ Hedef Barkod/Ürün Kodu: <strong>{selectedCampaign.target_barcode}</strong>
                </div>
              ) : null}

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


