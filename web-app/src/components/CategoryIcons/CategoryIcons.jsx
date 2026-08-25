/**
 * ============================================================================
 * BİLEŞEN ADI: CategoryIcons
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web sitesinin çeşitli sayfalarında tekrar kullanılabilen (Reusable) arayüz parçasıdır.
 * ============================================================================
 */
// -----------------------------------------------------------------------------
// Bileşen Adı: Kategori İkonları
// Açıklama: Ana sayfada kategorileri ikonik ve görsel olarak hızlı erişim için sunar.
// -----------------------------------------------------------------------------
import React from 'react';
import { Link } from 'react-router-dom';
import { Smile, Wind, User, Sparkles, Droplet, Heart, Stethoscope, ShieldCheck, Scissors, UserCheck, Grid } from 'lucide-react';
import styles from './CategoryIcons.module.css';

const categories = [
  { name: 'Cilt Bakımı', icon: <Smile size={28} strokeWidth={1.2} /> },
  { name: 'Saç Bakımı', icon: <Wind size={28} strokeWidth={1.2} /> },
  { name: 'Vücut Bakımı', icon: <User size={28} strokeWidth={1.2} /> },
  { name: 'Makyaj', icon: <Sparkles size={28} strokeWidth={1.2} /> },
  { name: 'Parfüm', icon: <Droplet size={28} strokeWidth={1.2} /> },
  { name: 'Anne & Bebek', icon: <Heart size={28} strokeWidth={1.2} /> },
  { name: 'Ağız & Diş Bakımı', icon: <Smile size={28} strokeWidth={1.2} /> },
  { name: 'Sağlık / Takviye', icon: <ShieldCheck size={28} strokeWidth={1.2} /> },
  { name: 'Kişisel Bakım', icon: <Scissors size={28} strokeWidth={1.2} /> },
  { name: 'Erkek Bakım', icon: <UserCheck size={28} strokeWidth={1.2} /> },
  { name: 'Doğal & Organik', icon: <Stethoscope size={28} strokeWidth={1.2} /> },
  { name: 'Tüm Kategoriler', icon: <Grid size={28} strokeWidth={1.2} />, isAll: true }
];

const CategoryIcons = () => {
  return (
    <div className={`container ${styles.iconsWrapper}`}>
      {categories.map((cat, index) => {
        const isLast = index === categories.length - 1;
        const linkPath = cat.isAll ? '/' : `/category/${encodeURIComponent(cat.name)}`;
        
        return (
          <Link key={index} to={linkPath} className={styles.iconItem} style={{ textDecoration: 'none' }}>
            <div className={`${styles.iconCircle} ${isLast ? styles.iconSquare : ''}`}>
              {cat.icon}
            </div>
            <span className={styles.iconTitle}>{cat.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default CategoryIcons;


