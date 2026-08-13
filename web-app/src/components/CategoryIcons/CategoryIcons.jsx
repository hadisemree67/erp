// -----------------------------------------------------------------------------
// Bileşen Adı: Kategori İkonları
// Açıklama: Ana sayfada kategorileri ikonik ve görsel olarak hızlı erişim için sunar.
// -----------------------------------------------------------------------------
import React from 'react';
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
  { name: 'Sağlık Ürünleri', icon: <ShieldCheck size={28} strokeWidth={1.2} /> },
  { name: 'Kişisel Bakım', icon: <Scissors size={28} strokeWidth={1.2} /> },
  { name: 'Erkek Bakım', icon: <UserCheck size={28} strokeWidth={1.2} /> },
  { name: 'Tüm Kategoriler', icon: <Grid size={28} strokeWidth={1.2} /> }
];

const CategoryIcons = () => {
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi
  return (
    <div className={`container ${styles.iconsWrapper}`}>
      {categories.map((cat, index) => {
        const isLast = index === categories.length - 1;
        return (
          <div key={index} className={styles.iconItem}>
            <div className={`${styles.iconCircle} ${isLast ? styles.iconSquare : ''}`}>
              {cat.icon}
            </div>
            <span className={styles.iconTitle}>{cat.name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryIcons;
