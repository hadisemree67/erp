import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import ProfileLayout from './pages/Profile/ProfileLayout';

// Ana uygulama bileşeni, tüm sayfaları ve alt bileşenleri bir araya getirir
function App() {
  return (
    // Uygulamanın en dış sarmalayıcısı (wrapper)
    <div>
      {/* Sitenin üst bilgi alanı ve logo/arama bölümü */}
      <Header />
      {/* Kategoriler ve sayfalar arası yatay gezinme menüsü */}
      <Navbar />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/*" element={<ProfileLayout />} />
      </Routes>
    </div>
  );
}

// App bileşenini uygulamanın diğer kısımlarında kullanılabilmesi için dışa aktarır
export default App;
