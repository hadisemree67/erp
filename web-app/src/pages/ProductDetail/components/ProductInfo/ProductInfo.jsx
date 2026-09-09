import React from 'react';
import { Star, Minus, Plus, ShoppingCart, Heart, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import styles from './ProductInfo.module.css';

const ProductInfo = ({
  product,
  salePrice,
  oldPrice,
  discountPercent,
  quantity,
  handleDecrease,
  handleIncrease,
  handleAddToCart,
  isAdding,
  toggleFavorite,
  isFavorite,
  reviewsData,
  onScrollToReviews
}) => {
  const avgRating = Number(reviewsData?.stats?.averageRating) || 0;
  const totalReviews = Number(reviewsData?.stats?.totalReviews) || 0;

  return (
    <div className={styles.productInfoWrapper}>
      <div className={styles.brandName}>{product.Brand || 'Markasız'}</div>
      <h1 className={styles.productTitle}>
        {product.ProductName}
        {product.AvailableStock <= 0 && <span className={styles.outOfStockBadge}>Tükendi</span>}
        {product.AvailableStock > 0 && product.AvailableStock < 100 && (
          <span className={styles.lowStockBadge}>Azalan Stok</span>
        )}
      </h1>

      <div 
        className={styles.ratingRow}
        style={{ cursor: onScrollToReviews ? 'pointer' : 'default', userSelect: 'none' }}
        onClick={onScrollToReviews}
        title="Yorumları gör"
      >
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              fill={star <= Math.round(avgRating) ? '#f59e0b' : '#e2e8f0'}
              color={star <= Math.round(avgRating) ? '#f59e0b' : '#e2e8f0'}
            />
          ))}
        </div>
        <span className={styles.reviewCount}>
          {avgRating > 0 ? `${avgRating.toFixed(1)} (${totalReviews} Değerlendirme)` : `(${totalReviews} Değerlendirme)`}
        </span>
      </div>

      <div className={styles.barcodeRow}>
        <div>
          Ürün Barkodu :{' '}
          <span className={styles.barcodeValue}>
            {product.Barcode && product.Barcode.length > 0
              ? Array.isArray(product.Barcode)
                ? product.Barcode[0]
                : typeof product.Barcode === 'string'
                ? (() => {
                    try {
                      return JSON.parse(product.Barcode)[0];
                    } catch (e) {
                      return product.Barcode;
                    }
                  })()
                : 'Yok'
              : 'Yok'}
          </span>
        </div>
        <div>
          Ürün Kodu : <span className={styles.barcodeValue}>{product.ProductCode || 'Yok'}</span>
        </div>
      </div>

      {/* Öne Çıkan Bilgiler Kutusu (Kullanıcı İsteği) */}
      {product.FeaturedFeatures &&
        (() => {
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
          } catch (e) {
            features = [];
          }

          if (
            Array.isArray(features) &&
            features.length === 1 &&
            typeof features[0] === 'string' &&
            features[0].includes('\n')
          ) {
            features = features[0].split('\n');
          }

          features = features.filter((f) => f && f.trim());
          if (!Array.isArray(features) || features.length === 0) return null;

          return (
            <div className={styles.featuredFeaturesBox}>
              <div className={styles.featuredFeaturesHeader}>Öne Çıkan Bilgiler</div>
              <ul className={styles.featuredFeaturesList}>
                {features.map((feat, i) => (
                  <li key={i} className={styles.featuredFeatureItem}>
                    {feat}
                  </li>
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
          <button onClick={handleDecrease} disabled={product.AvailableStock <= 0}>
            <Minus size={16} />
          </button>
          <span>{quantity}</span>
          <button
            onClick={handleIncrease}
            disabled={product.AvailableStock <= 0 || quantity >= product.AvailableStock}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          className={`${styles.addToCartBtn} ${product.AvailableStock <= 0 ? styles.disabledBtn : ''}`}
          onClick={handleAddToCart}
          disabled={product.AvailableStock <= 0 || isAdding}
        >
          <ShoppingCart size={18} />{' '}
          {product.AvailableStock <= 0 ? 'TÜKENDİ' : isAdding ? 'EKLENİYOR...' : 'SEPETE EKLE'}
        </button>
        <button className={styles.favoriteBtn} onClick={() => toggleFavorite(product)}>
          <Heart
            size={20}
            fill={isFavorite(product.Id) ? '#e11d48' : 'none'}
            color={isFavorite(product.Id) ? '#e11d48' : 'currentColor'}
          />
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
  );
};

export default ProductInfo;
