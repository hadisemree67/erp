// -----------------------------------------------------------------------------
// Bileşen Adı: Gezinme Çubuğu (Navbar)
// Açıklama: Kategoriler arası geçiş ve site içi temel sayfa bağlantılarını sağlayan yatay menüdür.
// -----------------------------------------------------------------------------
import React, { useState } from 'react';
import { Menu, ChevronUp } from 'lucide-react';
import MegaMenu from '../MegaMenu/MegaMenu';
import styles from './Navbar.module.css';

const Navbar = () => {
  // 1. State Tanımlamaları (Durum Yönetimi)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <div className={styles.navWrapper}>
      <div className={`container ${styles.navContainer}`} onMouseLeave={() => setIsMenuOpen(false)}>
        
        {/* All Categories Button */}
        <div className={styles.categoryBtnWrap} onMouseEnter={() => setIsMenuOpen(true)}>
          <button className={styles.categoryButton}>
            <Menu size={18} />
            <span>Tüm Kategoriler</span>
            <ChevronUp size={16} style={{ marginLeft: 'auto' }} />
          </button>
          
          <MegaMenu isOpen={isMenuOpen} />
        </div>

        {/* Main Navigation Links */}
        <nav className={styles.mainNav}>
          <a href="#" className={styles.navItem}>Markalar</a>
          <a href="#" className={styles.navItem}>Kampanyalar</a>
          <a href="#" className={styles.navItem}>Yeni Ürünler</a>
          <a href="#" className={styles.navItem}>Blog</a>
          <a href="#" className={styles.navItem}>Cilt Analizi</a>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
