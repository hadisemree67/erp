/**
 * ============================================================================
 * BİLEŞEN ADI: ProfileLayout
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Müşterinin sipariş geçmişini, adreslerini ve hesap ayarlarını yönettiği profil paneli.
 * ============================================================================
 */
import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Package, Ticket, User, MapPin, Heart, RefreshCcw, Bell, CreditCard, ShieldCheck, LogOut } from 'lucide-react';
import styles from './ProfileLayout.module.css';
import { useAuth } from '../../context/AuthContext';

import AccountInfo from './Tabs/AccountInfo';
import Addresses from './Tabs/Addresses';
import Orders from './Tabs/Orders';
import FavoritesPage from '../Favorites/FavoritesPage';
import Returns from './Tabs/Returns';
import SecuritySettings from './Tabs/SecuritySettings';
import PaymentMethods from './Tabs/PaymentMethods';
import Notifications from './Tabs/Notifications';
import Coupons from './Tabs/Coupons';
const menuItems = [
  { path: 'orders', name: 'Siparişlerim', icon: Package },
  { path: 'coupons', name: 'Kuponlarım', icon: Ticket },
  { path: 'info', name: 'Hesap Bilgilerim', icon: User },
  { path: 'addresses', name: 'Adreslerim', icon: MapPin },
  { path: 'favorites', name: 'Favorilerim', icon: Heart },
  { path: 'returns', name: 'İade ve Taleplerim', icon: RefreshCcw },
  { path: 'notifications', name: 'Bildirimlerim', icon: Bell },
  { path: 'payment', name: 'Ödeme Yöntemlerim', icon: CreditCard },
  { path: 'security', name: 'Güvenlik Ayarlarım', icon: ShieldCheck },
];

const ProfileLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={`container ${styles.profileContainer}`}>
      <div className={styles.sidebar}>
        <div className={styles.menuList}>
          {menuItems.map((item) => {
            // Aktif sayfalar
            const isActivePage = ['info', 'addresses', 'favorites', 'orders', 'returns', 'security', 'payment', 'notifications', 'coupons'].includes(item.path);
            
            if (isActivePage) {
              const toPath = `/profile/${item.path}`;
              
              return (
                <NavLink
                  key={item.path}
                  to={toPath}
                  className={({ isActive }) => 
                    `${styles.menuItem} ${isActive ? styles.active : ''}`
                  }
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </NavLink>
              );
            } else {
              // Yapım aşamasında olanlar tıklanamaz ve pasif görünür
              return (
                <div
                  key={item.path}
                  className={`${styles.menuItem} ${styles.disabled}`}
                  title="Yapım Aşamasında"
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </div>
              );
            }
          })}
          
          <div className={styles.divider}></div>
          
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <Routes>
          <Route path="/" element={<AccountInfo />} />
          <Route path="info" element={<AccountInfo />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="orders" element={<Orders />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="returns" element={<Returns />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="payment" element={<PaymentMethods />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="*" element={<div className={styles.placeholder}>Bu sayfa yapım aşamasındadır.</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default ProfileLayout;


