/**
 * ============================================================================
 * BİLEŞEN ADI: MainLayout
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header/Header';
import Navbar from '../components/Navbar/Navbar';
import styles from './MainLayout.module.css';

const MainLayout = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Eğer en üstte isek veya yukarı kaydırıyorsak göster
      if (currentScrollY < 150) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true); // Yukarı kaydırıyor
      } else if (currentScrollY > lastScrollY && currentScrollY > 150) {
        setIsVisible(false); // Aşağı kaydırıyor
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div>
      {/* Sitenin üst bilgi alanı ve logo/arama bölümü */}
      <div className={`${styles.stickyWrapper} ${isVisible ? styles.stickyVisible : styles.stickyHidden}`}>
        <Header />
        <Navbar />
      </div>

      {/* Alt sayfa içeriklerinin yükleneceği alan (Outlet) */}
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;


