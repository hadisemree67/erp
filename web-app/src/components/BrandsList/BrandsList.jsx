/**
 * ============================================================================
 * BİLEŞEN ADI: BrandsList
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web sitesinin çeşitli sayfalarında tekrar kullanılabilen (Reusable) arayüz parçasıdır.
 * ============================================================================
 */
// -----------------------------------------------------------------------------
// Bileşen Adı: Marka Listesi
// Açıklama: Ana sayfada veya markalar bölümünde popüler markaları ve logolarını listeler.
// -----------------------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import styles from './BrandsList.module.css';

const BrandsList = () => {
  // 1. State Tanımlamaları (Durum Yönetimi)
  const [brands, setBrands] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  // 2. Yan Etkiler ve Veri Çekme (useEffect)

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + '/api/brands');
        const data = await res.json();
        
        const brandsWithLogos = data.filter(b => b.logo_url);
        setBrands(brandsWithLogos);
      } catch (err) {
        console.error('Failed to fetch brands:', err);
        setBrands([]);
      }
    };
    fetchBrands();
  }, []);
  // 3. Yardımcı Fonksiyonlar (Helper Methods)

  // Markalar listesinde ileri butonuna basıldığında bir sonraki marka grubunu (sayfasını) getirir
  const handleNext = () => {
    if (currentIndex + 6 >= brands.length) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(currentIndex + 6);
    }
  };
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <div className={`container ${styles.brandsSection}`}>
      <div className={styles.brandsBlock}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Popüler Markalar</div>
          {brands.length > 6 && (
            <button className={styles.viewAll} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Daralt' : 'Tümünü Gör'} <ArrowRight size={16} />
            </button>
          )}
        </div>
        <div className={styles.brandsContainer} style={{ flexWrap: showAll ? 'wrap' : 'nowrap' }}>
          {brands.length > 0 ? (
            (showAll ? brands : brands.slice(currentIndex, currentIndex + 6)).map((brand, idx) => {
              const imgSrc = `${import.meta.env.VITE_API_URL}${brand.logo_url}`;
              const altText = brand.name;
              return (
                <Link key={idx} to={`/brand/${encodeURIComponent(brand.name)}`} style={{ textDecoration: 'none' }}>
                  <img src={imgSrc} alt={altText} title={altText} className={styles.brandLogo} />
                </Link>
              );
            })
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '14px', width: '100%', textAlign: 'center' }}>
              Henüz marka logosu yüklenmedi.
            </div>
          )}
          {!showAll && brands.length > 6 && (
            <button className={styles.nextBtn} onClick={handleNext}>
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.campaignsBlock}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Kampanyalar</div>
          <button className={styles.viewAll}>
            Tüm Kampanyalar <ArrowRight size={16} />
          </button>
        </div>
        <div className={styles.campaignBanner}>
          <div className={styles.campaignTitle}>İlk Alışverişine Özel</div>
          <div className={styles.campaignSubtitle}>%10 İndirim!</div>
          <div className={styles.campaignCode}>
            Kodu Kullan: <span>DERM010</span>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1608248593859-994df22a4d33?q=80&w=300&auto=format&fit=crop" 
            alt="Kampanya" 
            className={styles.campaignImage} 
            style={{ mixBlendMode: 'multiply' }}
          />
        </div>
      </div>
    </div>
  );
};

export default BrandsList;


