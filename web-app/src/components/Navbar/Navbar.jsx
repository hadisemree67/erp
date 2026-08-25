/**
 * ============================================================================
 * BİLEŞEN ADI: Navbar
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web sitesinin çeşitli sayfalarında tekrar kullanılabilen (Reusable) arayüz parçasıdır.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { Menu, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import MegaMenu from '../MegaMenu/MegaMenu';
import styles from './Navbar.module.css';

const Navbar = () => {
  // 1. State Tanımlamaları (Durum Yönetimi)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandSearch, setBrandSearch] = useState('');

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/brands');
        const data = await response.json();
        if (Array.isArray(data)) {
          setBrands(data);
        }
      } catch (error) {
        console.error('Markalar yüklenirken hata:', error);
      }
    };
    fetchBrands();
  }, []);

  // 4. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <div className={styles.navWrapper}>
      <div className={`container ${styles.navContainer}`} onMouseLeave={() => setIsMenuOpen(false)}>
        
        {/* All Categories Button */}
        <div className={styles.categoryBtnWrap} onMouseEnter={() => setIsMenuOpen(true)}>
          <button className={styles.categoryButton}>
            <Menu size={18} />
            <span>Tüm Kategoriler</span>
            <ChevronUp size={16} style={{ marginLeft: 'auto', transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
          
          <MegaMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>

        {/* Main Navigation Links */}
        <nav className={styles.mainNav}>
          <div className={styles.brandsWrapper}>
            <a href="#" className={styles.navItem} onClick={(e) => e.preventDefault()}>Markalar</a>
            
            {brands.length > 0 && (
              <div className={styles.brandsDropdown}>
                <div style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Marka Ara..." 
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      outline: 'none',
                      fontSize: '14px',
                      backgroundColor: '#f8fafc'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {brands.filter(b => (b.name || '').toLowerCase().includes(brandSearch.toLowerCase())).map(brand => (
                  <Link to={`/brand/${encodeURIComponent(brand.name)}`} key={brand.id} className={styles.brandItem}>
                    {brand.logo_url ? (
                      <img src={`http://localhost:3000${brand.logo_url}`} alt={brand.name} className={styles.brandLogo} />
                    ) : (
                      <div className={styles.brandLogo} style={{ backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Logo Yok</span>
                      </div>
                    )}
                    <span className={styles.brandName}>{brand.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/kampanyalar" className={styles.navItem}>Kampanyalar</Link>
          <Link to="/yeni-urunler" className={styles.navItem}>Yeni Ürünler</Link>
          <Link to="/blog" className={styles.navItem}>Blog</Link>
          <Link to="/cilt-analizi" className={styles.navItem}>Cilt Analizi</Link>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;

