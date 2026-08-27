/**
 * ============================================================================
 * BİLEŞEN ADI: CategoryBanners
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web sitesinin çeşitli sayfalarında tekrar kullanılabilen (Reusable) arayüz parçasıdır.
 * ============================================================================
 */
/**
 * CategoryBanners - Bir kategorinin üstünde gözüken 3 adet yatay banner bileşeni.
 * Tıklanınca banner'a bağlı markanın ürünler sayfasına gider.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CategoryBanners.module.css';

const API_BASE = import.meta.env.VITE_API_URL;

const CategoryBanners = ({ banners = [] }) => {
  const navigate = useNavigate();

  if (!banners || banners.length === 0) return null;

  // Sadece en fazla 3 banner göster, boş slotlar da dahil
  const slots = [0, 1, 2].map(i => banners[i] || null);

  const handleClick = (banner) => {
    if (banner?.brand_name) {
      if (banner?.category_name) {
        navigate(`/category/${encodeURIComponent(banner.category_name)}?brand=${encodeURIComponent(banner.brand_name)}`);
      } else {
        navigate(`/brand/${encodeURIComponent(banner.brand_name)}`);
      }
    }
  };

  return (
    <div className="container">
      <div className={styles.container}>
        {slots.map((banner, idx) => {
          const hasImage  = !!banner?.image_url;
          const hasBrand  = !!banner?.brand_name;
          const clickable = hasBrand;

          if (!hasImage) {
            return (
              <div key={idx} className={styles.slotEmpty}>
                <span className={styles.emptyIcon}>🖼️</span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`${styles.slot} ${clickable ? styles.clickable : ''}`}
              onClick={() => clickable && handleClick(banner)}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && clickable && handleClick(banner)}
            >
              <img
                src={`${API_BASE}${banner.image_url}`}
                alt={banner.brand_name || `Banner ${idx + 1}`}
                className={styles.image}
              />
              {hasBrand && (
                <div className={styles.overlay}>
                  <span className={styles.brandChip}>{banner.brand_name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryBanners;


