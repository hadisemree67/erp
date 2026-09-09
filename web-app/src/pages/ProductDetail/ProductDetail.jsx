import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import styles from './ProductDetail.module.css';

import ProductGallery from './components/ProductGallery/ProductGallery';
import ProductInfo from './components/ProductInfo/ProductInfo';
import ProductTabs from './components/ProductTabs/ProductTabs';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [reviewsData, setReviewsData] = useState(null);
  const [activeTab, setActiveTab] = useState('features');
  const tabsRef = useRef(null);

  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products/public/${id}/reviews`);
      const data = await response.json();
      if (data.success && data.data) {
        setReviewsData(data.data);
      }
    } catch (error) {
      console.error('Yorumlar yüklenirken hata:', error);
    }
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
    fetchReviews();
  }, [id]);

  const handleScrollToReviews = () => {
    setActiveTab('reviews');
    if (tabsRef.current) {
      tabsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

  const images =
    product.images && product.images.length > 0
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
    if (res.success) {
      setProduct((prev) => ({ ...prev, AvailableStock: prev.AvailableStock - quantity }));
    }
  };

  const salePrice = parseFloat(product.SalePrice) || 0;
  const oldPrice = salePrice * 1.2;
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
              <Link to={`/category/${encodeURIComponent(product.web_categories[0])}`}>
                {product.web_categories[0]}
              </Link>
              <ChevronRight size={14} />
            </>
          ) : (
            <>
              <Link to={`/category/${encodeURIComponent(product.Category || '')}`}>
                {product.Category || 'Kategori Yok'}
              </Link>
              <ChevronRight size={14} />
            </>
          )}

          {product.web_subcategories && product.web_subcategories[0] && (
            <>
              <Link
                to={`/category/${encodeURIComponent(product.web_categories[0])}/${encodeURIComponent(
                  product.web_subcategories[0]
                )}`}
              >
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
          <ProductGallery
            images={images}
            productName={product.ProductName}
            mainImageIndex={mainImageIndex}
            setMainImageIndex={setMainImageIndex}
            isImageModalOpen={isImageModalOpen}
            setIsImageModalOpen={setIsImageModalOpen}
          />
          <ProductInfo
            product={product}
            salePrice={salePrice}
            oldPrice={oldPrice}
            discountPercent={discountPercent}
            quantity={quantity}
            handleDecrease={handleDecrease}
            handleIncrease={handleIncrease}
            handleAddToCart={handleAddToCart}
            isAdding={isAdding}
            toggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
            reviewsData={reviewsData}
            onScrollToReviews={handleScrollToReviews}
          />
        </div>

        {/* Bottom Section */}
        <div className={styles.bottomSection} ref={tabsRef}>
          <ProductTabs
            product={product}
            images={images}
            mainImageIndex={mainImageIndex}
            setMainImageIndex={setMainImageIndex}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            reviewsData={reviewsData}
            onReviewSubmitted={fetchReviews}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
