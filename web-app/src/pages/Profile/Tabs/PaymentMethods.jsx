/**
 * ============================================================================
 * BİLEŞEN ADI: PaymentMethods
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React from 'react';
import { CreditCard, Plus, MoreVertical, Lock } from 'lucide-react';
import styles from './PaymentMethods.module.css';
import { useAuth } from '../../../context/AuthContext';

const PaymentMethods = () => {
  const { user } = useAuth();
  
  // Örnek statik veri
  const cards = [
    {
      id: 1,
      type: 'mastercard',
      name: user?.customerName || 'Müşteri',
      number: '**** **** **** 1234',
      expiry: '05/27',
      isDefault: true
    },
    {
      id: 2,
      type: 'visa',
      name: user?.customerName || 'Müşteri',
      number: '**** **** **** 5678',
      expiry: '11/28',
      isDefault: false
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <CreditCard size={28} />
          </div>
          <div>
            <h2 className={styles.title}>Ödeme Yöntemlerim</h2>
            <p className={styles.subtitle}>Kayıtlı kartlarınızı görüntüleyin, yeni kart ekleyin veya yönetin.</p>
          </div>
        </div>
        
        <button className={styles.addBtn}>
          <Plus size={18} />
          Yeni Kart Ekle
        </button>
      </div>

      <div className={styles.cardsList}>
        {cards.map(card => (
          <div key={card.id} className={styles.cardItem}>
            <div className={styles.cardInfo}>
              {/* Basit bir SVG veya placeholder logo - Mastercard / Visa */}
              <div className={styles.cardIcon}>
                {card.type === 'mastercard' ? (
                  <svg viewBox="0 0 44 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="15" cy="15" r="15" fill="#EB001B"/>
                    <circle cx="29" cy="15" r="15" fill="#F79E1B"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 44 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.927 0.323L11.173 13.677H7.31L4.693 2.508C4.545 1.942 4.148 1.545 3.528 1.347L0.123 0.323V0H8.384C9.176 0 9.87 0.545 10.043 1.397L11.852 10.334L15.39 0.323H16.927ZM25.86 0.323L22.614 13.677H19.268L22.514 0.323H25.86ZM33.376 0.323C34.789 0.323 35.855 0.942 36.326 2.032L33.303 3.295C33.006 2.725 32.262 2.379 31.395 2.379C30.205 2.379 29.387 3.023 29.387 3.964C29.387 4.757 30.007 5.228 31.543 5.575L32.857 5.897C34.938 6.368 35.955 7.433 35.955 8.97C35.955 11.472 33.996 13.876 30.676 13.876C28.718 13.876 27.28 13.083 26.313 11.646L29.14 10.309C29.735 11.25 30.776 11.745 31.916 11.745C33.155 11.745 34.022 11.076 34.022 10.135C34.022 9.243 33.377 8.797 31.84 8.425L30.725 8.153C28.52 7.633 27.479 6.518 27.479 5.032C27.479 2.505 29.56 0.323 33.376 0.323ZM43.877 13.677H40.755L40.16 10.877H36.369L35.725 13.677H32.653L36.369 0.323H39.814L43.877 13.677ZM38.326 6.888L37.137 10.084H39.518L38.326 6.888Z" fill="#1434CB"/>
                  </svg>
                )}
              </div>
              <div className={styles.cardDetails}>
                <span className={styles.cardName}>{card.name}</span>
                <span className={styles.cardNumber}>{card.number}</span>
              </div>
            </div>

            <div className={styles.cardExpiry}>
              <span className={styles.expiryLabel}>Son Kullanma</span>
              <span className={styles.expiryDate}>{card.expiry}</span>
            </div>

            <div className={styles.cardActions}>
              {card.isDefault && <span className={styles.defaultBadge}>Varsayılan</span>}
              <button className={styles.moreBtn}>
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.infoAlert}>
        <Lock size={18} />
        <span>Kart bilgileriniz 256-bit SSL sertifikası ile korunmaktadır.</span>
      </div>
    </div>
  );
};

export default PaymentMethods;


