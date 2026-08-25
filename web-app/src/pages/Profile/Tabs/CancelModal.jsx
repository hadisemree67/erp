/**
 * ============================================================================
 * BİLEŞEN ADI: CancelModal
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './ReturnModal.module.css';

const CancelModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('Vazgeçtim');
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

  const handleSelectAll = () => {
    if (selectedItems.length === order.items?.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(order.items || []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setError('Lütfen iptal etmek istediğiniz en az bir ürünü seçin.');
      return;
    }

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('customerToken');
    try {
      const response = await fetch('http://localhost:3000/api/customers/auth/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.Id,
          request_type: 'iptal',
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
        onSuccess('İptal talebiniz başarıyla oluşturuldu.');
        onClose();
        // Reset state
        setSelectedItems([]);
        setReason('Vazgeçtim');
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
          <h2>Siparişi İptal Et</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>1. İptal Edilecek Ürünleri Seç</h3>
                <button 
                    type="button" 
                    onClick={handleSelectAll} 
                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                >
                    {selectedItems.length === order.items?.length ? 'Tüm Seçimi Kaldır' : 'Tümünü Seç'}
                </button>
            </div>
            
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
                    <span className={styles.productDetails}>{item.Quantity} {item.Unit} - {Number(item.UnitPrice).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h3>2. İptal Nedeni</h3>
            <select
              className={styles.select}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Vazgeçtim">Vazgeçtim</option>
              <option value="Siparişi yanlış verdim">Siparişi yanlış verdim</option>
              <option value="Fiyatı düştü">Fiyatı düştü</option>
              <option value="Teslimat süresi çok uzun">Teslimat süresi çok uzun</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div className={styles.section}>
            <h3>3. Açıklama (İsteğe bağlı)</h3>
            <textarea
              className={styles.textarea}
              placeholder="Eklemek istediğiniz bir detay varsa buraya yazabilirsiniz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Kapat
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Gönderiliyor...' : 'İptal Talebini Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelModal;


