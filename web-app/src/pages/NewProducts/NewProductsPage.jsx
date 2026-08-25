/**
 * ============================================================================
 * BİLEŞEN ADI: NewProductsPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Sisteme yeni eklenen ürünleri vitrinde listeleyen sayfa.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import styles from './NewProductsPage.module.css';

const API_BASE = 'http://localhost:3000';

const NewProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // API'den tüm ürünleri çek
      const res = await fetch(`${API_BASE}/api/products/public`);
      const data = await res.json();
      if (data.success) {
        // Yeni ürünler simülasyonu: En son eklenenleri (Id'si en büyük olanları) veya sadece rastgele 12 tanesini gösterelim
        // Gerçekte API'de "sort=newest" parametresi olmalı.
        const sorted = data.data.sort((a, b) => b.Id - a.Id).slice(0, 20);
        setProducts(sorted);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product) => {
    if (product.AvailableStock <= 0) return;
    setAddingId(product.Id);
    const res = await addToCart(product, 1);
    setAddingId(null);
    if (res.success) {
      setProducts(prev => prev.map(p =>
        p.Id === product.Id ? { ...p, AvailableStock: p.AvailableStock - 1 } : p
      ));
    }
  };

  const getImg = (url) => {
    if (!url) return 'https://via.placeholder.com/300x300?text=Görsel+Yok';
    return url.startsWith('http') ? url : `${API_BASE}${url}`;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>✨ Yeni Gelenler</h1>
        <p className={styles.subtitle}>En son trendler ve yepyeni formüllerle tanışın.</p>
      </div>

      {loading ? (
        <div className={styles.loading}>Yükleniyor...</div>
      ) : (
        <div className={styles.productGrid}>
          {products.map(product => {
            let mainImage = 'https://via.placeholder.com/300x300?text=Görsel+Yok';
            if (product.images && product.images.length > 0) {
              const imgPath = product.images[0];
              if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
                mainImage = imgPath;
              } else {
                mainImage = `${API_BASE}${imgPath}`;
              }
            } else if (product.ImagePath) {
              const imgPath = product.ImagePath.split(',')[0];
              mainImage = imgPath.startsWith('http') ? imgPath : `${API_BASE}/${imgPath.replace(/^\//, '')}`;
            }

            return (
              <div key={product.Id} className={styles.productCard}>
                <div className={styles.newBadge}>Yeni</div>
                
                {product.AvailableStock <= 0 && (
                  <div style={{ position: 'absolute', top: '14px', left: '60px', background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', zIndex: 10 }}>Tükendi</div>
                )}
                {product.AvailableStock > 0 && product.AvailableStock < 100 && (
                  <div style={{ position: 'absolute', top: '14px', left: '60px', background: '#fef08a', color: '#a16207', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', zIndex: 10 }}>Azalan Stok</div>
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
      )}
    </div>
  );
};

export default NewProductsPage;


