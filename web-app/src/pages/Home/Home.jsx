/**
 * ============================================================================
 * BİLEŞEN ADI: Home
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import HeroSlider from '../../components/HeroSlider/HeroSlider';
import InfoBanners from '../../components/InfoBanners/InfoBanners';
import ProductCarousel from '../../components/ProductCarousel/ProductCarousel';
import CategoryBanners from '../../components/CategoryBanners/CategoryBanners';
import CategoryIcons from '../../components/CategoryIcons/CategoryIcons';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [webCategories, setWebCategories] = useState([]);
  const [categoryBanners, setCategoryBanners] = useState({}); // { category_name: [banner, ...] }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, bannerRes, treeRes] = await Promise.all([
          fetch(import.meta.env.VITE_API_URL + '/api/products/public'),
          fetch(import.meta.env.VITE_API_URL + '/api/web-categories/banners/all'),
          fetch(import.meta.env.VITE_API_URL + '/api/web-categories/tree'),
        ]);

        const prodData = await prodRes.json();
        if (prodData.success) setProducts(prodData.data);
        
        const treeData = await treeRes.json();
        if (Array.isArray(treeData)) setWebCategories(treeData);

        const bannerData = await bannerRes.json();
        if (Array.isArray(bannerData)) {
          // { category_name: [slot1, slot2, slot3] }
          const grouped = {};
          bannerData.forEach(b => {
            if (!grouped[b.category_name]) grouped[b.category_name] = [];
            grouped[b.category_name].push(b);
          });
          setCategoryBanners(grouped);
        }
      } catch (error) {
        console.error('Veri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      {/* Öne çıkan kampanyaların gösterildiği geniş kayan vitrin */}
      <HeroSlider />

      {/* Kategori İkonları (Vitamin dahil) */}
      <CategoryIcons />

      {/* İndirim ve kargo avantajlarını gösteren bilgi afişleri */}
      <InfoBanners />

      {/* Çok satan veya öne çıkan ürünlerin yana kaydırılarak gösterildiği alan */}
      {!loading && products.length > 0 && (
        <>
          <ProductCarousel title="Çok Satan Ürünler" products={products.filter(p => p.is_bestseller === 1 || p.is_bestseller === true)} />

          {/* Her kategori için ayrı bir Carousel — webCategories sırasına (ID) göre */}
          {webCategories.map(cat => {
            const category = cat.name;
            const categoryProducts = products.filter(p => {
              if (p.Category === category) return true;
              if (p.web_categories) {
                try {
                  const wc = typeof p.web_categories === 'string' ? JSON.parse(p.web_categories) : p.web_categories;
                  if (Array.isArray(wc) && wc.includes(category)) return true;
                } catch(e) {}
              }
              return false;
            });
            if (categoryProducts.length === 0) return null;
            const banners = categoryBanners[category] || [];
            return (
              <div key={category}>
                {banners.length > 0 && <CategoryBanners banners={banners} />}
                <ProductCarousel
                  title={`${category} Ürünleri`}
                  products={categoryProducts}
                />
              </div>
            );
          })}
        </>
      )}

      {/* Sayfanın altında boşluk bırakmak için geçici stil */}
      <div style={{ height: '100px' }}></div>
    </div>
  );
};

export default Home;

