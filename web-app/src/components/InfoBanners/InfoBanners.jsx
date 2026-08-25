/**
 * ============================================================================
 * BİLEŞEN ADI: InfoBanners
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web sitesinin çeşitli sayfalarında tekrar kullanılabilen (Reusable) arayüz parçasıdır.
 * ============================================================================
 */
// -----------------------------------------------------------------------------
// Bileşen Adı: Bilgi Afişleri (Banners)
// Açıklama: Kullanıcılara ücretsiz kargo, indirim veya güvenli alışveriş gibi fırsatları sunan afişlerdir.
// -----------------------------------------------------------------------------
import React from 'react';
import { Truck, CheckCircle, CreditCard, Clock } from 'lucide-react';
import styles from './InfoBanners.module.css';

const banners = [
  {
    title: 'Ücretsiz Kargo',
    desc: '750 TL ve üzeri siparişlerde',
    icon: <Truck size={24} strokeWidth={1.5} />
  },
  {
    title: '%100 Orijinal Ürün',
    desc: 'Tüm ürünlerimiz orijinal ve güvenilirdir.',
    icon: <CheckCircle size={24} strokeWidth={1.5} />
  },
  {
    title: 'Güvenli Ödeme',
    desc: '256-bit SSL ile güvenli ödeme.',
    icon: <CreditCard size={24} strokeWidth={1.5} />
  },
  {
    title: 'Hızlı Teslimat',
    desc: 'Siparişleriniz en hızlı şekilde kapınızda.',
    icon: <Clock size={24} strokeWidth={1.5} />
  }
];

const InfoBanners = () => {
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi
  return (
    <div className={`container ${styles.bannersWrapper}`}>
      {banners.map((banner, index) => (
        <div key={index} className={styles.bannerItem}>
          <div className={styles.bannerIcon}>
            {banner.icon}
          </div>
          <div className={styles.bannerText}>
            <div className={styles.bannerTitle}>{banner.title}</div>
            <div className={styles.bannerDesc}>{banner.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InfoBanners;


