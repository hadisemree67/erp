/**
 * ============================================================================
 * BİLEŞEN ADI: Returns
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import styles from './Returns.module.css';
import { RotateCcw, Package, Clock, CheckCircle, XCircle } from 'lucide-react';

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('Beklemede');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        setError('Oturum süresi dolmuş, lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }
      
      const res = await fetch('http://localhost:3000/api/customers/auth/returns', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setReturns(data.returns);
      } else {
        setError(data.message || 'İade talepleri yüklenemedi.');
      }
    } catch (err) {
      setError('Sunucu bağlantı hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Onaylandı': return <CheckCircle size={18} className={styles.statusIcon} />;
      case 'Reddedildi': return <XCircle size={18} className={styles.statusIcon} />;
      case 'Beklemede':
      default: return <Clock size={18} className={styles.statusIcon} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Onaylandı': return styles.statusApproved;
      case 'Reddedildi': return styles.statusRejected;
      case 'Beklemede':
      default: return styles.statusPending;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filterButtons = [
    { label: 'Bekleyen', value: 'Beklemede', icon: <Clock size={14} /> },
    { label: 'Onaylandı', value: 'Onaylandı', icon: <CheckCircle size={14} /> },
    { label: 'Reddedilen', value: 'Reddedildi', icon: <XCircle size={14} /> },
    { label: 'Tümü', value: 'Tümü', icon: <RotateCcw size={14} /> },
  ];
  const counts = {
    Beklemede: returns.filter(r => r.status === 'Beklemede').length,
    Onaylandı: returns.filter(r => r.status === 'Onaylandı').length,
    Reddedildi: returns.filter(r => r.status === 'Reddedildi').length,
    Tümü: returns.length,
  };
  const filteredReturns = filter === 'Tümü' ? returns : returns.filter(r => r.status === filter);

  if (loading) {
    return <div className={styles.loading}>Talepleriniz yükleniyor...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.returnsContainer}>
      <h2 className={styles.title}>İade ve Taleplerim</h2>
      
      {/* Filtre butonları */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {filterButtons.map(btn => {
          const isActive = filter === btn.value;
          const count = counts[btn.value];
          return (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '20px', border: '1.5px solid',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.18s',
                borderColor: isActive ? '#0f766e' : '#e2e8f0',
                background: isActive ? '#0f766e' : '#fff',
                color: isActive ? '#fff' : '#64748b',
              }}
            >
              {btn.icon}
              {btn.label}
              {count > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isActive ? '#fff' : '#475569',
                  borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                  padding: '1px 7px', marginLeft: '2px'
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
      
      {filteredReturns.length === 0 ? (
        <div className={styles.emptyState}>
          <RotateCcw size={48} className={styles.emptyIcon} />
          <p>{filter === 'Beklemede' ? 'Bekleyen talebiniz bulunmuyor.' : filter === 'Tümü' ? 'Henüz bir iade veya değişim talebiniz bulunmuyor.' : `${filter === 'Onaylandı' ? 'Onaylandı' : 'Reddedilen'} talebiniz bulunmuyor.`}</p>
        </div>
      ) : (
        <div className={styles.returnsList}>
          {filteredReturns.map(req => {
            let items = [];
            try {
              items = req.items_json ? (typeof req.items_json === 'string' ? JSON.parse(req.items_json) : req.items_json) : [];
            } catch(e) { }

            return (
              <div key={req.id} className={styles.returnCard}>
                <div className={styles.returnHeader}>
                  <div className={styles.returnInfo}>
                    <div className={styles.returnDate}>{formatDate(req.created_at)}</div>
                    <div className={styles.returnOrder}>Talep No: <strong>#REQ{req.id}</strong> (Sipariş: #{req.order_id})</div>
                  </div>
                  <div className={`${styles.returnStatus} ${getStatusClass(req.status)}`}>
                    {getStatusIcon(req.status)}
                    <span>{req.status}</span>
                  </div>
                </div>
                
                <div className={styles.returnDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Talep Türü:</span>
                    <span className={styles.detailValue}>{req.request_type}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Nedeni:</span>
                    <span className={styles.detailValue}>{req.reason}</span>
                  </div>
                  {req.description && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Açıklama:</span>
                      <span className={styles.detailValue}>{req.description}</span>
                    </div>
                  )}
                </div>

                <div className={styles.returnItems}>
                  <h4 className={styles.itemsTitle}>Talep Edilen Ürünler</h4>
                  {items.map((item, idx) => {
                    let parsedImagePath = '';
                    if (item.image_path) {
                      try {
                        const parsed = JSON.parse(item.image_path);
                        parsedImagePath = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
                      } catch (e) {
                        parsedImagePath = item.image_path;
                      }
                    }
                    const imgSrc = parsedImagePath ? (parsedImagePath.startsWith('http') ? parsedImagePath : `http://localhost:3000${parsedImagePath}`) : '';

                    return (
                      <div key={idx} className={styles.returnItem}>
                        {imgSrc ? (
                          <img 
                            src={imgSrc} 
                            alt={item.product_name} 
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', marginRight: '12px', border: '1px solid #e2e8f0' }} 
                          />
                        ) : (
                          <Package size={16} className={styles.itemIcon} />
                        )}
                        <div className={styles.itemName}>{item.product_name}</div>
                        <div className={styles.itemQty}>{item.quantity} Adet</div>
                        {item.price && (
                          <div className={styles.itemPrice}>
                            {Number(item.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Returns;


