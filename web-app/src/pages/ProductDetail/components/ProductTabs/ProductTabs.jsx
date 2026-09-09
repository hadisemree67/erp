import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Star, Link, RotateCcw, Box, FileText, Check } from 'lucide-react';
import DOMPurify from 'dompurify';
import AskQuestionModal from './AskQuestionModal';
import styles from './ProductTabs.module.css';

const availableIcons = [
  { id: 'Damla', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' },
  { id: 'AlkolYok', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M9.5 9.5A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 3.5-3.5A3.5 3.5 0 0 0 12 8.5"/></svg>' },
  { id: 'Kalkan', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  { id: 'Yaprak', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3c-4.97 4.97-4.97 13.03 0 18 4.97-4.97 4.97-13.03 0-18z"/><path d="M12 3v18"/></svg>' },
  { id: 'Kalp', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
  { id: 'Yildiz', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { id: 'Gunes', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' },
  { id: 'Gulumseme', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
  { id: 'Check', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
  { id: 'Ruzgar', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>' },
  { id: 'Goz', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' },
  { id: 'KimyasalYok', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><line x1="5.52" y1="16" x2="18.48" y2="16"/><line x1="3" y1="3" x2="21" y2="21"/></svg>' },
  { id: 'Enerji', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
  { id: 'GeriDonusum', svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 5.13a9.14 9.14 0 0 1 0 13.74"/><path d="M3.61 18.87a9.14 9.14 0 0 1 0-13.74"/><path d="M12 2A9.95 9.95 0 0 1 22 12"/><path d="M2 12A9.95 9.95 0 0 1 12 2"/></svg>' },
];

const getHighlightIconSvg = (iconId) => {
  return availableIcons.find((i) => i.id === iconId)?.svg || availableIcons[0].svg;
};

const renderMarkdownLite = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (!line.trim()) {
      return <div key={'br-' + i} className={styles.mdLineBreak} />;
    }

    let isH3 = false;
    let isH4 = false;
    let content = line;

    if (content.startsWith('# ')) {
      isH3 = true;
      content = content.slice(2);
    } else if (content.startsWith('## ')) {
      isH4 = true;
      content = content.slice(3);
    }

    // Split by **...**
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formattedContent = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isH3) {
      return (
        <h3 key={'h3-' + i} className={styles.mdH3}>
          {formattedContent}
        </h3>
      );
    } else if (isH4) {
      return (
        <h4 key={'h4-' + i} className={styles.mdH4}>
          {formattedContent}
        </h4>
      );
    } else {
      // Fake list items
      if (content.startsWith('- ') || content.startsWith('* ')) {
        const bulletContent = content.slice(2).split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        return (
          <div key={'li-' + i} className={styles.mdLi}>
            <span className={styles.mdBullet}>•</span>
            <span>{bulletContent}</span>
          </div>
        );
      }
      return (
        <div key={'p-' + i} className={styles.mdP}>
          {formattedContent}
        </div>
      );
    }
  });
};

const ProductTabs = ({
  product,
  images,
  mainImageIndex,
  setMainImageIndex,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  reviewsData: externalReviewsData,
  onReviewSubmitted
}) => {
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState('features');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab !== undefined ? externalSetActiveTab : setInternalActiveTab;

  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);

  const [reviewsData, setReviewsData] = useState(externalReviewsData || {
    stats: { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    reviews: []
  });
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (externalReviewsData) {
      setReviewsData(externalReviewsData);
    }
  }, [externalReviewsData]);

  const fetchReviews = async () => {
    if (!product?.Id) return;
    setLoadingReviews(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/products/public/${product.Id}/reviews`);
      const data = await res.json();
      if (data.success && data.data) {
        setReviewsData(data.data);
      }
    } catch (err) {
      console.error('Yorum listesi alınırken hata:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchQuestions = async () => {
    if (!product?.Id) return;
    setLoadingQuestions(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/products/public/${product.Id}/questions`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data || []);
      }
    } catch (err) {
      console.error('Soru listesi alınırken hata:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    if (!externalReviewsData) {
      fetchReviews();
    }
  }, [product?.Id]);

  return (
    <div className={styles.tabsWrapper}>
      <div className={styles.tabHeaders}>
        <button
          className={`${styles.tabHeader} ${activeTab === 'features' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('features')}
        >
          Ürün Özellikleri
        </button>
        <button
          className={`${styles.tabHeader} ${activeTab === 'description' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('description')}
        >
          Ürün Açıklaması
        </button>
        <button
          className={`${styles.tabHeader} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Kullanıcı Yorumları {reviewsData?.stats?.totalReviews > 0 ? `(${reviewsData.stats.totalReviews})` : ''}
        </button>
        <button
          className={`${styles.tabHeader} ${activeTab === 'qa' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          Soru ve Cevap {questions.length > 0 ? `(${questions.length})` : ''}
        </button>
        <button
          className={`${styles.tabHeader} ${activeTab === 'recommend' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('recommend')}
        >
          Tavsiye Et
        </button>
        <button
          className={`${styles.tabHeader} ${activeTab === 'return_policy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('return_policy')}
        >
          İade Koşulları
        </button>
        <button
          className={`${styles.tabHeader} ${activeTab === 'call_me' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('call_me')}
        ></button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'description' && (
          <div className={styles.descriptionContent}>
            <div className={styles.descriptionBox}>
              <h3 className={styles.descriptionTitle}>Ürün Açıklaması</h3>
              <div className={styles.descriptionText}>
                {product.Description
                  ? renderMarkdownLite(product.Description)
                  : 'Bu ürün için henüz bir açıklama girilmemiş.'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommend' && (
          <div className={styles.recommendBox}>
            <Share2 size={36} color="#0d9488" className={styles.recommendIcon} />
            <h3 className={styles.recommendTitle}>Bu Ürünü Tavsiye Et</h3>
            <p className={styles.recommendText}>
              Bu ürünü beğendiyseniz arkadaşlarınızla paylaşabilirsiniz.
            </p>

            <div className={styles.recommendActions}>
              <button className={`${styles.socialBtn} ${styles.whatsappBtn}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>
              <button className={`${styles.socialBtn} ${styles.facebookBtn}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
              <button className={`${styles.socialBtn} ${styles.copyLinkBtn}`}>
                <Link size={18} />
                Linki Kopyala
              </button>
            </div>
          </div>
        )}

        {activeTab === 'return_policy' && (
          <div className={styles.returnPolicyBox}>
            <h3 className={styles.returnPolicyTitle}>İade Koşulları</h3>
            <div className={styles.returnPolicyGrid}>
              <div className={styles.returnPolicyItem}>
                <div className={styles.returnPolicyIcon}>
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h4 className={styles.returnPolicyItemTitle}>14 Gün İçinde İade</h4>
                  <p className={styles.returnPolicyItemText}>
                    Satın aldığınız ürünü teslimat tarihinden itibaren 14 gün içerisinde iade
                    edebilirsiniz.
                  </p>
                </div>
              </div>
              <div className={styles.returnPolicyItem}>
                <div className={styles.returnPolicyIcon}>
                  <Box size={20} />
                </div>
                <div>
                  <h4 className={styles.returnPolicyItemTitle}>Orijinal Ambalaj</h4>
                  <p className={styles.returnPolicyItemText}>
                    Ürünün kullanılmamış ve orijinal ambalajı bozulmamış olması gerekmektedir.
                  </p>
                </div>
              </div>
              <div className={styles.returnPolicyItem}>
                <div className={styles.returnPolicyIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className={styles.returnPolicyItemTitle}>Fatura İle Gönderim</h4>
                  <p className={styles.returnPolicyItemText}>
                    İade sürecinde ürünün orijinal faturasının veya sevk irsaliyesinin eklenmesi
                    zorunludur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className={styles.featuresTabWrapper}>
            {/* TOP BANNER */}
            <div className={styles.featuresTopBanner}>
              <div className={styles.bannerLeft}>
                <div className={styles.bannerBrandLabel}>{product.Brand || 'MARKA'}</div>
                <h2 className={styles.bannerTitle}>{product.ProductName}</h2>
                <div className={styles.bannerSeparator}></div>
                <p className={styles.bannerSlogan}>
                  {product.BannerSlogan || 'Özel formülüyle cildinize iyi gelir.'}
                </p>
              </div>

              <div className={styles.bannerIconPills}>
                {(() => {
                  let highlights = [];
                  try {
                    if (product.Highlights)
                      highlights =
                        typeof product.Highlights === 'string'
                          ? JSON.parse(product.Highlights)
                          : product.Highlights;
                  } catch (e) {}

                  return highlights.map((item, i) => (
                    <div key={i} className={styles.iconPillItem}>
                      <div
                        className={styles.iconPillGraphic}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(getHighlightIconSvg(item.iconId)),
                        }}
                      ></div>
                      <span className={styles.iconPillText}>{item.label}</span>
                    </div>
                  ));
                })()}
              </div>

              <div className={styles.bannerBackgroundShape}>
                <svg width="120" height="120" viewBox="0 0 100 100" fill="#3d9e82">
                  <path d="M50 5 C20 20, 5 50, 20 80 C35 110, 65 95, 80 70 C95 45, 80 15, 50 5Z" />
                  <path d="M50 5 L50 80" stroke="#3d9e82" strokeWidth="2" fill="none" />
                  <path d="M50 30 C60 25, 70 35, 75 50" stroke="#3d9e82" strokeWidth="1.5" fill="none" />
                  <path d="M50 50 C40 45, 30 55, 25 70" stroke="#3d9e82" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            </div>

            {/* BIG WHITE WRAPPER */}
            <div className={styles.featuresBigWrapper}>
              <div className={styles.featuresGridContent}>
                {/* COL 1: Product Image */}
                <div className={styles.featuresImageCol}>
                  <img
                    src={images[mainImageIndex] || images[0]}
                    alt="Ürün"
                    className={styles.featuresMainImage}
                  />
                  {images.length > 1 && (
                    <div className={styles.featuresThumbnails}>
                      {images.slice(0, 4).map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setMainImageIndex(idx)}
                          className={`${styles.featuresThumbItem} ${
                            mainImageIndex === idx ? styles.activeFeatureThumb : ''
                          }`}
                        >
                          <img src={img} alt="thumb" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* COL 2: Main Description Text */}
                <div className={styles.featuresDescCol}>
                  <div className={styles.featuresDescText}>
                    {product.MarketingText || product.Description ? (
                      <div>{renderMarkdownLite(product.MarketingText || product.Description)}</div>
                    ) : (
                      'Açıklama bulunamadı.'
                    )}
                  </div>
                </div>

                {/* COL 3: Right Boxes */}
                <div className={styles.featuresBoxesCol}>
                  {/* Kimler Kullanabilir */}
                  <div className={styles.featuresRightBox}>
                    <div className={styles.rightBoxHeader}>
                      <div className={styles.rightBoxIcon}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <h4>Kimler Kullanabilir?</h4>
                    </div>
                    <div className={styles.rightBoxList}>
                      {(() => {
                        const field = product.WhoCanUse;
                        if (!field) return <div className={styles.noInfoText}>Belirtilmemiş</div>;
                        let arr = [];
                        if (Array.isArray(field)) arr = field;
                        else if (typeof field === 'string') arr = field.split('\n');
                        else {
                          try {
                            arr = JSON.parse(field);
                          } catch (e) {
                            arr = [String(field)];
                          }
                        }
                        return arr.filter(Boolean).map((item, idx) => (
                          <div key={idx} className={styles.whoCanUseItem}>
                            <div className={styles.whoCanUseDot}></div>
                            <span>{item}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Nasıl Kullanılır */}
                  <div className={styles.featuresRightBox}>
                    <div className={styles.rightBoxHeader}>
                      <div className={styles.rightBoxIcon}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polygon points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <h4>Nasıl Kullanılır?</h4>
                    </div>
                    <div className={styles.rightBoxList}>
                      {(() => {
                        const field = product.HowToUse;
                        if (!field) return <div className={styles.noInfoText}>Belirtilmemiş</div>;
                        let arr = [];
                        if (Array.isArray(field)) arr = field;
                        else if (typeof field === 'string') arr = field.split('\n');
                        else {
                          try {
                            arr = JSON.parse(field);
                          } catch (e) {
                            arr = [String(field)];
                          }
                        }
                        return arr.filter(Boolean).map((item, idx) => (
                          <div key={idx} className={styles.howToUseItem}>
                            <div className={styles.howToUseNumber}>{idx + 1}</div>
                            <span>{item}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className={styles.reviewsContainer}>
            <div className={styles.reviewsSummary}>
              <div className={styles.ratingBig}>
                <div className={styles.ratingScore}>
                  {reviewsData?.stats?.averageRating > 0
                    ? Number(reviewsData.stats.averageRating).toFixed(1)
                    : '0.0'}
                </div>
                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      fill={star <= Math.round(reviewsData?.stats?.averageRating || 0) ? '#f59e0b' : '#e2e8f0'}
                      color={star <= Math.round(reviewsData?.stats?.averageRating || 0) ? '#f59e0b' : '#e2e8f0'}
                    />
                  ))}
                </div>
                <div className={styles.ratingCountTotal}>
                  {reviewsData?.stats?.totalReviews || 0} Değerlendirme
                </div>
              </div>

              <div className={styles.ratingBars}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const pct = reviewsData?.stats?.percentages?.[star] ?? reviewsData?.stats?.ratingPercentages?.[star] ?? 0;
                  const cnt = reviewsData?.stats?.distribution?.[star] ?? reviewsData?.stats?.ratingDistribution?.[star] ?? 0;
                  return (
                    <div key={star} className={styles.ratingBarRow}>
                      <span style={{ minWidth: '55px' }}>{star} Yıldız</span>
                      <div className={styles.barBg}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${pct}%`, background: '#f59e0b' }}
                        ></div>
                      </div>
                      <span className={styles.barPercent}>%{pct}</span>
                      <span style={{ fontSize: '12px', color: '#1e293b', minWidth: '32px', fontWeight: '700' }}>({cnt})</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.addReviewBox}>
                <button
                  className={styles.writeReviewBtn}
                  onClick={() => {
                    const token = localStorage.getItem('customerToken');
                    if (token) {
                      navigate('/profilim?tab=orders');
                    } else {
                      navigate('/giris');
                    }
                  }}
                >
                  Yorum Yap
                </button>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', textAlign: 'center', maxWidth: '140px', lineHeight: 1.3 }}>
                  * Teslim edilen siparişleriniz üzerinden yorum yapabilirsiniz.
                </div>
              </div>
            </div>

            {loadingReviews ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                Yorumlar yükleniyor...
              </div>
            ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
              <div className={styles.reviewsList}>
                {reviewsData.reviews.map((rev) => (
                  <div key={rev.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewerInfo}>
                        <div className={styles.reviewerAvatar}>
                          {(rev.author || 'M')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={styles.reviewerName}>{rev.author || 'Müşteri'}</span>
                            {rev.isVerifiedPurchase && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  fontWeight: '600'
                                }}
                              >
                                <Check size={12} strokeWidth={2.5} />
                                Doğrulanmış Alıcı
                              </span>
                            )}
                          </div>
                          <div className={styles.reviewDate}>
                            {rev.created_at
                              ? new Date(rev.created_at).toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : ''}
                          </div>
                        </div>
                      </div>
                      <div className={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={16}
                            fill={s <= rev.rating ? '#f59e0b' : '#e2e8f0'}
                            color={s <= rev.rating ? '#f59e0b' : '#e2e8f0'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className={styles.reviewText}>
                      {rev.comment && rev.comment.trim() ? (
                        rev.comment
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                          (Kullanıcı yalnızca yıldız puanı verdi)
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Henüz değerlendirme yapılmamış
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                  Bu ürün için henüz kullanıcı yorumu bulunmuyor. Teslim aldığınız siparişlerinizden ilk deneyimi siz paylaşabilirsiniz!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'qa' && (
          <div className={styles.qaContainer}>
            <div className={styles.qaHeader}>
              <div>
                <h3 className={styles.qaHeaderTitle}>Soru ve Cevaplar ({questions.length})</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Ürün hakkında müşterilerin sorduğu ve mağaza tarafından yanıtlanan tüm sorular
                </p>
              </div>
              <button 
                className={styles.askNewQuestionBtn} 
                onClick={() => setIsAskModalOpen(true)}
              >
                Soru Sor
              </button>
            </div>

            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                Sorular yükleniyor...
              </div>
            ) : questions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Henüz soru sorulmamış
                </p>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                  Bu ürünle ilgili aklınıza takılan soruları satıcıya ilk siz iletebilirsiniz.
                </p>
                <button
                  className={styles.askNewQuestionBtn}
                  onClick={() => setIsAskModalOpen(true)}
                  style={{ display: 'inline-block' }}
                >
                  İlk Soruyu Siz Sorun
                </button>
              </div>
            ) : (
              <div className={styles.qaList}>
                {questions.map((q) => (
                  <div key={q.id} className={styles.qaCardSimple}>
                    {/* Soru Üst Başlık Satırı */}
                    <div className={styles.qaHeaderRow}>
                      <span className={styles.qaTopicBadge}>
                        📌 {q.topic || 'Genel'}
                      </span>
                      <div className={styles.qaAuthorInfo}>
                        <span className={styles.qaAuthorName}>{q.author}</span>
                        {q.created_at && (
                          <span>
                            • {new Date(q.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Soru Metni */}
                    <p className={styles.qaQuestionBody}>{q.question}</p>

                    {/* Satıcı Yanıtı */}
                    {q.answer && (
                      <div className={styles.qaAnswerBox}>
                        <div className={styles.qaAnswerHeader}>
                          <span className={styles.qaSellerBadge}>
                            🏪 Satıcı Yanıtı
                          </span>
                          {q.answered_at && (
                            <span className={styles.qaAnswerDate}>
                              {new Date(q.answered_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className={styles.qaAnswerText}>{q.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AskQuestionModal
        product={product}
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        onSuccess={() => {
          fetchQuestions();
        }}
      />
    </div>
  );
};

export default ProductTabs;
