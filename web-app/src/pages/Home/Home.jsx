import React from 'react';
import HeroSlider from '../../components/HeroSlider/HeroSlider';
import CategoryIcons from '../../components/CategoryIcons/CategoryIcons';
import InfoBanners from '../../components/InfoBanners/InfoBanners';
import BrandsList from '../../components/BrandsList/BrandsList';
import ProductCarousel from '../../components/ProductCarousel/ProductCarousel';

const Home = () => {
  return (
    <div>
      {/* Öne çıkan kampanyaların gösterildiği geniş kayan vitrin */}
      <HeroSlider />
      {/* Hızlı erişim sağlayan ikonik kategoriler */}
      <CategoryIcons />
      {/* İndirim ve kargo avantajlarını gösteren bilgi afişleri */}
      <InfoBanners />
      {/* Popüler markaların logolarıyla listelendiği bölüm */}
      <BrandsList />
      {/* Çok satan veya öne çıkan ürünlerin yana kaydırılarak gösterildiği alan */}
      <ProductCarousel />
      
      {/* Sayfanın altında boşluk bırakmak için geçici stil */}
      <div style={{ height: '100px' }}></div>
    </div>
  );
};

export default Home;
