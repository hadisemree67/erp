/**
 * ============================================================================
 * BİLEŞEN ADI: Coupons
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { Ticket, History, Info, Copy } from 'lucide-react';
import styles from './Coupons.module.css';

const Coupons = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(import.meta.env.VITE_API_URL + '/api/coupons/my-coupons', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (data.success) {
          setCoupons(data.coupons || []);
        }
      } catch (error) {
        console.error("Kuponlar alınamadı:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCoupons();
  }, []);

  const activeCoupons = coupons;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Ticket size={28} />
          </div>
          <div>
            <h2 className={styles.title}>Kuponlarım</h2>
            <p className={styles.subtitle}>Kullanabileceğiniz kuponlarınızı görüntüleyin.</p>
          </div>
        </div>
        <button className={styles.historyBtn}>
          <History size={18} /> Geçmiş Kuponlarım
        </button>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'active' ? styles.active : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Kullanılabilir ({activeCoupons.length})
        </button>
      </div>

      <div className={styles.couponGrid}>
        {loading ? (
          <div style={{ padding: '20px', color: '#64748b' }}>Kuponlarınız yükleniyor...</div>
        ) : activeCoupons.length === 0 ? (
          <div style={{ padding: '20px', color: '#64748b' }}>Şu an sizin için tanımlanmış aktif bir kupon bulunmuyor.</div>
        ) : (
          activeTab === 'active' && activeCoupons.map((coupon) => (
            <div key={coupon.id} className={`${styles.couponCard} ${styles.themeGreen}`}>
              <div className={styles.couponLeft}>
                <div className={styles.couponCodeBadge} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {coupon.code}
                  <Copy 
                    size={14} 
                    style={{ cursor: 'pointer', opacity: 0.8 }} 
                    onClick={() => { navigator.clipboard.writeText(coupon.code); alert('Kupon kodu kopyalandı!'); }} 
                  />
                </div>
                <div className={styles.couponValue}>
                  {coupon.discount_type === 'Percentage' ? `%${coupon.discount_value}` : `${coupon.discount_value} TL`}
                </div>
                <div className={styles.couponType}>İndirim</div>
              </div>
              
              <div className={styles.couponRight}>
                <div>
                  <h4 className={styles.couponCondition}>
                    {coupon.minimum_order_amount 
                      ? `Min. ${coupon.minimum_order_amount} TL alışverişinize ${coupon.discount_type === 'Percentage' ? '%' + coupon.discount_value : coupon.discount_value + ' TL'} indirim fırsatı!` 
                      : `${coupon.discount_type === 'Percentage' ? '%' + coupon.discount_value : coupon.discount_value + ' TL'} İndirim fırsatı!`}
                  </h4>
                  <p className={styles.couponDesc}>
                    {coupon.target_audience === 'specific' ? 'Sadece size özel.' : 'Herkese açık kampanya.'}
                    {coupon.usage_limit ? ` (Sınırlı kullanım: ${coupon.usage_limit} adet)` : ''}
                  </p>
                </div>
                
                <div className={styles.couponFooter}>
                  <span className={styles.expiryDate}>
                    Son Kullanma: {coupon.end_date ? new Date(coupon.end_date).toLocaleDateString('tr-TR') : 'Süresiz'}
                  </span>
                  <button className={styles.useBtn} onClick={() => { navigator.clipboard.writeText(coupon.code); window.location.href = '/sepet'; }}>Kopyala & Sepete Git</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.infoAlert}>
        <Info size={18} />
        <span>Kuponlar, sepette otomatik olarak uygulanır. Koşulları sağlanmayan kuponlar kullanılamaz.</span>
      </div>
    </div>
  );
};

export default Coupons;


