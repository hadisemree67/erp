import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Package, Ticket, User, MapPin, Heart, RefreshCcw, Bell, CreditCard, ShieldCheck, LogOut } from 'lucide-react';
import styles from './ProfileLayout.module.css';

import AccountInfo from './Tabs/AccountInfo';
import Addresses from './Tabs/Addresses';

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

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerUser');
    navigate('/');
    window.location.reload();
  };

  return (
    <div className={`container ${styles.profileContainer}`}>
      <div className={styles.sidebar}>
        <div className={styles.menuList}>
          {menuItems.map((item) => {
            // Sadece info ve addresses sayfaları aktif
            const isActivePage = item.path === 'info' || item.path === 'addresses';
            
            if (isActivePage) {
              return (
                <NavLink
                  key={item.path}
                  to={`/profile/${item.path}`}
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
          <Route path="*" element={<div className={styles.placeholder}>Bu sayfa yapım aşamasındadır.</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default ProfileLayout;
