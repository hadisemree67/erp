/**
 * ============================================================================
 * BİLEŞEN ADI: BrandPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Belirli bir markaya ait ürünlerin listelendiği marka vitrini.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Star, ChevronRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import styles from '../Category/CategoryPage.module.css';

const BrandPage = () => {
  const { brandName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [addingId, setAddingId] = React.useState(null);

  const handleAddToCart = async (product) => {
    if (product.AvailableStock <= 0) return;
    setAddingId(product.Id);
    const res = await addToCart(product, 1);
    setAddingId(null);
    if (!res.success) {
        // toast handles error
    } else {
        setProducts(prevProducts => 
            prevProducts.map(p => 
                p.Id === product.Id 
                ? { ...p, AvailableStock: p.AvailableStock - 1 } 
                : p
            )
        );
    }
  };

  useEffect(() => {
    const fetchBrandProducts = async () => {
      setLoading(true);
      try {
        let url = `http://localhost:3000/api/products/public?`;
        const params = new URLSearchParams();
        if (brandName) params.append('brand', brandName);

        const response = await fetch(url + params.toString());
        const data = await response.json();
        if (data.success) {
          setProducts(data.data);
        }
      } catch (error) {
        console.error('Marka ürünleri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrandProducts();
  }, [brandName]);

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link to="/">Ana Sayfa</Link>
        <ChevronRight size={14} />
        <span className={styles.current}>{brandName} Ürünleri</span>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.pageTitle}>
          {brandName}
        </h1>
        <div className={styles.productCount}>
          {products.length} ürün listeleniyor
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Ürünler yükleniyor...</div>
      ) : products.length > 0 ? (
        <div className={styles.productGrid}>
          {products.map((product) => {
            const getImageUrl = (imgPath) => {
              if (!imgPath) return 'https://via.placeholder.com/300x300?text=Görsel+Yok';
              if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
                return imgPath;
              }
              return `http://localhost:3000${imgPath}`;
            };

            const mainImage = product.images && product.images.length > 0
              ? getImageUrl(product.images[0])
              : 'https://via.placeholder.com/300x300?text=Görsel+Yok';

            return (
              <div key={product.Id} className={styles.productCard}>
                {product.AvailableStock <= 0 && (
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>Tükendi</div>
                )}
                {product.AvailableStock > 0 && product.AvailableStock < 100 && (
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#fef08a', color: '#a16207', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>Azalan Stok</div>
                )}
                <button className={styles.favoriteBtn} onClick={() => toggleFavorite(product)}>
                  <Heart size={20} fill={isFavorite(product.Id) ? "#e11d48" : "none"} color={isFavorite(product.Id) ? "#e11d48" : "currentColor"} />
                </button>
                
                <Link to={`/product/${product.Id}`} className={styles.imageLink}>
                  <img src={mainImage} alt={product.ProductName} className={styles.productImage} />
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
      ) : (
        <div className={styles.emptyState}>
          <p>Bu markaya ait henüz ürün bulunmuyor.</p>
          <Link to="/" className={styles.backBtn}>Ana Sayfaya Dön</Link>
        </div>
      )}
    </div>
  );
};

export default BrandPage;


