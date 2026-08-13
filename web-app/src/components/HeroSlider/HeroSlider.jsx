// -----------------------------------------------------------------------------
// Bileşen Adı: Ana Kayan Vitrin (Slider)
// Açıklama: Ana sayfadaki büyük kayan görsel kampanyaları ve öne çıkan duyuruları gösterir.
// -----------------------------------------------------------------------------
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import styles from './HeroSlider.module.css';

const slides = [
  {
    id: 1,
    title: 'Doğal içerikli\ncilt bakım ürünleri',
    subtitle: 'Sağlıklı ve ışıl ışıl bir cilt için doğadan gelen bakım.',
    buttonText: 'Alışverişe Başla',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #e8f4f0 0%, #d4ece6 50%, #c8e6dd 100%)'
  },
  {
    id: 2,
    title: 'Güneşin Zararlı\nEtkilerinden Korunun',
    subtitle: 'Yaz aylarına özel 50+ SPF güneş kremleri.',
    buttonText: 'Hemen İncele',
    image: 'https://images.unsplash.com/photo-1571781926291-c477eb3af50d?q=80&w=600&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #fdf6e3 0%, #fdf0d5 100%)'
  }
];

const HeroSlider = () => {
  // 1. State Tanımlamaları (Durum Yönetimi)
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slider (Vitrin) üzerinde bir sonraki görsele/kampanyaya geçiş yapar
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  // Slider (Vitrin) üzerinde bir önceki görsele/kampanyaya döner
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const slide = slides[currentSlide];
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <div className={`container ${styles.heroSection}`}>
      {/* Main Slider */}
      <div className={styles.heroSliderWrapper}>
        <button className={`${styles.sliderBtn} ${styles.prevBtn}`} onClick={prevSlide}>
          <ChevronLeft size={20} />
        </button>
        
        <div className={styles.heroSlider} style={{ background: slide.gradient }}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              {slide.title.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i === 0 && <br />}
                </React.Fragment>
              ))}
            </h1>
            <p className={styles.heroSubtitle}>{slide.subtitle}</p>
            <button className={styles.heroButton}>
              {slide.buttonText} <ArrowRight size={16} />
            </button>
          </div>
          
          <div className={styles.heroImageContainer}>
            <img src={slide.image} alt="Ürünler" className={styles.heroImage} />
          </div>
        </div>

        <button className={`${styles.sliderBtn} ${styles.nextBtn}`} onClick={nextSlide}>
          <ChevronRight size={20} />
        </button>

        <div className={styles.sliderDots}>
          {[0, 1, 2].map((index) => (
            <button 
              key={index} 
              className={`${styles.dot} ${currentSlide === index ? styles.active : ''}`}
              onClick={() => setCurrentSlide(index % slides.length)}
            />
          ))}
        </div>
      </div>

      {/* Side Banners */}
      <div className={styles.sideBanners}>
        <div className={`${styles.sideBanner} ${styles.banner1}`}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerTitle}>Güneşten korun, cildini koru!</div>
            <div className={styles.bannerDesc}>Güneş bakım ürünlerinde özel fırsatlar.</div>
            <a href="#" className={styles.bannerLink}>Ürünleri Keşfet <ArrowRight size={14} /></a>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop" 
            alt="Güneş Kremi" 
            className={styles.bannerImage} 
          />
        </div>
        
        <div className={`${styles.sideBanner} ${styles.banner2}`}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerTitle}>Nemlendiricilerde %20'ye varan indirim!</div>
            <div className={styles.bannerDesc}>Yoğun nem desteği veren formüller.</div>
            <a href="#" className={styles.bannerLink}>Ürünleri Keşfet <ArrowRight size={14} /></a>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=200&auto=format&fit=crop" 
            alt="Nemlendirici" 
            className={styles.bannerImage} 
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSlider;
