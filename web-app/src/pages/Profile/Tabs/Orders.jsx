/**
 * ============================================================================
 * BİLEŞEN ADI: Orders
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import styles from './Orders.module.css';
import { Package, Truck, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ReturnModal from './ReturnModal';
import OrderDetailModal from './OrderDetailModal';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        setError('Oturum süresi dolmuş, lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }
      
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/my-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        setError(data.message || 'Siparişler yüklenemedi.');
      }
    } catch (err) {
      setError('Sunucu bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Kargoya Verildi':
        return <Truck size={18} className={styles.statusIcon} />;
      case 'Teslim Edildi':
        return <CheckCircle size={18} className={styles.statusIcon} />;
      case 'İptal Edildi':
      case 'İptal':
        return <XCircle size={18} className={styles.statusIcon} />;
      case 'Onaylandı':
      case 'Hazırlanıyor':
      case 'Paketleniyor':
      case 'Paketlendi':
      case 'Toplamada':
      case 'Hazır':
        return <Package size={18} className={styles.statusIcon} />;
      case 'Beklemede':
      default:
        return <Clock size={18} className={styles.statusIcon} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Kargoya Verildi': return styles.statusShipped;
      case 'Teslim Edildi': return styles.statusDelivered;
      case 'İptal Edildi':
      case 'İptal': return styles.statusCancelled;
      case 'Beklemede': return styles.statusPending;
      default: return styles.statusProcessing;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenDetail = (order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const handleOpenReturn = (order) => {
    setDetailModalOpen(false); // Detay modalını kapat
    setSelectedOrder(order);
    setTimeout(() => {
      setReturnModalOpen(true);
    }, 100);
  };

  const handleReturnSuccess = (message) => {
    alert(message);
    // İsteğe bağlı olarak sipariş listesini güncelleyebiliriz
  };

  if (loading) {
    return <div className={styles.loading}>Siparişleriniz yükleniyor...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.ordersContainer}>
      <h2 className={styles.title}>Siparişlerim</h2>
      
      {orders.length === 0 ? (
        <div className={styles.emptyState}>
          <Package size={48} className={styles.emptyIcon} />
          <p>Henüz bir siparişiniz bulunmuyor.</p>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.filter(order => order.OrderStatus !== 'İptal Edildi' && order.OrderStatus !== 'İptal').map(order => (
            <div key={order.Id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <div className={styles.orderDate}>{formatDate(order.OrderDate)}</div>
                  <div className={styles.orderNumber}>Sipariş No: <strong>{order.OrderNumber}</strong></div>
                </div>
                <div className={`${styles.orderStatus} ${getStatusClass(order.OrderStatus)}`}>
                  {getStatusIcon(order.OrderStatus)}
                  <span>{order.OrderStatus}</span>
                </div>
              </div>
              
              <div className={styles.miniImages}>
                {order.items?.map((item, index) => {
                  if (index > 3) return null; // Sadece ilk 4'ü göster, kalanı +X olarak
                  let imagePath = '';
                  if (item.ImagePath) {
                    try {
                      const parsed = JSON.parse(item.ImagePath);
                      imagePath = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
                    } catch (e) {
                      imagePath = item.ImagePath;
                    }
                  }
                  const imgSrc = imagePath ? (imagePath.startsWith('http') ? imagePath : `${import.meta.env.VITE_API_URL}${imagePath}`) : '';
                  return (
                    <div key={item.Id} className={styles.miniImageWrap}>
                      {imgSrc ? (
                        <img src={imgSrc} alt={item.ProductName} title={item.ProductName} />
                      ) : (
                        <Package size={20} title={item.ProductName} />
                      )}
                    </div>
                  );
                })}
                {order.items?.length > 4 && (
                  <div className={styles.moreImages}>+{order.items.length - 4}</div>
                )}
              </div>

              <div className={styles.orderFooter}>
                <div className={styles.footerActions}>
                  <button 
                    className={styles.detailBtn} 
                    onClick={() => handleOpenDetail(order)}
                  >
                    Sipariş Detayı
                  </button>
                </div>
                <div className={styles.totalSection}>
                  <div className={styles.totalLabel}>Toplam Tutar:</div>
                  <div className={styles.totalAmount}>
                    {Number(order.TotalAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailModalOpen && (
        <OrderDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          order={selectedOrder}
          onOpenReturn={handleOpenReturn}
          onOrderUpdated={fetchOrders}
        />
      )}

      {returnModalOpen && (
        <ReturnModal 
          isOpen={returnModalOpen} 
          onClose={() => setReturnModalOpen(false)} 
          order={selectedOrder}
          onSuccess={handleReturnSuccess}
        />
      )}
    </div>
  );
};

export default Orders;


