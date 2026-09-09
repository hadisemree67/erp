/**
 * ============================================================================
 * BİLEŞEN ADI: Notifications
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) müşteri bildirimleri ekranıdır.
 *   Satıcının soruya verdiği yanıtlar, sipariş durumları ve sistem bildirimlerini canlı olarak listeler.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Package, Ticket, Megaphone, CheckCheck } from 'lucide-react';
import styles from './Notifications.module.css';

const Notifications = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('customerToken');

  const fetchNotifications = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/customers/auth/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Bildirimler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notifId, link) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/api/customers/auth/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n)
      );
    } catch (e) {
      console.error('Okundu işaretleme hatası:', e);
    }

    if (link) {
      navigate(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/api/customers/auth/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error('Tümünü okundu işaretleme hatası:', e);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timePart = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      if (isToday) return `Bugün, ${timePart}`;
      if (isYesterday) return `Dün, ${timePart}`;

      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getNotifIconConfig = (type) => {
    switch (type) {
      case 'qa':
        return { icon: MessageSquare, colorClass: styles.green };
      case 'order':
        return { icon: Package, colorClass: styles.green };
      case 'campaign':
        return { icon: Ticket, colorClass: styles.yellow };
      default:
        return { icon: Megaphone, colorClass: styles.blue };
    }
  };

  const qaCount = notifications.filter(n => n.type === 'qa').length;
  const orderCount = notifications.filter(n => n.type === 'order').length;
  const campaignCount = notifications.filter(n => n.type === 'campaign').length;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifs = activeTab === 'all'
    ? notifications
    : notifications.filter(n => {
        if (activeTab === 'qa') return n.type === 'qa';
        if (activeTab === 'order') return n.type === 'order';
        if (activeTab === 'campaign') return n.type === 'campaign';
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
            <h2 className={styles.title}>Bildirimlerim {unreadCount > 0 && `(${unreadCount} Okunmamış)`}</h2>
            <p className={styles.subtitle}>Soru yanıtları, sipariş güncellemeleri ve tüm duyurularınızı buradan takip edin.</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button 
            className={styles.settingsBtn}
            onClick={handleMarkAllAsRead}
            title="Tümünü Okundu İşaretle"
          >
            <CheckCheck size={18} /> Tümünü Okundu Say
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Tümü ({notifications.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'qa' ? styles.active : ''}`}
          onClick={() => setActiveTab('qa')}
        >
          💬 Soru & Cevap ({qaCount})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'order' ? styles.active : ''}`}
          onClick={() => setActiveTab('order')}
        >
          📦 Sipariş ({orderCount})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'campaign' ? styles.active : ''}`}
          onClick={() => setActiveTab('campaign')}
        >
          🎉 Kampanya ({campaignCount})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          Bildirimler yükleniyor...
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #e2e8f0'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔔</div>
          <p style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
            Henüz bir bildiriminiz bulunmuyor
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            {activeTab === 'qa'
              ? 'Sorduğunuz ürün soruları satıcı tarafından yanıtlandığında burada anında görünecektir.'
              : 'Hesabınızla ilgili tüm güncellemeler bu alanda listelenecektir.'}
          </p>
        </div>
      ) : (
        <div className={styles.notificationList}>
          {filteredNotifs.map(notif => {
            const config = getNotifIconConfig(notif.type);
            const IconComp = config.icon;
            const isUnread = !notif.is_read;

            return (
              <div 
                key={notif.id} 
                className={styles.notificationItem}
                style={{
                  cursor: notif.link ? 'pointer' : 'default',
                  backgroundColor: isUnread ? '#f0fdf4' : '#ffffff',
                  borderColor: isUnread ? '#bbf7d0' : 'var(--border-color)',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => handleMarkAsRead(notif.id, notif.link)}
              >
                <div className={`${styles.notifIcon} ${config.colorClass}`}>
                  <IconComp size={24} />
                </div>
                
                <div className={styles.notifContent}>
                  <div className={styles.notifHeader}>
                    <h4 className={styles.notifTitle} style={{ color: isUnread ? '#065f46' : 'var(--text-dark)' }}>
                      {notif.title}
                    </h4>
                  </div>
                  <p className={styles.notifDesc}>{notif.message}</p>
                </div>

                <div className={styles.notifRight}>
                  <span className={styles.notifTime}>{formatTime(notif.created_at)}</span>
                  <div className={isUnread ? styles.unreadDot : styles.readDot}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
