/**
 * ============================================================================
 * BİLEŞEN ADI: App
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import CategoryPage from './pages/Category/CategoryPage';
import SearchPage from './pages/Search/SearchPage';
import BrandPage from './pages/Brand/BrandPage';
import ProfileLayout from './pages/Profile/ProfileLayout';
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import FavoritesPage from './pages/Favorites/FavoritesPage';
import CartPage from './pages/Cart/CartPage';
import CheckoutPage from './pages/Checkout/CheckoutPage';
import CampaignsPage from './pages/Campaigns/CampaignsPage';
import NewProductsPage from './pages/NewProducts/NewProductsPage';
import BlogPage from './pages/Blog/BlogPage';
import SkinAnalysisPage from './pages/SkinAnalysis/SkinAnalysisPage';
import CheckoutSuccess from './pages/Checkout/CheckoutSuccess';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Ana uygulama bileşeni, tüm sayfaları ve alt bileşenleri bir araya getirir
function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/category/:category/:subcategory" element={<CategoryPage />} />
            <Route path="/category/:category/:subcategory/:subtitle" element={<CategoryPage />} />
            <Route path="/brand/:brandName" element={<BrandPage />} />
            <Route path="/arama" element={<SearchPage />} />
            <Route path="/sepetim" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/favorilerim" element={<FavoritesPage />} />
            <Route path="/kampanyalar" element={<CampaignsPage />} />
            <Route path="/yeni-urunler" element={<NewProductsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/cilt-analizi" element={<SkinAnalysisPage />} />
            <Route path="/profile/*" element={<ProfileLayout />} />
          </Route>
        </Routes>
        </CartProvider>
      </FavoritesProvider>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
    </AuthProvider>
  );
}

// App bileşenini uygulamanın diğer kısımlarında kullanılabilmesi için dışa aktarır
export default App;

