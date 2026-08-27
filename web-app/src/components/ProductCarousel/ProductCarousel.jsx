/**
 * ============================================================================
 * BİLEŞEN ADI: ProductCarousel
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web sitesinin çeşitli sayfalarında tekrar kullanılabilen (Reusable) arayüz parçasıdır.
 * ============================================================================
 */
// -----------------------------------------------------------------------------
// Bileşen Adı: Ürün Kaydırıcı (Carousel)
// Açıklama: Yeni ürünler veya çok satanlar gibi ürün vitrinlerini yatay olarak kaydırılabilir şekilde sunar.
// -----------------------------------------------------------------------------
import React from 'react';
import { ArrowRight, Heart, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import styles from './ProductCarousel.module.css';

const ProductCarousel = ({ title = "Ürünler", products = [] }) => {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [addingId, setAddingId] = React.useState(null);
  const [localProducts, setLocalProducts] = React.useState([]);
  const scrollRef = React.useRef(null);
  const isBestsellerSection = title === "Çok Satan Ürünler";

  const handleNext = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const handleAddToCart = async (product) => {
    if (product.AvailableStock <= 0) return;
    setAddingId(product.Id);
    const res = await addToCart(product, 1);
    setAddingId(null);
    if (!res.success) {
        // toast handles error
    } else {
        setLocalProducts(prev => 
            prev.map(p => 
                p.Id === product.Id 
                ? { ...p, AvailableStock: p.AvailableStock - 1 } 
                : p
            )
        );
    }
  };

  // 4. Arayüz (UI) Çizimi ve Render Edilmesi
  return (
    <div className={`container ${styles.carouselWrapper}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>{title}</div>
        <button className={styles.viewAll}>
          Tümünü Gör <ArrowRight size={16} />
        </button>
      </div>
      
      <div className={styles.productGridContainer}>
        {localProducts.length > 5 && (
          <button className={styles.prevBtn} onClick={handlePrev}>
            <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
        <div className={styles.productGrid} ref={scrollRef}>
          {localProducts.map((product) => {
          let mainImage = 'https://via.placeholder.com/300x300?text=Görsel+Yok';
          if (product.images && product.images.length > 0) {
            const imgPath = product.images[0];
            if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
              mainImage = imgPath;
            } else {
              mainImage = `http://localhost:3000${imgPath}`;
            }
          }
            
          return (
            <div key={product.Id} className={`${styles.productCard} ${isBestsellerSection ? styles.bestsellerCard : ''}`}>
              {/* Çok Satan Rozeti */}
              {isBestsellerSection && (
                <div className={styles.bestsellerBadge}>
                  <Star size={12} fill="#fff" stroke="none" style={{ marginRight: '4px' }} /> ÇOK SATAN
                </div>
              )}
              {/* Örnek rozet mantığı */}
              {product.isNew && !isBestsellerSection && (
                <div className={`${styles.badge} ${styles.new}`}>Yeni</div>
              )}
              {product.AvailableStock <= 0 && (
                <div style={{ position: 'absolute', top: product.isNew ? '40px' : '14px', left: '14px', background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>Tükendi</div>
              )}
              {product.AvailableStock > 0 && product.AvailableStock < 100 && (
                <div style={{ position: 'absolute', top: product.isNew ? '40px' : '14px', left: '14px', background: '#fef08a', color: '#a16207', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>Azalan Stok</div>
              )}
              
              <button className={styles.favoriteBtn} onClick={() => toggleFavorite(product)}>
                <Heart size={20} fill={isFavorite(product.Id) ? "#e11d48" : "none"} color={isFavorite(product.Id) ? "#e11d48" : "currentColor"} />
              </button>
              
              <Link to={`/product/${product.Id}`} className={styles.imageLink}>
                <img src={mainImage} alt={product.ProductName} className={styles.productImage} style={{ mixBlendMode: 'multiply' }} />
              </Link>
              
              <div className={styles.productBrand}>{product.Brand || 'Markasız'}</div>
              <Link to={`/product/${product.Id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={styles.productName} title={product.ProductName}>
                  {product.ProductName}
                </div>
              </Link>
              
              <div className={styles.ratingRow}>
                <Star size={14} className={styles.star} fill="currentColor" />
                <span className={styles.ratingCount}>(0)</span>
              </div>
              
              <div className={styles.productPrice}>
                {product.SalePrice ? `${product.SalePrice} TL` : 'Fiyat Yok'}
              </div>

              <button 
                className={styles.addToCartBtn} 
                onClick={() => handleAddToCart(product)}
                disabled={product.AvailableStock <= 0 || addingId === product.Id}
                style={{ opacity: product.AvailableStock <= 0 ? 0.5 : 1, cursor: product.AvailableStock <= 0 ? 'not-allowed' : 'pointer' }}
              >
                {product.AvailableStock <= 0 ? 'TÜKENDİ' : (addingId === product.Id ? 'EKLENİYOR...' : 'SEPETE EKLE')}
              </button>
            </div>
          );
        })}
        </div>
        {localProducts.length > 5 && (
          <button className={styles.nextBtn} onClick={handleNext}>
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCarousel;


