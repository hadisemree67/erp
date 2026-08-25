/**
 * ============================================================================
 * BİLEŞEN ADI: BlogPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   E-ticaret sitesi blog yazılarını ve içeriklerini gösteren sayfa.
 * ============================================================================
 */
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './BlogPage.module.css';

const BlogPage = () => {
  const posts = [
    {
      id: 1,
      title: 'Kış Aylarında Cilt Bakım Rutini Nasıl Olmalı?',
      excerpt: 'Soğuk havalarda kuruyan ve çatlayan cildinizi korumak için uygulayabileceğiniz 5 altın kuralı derledik.',
      image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600&auto=format&fit=crop',
      category: 'Cilt Bakımı',
      date: '12 Aralık 2026',
    },
    {
      id: 2,
      title: 'Doğal Makyajın Sırları: Yokmuş Gibi Görünmek',
      excerpt: 'Günlük hayatta abartıdan uzak, doğal ve ışıltılı bir cilt görünümü elde etmenin püf noktaları.',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=600&auto=format&fit=crop',
      category: 'Makyaj',
      date: '05 Aralık 2026',
    },
    {
      id: 3,
      title: 'Güneş Kremi Sadece Yazın Mı Kullanılır?',
      excerpt: 'UV ışınlarının cildimize etkileri ve neden kışın da güneş kremi kullanmamız gerektiğine dair her şey.',
      image: 'https://images.unsplash.com/photo-1556228720-192a6af4e865?q=80&w=600&auto=format&fit=crop',
      category: 'Sağlık',
      date: '28 Kasım 2026',
    },
    {
      id: 4,
      title: 'Hangi Serum Hangi Cilt Tipine Uygun?',
      excerpt: 'Hyaluronik asit, C vitamini, Niasinamid... Cilt tipinize ve ihtiyacınıza en uygun serumu seçme rehberi.',
      image: 'https://images.unsplash.com/photo-1617897903246-719242758050?q=80&w=600&auto=format&fit=crop',
      category: 'Rehber',
      date: '15 Kasım 2026',
    }
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Güzellik & Bakım Blogu</h1>
        <p className={styles.subtitle}>En güncel trendler, uzman tavsiyeleri ve bakım sırları.</p>
      </div>

      <div className={styles.grid}>
        {posts.map(post => (
          <article key={post.id} className={styles.card}>
            <div className={styles.imageWrapper}>
              <img src={post.image} alt={post.title} className={styles.image} />
              <span className={styles.category}>{post.category}</span>
            </div>
            <div className={styles.content}>
              <div className={styles.date}>{post.date}</div>
              <h2 className={styles.cardTitle}>{post.title}</h2>
              <p className={styles.excerpt}>{post.excerpt}</p>
              <button className={styles.readMore}>Devamını Oku →</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default BlogPage;


