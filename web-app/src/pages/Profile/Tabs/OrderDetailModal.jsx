/**
 * ============================================================================
 * BİLEŞEN ADI: OrderDetailModal
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState } from 'react';
import { X, Package, RotateCcw, MapPin, Ban } from 'lucide-react';
import styles from './OrderDetailModal.module.css';
import AddressChangeModal from './AddressChangeModal';
import CancelModal from './CancelModal';

const OrderDetailModal = ({ isOpen, onClose, order, onOpenReturn, onOrderUpdated }) => {
  if (!isOpen || !order) return null;

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
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isReturnActive = order.OrderStatus === 'Teslim Edildi';
  const isAddressChangeActive = !['Kargoya Verildi', 'Teslim Edildi', 'İptal Edildi', 'İptal'].includes(order.OrderStatus);
  
  // Siparişi İptal Et is always active according to user request (for now)
  const isCancelActive = true; 

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleReturnClick = () => {
    onClose();
    onOpenReturn(order);
  };

  const handleAddressChangeClick = () => {
    setIsAddressModalOpen(true);
  };

  const handleCancelClick = () => {
    setIsCancelModalOpen(true);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Sipariş Detayı</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.orderSummary}>
            <div className={styles.summaryRow}>
              <span>Sipariş No:</span>
              <strong>{order.OrderNumber}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Tarih:</span>
              <strong>{formatDate(order.OrderDate)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Durum:</span>
              <strong className={getStatusClass(order.OrderStatus)}>{order.OrderStatus}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Toplam Tutar:</span>
              <strong>{Number(order.TotalAmount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</strong>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Ürünler</h3>
            <div className={styles.orderItems}>
              {order.items?.map(item => {
                let imagePath = '';
                if (item.ImagePath) {
                  try {
                    const parsed = JSON.parse(item.ImagePath);
                    imagePath = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
                  } catch (e) {
                    imagePath = item.ImagePath;
                  }
                }
                const imgSrc = imagePath ? (imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`) : '';

                return (
                  <div key={item.Id} className={styles.orderItem}>
                    <div className={styles.itemImage}>
                      {imgSrc ? (
                        <img src={imgSrc} alt={item.ProductName} />
                      ) : (
                        <Package size={24} />
                      )}
                    </div>
                    <div className={styles.itemDetails}>
                      <div className={styles.itemName}>{item.ProductName}</div>
                      <div className={styles.itemQty}>{item.Quantity} {item.Unit || 'Adet'} - {Number(item.UnitPrice).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.section}>
            <h3>Sipariş İşlemleri</h3>
            <div className={styles.actionButtons}>
              <button 
                className={styles.actionBtn} 
                disabled={!isReturnActive}
                onClick={handleReturnClick}
              >
                <RotateCcw size={18} />
                İade / Değişim Talebi Oluştur
              </button>
              
              <button 
                className={styles.actionBtn} 
                disabled={!isAddressChangeActive}
                onClick={handleAddressChangeClick}
              >
                <MapPin size={18} />
                Adresimi Değiştir
              </button>

              <button 
                className={`${styles.actionBtn} ${styles.cancelBtn}`} 
                disabled={!isCancelActive}
                onClick={handleCancelClick}
              >
                <Ban size={18} />
                Siparişi İptal Et
              </button>
            </div>
            <p className={styles.helpText}>
              {!isReturnActive && order.OrderStatus !== 'Teslim Edildi' && '* İade/Değişim talebi sadece teslim edilen siparişler için oluşturulabilir. '}
              {!isAddressChangeActive && '* Sipariş kargoya verildiği veya tamamlandığı için adres değişikliği yapılamaz.'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Adres Değiştirme Modalı */}
      <AddressChangeModal 
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        order={order}
        onAddressUpdated={() => {
          setIsAddressModalOpen(false);
          onClose(); // Ana modalı da kapat
          if (onOrderUpdated) onOrderUpdated(); // Listeyi yenilemek için fonksiyon çağır
        }}
      />

      {/* İptal Modalı */}
      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        order={order}
        onSuccess={(message) => {
          setIsCancelModalOpen(false);
          alert(message);
          onClose();
          if (onOrderUpdated) onOrderUpdated();
        }}
      />
    </div>
  );
};

export default OrderDetailModal;


