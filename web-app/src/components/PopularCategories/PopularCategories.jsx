// -----------------------------------------------------------------------------
// Bileşen Adı: Popüler Kategoriler
// Açıklama: Kullanıcıların en çok ziyaret ettiği ürün kategorilerini ana sayfada öne çıkarır.
// -----------------------------------------------------------------------------
import React from 'react';
import styles from './PopularCategories.module.css';

const categories = [
  {
    title: 'Cilt Bakımı',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=300&auto=format&fit=crop'
  },
  {
    title: 'Güneş Ürünleri',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=300&auto=format&fit=crop'
  },
  {
    title: 'Parfüm',
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=300&auto=format&fit=crop'
  },
  {
    title: 'Anne & Bebek',
    image: 'https://images.unsplash.com/photo-1608248593859-994df22a4d33?q=80&w=300&auto=format&fit=crop'
  },
  {
    title: 'Kişisel Bakım',
    image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=300&auto=format&fit=crop'
  }
];

const PopularCategories = () => {
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi
  return (
    <div className={`container ${styles.categoriesSection}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Popüler Kategoriler</div>
      </div>
      
      <div className={styles.grid}>
        {categories.map((cat, index) => (
          <div key={index} className={styles.card}>
            <img src={cat.image} alt={cat.title} className={styles.cardImage} />
            {/* <div className={styles.cardTitle}>{cat.title}</div> */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularCategories;
