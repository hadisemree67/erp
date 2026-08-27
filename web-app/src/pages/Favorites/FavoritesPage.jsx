/**
 * ============================================================================
 * BİLEŞEN ADI: FavoritesPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Kullanıcının favoriye/beğenilere eklediği ürünleri listeleyen sayfa.
 * ============================================================================
 */
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { Star, Eye, Trash2, ShieldCheck, Lock, Truck, RotateCcw } from 'lucide-react';
import styles from './FavoritesPage.module.css';

const FavoritesPage = () => {
    const { favorites, removeFavorite, clearFavorites, favoritesCount } = useFavorites();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const isProfile = location.pathname.includes('/profile');

    const handleAddToCart = async (product) => {
        if (product.AvailableStock <= 0) return;
        const res = await addToCart(product, 1);
        if (!res.success) {
            // toast will handle the error message
        }
    };

    if (favorites.length === 0) {
        return (
            <div className={styles.emptyContainer}>
                <div className={styles.emptyIcon}>❤️</div>
                <h2>Favorilerinizde henüz ürün yok</h2>
                <p>Beğendiğiniz ürünleri favorilere ekleyerek daha sonra kolayca bulabilirsiniz.</p>
                <button className={styles.continueShoppingBtn} onClick={() => navigate('/')}>
                    ALIŞVERİŞE BAŞLA
                </button>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Favorilerim <span className={styles.itemCount}>({favoritesCount} Ürün)</span></h1>
                <button className={styles.clearAllBtn} onClick={clearFavorites}>
                    <Trash2 size={16} /> Tümünü Temizle
                </button>
            </div>

            <div className={isProfile ? styles.gridProfile : styles.grid}>
                {favorites.map((product) => {
                    let imagePath = '';
                    if (product.ImagePath) {
                        try {
                            const parsed = JSON.parse(product.ImagePath);
                            imagePath = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
                        } catch (e) {
                            imagePath = product.ImagePath;
                        }
                    } else if (product.images && product.images.length > 0) {
                        imagePath = product.images[0];
                    }
                    
                    const imgSrc = imagePath ? (imagePath.startsWith('http') ? imagePath : `${import.meta.env.VITE_API_URL}${imagePath}`) : '/placeholder-image.png';
                    const oldPrice = parseFloat(product.SalePrice) * 1.2; // Görsel amaçlı

                    return (
                        <div key={product.Id} className={styles.card}>
                            <button className={styles.favoriteBtn} onClick={() => removeFavorite(product.Id)}>
                                <HeartFilled />
                            </button>
                            
                            <Link to={`/product/${product.Id}`} className={styles.imageLink}>
                                <img src={imgSrc} alt={product.ProductName} className={styles.productImage} />
                            </Link>

                            <div className={styles.productInfo}>
                                <div className={styles.brandTitle}>{product.Brand || 'Markasız'}</div>
                                <Link to={`/product/${product.Id}`} className={styles.productNameLink}>
                                    <h3 className={styles.productName}>{product.ProductName}</h3>
                                </Link>
                                
                                {product.Volume && (
                                    <div className={styles.volumeText}>{product.Volume} {product.unit_type === 'Litre' ? 'L' : 'ml'}</div>
                                )}
                                
                                <div className={styles.ratingRow}>
                                    <div className={styles.stars}>
                                        <Star size={12} fill="#fbbf24" color="#fbbf24" />
                                        <Star size={12} fill="#fbbf24" color="#fbbf24" />
                                        <Star size={12} fill="#fbbf24" color="#fbbf24" />
                                        <Star size={12} fill="#fbbf24" color="#fbbf24" />
                                        <Star size={12} fill="#fbbf24" color="#fbbf24" />
                                    </div>
                                    <span className={styles.ratingCount}>(128)</span>
                                </div>

                                <div className={styles.priceRow}>
                                    <span className={styles.currentPrice}>{Number(product.SalePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                    <span className={styles.oldPrice}>{Number(oldPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                </div>
                            </div>

                            <div className={styles.actionRow}>
                                <button 
                                    className={styles.addCartBtn} 
                                    onClick={() => handleAddToCart(product)}
                                    disabled={product.AvailableStock <= 0}
                                    style={{ opacity: product.AvailableStock <= 0 ? 0.5 : 1 }}
                                >
                                    {product.AvailableStock <= 0 ? 'TÜKENDİ' : 'SEPETE EKLE'}
                                </button>
                                <button className={styles.iconBtn} onClick={() => navigate(`/product/${product.Id}`)}>
                                    <Eye size={18} />
                                </button>
                                <button className={styles.iconBtn} onClick={() => removeFavorite(product.Id)}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={styles.trustBanners}>
                <div className={styles.trustItem}>
                    <Truck className={styles.trustIcon} />
                    <span>2000 TL ve üzeri<br/>kargo ücretsiz</span>
                </div>
                <div className={styles.trustItem}>
                    <RotateCcw className={styles.trustIcon} />
                    <span>14 gün içinde<br/>iade</span>
                </div>
                <div className={styles.trustItem}>
                    <ShieldCheck className={styles.trustIcon} />
                    <span>Orijinal ürün<br/>garantisi</span>
                </div>
                <div className={styles.trustItem}>
                    <Lock className={styles.trustIcon} />
                    <span>Güvenli<br/>ödeme</span>
                </div>
            </div>
        </div>
    );
};

const HeartFilled = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#e11d48" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
    </svg>
);

export default FavoritesPage;


