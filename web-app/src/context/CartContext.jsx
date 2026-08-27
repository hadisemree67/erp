/**
 * ============================================================================
 * BİLEŞEN ADI: CartContext
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { toast } from 'react-toastify';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        const savedCart = localStorage.getItem('cart_items');
        if (savedCart) {
            try {
                return JSON.parse(savedCart);
            } catch (e) {
                console.error("Sepet parse hatası", e);
            }
        }
        return [];
    });
    const [sessionId, setSessionId] = useState(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [campaigns, setCampaigns] = useState([]);
    const [appliedCampaigns, setAppliedCampaigns] = useState([]);
    const [campaignDiscountAmount, setCampaignDiscountAmount] = useState(0);

    // Kampanyaları çek
    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const res = await axios.get(import.meta.env.VITE_API_URL + '/api/campaigns/public');
                if (res.data.success) {
                    setCampaigns(res.data.data);
                }
            } catch (err) {
                console.error("Kampanyalar çekilemedi:", err);
            }
        };
        fetchCampaigns();
    }, []);

    // Sepetteki ürünlerin güncel fiyat ve isimlerini backend'den senkronize et
    useEffect(() => {
        const syncCartItems = async () => {
            const savedCart = localStorage.getItem('cart_items');
            if (!savedCart) return;
            
            try {
                const items = JSON.parse(savedCart);
                if (items.length === 0) return;

                let isUpdated = false;
                const updatedItems = await Promise.all(items.map(async (item) => {
                    try {
                        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/products/public/${item.Id}`);
                        if (res.data.success) {
                            const fresh = res.data.data;
                            if (
                                item.ProductName !== fresh.ProductName || 
                                item.SalePrice !== fresh.SalePrice || 
                                item.ImagePath !== fresh.ImagePath
                            ) {
                                isUpdated = true;
                                return { ...fresh, quantity: item.quantity };
                            }
                        } else {
                            // Ürün pasife alınmış veya silinmiş olabilir
                            isUpdated = true;
                            return null;
                        }
                    } catch (err) {
                        console.error(`Ürün güncellenirken hata oluştu (ID: ${item.Id}):`, err);
                    }
                    return item;
                }));

                if (isUpdated) {
                    const finalItems = updatedItems.filter(i => i !== null);
                    setCartItems(finalItems);
                    localStorage.setItem('cart_items', JSON.stringify(finalItems));
                    toast.info('Sepetinizdeki bazı ürünlerin fiyat veya bilgileri güncellendi.');
                }
            } catch (e) {
                console.error("Sepet senkronizasyon hatası:", e);
            }
        };

        syncCartItems();
    }, []);

    useEffect(() => {
        let sid = localStorage.getItem('cart_session_id');
        if (!sid) {
            sid = uuidv4();
            localStorage.setItem('cart_session_id', sid);
        }
        setSessionId(sid);
    }, []);

    // Her sepet değiştiğinde local storage'a kaydet
    useEffect(() => {
        if (cartItems.length > 0 || localStorage.getItem('cart_items')) {
            localStorage.setItem('cart_items', JSON.stringify(cartItems));
        }
    }, [cartItems]);

    // Arka planda rezervasyonları canlı tut
    useEffect(() => {
        if (cartItems.length > 0 && sessionId) {
            const interval = setInterval(async () => {
                try {
                    await axios.post(import.meta.env.VITE_API_URL + '/api/cart/ping', { session_id: sessionId });
                } catch (e) {
                    console.error("Ping error", e);
                }
            }, 5 * 60 * 1000); // Her 5 dakikada bir ping at
            return () => clearInterval(interval);
        }
    }, [cartItems, sessionId]);

    const addToCart = async (product, quantity = 1) => {
        if (!sessionId) return { success: false, message: 'Oturum yükleniyor...' };

        const existingItem = cartItems.find(item => item.Id === product.Id);
        const newTotalQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

        try {
            // Arka plandan stok ayır
            const res = await axios.post(import.meta.env.VITE_API_URL + '/api/cart/reserve', {
                session_id: sessionId,
                product_id: product.Id,
                quantity: newTotalQuantity
            });

            if (res.data.success) {
                setCartItems(prev => {
                    const existingItem = prev.find(item => item.Id === product.Id);
                    if (existingItem) {
                        return prev.map(item => 
                            item.Id === product.Id 
                                ? { ...item, quantity: item.quantity + quantity }
                                : item
                        );
                    }
                    return [...prev, { ...product, quantity }];
                });
                toast.success('Ürün sepete eklendi!');
                return { success: true };
            } else {
                toast.error(res.data.message || 'Stok ayırma başarısız.');
                return { success: false, message: res.data.message || 'Stok ayırma başarısız.' };
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Ağ hatası. Sepete eklenemedi.';
            toast.error(errorMsg);
            return { success: false, message: errorMsg };
        }
    };

    const removeFromCart = async (productId) => {
        if (!sessionId) return;
        
        try {
            await axios.post(import.meta.env.VITE_API_URL + '/api/cart/release', {
                session_id: sessionId,
                product_id: productId
            });
            
            setCartItems(prev => prev.filter(item => item.Id !== productId));
        } catch (e) {
            console.error("Remove from cart error", e);
        }
    };

    const updateQuantity = async (productId, newQuantity) => {
        if (!sessionId) return { success: false };
        if (newQuantity <= 0) {
            await removeFromCart(productId);
            return { success: true };
        }

        try {
            const res = await axios.post(import.meta.env.VITE_API_URL + '/api/cart/reserve', {
                session_id: sessionId,
                product_id: productId,
                quantity: newQuantity
            });

            if (res.data.success) {
                setCartItems(prev => prev.map(item => 
                    item.Id === productId 
                        ? { ...item, quantity: newQuantity }
                        : item
                ));
                return { success: true };
            } else {
                return { success: false, message: res.data.message || 'Stok yetersiz.' };
            }
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Ağ hatası.' };
        }
    };

    const clearCart = async () => {
        if (!sessionId) return;
        try {
            await axios.post(import.meta.env.VITE_API_URL + '/api/cart/clear', { session_id: sessionId });
            setCartItems([]);
            localStorage.removeItem('cart_items');
        } catch (e) {
            console.error("Clear cart error", e);
        }
    };

    const rawTotalAmount = cartItems.reduce((acc, item) => acc + (parseFloat(item.SalePrice) * item.quantity), 0);
    const cartItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    // Kampanya İndirimi Hesaplama
    useEffect(() => {
        let discount = 0;
        let applied = [];

        if (campaigns.length > 0 && cartItems.length > 0) {
            campaigns.forEach(camp => {
                let applicableItems = cartItems;
                
                // Eğer kampanya sadece belirli ürünleri kapsıyorsa
                if (camp.target_product_ids && camp.target_product_ids.length > 0) {
                    applicableItems = cartItems.filter(item => camp.target_product_ids.includes(item.Id));
                }

                if (applicableItems.length === 0) return;

                if (camp.campaign_type === 'buy_x_pay_y') {
                    // X al Y öde (Örn: 2 al 1 öde)
                    applicableItems.forEach(item => {
                        const bQty = camp.buy_quantity;
                        const pQty = camp.pay_quantity;
                        if (item.quantity >= bQty) {
                            // Örnek: 2 al 1 öde. 3 tane aldıysan 1 bedava.
                            // Formül: Math.floor(quantity / buy_quantity) * (buy_quantity - pay_quantity) = bedava ürün adedi
                            const freeCount = Math.floor(item.quantity / bQty) * (bQty - pQty);
                            const itemPrice = parseFloat(item.SalePrice);
                            if (freeCount > 0) {
                                discount += freeCount * itemPrice;
                                if (!applied.includes(camp.title)) applied.push(camp.title);
                            }
                        }
                    });
                } else if (camp.campaign_type === 'min_amount_discount') {
                    // Belirli tutar üzeri % indirim
                    // Sepetteki kampanya kapsamındaki ürünlerin toplamı min_amount'u geçiyor mu?
                    const applicableTotal = applicableItems.reduce((acc, item) => acc + (parseFloat(item.SalePrice) * item.quantity), 0);
                    if (applicableTotal >= camp.min_amount) {
                        const discVal = applicableTotal * (camp.discount_rate / 100);
                        discount += discVal;
                        if (!applied.includes(camp.title)) applied.push(camp.title);
                    }
                } else if (camp.campaign_type === 'gift_product') {
                    // Hediye ürün
                    const totalQty = applicableItems.reduce((acc, item) => acc + item.quantity, 0);
                    if (totalQty >= camp.buy_quantity) {
                        // Burada indirim hesaplamıyoruz, sadece hediye bilgisini applied içine yazıyoruz.
                        if (!applied.includes(camp.title)) applied.push(`🎁 Hediye: ${camp.gift_product_name}`);
                    }
                }
            });
        }

        setCampaignDiscountAmount(discount);
        setAppliedCampaigns(applied);
    }, [cartItems, campaigns, rawTotalAmount]);

    // cartTotalAmount artık sadece ham toplam (rawTotalAmount). 
    // Fatura hesaplaması CartPage'de finalTotal = rawTotalAmount - campaignDiscountAmount şeklinde yapılacak.
    const cartTotalAmount = rawTotalAmount;

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotalAmount,
            cartItemsCount,
            isCartOpen,
            setIsCartOpen,
            campaignDiscountAmount,
            appliedCampaigns
        }}>
            {children}
        </CartContext.Provider>
    );
};


