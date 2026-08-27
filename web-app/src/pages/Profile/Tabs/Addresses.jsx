/**
 * ============================================================================
 * BİLEŞEN ADI: Addresses
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Info } from 'lucide-react';
import styles from './Addresses.module.css';
import AddressModal from './AddressModal';

// Dummy data removed, fetched from API now
const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  React.useEffect(() => {
    const fetchAddresses = async () => {
      const token = localStorage.getItem('customerToken');
      if (!token) return;
      try {
        const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.addresses) {
          setAddresses(data.addresses);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAddresses();
  }, []);


  const saveToBackend = async (newAddressesList) => {
    const token = localStorage.getItem('customerToken');
    if (!token) return;
    try {
      await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/addresses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ addresses: newAddressesList })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleAddAddress = (newAddress) => {
    let updated;
    if (newAddress.id) {
      updated = addresses.map(a => a.id === newAddress.id ? newAddress : a);
    } else {
      updated = [...addresses, { ...newAddress, id: Date.now() }];
    }
    setAddresses(updated);
    saveToBackend(updated);
    setIsModalOpen(false);
    setEditingAddress(null);
  };
  
  const handleEditClick = (addr) => {
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if(window.confirm('Bu adresi silmek istediğinize emin misiniz?')) {
        const updated = addresses.filter(a => a.id !== id);
        setAddresses(updated);
        saveToBackend(updated);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Adreslerim</h1>
          <p className={styles.subtitle}>Siparişlerinizde kullanacağınız adresleri yönetin.</p>
        </div>
        <button className={styles.addBtn} onClick={() => { setEditingAddress(null); setIsModalOpen(true); }}>
          <Plus size={16} /> Yeni Adres Ekle
        </button>
      </div>

      <div className={styles.addressGrid}>
        {addresses.length === 0 && <p className={styles.subtitle}>Kayıtlı adresiniz bulunmuyor.</p>}
        {addresses.map(addr => (
          <div key={addr.id} className={styles.addressCard}>
            {addr.isDefault && <span className={styles.defaultBadge}>Varsayılan Adres</span>}
            <h3 className={styles.cardTitle}>{addr.title}</h3>
            <div className={styles.cardBody}>
              <p className={styles.name}>{addr.name}</p>
              <p>{addr.neighborhood} {addr.addressDetail}</p>
              <p>{addr.district} / {addr.city}</p>
              <p>Türkiye</p>
              <p className={styles.phone}>Telefon: {addr.phone}</p>
            </div>
            
            <div className={styles.cardActions}>
              <button className={styles.actionBtn} onClick={() => handleEditClick(addr)}>
                <Edit3 size={14} /> Düzenle
              </button>
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(addr.id)}>
                <Trash2 size={14} /> Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.infoBox}>
        <Info size={16} className={styles.infoIcon} />
        <span>Adreslerinizi sipariş verirken seçebilir veya yeni adres ekleyebilirsiniz.</span>
      </div>

      <AddressModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingAddress(null); }} 
        onSave={handleAddAddress}
        initialData={editingAddress}
      />
    </div>
  );
};

export default Addresses;


