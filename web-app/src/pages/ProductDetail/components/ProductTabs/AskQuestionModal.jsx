import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import styles from './AskQuestionModal.module.css';

const TOPICS = [
  'Ürün İçeriği & Formül',
  'Kullanım Şekli',
  'Kargo & Paketleme',
  'Son Kullanma Tarihi',
  'Diğer'
];

const AskQuestionModal = ({ product, isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const token = localStorage.getItem('customerToken');

  const [topic, setTopic] = useState(TOPICS[0]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMessage('Lütfen sorunuzu yazın.');
      return;
    }
    if (question.trim().length < 5) {
      setErrorMessage('Soru en az 5 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/products/public/${product.Id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic,
          question: question.trim(),
          is_anonymous: 1
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data.message || 'Soru iletilirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Soru gönderme hatası:', err);
      setErrorMessage('Sunucuya bağlanılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setQuestion('');
    setErrorMessage('');
    onClose();
  };

  const firstImage = Array.isArray(product?.images) && product.images.length > 0 
    ? product.images[0] 
    : (typeof product?.ImagePath === 'string' && product.ImagePath.startsWith('uploads') ? `/${product.ImagePath}` : product?.ImagePath);

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Satıcıya Soru Sor</h3>
            <p className={styles.modalSubtitle}>Ürün hakkında aklınıza takılan soruları doğrudan satıcıya iletin</p>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        {/* Giriş Yapılmamışsa */}
        {!token ? (
          <div className={styles.modalBody}>
            <div className={styles.notLoggedInBox}>
              <div className={styles.loginIcon}>🔒</div>
              <div className={styles.notLoggedInText}>Soru sormak için üye girişi yapmalısınız</div>
              <div className={styles.notLoggedInSub}>
                Sorularınızın takibi ve satıcı yanıt verdiğinde bilgilendirilebilmeniz için hesabınıza giriş yapın.
              </div>
              <button 
                className={styles.goToLoginBtn}
                onClick={() => {
                  window.location.href = '/giris-yap?redirect=' + encodeURIComponent(window.location.pathname);
                }}
              >
                Giriş Yap / Üye Ol
              </button>
            </div>
          </div>
        ) : isSubmitted ? (
          /* Başarılı Gönderim Ekranı */
          <div className={styles.modalBody}>
            <div className={styles.successBox}>
              <div className={styles.successIcon}>🎉</div>
              <div className={styles.successTitle}>Sorunuz Başarıyla İletildi!</div>
              <p className={styles.successDesc}>
                Sorunuz satıcı ekibimize ulaştı. İnceleme ve yanıtlama sürecinin ardından ürünün "Soru ve Cevap" alanında yayınlanacaktır.
              </p>
              <button className={styles.submitBtn} onClick={handleClose}>
                Tamam
              </button>
            </div>
          </div>
        ) : (
          /* Soru Sorma Formu */
          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
              {/* Ürün Özeti */}
              <div className={styles.productSummary}>
                {firstImage && (
                  <img
                    src={`${import.meta.env.VITE_API_URL || ''}${firstImage.startsWith('/') ? '' : '/'}${firstImage}`}
                    alt={product.ProductName}
                    className={styles.productImage}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className={styles.productDetails}>
                  <span className={styles.productBrand}>{product.Brand || 'Marka'}</span>
                  <span className={styles.productName}>{product.ProductName}</span>
                </div>
              </div>

              {/* Konu Seçimi */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <span>Soru Konusu</span>
                </label>
                <select
                  className={styles.selectInput}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Soru Metni */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <span>Sorunuz</span>
                  <span className={styles.charCount}>{question.length} / 500</span>
                </label>
                <textarea
                  className={styles.textareaInput}
                  placeholder="Ürün içeriği, kullanımı, paketleme veya teslimat hakkında sorunuzu yazın..."
                  value={question}
                  maxLength={500}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>

              {errorMessage && (
                <div style={{ color: '#e11d48', fontSize: '13px', background: '#ffe4e6', padding: '10px 14px', borderRadius: '8px' }}>
                  {errorMessage}
                </div>
              )}

              <div className={styles.privacyHint}>
                🔒 <strong>Gizlilik Koruması:</strong> Adınız ve soyadınız e-ticaret vitrininde tüm ziyaretçilere otomatik olarak yıldızlı (örn: A*** K***) olarak gösterilir.
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={handleClose}>
                İptal
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading || !question.trim()}
              >
                {loading ? 'Gönderiliyor...' : 'Soruyu Gönder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AskQuestionModal;
