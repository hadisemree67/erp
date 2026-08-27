/**
 * ============================================================================
 * BİLEŞEN ADI: ProductDetail
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
import DOMPurify from 'dompurify';
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
  return availableIcons.find(i => i.id === iconId)?.svg || availableIcons[0].svg;
};
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, X, Heart, Share2, Star, Minus, Plus, Maximize2, ShoppingCart, Truck, RotateCcw, ShieldCheck, Droplet, Sparkles, Activity, Sun, Check, Leaf, Info, Box, FileText, MessageSquare, HelpCircle, Package, PhoneCall, Users, Store } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import styles from './ProductDetail.module.css';

const renderMarkdownLite = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (!line.trim()) {
      return <div key={'br-' + i} style={{ height: '4px' }} />;
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
      return <h3 key={'h3-' + i} style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>{formattedContent}</h3>;
    } else if (isH4) {
      return <h4 key={'h4-' + i} style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', margin: '6px 0 2px 0' }}>{formattedContent}</h4>;
    } else {
      // Fake list items
      if (content.startsWith('- ') || content.startsWith('* ')) {
        const bulletContent = content.slice(2).split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        return <div key={'li-' + i} style={{ margin: '0 0 4px 0', display: 'flex', gap: '6px' }}><span style={{ color: '#94a3b8' }}>•</span><span>{bulletContent}</span></div>;
      }
      return <div key={'p-' + i} style={{ margin: '0 0 4px 0' }}>{formattedContent}</div>;
    }
  });
};

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('features');
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [isAdding, setIsAdding] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const nextImage = (e) => {
    e?.stopPropagation();
    setMainImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e) => {
    e?.stopPropagation();
    setMainImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products/public/${id}`);
        const data = await response.json();
        if (data.success) {
          setProduct(data.data);
        }
      } catch (error) {
        console.error('Ürün yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return <div className={styles.loading}>Yükleniyor...</div>;
  }

  if (!product) {
    return <div className={styles.loading}>Ürün bulunamadı.</div>;
  }

  const getImageUrl = (imgPath) => {
    if (!imgPath) return 'https://via.placeholder.com/600x600?text=Görsel+Yok';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
      return imgPath;
    }
    return `${import.meta.env.VITE_API_URL}${imgPath}`;
  };

  const images = product.images && product.images.length > 0
    ? product.images.map(getImageUrl)
    : ['https://via.placeholder.com/600x600?text=Görsel+Yok'];

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity < (product.AvailableStock || 0)) {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = async () => {
    if (product.AvailableStock <= 0) return;
    setIsAdding(true);
    const res = await addToCart(product, quantity);
    setIsAdding(false);
    if (!res.success) {
      // toast handles error
    } else {
      setProduct(prev => ({ ...prev, AvailableStock: prev.AvailableStock - quantity }));
    }
  };

  const salePrice = parseFloat(product.SalePrice) || 0;
  const oldPrice = salePrice * 1.20;
  const discountPercent = 15;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/">Ana Sayfa</Link>
          <ChevronRight size={14} />
          {product.web_categories && product.web_categories[0] ? (
            <>
              <Link to={`/category/${encodeURIComponent(product.web_categories[0])}`}>{product.web_categories[0]}</Link>
              <ChevronRight size={14} />
            </>
          ) : (
            <>
              <Link to={`/category/${encodeURIComponent(product.Category || '')}`}>{product.Category || 'Kategori Yok'}</Link>
              <ChevronRight size={14} />
            </>
          )}

          {product.web_subcategories && product.web_subcategories[0] && (
            <>
              <Link to={`/category/${encodeURIComponent(product.web_categories[0])}/${encodeURIComponent(product.web_subcategories[0])}`}>
                {product.web_subcategories[0]}
              </Link>
              <ChevronRight size={14} />
            </>
          )}

          {product.web_subtitles && product.web_subtitles[0] && (
            <>
              <span className={styles.breadcrumbItem}>{product.web_subtitles[0]}</span>
              <ChevronRight size={14} />
            </>
          )}
          <span className={styles.current}>{product.ProductName}</span>
        </nav>

        {/* Hero Section */}
        <div className={styles.heroSection}>
          {/* Left: Image Gallery */}
          <div className={styles.galleryWrapper}>
            <div className={styles.mainImageContainer}>
              {images.length > 1 && (
                <button className={`${styles.navArrowBtn} ${styles.prevBtn}`} onClick={prevImage}><ChevronLeft size={24} /></button>
              )}
              <img src={images[mainImageIndex]} alt={product.ProductName} className={styles.mainImage} />
              <button className={styles.maximizeBtn} onClick={() => setIsImageModalOpen(true)}><Maximize2 size={20} /></button>
              {images.length > 1 && (
                <button className={`${styles.navArrowBtn} ${styles.nextBtn}`} onClick={nextImage}><ChevronRight size={24} /></button>
              )}
            </div>

            {images.length > 1 && (
              <div className={styles.thumbnailList}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`${styles.thumbnailItem} ${mainImageIndex === idx ? styles.activeThumb : ''}`}
                    onClick={() => setMainImageIndex(idx)}
                  >
                    <img src={img} alt={`Thumbnail ${idx}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className={styles.productInfoWrapper}>
            <div className={styles.brandName}>{product.Brand || 'Markasız'}</div>
            <h1 className={styles.productTitle}>
              {product.ProductName}
              {product.AvailableStock <= 0 && <span style={{ marginLeft: '12px', fontSize: '14px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', verticalAlign: 'middle' }}>Tükendi</span>}
              {product.AvailableStock > 0 && product.AvailableStock < 100 && <span style={{ marginLeft: '12px', fontSize: '14px', backgroundColor: '#fef08a', color: '#a16207', padding: '4px 8px', borderRadius: '4px', verticalAlign: 'middle' }}>Azalan Stok</span>}
            </h1>

            <div className={styles.ratingRow}>
              <div className={styles.stars}>
                <Star size={16} fill="var(--primary)" color="var(--primary)" />
                <Star size={16} fill="var(--primary)" color="var(--primary)" />
                <Star size={16} fill="var(--primary)" color="var(--primary)" />
                <Star size={16} fill="var(--primary)" color="var(--primary)" />
                <Star size={16} fill="var(--primary-light)" color="var(--primary-light)" />
              </div>
              <span className={styles.reviewCount}>(128 Değerlendirme)</span>
            </div>

            <div style={{ marginTop: '12px', marginBottom: '16px', fontSize: '13px', color: '#475569', display: 'flex', gap: '16px' }}>
              <div>Ürün Barkodu : <span style={{ color: '#ec4899', fontWeight: '600' }}>{product.Barcode && product.Barcode.length > 0 ? (Array.isArray(product.Barcode) ? product.Barcode[0] : (typeof product.Barcode === 'string' ? (() => { try { return JSON.parse(product.Barcode)[0]; } catch (e) { return product.Barcode; } })() : 'Yok')) : 'Yok'}</span></div>
              <div>Ürün Kodu : <span style={{ color: '#ec4899', fontWeight: '600' }}>{product.ProductCode || 'Yok'}</span></div>
            </div>

            {/* Öne Çıkan Bilgiler Kutusu (Kullanıcı İsteği) */}
            {product.FeaturedFeatures && (() => {
              let features = [];
              try {
                if (typeof product.FeaturedFeatures === 'string') {
                  if (product.FeaturedFeatures.trim().startsWith('[')) {
                    features = JSON.parse(product.FeaturedFeatures);
                  } else {
                    features = product.FeaturedFeatures.split('\n');
                  }
                } else {
                  features = product.FeaturedFeatures;
                }
              } catch (e) { features = []; }

              // If it somehow parsed to an array of 1 element that has newlines, split it further
              if (Array.isArray(features) && features.length === 1 && typeof features[0] === 'string' && features[0].includes('\n')) {
                features = features[0].split('\n');
              }

              features = features.filter(f => f && f.trim());
              if (!Array.isArray(features) || features.length === 0) return null;

              return (
                <div style={{ margin: '4px 0 16px 0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Öne Çıkan Bilgiler</div>
                  <ul style={{ margin: 0, padding: '12px 16px 12px 32px', display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'disc' }}>
                    {features.map((feat, i) => (
                      <li key={i} style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{feat}</li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            <div className={styles.priceRow}>
              <div className={styles.currentPrice}>
                {salePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </div>
              <div className={styles.oldPrice}>
                {oldPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </div>
              <div className={styles.discountBadge}>%{discountPercent} İndirim</div>
            </div>

            <div className={styles.actionRow}>
              <div className={styles.quantitySelector}>
                <button onClick={handleDecrease} disabled={product.AvailableStock <= 0}><Minus size={16} /></button>
                <span>{quantity}</span>
                <button onClick={handleIncrease} disabled={product.AvailableStock <= 0 || quantity >= product.AvailableStock}><Plus size={16} /></button>
              </div>
              <button
                className={styles.addToCartBtn}
                onClick={handleAddToCart}
                disabled={product.AvailableStock <= 0 || isAdding}
                style={{ opacity: product.AvailableStock <= 0 ? 0.5 : 1, cursor: product.AvailableStock <= 0 ? 'not-allowed' : 'pointer' }}
              >
                <ShoppingCart size={18} /> {product.AvailableStock <= 0 ? 'TÜKENDİ' : (isAdding ? 'EKLENİYOR...' : 'SEPETE EKLE')}
              </button>
              <button className={styles.favoriteBtn} onClick={() => toggleFavorite(product)}>
                <Heart size={20} fill={isFavorite(product.Id) ? "#e11d48" : "none"} color={isFavorite(product.Id) ? "#e11d48" : "currentColor"} />
                {isFavorite(product.Id) ? 'FAVORİLERDEN ÇIKAR' : 'FAVORİLERE EKLE'}
              </button>
            </div>

            <div className={styles.trustBadges}>
              <div className={styles.trustBadge}>
                <Truck size={18} color="var(--primary)" />
                <span>2000 TL ve üzeri kargo ücretsiz</span>
              </div>
              <div className={styles.trustBadge}>
                <RotateCcw size={18} color="var(--primary)" />
                <span>14 gün içinde iade</span>
              </div>
              <div className={styles.trustBadge}>
                <ShieldCheck size={18} color="var(--primary)" />
                <span>Orijinal ürün garantisi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={styles.bottomSection}>
          {/* Left: Tabs */}
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
                Kullanıcı Yorumları (695)
              </button>
              <button
                className={`${styles.tabHeader} ${activeTab === 'qa' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('qa')}
              >
                Soru ve Cevap
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
              >
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'description' && (
                <div className={styles.descriptionContent}>
                  <div style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Ürün Açıklaması</h3>
                    <div style={{ color: '#475569', wordBreak: 'break-word' }}>
                      {product.Description ? renderMarkdownLite(product.Description) : 'Bu ürün için henüz bir açıklama girilmemiş.'}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recommend' && (
                <div style={{ padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <Share2 size={36} color="#0d9488" style={{ marginBottom: '16px' }} />
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1e293b', fontWeight: '700' }}>Bu Ürünü Tavsiye Et</h3>
                  <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '14px' }}>Bu ürünü beğendiyseniz arkadaşlarınızla paylaşabilirsiniz.</p>
                  
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button style={{ padding: '10px 20px', borderRadius: '8px', background: '#fff', color: '#25D366', border: '1px solid #25D366', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      WhatsApp
                    </button>
                    <button style={{ padding: '10px 20px', borderRadius: '8px', background: '#fff', color: '#3b5998', border: '1px solid #3b5998', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </button>
                    <button style={{ padding: '10px 20px', borderRadius: '8px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <Link size={18} />
                      Linki Kopyala
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'return_policy' && (
                <div style={{ padding: '32px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#1e293b', fontWeight: '700', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>İade Koşulları</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f8fafc', color: '#0d9488', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <RotateCcw size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>14 Gün İçinde İade</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Satın aldığınız ürünü teslimat tarihinden itibaren 14 gün içerisinde iade edebilirsiniz.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f8fafc', color: '#0d9488', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Box size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>Orijinal Ambalaj</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Ürünün kullanılmamış ve orijinal ambalajı bozulmamış olması gerekmektedir.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f8fafc', color: '#0d9488', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>Fatura İle Gönderim</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>İade sürecinde ürünün orijinal faturasının veya sevk irsaliyesinin eklenmesi zorunludur.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'features' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* ── TOP BANNER ── */}
                  <div style={{
                    background: 'linear-gradient(135deg, #edf6f2 0%, #d8ede5 100%)',
                    borderRadius: '16px',
                    padding: '28px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '160px'
                  }}>
                    <div style={{ flex: 1, zIndex: 2 }}>
                      <div style={{
                        display: 'inline-block',
                        background: 'white',
                        color: '#3d9e82',
                        fontWeight: '700',
                        fontSize: '12px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        marginBottom: '10px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                      }}>{product.Brand || 'MARKA'}</div>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
                        {product.ProductName}
                      </h2>
                      <div style={{ width: '36px', height: '3px', background: '#3d9e82', borderRadius: '4px', marginBottom: '8px' }}></div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                        {product.BannerSlogan || 'Özel formülüyle cildinize iyi gelir.'}
                      </p>
                    </div>

                    {/* Center: icon pills */}
                    <div style={{ display: 'flex', gap: '24px', zIndex: 2, flexShrink: 0, marginLeft: 'auto', transform: 'translateX(-90px)' }}>
                      {(() => {
                        let highlights = [];
                        try {
                          if (product.Highlights) highlights = typeof product.Highlights === 'string' ? JSON.parse(product.Highlights) : product.Highlights;
                        } catch (e) { }

                        return highlights.map((item, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '52px', height: '52px', borderRadius: '50%',
                              background: 'white', border: '1px solid #bce8d8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(22,163,74,0.12)',
                              color: '#3d9e82'
                            }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getHighlightIconSvg(item.iconId)) }}></div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{item.label}</span>
                          </div>
                        ));
                      })()}
                    </div>

                    <div style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', opacity: 0.18, zIndex: 1 }}>
                      <svg width="120" height="120" viewBox="0 0 100 100" fill="#3d9e82">
                        <path d="M50 5 C20 20, 5 50, 20 80 C35 110, 65 95, 80 70 C95 45, 80 15, 50 5Z" />
                        <path d="M50 5 L50 80" stroke="#3d9e82" strokeWidth="2" fill="none" />
                        <path d="M50 30 C60 25, 70 35, 75 50" stroke="#3d9e82" strokeWidth="1.5" fill="none" />
                        <path d="M50 50 C40 45, 30 55, 25 70" stroke="#3d9e82" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                  </div>

                  {/* ── BIG WHITE WRAPPER ── */}
                  <div style={{ background: 'white', borderRadius: '16px', padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '32px', alignItems: 'start', marginBottom: '32px' }}>

                      {/* COL 1: Product Image */}
                      <div style={{ borderRadius: '12px', overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #f1f5f9' }}>
                        <img src={images[mainImageIndex] || images[0]} alt="Ürün" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />
                        {images.length > 1 && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {images.slice(0, 4).map((img, idx) => (
                              <div key={idx} onClick={() => setMainImageIndex(idx)} style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: mainImageIndex === idx ? '2px solid #3d9e82' : '1px solid #e2e8f0', cursor: 'pointer', background: 'white' }}>
                                <img src={img} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COL 2: Main Description Text (No Box, directly side-by-side) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
                        <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                          {(product.MarketingText || product.Description) ? (
                            <div style={{ wordBreak: 'break-word', color: '#475569' }}>
                              {renderMarkdownLite(product.MarketingText || product.Description)}
                            </div>
                          ) : 'Açıklama bulunamadı.'}
                        </div>
                      </div>

                      {/* COL 3: Right Boxes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Kimler Kullanabilir */}
                        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '24px', background: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#edf6f2', color: '#3d9e82', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bce8d8' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Kimler Kullanabilir?</h4>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {(() => {
                              const field = product.WhoCanUse;
                              if (!field) return <div style={{ color: '#94a3b8' }}>Belirtilmemiş</div>;
                              let arr = [];
                              if (Array.isArray(field)) arr = field;
                              else if (typeof field === 'string') arr = field.split('\n');
                              else { try { arr = JSON.parse(field); } catch (e) { arr = [String(field)]; } }
                              return arr.filter(Boolean).map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3d9e82', flexShrink: 0 }}></div>
                                  <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>{item}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                        {/* Nasıl Kullanılır */}
                        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '24px', background: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#edf6f2', color: '#3d9e82', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bce8d8' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Nasıl Kullanılır?</h4>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(() => {
                              const field = product.HowToUse;
                              if (!field) return <div style={{ color: '#94a3b8' }}>Belirtilmemiş</div>;
                              let arr = [];
                              if (Array.isArray(field)) arr = field;
                              else if (typeof field === 'string') arr = field.split('\n');
                              else { try { arr = JSON.parse(field); } catch (e) { arr = [String(field)]; } }
                              return arr.filter(Boolean).map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3d9e82', color: 'white', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>{idx + 1}</div>
                                  <span style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>{item}</span>
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
                      <div className={styles.ratingScore}>4.8</div>
                      <div className={styles.ratingStars}>
                        <Star size={20} fill="#fbbf24" color="#fbbf24" />
                        <Star size={20} fill="#fbbf24" color="#fbbf24" />
                        <Star size={20} fill="#fbbf24" color="#fbbf24" />
                        <Star size={20} fill="#fbbf24" color="#fbbf24" />
                        <Star size={20} fill="#fbbf24" color="#fbbf24" />
                      </div>
                      <div className={styles.ratingCountTotal}>695 Değerlendirme</div>
                    </div>
                    <div className={styles.ratingBars}>
                      {[5,4,3,2,1].map((star, idx) => {
                        const percents = [85, 10, 3, 1, 1];
                        return (
                          <div key={star} className={styles.ratingBarRow}>
                            <span>{star} Yıldız</span>
                            <div className={styles.barBg}>
                              <div className={styles.barFill} style={{ width: `${percents[idx]}%` }}></div>
                            </div>
                            <span className={styles.barPercent}>%{percents[idx]}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.addReviewBox}>
                      <button className={styles.writeReviewBtn}>Yorum Yaz</button>
                    </div>
                  </div>

                  <div className={styles.reviewsList}>
                    {[1, 2, 3].map((rev) => (
                      <div key={rev} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewerInfo}>
                            <div className={styles.reviewerAvatar}>A{rev}</div>
                            <div>
                              <div className={styles.reviewerName}>Ayşe K.</div>
                              <div className={styles.reviewDate}>12 Ağustos 2026</div>
                            </div>
                          </div>
                          <div className={styles.reviewStars}>
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                          </div>
                        </div>
                        <p className={styles.reviewText}>
                          Ürün gerçekten harika! İlk kullanımda bile etkisini fark ettim. Kesinlikle tekrar alacağım. Kargo da çok hızlıydı, ertesi gün elime ulaştı. Teşekkürler!
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'qa' && (
                <div className={styles.qaContainer}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>Soru ve Cevaplar</h3>
                    <button className={styles.askNewQuestionBtn}>Soru Sor</button>
                  </div>

                  <div className={styles.qaList}>
                    {[1, 2].map((qa) => (
                      <div key={qa} className={styles.qaCardSimple}>
                        <div className={styles.qaQuestionSimple}>
                          <div className={styles.qaBadgeQ}>S</div>
                          <div className={styles.qaTextWrapper}>
                            <p className={styles.qaTextStrong}>Hangi cilt tipleri için uygundur? Hassas ciltler kullanabilir mi?</p>
                            <span className={styles.qaDateSimple}>Müşteri - 05 Ağustos 2026</span>
                          </div>
                        </div>
                        
                        <div className={styles.qaAnswerSimple}>
                          <div className={styles.qaBadgeA}>C</div>
                          <div className={styles.qaTextWrapper}>
                            <p className={styles.qaTextLight}>Merhaba, ürünümüz tüm cilt tipleri için formüle edilmiştir. Hassas ciltler üzerinde dermatolojik olarak test edilmiştir, güvenle kullanabilirsiniz.</p>
                            <span className={styles.qaDateSimple}>Satıcı - 06 Ağustos 2026</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {isImageModalOpen && (
        <div className={styles.imageModalOverlay} onClick={() => setIsImageModalOpen(false)}>
          <div className={styles.imageModalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.imageModalClose} onClick={() => setIsImageModalOpen(false)}>
              <X size={32} />
            </button>
            {images.length > 1 && (
              <button className={`${styles.modalNavArrow} ${styles.prevBtn}`} onClick={prevImage}>
                <ChevronLeft size={48} />
              </button>
            )}
            <img src={images[mainImageIndex]} alt={product.ProductName} className={styles.imageModalImage} />
            {images.length > 1 && (
              <button className={`${styles.modalNavArrow} ${styles.nextBtn}`} onClick={nextImage}>
                <ChevronRight size={48} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;




