// -----------------------------------------------------------------------------
// Bileşen Adı: Ürün Kaydırıcı (Carousel)
// Açıklama: Yeni ürünler veya çok satanlar gibi ürün vitrinlerini yatay olarak kaydırılabilir şekilde sunar.
// -----------------------------------------------------------------------------
import React from 'react';
import { ArrowRight, Heart, Star } from 'lucide-react';
import styles from './ProductCarousel.module.css';

const products = [
  {
    id: 1,
    brand: 'La Roche-Posay',
    name: 'Effaclar Yüz Yıkama Jeli 400 ml',
    price: '499,90 TL',
    oldPrice: '599,90 TL',
    rating: 4.8,
    reviews: 1245,
    badge: '%20',
    badgeType: 'discount',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=100&w=800&auto=format&fit=crop'
  },
  {
    id: 2,
    brand: 'Cerave',
    name: 'Nemlendirici Krem 340 gr',
    price: '349,90 TL',
    rating: 4.9,
    reviews: 856,
    badge: 'Yeni',
    badgeType: 'new',
    image: 'https://images.unsplash.com/photo-1617897903246-719242758050?q=100&w=800&auto=format&fit=crop'
  },
  {
    id: 3,
    brand: 'Vichy',
    name: 'Mineral 89 Probiyotik Serum 30 ml',
    price: '899,90 TL',
    rating: 4.7,
    reviews: 432,
    image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=100&w=800&auto=format&fit=crop'
  },
  {
    id: 4,
    brand: 'Bioderma',
    name: 'Sensibio H2O Micellar Su 500 ml',
    price: '299,90 TL',
    oldPrice: '349,90 TL',
    rating: 4.9,
    reviews: 2150,
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=100&w=800&auto=format&fit=crop'
  }
];

const ProductCarousel = () => {
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi
  return (
    <div className={`container ${styles.carouselWrapper}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Çok Satan Ürünler</div>
        <button className={styles.viewAll}>
          Tümünü Gör <ArrowRight size={16} />
        </button>
      </div>
      
      <div className={styles.productGrid}>
        {products.map((product) => (
          <div key={product.id} className={styles.productCard}>
            {product.badge && (
              <div className={`${styles.badge} ${styles[product.badgeType]}`}>
                {product.badge}
              </div>
            )}
            
            <button className={styles.favoriteBtn}>
              <Heart size={20} />
            </button>
            
            <img src={product.image} alt={product.name} className={styles.productImage} style={{ mixBlendMode: 'multiply' }} />
            
            <div className={styles.productBrand}>{product.brand}</div>
            <div className={styles.productName}>{product.name}</div>
            
            <div className={styles.ratingRow}>
              <Star size={14} className={styles.star} fill="currentColor" />
              <span className={styles.ratingCount}>({product.reviews})</span>
            </div>
            
            <div className={styles.productPrice}>
              {product.price}
              {product.oldPrice && <span className={styles.oldPrice}>{product.oldPrice}</span>}
            </div>

            <button className={styles.addToCartBtn}>Sepete Ekle</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel;
