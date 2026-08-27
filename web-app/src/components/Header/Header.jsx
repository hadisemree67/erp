/**
 * ============================================================================
 * BİLEŞEN ADI: Header
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web sitesinin çeşitli sayfalarında tekrar kullanılabilen (Reusable) arayüz parçasıdır.
 * ============================================================================
 */
// -----------------------------------------------------------------------------
// Bileşen Adı: Üst Başlık (Header)
// Açıklama: Sitenin üst kısmındaki arama çubuğu, kullanıcı menüsü, sepet ve logoyu barındırır.
// -----------------------------------------------------------------------------
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, Truck, CheckCircle2, Leaf, LogOut, Package, Ticket, MapPin, RefreshCcw, Bell, CreditCard, ShieldCheck, ChevronRight } from 'lucide-react';
import LoginModal from '../LoginModal/LoginModal';
import styles from './Header.module.css';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';

const Header = () => {
  // 1. State Tanımlamaları (Durum Yönetimi)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentUser, login, logout } = useAuth();
  const { cartItemsCount } = useCart();
  const { favoritesCount } = useFavorites();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/arama?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  // 2. Yardımcı Fonksiyonlar (Helper Methods)

  // Kullanıcının çıkış yapmasını sağlar
  const handleLogout = () => {
    logout();
  };

  // Kullanıcı başarıyla giriş yaptıktan sonra
  const handleLoginSuccess = (user, token) => {
    login(user, token);
  };
  
  // 3. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <header>
      {/* Top Bar */}
      <div className={styles.headerTop}>
        <div className={`container ${styles.topContainer}`}>
          <div className={styles.topInfo}>
            <Leaf size={14} />
            <span>Doğal içerikli ürünler, sağlıklı bir yaşam için!</span>
          </div>
          <div className={styles.topFeatures}>
            <div className={styles.featureItem}>
              <Truck size={14} />
              <span>Ücretsiz Kargo</span>
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={14} />
              <span>%100 Orijinal</span>
            </div>
            <div className={styles.featureItem}>
              <Leaf size={14} />
              <span>Güvenli Alışveriş</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className={styles.headerMain}>
        <div className={`container ${styles.mainContainer}`}>
          {/* Logo */}
          <a href="/" className={styles.logo}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22" cy="22" r="22" fill="#00A896" opacity="0.12"/>
              <path d="M22 6C22 6 28 6 28 12C28 18 22 22 22 22C22 22 16 18 16 12C16 6 22 6 22 6Z" fill="#00A896"/>
              <path d="M22 38C22 38 28 38 28 32C28 26 22 22 22 22C22 22 16 26 16 32C16 38 22 38 22 38Z" fill="#00A896"/>
              <path d="M6 22C6 22 6 16 12 16C18 16 22 22 22 22C22 22 18 28 12 28C6 28 6 22 6 22Z" fill="#00A896"/>
              <path d="M38 22C38 22 38 16 32 16C26 16 22 22 22 22C22 22 26 28 32 28C38 28 38 22 38 22Z" fill="#00A896"/>
              <rect x="20" y="10" width="4" height="24" rx="2" fill="#00A896"/>
              <rect x="10" y="20" width="24" height="4" rx="2" fill="#00A896"/>
            </svg>
            <div>
              <div style={{ fontWeight: '700', fontSize: '28px', color: '#00A896', letterSpacing: '-0.5px', lineHeight: '1' }}>dermo</div>
              <div style={{ fontWeight: '400', fontSize: '18px', color: '#6b7280', letterSpacing: '1px', lineHeight: '1.2' }}>pharma</div>
            </div>
          </a>

          {/* Search */}
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <input 
              type="text" 
              placeholder="Ürün, kategori veya marka ara..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchButton}>
              <Search size={20} />
            </button>
          </form>

          {/* User Actions */}
          <div className={styles.userActions}>
            {!currentUser ? (
              <button className={styles.actionItem} onClick={() => setIsLoginModalOpen(true)}>
                <User size={22} strokeWidth={1.5} />
                <div className={styles.actionText}>
                  <span className={styles.actionLabel}>Hesabım</span>
                  <span className={styles.actionValue}>Giriş Yap</span>
                </div>
              </button>
            ) : (
              <div className={styles.userAccountItem}>
                <User size={22} strokeWidth={1.5} />
                <Link to="/profile/info" className={styles.actionText} style={{ textDecoration: 'none' }}>
                  <span className={styles.actionLabel}>Hesabım</span>
                  <span className={styles.actionValue}>Merhaba, {currentUser.name ? currentUser.name.split(' ')[0] : 'Kullanıcı'}</span>
                </Link>

                {/* Dropdown Menu */}
                <div className={styles.userDropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.userInitials}>
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{currentUser.name || 'Kayıtlı Müşteri'}</span>
                      <span className={styles.userEmail}>{currentUser.email || currentUser.phone || ''}</span>
                      <Link to="/profile" className={styles.profileLink}>Profilimi Görüntüle <ChevronRight size={12} /></Link>
                    </div>
                  </div>
                  
                  <ul className={styles.dropdownList}>
                    <li className={styles.dropdownItem}>
                      <Link to="/profile/orders" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><Package size={16} className={styles.dropdownLinkIcon}/> Siparişlerim</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </Link>
                    </li>
                    <li className={styles.dropdownItem}>
                      <Link to="/profile/coupons" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><Ticket size={16} className={styles.dropdownLinkIcon}/> Kuponlarım</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </Link>
                    </li>
                    <li className={styles.dropdownItem}>
                      <Link to="/profile/info" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><User size={16} className={styles.dropdownLinkIcon}/> Hesap Bilgilerim</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </Link>
                    </li>
                    <li className={styles.dropdownItem}>
                      <Link to="/profile/addresses" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><MapPin size={16} className={styles.dropdownLinkIcon}/> Adreslerim</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </Link>
                    </li>
                    <li className={styles.dropdownItem}>
                      <Link to="/profile/favorites" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><Heart size={16} className={styles.dropdownLinkIcon}/> Favorilerim</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </Link>
                    </li>
                    <li className={styles.dropdownItem}>
                      <Link to="/profile/returns" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><RefreshCcw size={16} className={styles.dropdownLinkIcon}/> İade ve Taleplerim</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </Link>
                    </li>
                    <li className={styles.dropdownItem}>
                      <a href="#" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><Bell size={16} className={styles.dropdownLinkIcon}/> Bildirimlerim</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </a>
                    </li>
                    <li className={styles.dropdownItem}>
                      <a href="#" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><CreditCard size={16} className={styles.dropdownLinkIcon}/> Ödeme Yöntemlerim</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </a>
                    </li>
                    <li className={styles.dropdownItem}>
                      <a href="#" className={styles.dropdownLink}>
                        <div className={styles.dropdownLinkLeft}><ShieldCheck size={16} className={styles.dropdownLinkIcon}/> Güvenlik Ayarlarım</div>
                        <ChevronRight size={14} className={styles.dropdownLinkArrow}/>
                      </a>
                    </li>
                    
                    <div className={styles.dropdownDivider}></div>
                    
                    <li className={styles.dropdownItem}>
                      <button className={styles.logoutBtn} onClick={handleLogout}>
                        <LogOut size={16} className={styles.logoutIcon}/> Çıkış Yap
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            )}
            <Link to="/favorilerim" className={`${styles.actionItem} ${styles.cartItem}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Heart size={22} strokeWidth={1.5} />
              <span className={styles.actionValue}>Favorilerim</span>
              {favoritesCount > 0 && <span className={styles.cartBadge}>{favoritesCount}</span>}
            </Link>
            <Link to="/sepetim" className={`${styles.actionItem} ${styles.cartItem}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <ShoppingBag size={22} strokeWidth={1.5} />
              <span className={styles.actionValue}>Sepetim</span>
              {cartItemsCount > 0 && <span className={styles.cartBadge}>{cartItemsCount}</span>}
            </Link>
          </div>
        </div>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
      />
    </header>
  );
};

export default Header;


