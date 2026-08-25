/**
 * ============================================================================
 * BİLEŞEN ADI: Notifications
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState } from 'react';
import { Bell, Settings, Package, Ticket, Megaphone, Star, ChevronDown } from 'lucide-react';
import styles from './Notifications.module.css';

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('all');

  const notifications = [
    {
      id: 1,
      type: 'order',
      icon: Package,
      iconColorClass: styles.green,
      title: 'Siparişiniz kargoya verildi 🚚',
      desc: '#SIP5698 numaralı siparişiniz kargoya verildi. Kargo takibi için tıklayın.',
      time: 'Dün, 14:35',
      unread: true,
    },
    {
      id: 2,
      type: 'campaign',
      icon: Ticket,
      iconColorClass: styles.yellow,
      title: '%20 indirim kuponunuz hesabınıza yüklendi! 🎉',
      desc: 'Tüm cilt bakım ürünlerinde geçerli %20 indirim kuponunuzu kaçırmayın.',
      time: '2 gün önce',
      unread: true,
    },
    {
      id: 3,
      type: 'system',
      icon: Megaphone,
      iconColorClass: styles.red,
      title: 'Haftanın Fırsatları başladı!',
      desc: 'Seçili ürünlerde kaçırılmayacak indirimler başladı. Alışverişe başla!',
      time: '3 gün önce',
      unread: true,
    },
    {
      id: 4,
      type: 'campaign',
      icon: Star,
      iconColorClass: styles.blue,
      title: 'Favori ürününüz indirime girdi!',
      desc: 'Favorilerinize eklediğiniz bir ürünün fiyatı düştü.',
      time: '5 gün önce',
      unread: false,
    }
  ];

  const filteredNotifs = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => {
        if (activeTab === 'order') return n.type === 'order';
        if (activeTab === 'campaign') return n.type === 'campaign';
        if (activeTab === 'system') return n.type === 'system';
        return true;
      });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Bell size={28} />
          </div>
          <div>
            <h2 className={styles.title}>Bildirimlerim</h2>
            <p className={styles.subtitle}>Tüm bildirimlerinizi buradan görüntüleyebilirsiniz.</p>
          </div>
        </div>
        <button className={styles.settingsBtn}>
          <Settings size={18} /> Bildirim Ayarları
        </button>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Tümü (12)
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'order' ? styles.active : ''}`}
          onClick={() => setActiveTab('order')}
        >
          Sipariş (4)
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'campaign' ? styles.active : ''}`}
          onClick={() => setActiveTab('campaign')}
        >
          Kampanya (3)
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'system' ? styles.active : ''}`}
          onClick={() => setActiveTab('system')}
        >
          Sistem (5)
        </button>
      </div>

      <div className={styles.notificationList}>
        {filteredNotifs.map(notif => (
          <div key={notif.id} className={styles.notificationItem}>
            <div className={`${styles.notifIcon} ${notif.iconColorClass}`}>
              <notif.icon size={24} />
            </div>
            
            <div className={styles.notifContent}>
              <div className={styles.notifHeader}>
                <h4 className={styles.notifTitle}>{notif.title}</h4>
              </div>
              <p className={styles.notifDesc}>{notif.desc}</p>
            </div>

            <div className={styles.notifRight}>
              <span className={styles.notifTime}>{notif.time}</span>
              <div className={notif.unread ? styles.unreadDot : styles.readDot}></div>
            </div>
          </div>
        ))}
      </div>

      <button className={styles.loadMoreBtn}>
        Daha Fazla Bildirim Yükle <ChevronDown size={18} />
      </button>
    </div>
  );
};

export default Notifications;


