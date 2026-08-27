/**
 * ============================================================================
 * BİLEŞEN ADI: CheckoutPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Ödeme, adres seçimi ve sipariş tamamlama (Checkout) işlemlerini yürüten ekran.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import styles from './CheckoutPage.module.css';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const CheckoutPage = () => {
    const { cartItems, cartTotalAmount, cartItemsCount, clearCart, campaignDiscountAmount } = useCart();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: currentUser?.CustomerName || '',
        email: currentUser?.Email || '',
        phone: currentUser?.Phone || '',
        address: currentUser?.Address || '',
        shipperId: ''
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [shippers, setShippers] = useState([]);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');

    useEffect(() => {
        if (currentUser) {
            setFormData(prev => ({
                ...prev,
                name: prev.name || currentUser.CustomerName || '',
                email: prev.email || currentUser.Email || '',
                phone: prev.phone || currentUser.Phone || '',
                address: prev.address || currentUser.Address || ''
            }));
        }
    }, [currentUser]);

    useEffect(() => {
        if (cartItems.length === 0) {
            navigate('/sepetim');
        }

        // Kargo firmalarını çek
        const fetchShippers = async () => {
            try {
                const res = await fetch(import.meta.env.VITE_API_URL + '/api/shippers/public');
                const data = await res.json();
                if (data.success) {
                    setShippers(data.data);
                    if (data.data.length > 0) {
                        setFormData(prev => ({ ...prev, shipperId: data.data[0].Id }));
                    }
                }
            } catch (err) {
                console.error("Kargolar alınamadı:", err);
            }
        };
        fetchShippers();

        // Eğer kullanıcı giriş yaptıysa adreslerini çek
        const fetchAddresses = async () => {
            const token = localStorage.getItem('customerToken');
            if (token) {
                try {
                    const res = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/profile', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        if (data.user) {
                            setFormData(prev => ({
                                ...prev,
                                name: prev.name || (data.user.firstName + ' ' + data.user.lastName).trim() || '',
                                email: prev.email || data.user.email || '',
                                phone: prev.phone || data.user.phone || ''
                            }));
                        }

                        if (data.addresses && data.addresses.length > 0) {
                            setSavedAddresses(data.addresses);
                            // Varsayılan adresi otomatik seç
                            const defaultAddr = data.addresses.find(a => a.isDefault) || data.addresses[0];
                            handleAddressSelect(defaultAddr.id, data.addresses);
                        }
                    }
                } catch (err) {
                    console.error("Profil/Adres bilgileri alınamadı:", err);
                }
            }
        };
        fetchAddresses();
    }, [cartItems, navigate]);

    const handleAddressSelect = (id, addressesList = savedAddresses) => {
        setSelectedAddressId(id);
        if (id === 'new') {
            setFormData(prev => ({ 
                ...prev, 
                address: '', 
                name: currentUser?.CustomerName || prev.name, 
                phone: currentUser?.Phone || prev.phone,
                email: currentUser?.Email || prev.email
            }));
            return;
        }
        const addr = addressesList.find(a => a.id.toString() === id.toString());
        if (addr) {
            const fullAddress = `${addr.neighborhood} ${addr.addressDetail}, ${addr.district} / ${addr.city}`;
            setFormData(prev => ({
                ...prev,
                name: addr.name || currentUser?.CustomerName || prev.name,
                phone: addr.phone || currentUser?.Phone || prev.phone,
                email: currentUser?.Email || prev.email,
                address: fullAddress
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const shippingCost = cartTotalAmount >= 2000 ? 0 : 50.00;
    const finalTotal = cartTotalAmount + shippingCost - (campaignDiscountAmount || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.address || !formData.phone) {
            toast.error("Lütfen ad, telefon ve adres alanlarını doldurunuz.");
            return;
        }

        setIsProcessing(true);

        const sid = localStorage.getItem('cart_session_id');

        try {
            // Ödeme simülasyonu
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await fetch(import.meta.env.VITE_API_URL + '/api/orders/public/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sid,
                    shippingAddress: formData.address,
                    customerInfo: {
                        id: currentUser?.Id || null,
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone
                    },
                    paymentMethod: 'Web (Kredi Kartı)',
                    shipperId: formData.shipperId,
                    items: cartItems.map(i => ({ Id: i.Id, quantity: i.quantity })),
                    discountAmount: campaignDiscountAmount || 0
                })
            });

            const data = await response.json();

            if (data.success) {
                // local storage'daki sepeti temizle
                localStorage.removeItem('cart_items');
                // state'deki sepeti de context içinden temizlemek için
                // Ama context reload olunca düzelecek. Veya bir fonksiyon çağırabiliriz
                window.location.href = `/checkout/success?order=${data.orderNumber}`;
            } else {
                toast.error(data.message || "Sipariş oluşturulamadı.");
                setIsProcessing(false);
            }
        } catch (error) {
            toast.error("Bir ağ hatası oluştu.");
            setIsProcessing(false);
        }
    };

    return (
        <div className={styles.checkoutContainer}>
            <div className={styles.checkoutLeft}>
                <h1 className={styles.pageTitle}>Ödeme ve Teslimat</h1>
                
                <form className={styles.checkoutForm} onSubmit={handleSubmit}>
                    <div className={styles.formSection}>
                        <h2>1. Teslimat Adresi</h2>
                        
                        {savedAddresses.length > 0 && (
                            <div className={styles.inputGroup} style={{ marginBottom: '24px' }}>
                                <label>Kayıtlı Adreslerimden Seç</label>
                                <select 
                                    className={styles.addressSelect}
                                    value={selectedAddressId} 
                                    onChange={(e) => handleAddressSelect(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '15px' }}
                                >
                                    <option value="new">+ Yeni Adres Gir</option>
                                    {savedAddresses.map(addr => (
                                        <option key={addr.id} value={addr.id}>
                                            {addr.title} ({addr.district}/{addr.city})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label>Ad Soyad</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className={styles.inputGroupRow}>
                            <div className={styles.inputGroup}>
                                <label>Telefon Numarası</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>E-posta</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} />
                            </div>
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Açık Adres</label>
                            <textarea name="address" rows="4" value={formData.address} onChange={handleChange} required></textarea>
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h2>2. Kargo Firması</h2>
                        <div className={styles.inputGroup}>
                            <select 
                                name="shipperId" 
                                value={formData.shipperId} 
                                onChange={handleChange}
                                required
                                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '15px', width: '100%' }}
                            >
                                <option value="" disabled>-- Kargo Seçiniz --</option>
                                {shippers.length > 0 ? (
                                    shippers.map(shipper => (
                                        <option key={shipper.Id} value={shipper.Id}>
                                            {shipper.CompanyName}
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="1">Elden Teslim</option>
                                        <option value="2">Aras Kargo</option>
                                        <option value="3">Hepsijet</option>
                                        <option value="4">MNG Kargo</option>
                                        <option value="5">PTT Kargo</option>
                                        <option value="6">Sürat Kargo</option>
                                        <option value="7">Trendyol Express</option>
                                        <option value="8">UPS Kargo</option>
                                        <option value="9">Yurtiçi Kargo</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h2>3. Ödeme Bilgileri</h2>
                        <div className={styles.mockPaymentNotice}>
                            <ShieldCheck size={24} color="#0d9488" />
                            <p>Sisteminizde güvenli ödeme simülasyonu devrededir. Kart bilgisi girmeden siparişi tamamlayabilirsiniz.</p>
                        </div>
                    </div>
                </form>
            </div>

            <div className={styles.checkoutRight}>
                <div className={styles.summaryBox}>
                    <h2>Sipariş Özeti</h2>
                    <div className={styles.summaryItems}>
                        {cartItems.map(item => (
                            <div key={item.Id} className={styles.summaryItem}>
                                <span>{item.quantity}x {item.ProductName}</span>
                                <span>{(item.quantity * item.SalePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                            </div>
                        ))}
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Ara Toplam</span>
                        <span>{cartTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Kargo</span>
                        <span>{shippingCost === 0 ? 'Ücretsiz' : `${shippingCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`}</span>
                    </div>
                    {campaignDiscountAmount > 0 && (
                        <div className={styles.summaryRow} style={{ color: '#059669', fontWeight: 'bold' }}>
                            <span>Kampanya İndirimi</span>
                            <span>- {campaignDiscountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                        </div>
                    )}
                    <div className={styles.totalRow}>
                        <span>Ödenecek Tutar</span>
                        <span className={styles.totalPrice}>{finalTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                    </div>

                    <button 
                        className={styles.completeBtn} 
                        onClick={handleSubmit} 
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'İŞLENİYOR...' : 'ÖDEMEYİ TAMAMLA'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;


