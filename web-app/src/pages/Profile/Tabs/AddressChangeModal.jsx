/**
 * ============================================================================
 * BİLEŞEN ADI: AddressChangeModal
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import styles from './AddressChangeModal.module.css';

const AddressChangeModal = ({ isOpen, onClose, order, onAddressUpdated }) => {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (isOpen && order) {
            fetchAddresses();
        }
    }, [isOpen, order]);

    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('customerToken');
            const res = await fetch('http://localhost:3000/api/customers/auth/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.addresses) {
                setAddresses(data.addresses);
            }
        } catch (error) {
            console.error('Adresler yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatAddressString = (a, index) => {
        return `[ADRES ${index + 1}: ${a.title?.toUpperCase() || 'ADRES'}]
Ad Soyad: ${a.name}
Telefon: ${a.phone}
İl/İlçe: ${a.city} / ${a.district}
Mahalle: ${a.neighborhood}
Açık Adres: ${a.addressDetail}
${a.isDefault ? '(Varsayılan Adres)' : ''}`.trim();
    };

    const handleSubmit = async () => {
        if (selectedAddressIndex === null) return;
        
        const selectedObj = addresses[selectedAddressIndex];
        const formattedAddress = formatAddressString(selectedObj, selectedAddressIndex);
        
        setUpdating(true);
        try {
            const token = localStorage.getItem('customerToken');
            const res = await fetch(`http://localhost:3000/api/customers/auth/my-orders/${order.Id}/address`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ shippingAddress: formattedAddress })
            });
            
            const data = await res.json();
            if (data.success) {
                alert('Adres başarıyla güncellendi!');
                onAddressUpdated();
                onClose();
            } else {
                alert(data.message || 'Adres güncellenemedi.');
            }
        } catch (error) {
            console.error('Adres güncellenirken hata:', error);
            alert('Sunucu ile iletişim kurulamadı.');
        } finally {
            setUpdating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Sipariş Adresini Değiştir</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '14px' }}>
                        <strong>#{order.OrderNumber}</strong> numaralı siparişinizin teslimat adresini güncelliyorsunuz. Lütfen aşağıdan kayıtlı adreslerinizden birini seçin:
                    </p>

                    {loading ? (
                        <div className={styles.loading}>Adresleriniz yükleniyor...</div>
                    ) : addresses.length === 0 ? (
                        <div className={styles.emptyState}>
                            <MapPin size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                            <div>Sistemde kayıtlı adresiniz bulunamadı.</div>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Lütfen önce profilinizden bir adres ekleyin.</div>
                        </div>
                    ) : (
                        <div className={styles.addressList}>
                            {addresses.map((addr, index) => (
                                <div 
                                    key={index}
                                    className={`${styles.addressCard} ${selectedAddressIndex === index ? styles.selected : ''}`}
                                    onClick={() => setSelectedAddressIndex(index)}
                                >
                                    <input 
                                        type="radio" 
                                        className={styles.radioBtn}
                                        checked={selectedAddressIndex === index}
                                        onChange={() => setSelectedAddressIndex(index)}
                                    />
                                    <div className={styles.addressInfo}>
                                        <div className={styles.addressTitle}>
                                            {addr.title}
                                            {addr.isDefault && <span className={styles.defaultBadge}>Varsayılan</span>}
                                        </div>
                                        <p className={styles.addressDetail}>
                                            {addr.name} - {addr.phone} <br/>
                                            {addr.neighborhood} Mah. {addr.addressDetail} <br/>
                                            {addr.district} / {addr.city}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose} disabled={updating}>
                        İptal
                    </button>
                    <button 
                        className={styles.submitBtn} 
                        onClick={handleSubmit} 
                        disabled={selectedAddressIndex === null || updating}
                    >
                        {updating ? 'Güncelleniyor...' : 'Adresi Güncelle'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddressChangeModal;


