import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle, Package, AlertCircle } from 'lucide-react';
import styles from './ProductReviewModal.module.css';

const RATING_TEXTS = {
  1: 'Çok Kötü',
  2: 'Kötü',
  3: 'Orta',
  4: 'İyi',
  5: 'Harika!'
};

const ProductReviewModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [reviewsMap, setReviewsMap] = useState({}); // { [productId]: { rating: 5, comment: '', isExisting: false, loading: false, successMsg: '' } }
  const [hoveredStars, setHoveredStars] = useState({}); // { [productId]: 4 }
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    if (isOpen && order) {
      fetchExistingReviews();
    }
  }, [isOpen, order]);

  const fetchExistingReviews = async () => {
    setLoadingInitial(true);
    try {
      const token = localStorage.getItem('customerToken');
      const initialMap = {};

      (order.items || []).forEach(item => {
        initialMap[item.ProductId] = {
          rating: 5,
          comment: '',
          isExisting: false,
          submitting: false,
          error: '',
          success: ''
        };
      });

      if (token) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/customers/auth/my-reviews`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.reviews)) {
          data.reviews.forEach(r => {
            if (initialMap[r.product_id]) {
              initialMap[r.product_id] = {
                rating: r.rating || 5,
                comment: r.comment || '',
                isExisting: true,
                submitting: false,
                error: '',
                success: 'Daha önce değerlendirildi'
              };
            }
          });
        }
      }

      setReviewsMap(initialMap);
    } catch (e) {
      console.error('Var olan yorumlar çekilemedi:', e);
    } finally {
      setLoadingInitial(false);
    }
  };

  if (!isOpen || !order) return null;

  const handleRatingChange = (productId, star) => {
    setReviewsMap(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        rating: star
      }
    }));
  };

  const handleCommentChange = (productId, comment) => {
    setReviewsMap(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        comment: comment,
        error: ''
      }
    }));
  };

  const handleSubmitReview = async (productId) => {
    const itemReview = reviewsMap[productId];
    if (!itemReview) return;

    setReviewsMap(prev => ({
      ...prev,
      [productId]: { ...prev[productId], submitting: true, error: '', success: '' }
    }));

    try {
      const token = localStorage.getItem('customerToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products/public/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.Id,
          rating: itemReview.rating,
          comment: itemReview.comment
        })
      });

      const data = await res.json();
      if (data.success) {
        setReviewsMap(prev => ({
          ...prev,
          [productId]: {
            ...prev[productId],
            submitting: false,
            isExisting: true,
            success: 'Değerlendirmeniz yayınlandı! Teşekkür ederiz.'
          }
        }));
        if (onSuccess) onSuccess();
      } else {
        setReviewsMap(prev => ({
          ...prev,
          [productId]: { ...prev[productId], submitting: false, error: data.message || 'Kaydedilemedi.' }
        }));
      }
    } catch (err) {
      setReviewsMap(prev => ({
        ...prev,
        [productId]: { ...prev[productId], submitting: false, error: 'Sunucu bağlantı hatası oluştu.' }
      }));
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Ürünleri Değerlendir</h2>
            <p className={styles.subTitle}>Sipariş No: <strong>{order.OrderNumber}</strong></p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {loadingInitial ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Değerlendirme bilgileri yükleniyor...
            </div>
          ) : !order.items || order.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Değerlendirilecek ürün bulunamadı.
            </div>
          ) : (
            <div className={styles.productsList}>
              {order.items.map((item) => {
                const pId = item.ProductId;
                const rev = reviewsMap[pId] || { rating: 5, comment: '', isExisting: false, submitting: false, error: '', success: '' };
                const currentHover = hoveredStars[pId] || 0;
                const activeStar = currentHover || rev.rating;

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
                  <div key={pId} className={styles.productCard}>
                    {/* Ürün Bilgi Başlığı */}
                    <div className={styles.productHeader}>
                      <div className={styles.imageWrap}>
                        {imgSrc ? (
                          <img src={imgSrc} alt={item.ProductName} />
                        ) : (
                          <Package size={24} color="#94a3b8" />
                        )}
                      </div>
                      <div className={styles.productMeta}>
                        <h4 className={styles.productName}>{item.ProductName}</h4>
                        <span className={styles.productQty}>
                          {item.Quantity} {item.Unit || 'Adet'} • {Number(item.UnitPrice).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                      </div>
                      {rev.isExisting && (
                        <div className={styles.reviewedBadge}>
                          <CheckCircle size={14} /> Değerlendirildi
                        </div>
                      )}
                    </div>

                    {/* Yıldız Seçim Alanı */}
                    <div className={styles.ratingSection}>
                      <span className={styles.ratingLabel}>Puanınız:</span>
                      <div className={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={styles.starBtn}
                            onMouseEnter={() => setHoveredStars(prev => ({ ...prev, [pId]: star }))}
                            onMouseLeave={() => setHoveredStars(prev => ({ ...prev, [pId]: 0 }))}
                            onClick={() => handleRatingChange(pId, star)}
                          >
                            <Star
                              size={26}
                              fill={star <= activeStar ? '#f59e0b' : 'none'}
                              color={star <= activeStar ? '#f59e0b' : '#cbd5e1'}
                              strokeWidth={star <= activeStar ? 0 : 2}
                            />
                          </button>
                        ))}
                        <span className={styles.ratingScoreText}>
                          {activeStar} / 5 — <b>{RATING_TEXTS[activeStar] || ''}</b>
                        </span>
                      </div>
                    </div>

                    {/* Yorum Giriş Alanı */}
                    <div className={styles.commentSection}>
                      <textarea
                        className={styles.commentInput}
                        rows={3}
                        placeholder="Yorum eklemek isterseniz buraya yazabilirsiniz (isteğe bağlı)..."
                        value={rev.comment}
                        onChange={(e) => handleCommentChange(pId, e.target.value)}
                        maxLength={1000}
                      />
                      <div className={styles.charCount}>
                        {rev.comment.length} / 1000
                      </div>
                    </div>

                    {/* Hata & Başarı Mesajı */}
                    {rev.error && (
                      <div className={styles.errorAlert}>
                        <AlertCircle size={15} /> {rev.error}
                      </div>
                    )}
                    {rev.success && (
                      <div className={styles.successAlert}>
                        <CheckCircle size={15} /> {rev.success}
                      </div>
                    )}

                    {/* Kaydet Butonu */}
                    <div className={styles.cardFooter}>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        disabled={rev.submitting}
                        onClick={() => handleSubmitReview(pId)}
                      >
                        {rev.submitting ? 'Kaydediliyor...' : (rev.isExisting ? 'Değerlendirmeyi Güncelle' : 'Değerlendirmeyi Kaydet')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.closeModalBtn} onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductReviewModal;
