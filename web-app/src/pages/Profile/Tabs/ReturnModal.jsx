/**
 * ============================================================================
 * BİLEŞEN ADI: ReturnModal
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './ReturnModal.module.css';

const ReturnModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [requestType, setRequestType] = useState('İade');
  const [reason, setReason] = useState('Ürün hasarlı geldi');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !order) return null;

  const handleItemToggle = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.Id === item.Id);
      if (exists) {
        return prev.filter(i => i.Id !== item.Id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setError('Lütfen iade/değişim yapmak istediğiniz en az bir ürünü seçin.');
      return;
    }

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('customerToken');
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.Id,
          request_type: requestType,
          reason,
          description,
          items: selectedItems.map(item => ({
            product_id: item.ProductId,
            product_name: item.ProductName,
            quantity: item.Quantity,
            price: item.UnitPrice,
            image_path: item.ImagePath
          }))
        })
      });

      const data = await response.json();
      if (data.success) {
        onSuccess(data.message);
        onClose();
        // Reset state
        setSelectedItems([]);
        setRequestType('İade');
        setReason('Ürün hasarlı geldi');
        setDescription('');
      } else {
        setError(data.message || 'Talebiniz oluşturulurken bir hata oluştu.');
      }
    } catch (err) {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>İade / Değişim Talebi</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h3>1. Ürün Seç</h3>
            <p className={styles.subtitle}>Sipariş: #{order.OrderNumber} ({order.items?.length} ürün)</p>
            <div className={styles.productList}>
              {order.items?.map(item => (
                <label key={item.Id} className={styles.productItem}>
                  <input
                    type="checkbox"
                    checked={!!selectedItems.find(i => i.Id === item.Id)}
                    onChange={() => handleItemToggle(item)}
                  />
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>{item.ProductName}</span>
                    <span className={styles.productDetails}>{item.Quantity} {item.Unit} - {item.UnitPrice} TL</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h3>2. Talep Türü</h3>
            <div className={styles.radioGroup}>
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="requestType"
                  value="İade"
                  checked={requestType === 'İade'}
                  onChange={(e) => setRequestType(e.target.value)}
                />
                <span>↩️ İade</span>
              </label>
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="requestType"
                  value="Ürün değişimi"
                  checked={requestType === 'Ürün değişimi'}
                  onChange={(e) => setRequestType(e.target.value)}
                />
                <span>🔄 Ürün değişimi</span>
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h3>3. İade / Değişim Nedeni</h3>
            <select
              className={styles.select}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Ürün hasarlı geldi">Ürün hasarlı geldi</option>
              <option value="Yanlış ürün gönderildi">Yanlış ürün gönderildi</option>
              <option value="Beklentimi karşılamadı">Beklentimi karşılamadı</option>
              <option value="Fikrim değişti">Fikrim değişti</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div className={styles.section}>
            <h3>4. Açıklama (İsteğe bağlı)</h3>
            <textarea
              className={styles.textarea}
              placeholder="Talebinizle ilgili eklemek istediklerinizi yazabilirsiniz..."
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className={styles.section}>
            <h3>5. Fotoğraf Ekle (Yakında)</h3>
            <p className={styles.subtitle}>Görsel yükleme özelliği çok yakında eklenecektir.</p>
            <input type="file" disabled className={styles.fileInput} />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              İptal
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading || selectedItems.length === 0}>
              {loading ? 'Gönderiliyor...' : 'Talebi Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnModal;


