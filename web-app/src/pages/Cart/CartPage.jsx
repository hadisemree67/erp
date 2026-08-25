/**
 * ============================================================================
 * BİLEŞEN ADI: CartPage
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Kullanıcının alışveriş sepetini, ürün adetlerini ve toplam tutarı gösteren arayüz.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import styles from './CartPage.module.css';
import { Trash2, ChevronLeft, Truck, RotateCcw, ShieldCheck, Lock, AlertCircle } from 'lucide-react';

const CartPage = () => {
    const { cartItems, removeFromCart, updateQuantity, cartTotalAmount, cartItemsCount, campaignDiscountAmount, appliedCampaigns } = useCart();
    const navigate = useNavigate();
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');
    const [invalidItems, setInvalidItems] = useState([]);

    const handleApplyCoupon = async () => {
        setCouponError('');
        setCouponSuccess('');
        if (!couponCode.trim()) return setCouponError('Lütfen bir kupon kodu girin.');
        
        const token = localStorage.getItem('customerToken');
        if (!token) return setCouponError('Kupon kullanmak için giriş yapmalısınız.');
        
        try {
            const res = await fetch('http://localhost:3000/api/coupons/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: couponCode.trim(), cartTotal: cartTotalAmount })
            });
            const data = await res.json();
            
            if (data.success) {
                setCouponDiscount(data.discountAmount);
                setCouponSuccess(`${data.coupon.discount_type === 'Percentage' ? '%' + data.coupon.discount_value : data.coupon.discount_value + ' TL'} indirim başarıyla uygulandı!`);
            } else {
                setCouponError(data.message || 'Kupon uygulanamadı.');
                setCouponDiscount(0);
            }
        } catch (err) {
            setCouponError('Sunucuya bağlanılamadı.');
            setCouponDiscount(0);
        }
    };

    useEffect(() => {
        const validateCart = async () => {
            const sid = localStorage.getItem('cart_session_id');
            if (!sid || cartItems.length === 0) {
                return;
            }
            try {
                const res = await fetch(`http://localhost:3000/api/cart/validate-stock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sid,
                        items: cartItems.map(i => ({ Id: i.Id, quantity: i.quantity }))
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setInvalidItems(data.invalidIds || []);
                }
            } catch (err) {
                console.error("Cart validation error", err);
            }
        };
        validateCart();
        const interval = setInterval(validateCart, 10000); // 10 saniyede bir kontrol et
        return () => clearInterval(interval);
    }, [cartItems]);

    const shippingCost = cartTotalAmount < 2000 ? 50.00 : 0.00;
    const discount = couponDiscount || 0; // İndirim kuponu değerini al
    const totalDiscount = discount + (campaignDiscountAmount || 0);
    const finalTotal = cartTotalAmount + shippingCost - totalDiscount;

    const handleIncrement = (item) => {
        // En fazla 10 veya stok kadar artırılabilir (stok kontrolü context'te API ile yapılıyor)
        updateQuantity(item.Id, item.quantity + 1);
    };

    const handleDecrement = (item) => {
        if (item.quantity > 1) {
            updateQuantity(item.Id, item.quantity - 1);
        } else {
            removeFromCart(item.Id);
        }
    };

    if (cartItems.length === 0) {
        return (
            <div className={styles.emptyCartContainer}>
                <div className={styles.emptyCartIcon}>🛒</div>
                <h2 className={styles.emptyCartTitle}>Sepetiniz şu an boş.</h2>
                <p className={styles.emptyCartDesc}>Alışverişe başlamak için ürünlerimize göz atın.</p>
                <button className={styles.continueShoppingBtn} onClick={() => navigate('/')}>
                    ALIŞVERİŞE BAŞLA
                </button>
            </div>
        );
    }

    return (
        <div className={styles.cartPageContainer}>
            <h1 className={styles.pageTitle}>Sepetim <span className={styles.itemCount}>({cartItemsCount} Ürün)</span></h1>

            <div className={styles.cartContentWrapper}>
                <div className={styles.cartLeftColumn}>
                    <div className={styles.cartItemsList}>
                        {cartItems.map(item => {
                            let imagePath = '';
                            if (item.ImagePath) {
                                try {
                                    const parsedImages = JSON.parse(item.ImagePath);
                                    imagePath = Array.isArray(parsedImages) && parsedImages.length > 0 ? parsedImages[0] : '';
                                } catch (e) {
                                    imagePath = item.ImagePath;
                                }
                            }
                            const imgSrc = imagePath ? (imagePath.startsWith('http') ? imagePath : `http://localhost:3000${imagePath}`) : '/placeholder-image.png';

                            const isInvalid = invalidItems.includes(item.Id);

                            return (
                                <div key={item.Id} className={`${styles.cartItem} ${isInvalid ? styles.invalidItem : ''}`}>
                                    <div className={styles.itemImageWrapper}>
                                        <img src={imgSrc} alt={item.ProductName} className={styles.itemImage} style={{ opacity: isInvalid ? 0.5 : 1 }} />
                                    </div>
                                    <div className={styles.itemDetails}>
                                        <h3 className={styles.itemTitle}>{item.ProductName}</h3>
                                        {/* Eğer ürünün hacmi/miktarı varsa gösterebiliriz */}
                                        {item.Volume && item.Volume > 0 && <p className={styles.itemVolume}>{item.Volume} {item.unit_type === 'Litre' ? 'L' : 'ml'}</p>}
                                        <div className={styles.itemPriceRow}>
                                            <span className={styles.itemPrice}>{Number(item.SalePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                            {isInvalid && <span className={styles.invalidBadge}><AlertCircle size={14}/> Stok Tükendi</span>}
                                            <div className={styles.itemActions}>
                                                <div className={styles.quantityControls} style={{ opacity: isInvalid ? 0.5 : 1, pointerEvents: isInvalid ? 'none' : 'auto' }}>
                                                    <button className={styles.qtyBtn} onClick={() => handleDecrement(item)}>-</button>
                                                    <span className={styles.qtyValue}>{item.quantity}</span>
                                                    <button className={styles.qtyBtn} onClick={() => handleIncrement(item)}>+</button>
                                                </div>
                                                <button className={styles.deleteBtn} onClick={() => removeFromCart(item.Id)}>
                                                    <Trash2 size={16} /> Sil
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.trustBannersLeft}>
                        <div className={styles.trustItem}>
                            <Truck className={styles.trustIcon} />
                            <span>2000 TL ve üzeri<br/>kargo ücretsiz</span>
                        </div>
                        <div className={styles.trustItem}>
                            <RotateCcw className={styles.trustIcon} />
                            <span>14 gün içinde<br/>iade</span>
                        </div>
                        <div className={styles.trustItem}>
                            <ShieldCheck className={styles.trustIcon} />
                            <span>Orijinal ürün<br/>garantisi</span>
                        </div>
                        <div className={styles.trustItem}>
                            <Lock className={styles.trustIcon} />
                            <span>Güvenli<br/>ödeme</span>
                        </div>
                    </div>
                </div>

                <div className={styles.cartRightColumn}>
                    <div className={styles.orderSummaryBox}>
                        <h2 className={styles.summaryTitle}>Sipariş Özeti</h2>
                        
                        <div className={styles.summaryRow}>
                            <span>Ara Toplam ({cartItemsCount} Ürün)</span>
                            <span>{cartTotalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Kargo</span>
                            <span>{shippingCost === 0 ? '0,00 TL' : `${shippingCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                                <span>İndirim (Kampanya)</span>
                                <span>- {totalDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                            </div>
                        )}
                        {appliedCampaigns && appliedCampaigns.length > 0 && (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {appliedCampaigns.map((camp, idx) => (
                                    <div key={idx} style={{ background: '#f0fdf4', color: '#166534', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>✓</span> {camp}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className={styles.totalRow}>
                            <span>Toplam</span>
                            <div className={styles.totalPriceWrapper}>
                                <span className={styles.totalPrice}>{finalTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                <span className={styles.kdvNote}>KDV dahil</span>
                            </div>
                        </div>

                        {/* İndirim Kuponu */}
                        <div className={styles.couponContainer}>
                            <input 
                                type="text" 
                                placeholder="İndirim Kodu Giriniz" 
                                value={couponCode} 
                                onChange={(e) => setCouponCode(e.target.value)} 
                                className={styles.couponInput}
                            />
                            <button className={styles.couponApplyBtn} onClick={handleApplyCoupon}>KULLAN</button>
                        </div>
                        {couponError && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>{couponError}</div>}
                        {couponSuccess && <div style={{ color: '#10b981', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>{couponSuccess}</div>}

                        <button 
                            className={styles.checkoutBtn} 
                            disabled={invalidItems.length > 0} 
                            style={{ opacity: invalidItems.length > 0 ? 0.5 : 1, cursor: invalidItems.length > 0 ? 'not-allowed' : 'pointer' }}
                            onClick={() => navigate('/checkout')}
                        >
                            SİPARİŞİ TAMAMLA
                        </button>
                        
                        <button className={styles.backToShopBtn} onClick={() => navigate('/')}>
                            <ChevronLeft size={16} /> ALIŞVERİŞE DEVAM ET
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.footerTrustBanners}>
                <div className={styles.footerTrustItem}>
                    <ShieldCheck size={32} color="#0d9488" />
                    <div>
                        <h4>%100 Güvenli Alışveriş</h4>
                        <p>Kişisel bilgileriniz SSL sertifikası ile korunur.</p>
                    </div>
                </div>
                <div className={styles.footerTrustItem}>
                    <RotateCcw size={32} color="#0d9488" />
                    <div>
                        <h4>14 Gün İçinde İade</h4>
                        <p>Memnun kalmadığınız ürünleri kolayca iade edin.</p>
                    </div>
                </div>
                <div className={styles.footerTrustItem}>
                    <div style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0d9488', borderRadius: '50%', color: '#0d9488' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>?</span>
                    </div>
                    <div>
                        <h4>7/24 Müşteri Desteği</h4>
                        <p>Her zaman yanınızdayız.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;


