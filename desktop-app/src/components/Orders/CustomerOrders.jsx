/*
 * ÖZET:
 * Bu dosya (CustomerOrders.jsx), Müşteri siparişleri, kargo takibi ve siparişlerin paketlenmesi aşamalarını içerir.
 */

import React, { useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '../../utils/api';
import * as XLSX from 'xlsx';

const CustomerOrders = ({ currentUser, onNavigate, statusFilter = 'Beklemede', customerId = null }) => {
    const hasPerm = (key) => currentUser?.role === 'admin' || (currentUser?.permissions || []).includes(key);
    // 1. Durum (State) Tanımlamaları ve Hook'lar
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [boxes, setBoxes] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [shippers, setShippers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(statusFilter === 'tumu' ? 'Tümü' : statusFilter);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');

    // Order Create Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Kupon Durumları
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState(null);
    const [couponDiscount, setCouponDiscount] = useState(0);

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [shippingAddress, setShippingAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Nakit');
    const [selectedShipperId, setSelectedShipperId] = useState('');
    const [orderItems, setOrderItems] = useState([
        { productId: '', quantity: 1, unitPrice: 0 }
    ]);
    const [submitting, setSubmitting] = useState(false);

    // Pack Modal state (Removed, using inline selection now)
    const [packing, setPacking] = useState(false);
    const [manualBoxSelections, setManualBoxSelections] = useState({});

    // Packing Barcode Verification Modal State
    const [packingVerifyState, setPackingVerifyState] = useState({
        isOpen: false,
        order: null,
        scannedItems: {},
        barcodeInput: '',
        errorMsg: '',
        selectedBoxId: ''
    });

    // Detail Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

    // Label Modal
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);

    // Prompt Modal for Quantity
    const [qtyPrompt, setQtyPrompt] = useState({ isOpen: false, foundItem: null, remaining: 0, inputVal: '' });

    // Stats Modal
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [statsData, setStatsData] = useState([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsRange, setStatsRange] = useState('daily');

    // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

    useEffect(() => {
        fetchInitialData();
        const intervalId = setInterval(() => {
            fetchInitialData(false); // pass false to avoid loading spinner
        }, 5000);
        return () => clearInterval(intervalId);
    }, []);

    // 3. Backend API İstekleri (Veri Çekme)

    const fetchInitialData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [ordersRes, customersRes, productsRes, boxesRes, campaignsRes, shippersRes] = await Promise.all([
                apiFetch('http://localhost:3000/api/orders'),
                apiFetch('http://localhost:3000/api/customers'),
                apiFetch('http://localhost:3000/api/products'),
                apiFetch('http://localhost:3000/api/boxes'),
                apiFetch('http://localhost:3000/api/campaigns'),
                apiFetch('http://localhost:3000/api/shippers')
            ]);

            const ordersData = await ordersRes.json();
            const customersData = await customersRes.json();
            const productsData = await productsRes.json();
            const boxesData = await boxesRes.json();
            const campaignsData = await campaignsRes.json();
            const shippersData = await shippersRes.json();

            console.log("Orders Data:", ordersData);
            console.log("Customers Data:", customersData);
            
            const allOrders = ordersData.data || (Array.isArray(ordersData) ? ordersData : []);
            const allCustomers = customersData.data || (Array.isArray(customersData) ? customersData : []);
            const allProducts = productsData.data || (Array.isArray(productsData) ? productsData : []);
            const allBoxes = boxesData.data || (Array.isArray(boxesData) ? boxesData : []);
            const allCampaigns = campaignsData.data || (Array.isArray(campaignsData) ? campaignsData : []);
            const allShippers = shippersData.data || (Array.isArray(shippersData) ? shippersData : []);

            setOrders(allOrders);
            setCustomers(allCustomers);
            setProducts(allProducts);
            setBoxes(allBoxes.filter(b => b.IsActive));
            setCampaigns(allCampaigns.filter(c => c.status === 'Aktif'));
            setShippers(allShippers);
            
        } catch (err) {
            console.error('Veri yükleme hatası:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async (range) => {
        setStatsLoading(true);
        try {
            const res = await apiFetch(`http://localhost:3000/api/mobile/stats?range=${range}`);
            const data = await res.json();
            if (data.success) {
                setStatsData(data.stats || []);
            } else {
                alert('İstatistikler yüklenemedi.');
            }
        } catch (err) {
            console.error('Stats error:', err);
            alert('Sunucu bağlantı hatası.');
        } finally {
            setStatsLoading(false);
        }
    };

    const handleOpenStatsModal = async () => {
        setIsStatsModalOpen(true);
        setStatsRange('daily');
        fetchStats('daily');
    };

    const handleStatsRangeChange = (range) => {
        setStatsRange(range);
        fetchStats(range);
    };

    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)

    const handleAddItemRow = () => {
        setOrderItems([...orderItems, { productId: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleRemoveItemRow = (index) => {
        if (orderItems.length === 1) return;
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...orderItems];
        newItems[index][field] = value;

        // Ürün seçildiyse birim fiyatı otomatik getir
        if (field === 'productId') {
            const prod = products.find(p => p.Id === parseInt(value) || p.id === parseInt(value));
            if (prod) {
                newItems[index].unitPrice = prod.SalePrice || prod.Price || prod.price || prod.unit_price || 0;
            }
        }

        setOrderItems(newItems);
    };

    const handleApplyCoupon = async () => {
        setCouponError(null);
        if (!couponCodeInput.trim()) return;
        
        const validItems = orderItems.filter(i => i.productId && i.quantity > 0).map(item => {
             const prod = products.find(p => p.Id === parseInt(item.productId) || p.id === parseInt(item.productId));
             return {
                 ...item,
                 Category: prod ? prod.Category : ''
             };
        });
        
        if (validItems.length === 0) {
            setCouponError('Sepette geçerli ürün yok.');
            return;
        }

        try {
            const res = await apiFetch('http://localhost:3000/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCodeInput, items: validItems })
            });
            const data = await res.json();
            if (data.success) {
                setAppliedCoupon(data.coupon);
                setCouponDiscount(data.discountAmount);
                if (data.giftItem) {
                    setOrderItems([...orderItems.filter(i => !i.isGift), {
                        productId: data.giftItem.productId,
                        quantity: data.giftItem.quantity,
                        unitPrice: data.giftItem.unitPrice,
                        isGift: true
                    }]);
                }
                alert('Kupon başarıyla uygulandı!');
            } else {
                setCouponError(data.message);
                setAppliedCoupon(null);
                setCouponDiscount(0);
                // Hediye ürünleri temizle
                setOrderItems(orderItems.filter(i => !i.isGift));
            }
        } catch (e) {
            setCouponError('Kupon doğrulanırken hata oluştu.');
        }
    };

    const calculateTotalAndDiscount = () => {
            let total = 0;
            let discount = 0;
            let appliedCampaignName = null;
            let appliedCampaignId = null;

            orderItems.forEach(item => {
                const q = parseFloat(item.quantity) || 0;
                const p = parseFloat(item.unitPrice) || 0;
                const productId = parseInt(item.productId);
                
                let itemTotal = q * p;
                total += itemTotal;

                if (productId && q > 0) {
                    const prodCampaign = campaigns.find(c => {
                        if (c.campaign_type !== 'buy_x_pay_y') return false;
                        let ids = [];
                        try {
                            if (Array.isArray(c.target_product_ids)) ids = c.target_product_ids;
                            else if (typeof c.target_product_ids === 'string') ids = JSON.parse(c.target_product_ids);
                            else if (c.target_product_id) ids = [c.target_product_id];
                        } catch(e) {}
                        
                        return ids.map(id => String(id)).includes(String(productId));
                    });
                    if (prodCampaign) {
                        const x = parseInt(prodCampaign.buy_quantity);
                        const y = parseInt(prodCampaign.pay_quantity);
                        if (x > 0 && y >= 0 && x > y && q >= x) {
                            const groups = Math.floor(q / x);
                            const remainder = q % x;
                            const paidQty = (groups * y) + remainder;
                            const newTotal = paidQty * p;
                            discount += (itemTotal - newTotal);
                            appliedCampaignName = prodCampaign.title;
                            appliedCampaignId = prodCampaign.id;
                        }
                    }
                }
            });

            if (appliedCoupon) {
                discount += couponDiscount;
                appliedCampaignName = appliedCampaignName ? `${appliedCampaignName} + ${appliedCoupon.code}` : appliedCoupon.code;
            }

            return {
                rawTotal: total,
                finalTotal: total - discount,
                discount: discount,
                campaignName: appliedCampaignName,
                campaignId: appliedCampaignId
            };
    };

    const calculateTotal = () => {
        return calculateTotalAndDiscount().finalTotal;
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (!selectedCustomerId) {
            alert('Lütfen bir müşteri seçiniz.');
            return;
        }
        if (selectedShipperId !== 'ELDEN_TESLIM' && (!shippingAddress || !shippingAddress.trim())) {
            alert('Lütfen sevkiyat adresi giriniz.');
            return;
        }
        if (!selectedShipperId) {
            alert('Lütfen kargo şirketi seçiniz.');
            return;
        }

        const validItems = orderItems.filter(i => i.productId && i.quantity > 0);
        if (validItems.length === 0) {
            alert('Lütfen en az 1 geçerli ürün kalemi ekleyiniz.');
            return;
        }

        const calcResult = calculateTotalAndDiscount();

        setSubmitting(true);
        try {
            const res = await apiFetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomerId,
                    shippingAddress: selectedShipperId === 'ELDEN_TESLIM' ? 'Elden Teslim' : shippingAddress,
                    paymentMethod,
                    items: validItems,
                    userId: currentUser?.id,
                    campaignId: calcResult.campaignId,
                    campaignName: calcResult.campaignName,
                    discountAmount: calcResult.discount,
                    shipperId: selectedShipperId === 'ELDEN_TESLIM' ? null : selectedShipperId,
                    couponId: appliedCoupon ? appliedCoupon.id : null,
                    couponCode: appliedCoupon ? appliedCoupon.code : null
                })
            });

            const data = await res.json();
            if (data.success) {
                let alertMsg = data.message;
                alert(alertMsg);
                setIsModalOpen(false);
                setSelectedCustomerId('');
                setShippingAddress('');
                setPaymentMethod('Nakit');
                setSelectedShipperId('');
                setCouponCodeInput('');
                setAppliedCoupon(null);
                setCouponDiscount(0);
                setOrderItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
                fetchInitialData();
            } else {
                alert(data.message || 'Sipariş oluşturulamadı.');
            }
        } catch (err) {
            console.error('Sipariş hatası:', err);
            alert('Sipariş kaydedilirken sunucu hatası oluştu.');
        } finally {
            setSubmitting(false);
        }
    };



    const handleUpdateStatus = async (orderId, newStatus) => {
        if (newStatus === 'İptal' || newStatus === 'İptal Edildi') {
            if (!window.confirm('Bu siparişi iptal etmek istediğinize emin misiniz? (Düşülen stoklar orijinal raflarına iade edilecektir.)')) return;
        }
        
        try {
            const res = await apiFetch(`http://localhost:3000/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                fetchInitialData();
            } else {
                alert(data.message || 'Durum güncellenemedi.');
            }
        } catch (err) {
            console.error('Durum hatası:', err);
        }
    };

    const handleApproveOrder = async (orderId) => {
        if (!window.confirm('Bu siparişi onaylayıp Onaylandı aşamasına almak istediğinize emin misiniz?')) return;
        
        try {
            const res = await apiFetch(`http://localhost:3000/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Onaylandı' })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Sipariş Onaylandı. Artık depo toplayıcıları tarafından alınabilir.`);
                fetchInitialData();
            } else {
                alert(data.message || 'Sipariş onaylanamadı.');
            }
        } catch (err) {
            console.error('Onaylama hatası:', err);
            alert('Sunucu hatası.');
        }
    };

    const handlePackSubmit = async (order, boxId) => {
        if (!boxId) {
            alert('Lütfen bir kargo kutusu seçiniz.');
            return;
        }

        setPacking(true);
        try {
            const trackingNo = `CRG-${order.Id}-${Date.now().toString().slice(-4)}`;
            const res = await apiFetch(`http://localhost:3000/api/orders/${order.Id}/pack`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    BoxId: boxId,
                    TrackingNumber: trackingNo
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Sipariş paketlendi, Kargo Barkodu oluşturuldu.');
                fetchInitialData();
            } else {
                alert(data.message || 'Paketleme yapılamadı.');
            }
        } catch (err) {
            console.error('Paketleme hatası:', err);
        } finally {
            setPacking(false);
        }
    };

    const getRecommendedBox = (order) => {
        if (!boxes || boxes.length === 0) return null;
        
        const ordWeight = parseFloat(order.TotalWeight) || 0;
        
        let totalItemsVolume = 0;
        if (order && order.items) {
            order.items.forEach(item => {
                const w = parseFloat(item.Width) || 10;
                const h = parseFloat(item.Height) || 10;
                const d = parseFloat(item.Depth) || 10;
                const qty = parseInt(item.Quantity) || 1;
                totalItemsVolume += (w * h * d) * qty;
            });
        }
        
        let validBoxes = boxes.filter(b => {
            const boxNetW = parseFloat(b.Width) - 5;
            const boxNetD = parseFloat(b.Depth) - 5;
            const boxNetH = parseFloat(b.Height) - 3;
            const netVol = boxNetW * boxNetD * boxNetH;
            
            return parseFloat(b.MaxWeightCapacity) >= ordWeight && netVol >= totalItemsVolume;
        });
        
        if (validBoxes.length === 0) {
            // Hiçbir kutu yetmiyorsa, bari en büyük kutuyu önerelim.
            let allBoxes = [...boxes];
            allBoxes.sort((a, b) => {
                const volA = (parseFloat(a.Width)||1) * (parseFloat(a.Height)||1) * (parseFloat(a.Depth)||1);
                const volB = (parseFloat(b.Width)||1) * (parseFloat(b.Height)||1) * (parseFloat(b.Depth)||1);
                return volB - volA; // Azalan sıra (en büyük ilk)
            });
            return allBoxes[0];
        }
        
        // Yeterli olanlar arasından en küçüğünü seç
        validBoxes.sort((a, b) => {
            const volA = (parseFloat(a.Width)||1) * (parseFloat(a.Height)||1) * (parseFloat(a.Depth)||1);
            const volB = (parseFloat(b.Width)||1) * (parseFloat(b.Height)||1) * (parseFloat(b.Depth)||1);
            return volA - volB; // Artan sıra (en küçük yeterli olan ilk)
        });
        return validBoxes[0];
    };

    const handleOpenPackingModal = (order) => {
        const initialScanned = {};
        if (order && order.items) {
            order.items.forEach(item => {
                initialScanned[item.ProductId] = 0;
            });
        }
        
        const recBox = getRecommendedBox(order);
        
        setPackingVerifyState({
            isOpen: true,
            order: order,
            scannedItems: initialScanned,
            barcodeInput: '',
            errorMsg: '',
            selectedBoxId: recBox ? recBox.Id : (boxes[0]?.Id || '')
        });
    };

    const handleClosePackingModal = () => {
        setPackingVerifyState({ ...packingVerifyState, isOpen: false });
    };

    const handleBarcodeKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = packingVerifyState.barcodeInput.trim();
            if (!val) return;
            
            const order = packingVerifyState.order;
            let foundItem = null;
            
            for (const item of order.items) {
                try {
                    const codes = JSON.parse(item.ProductCode || '[]');
                    if (Array.isArray(codes) && codes.includes(val)) {
                        foundItem = item;
                        break;
                    } else if (item.ProductCode === val) {
                        foundItem = item;
                        break;
                    }
                } catch(err) {
                    if (item.ProductCode === val) foundItem = item;
                }
            }
            
            if (!foundItem) {
                for (const item of order.items) {
                    if (val === `STK-${item.ProductId}` || val === `PRD-${item.ProductId}`) {
                        foundItem = item;
                        break;
                    }
                }
            }
            
            if (!foundItem) {
                setPackingVerifyState(prev => ({ ...prev, errorMsg: `HATA: "${val}" barkodlu ürün bu siparişte yok!`, barcodeInput: '' }));
                return;
            }
            
            const currentScanned = packingVerifyState.scannedItems[foundItem.ProductId] || 0;
            const requested = parseInt(foundItem.Quantity) || 1;
            const remaining = requested - currentScanned;
            
            if (remaining <= 0) {
                setPackingVerifyState(prev => ({ ...prev, errorMsg: `HATA: "${foundItem.ProductName}" için zaten istenen adede (${requested}) ulaşıldı! Fazla ürün okutulamaz.`, barcodeInput: '' }));
                return;
            }

            setQtyPrompt({
                isOpen: true,
                foundItem: foundItem,
                remaining: remaining,
                inputVal: remaining.toString()
            });
        }
    };

    const handleQtyPromptSubmit = () => {
        const { foundItem, remaining, inputVal } = qtyPrompt;
        const inputQty = parseInt(inputVal);
        
        if (isNaN(inputQty) || inputQty <= 0) {
            setPackingVerifyState(prev => ({ ...prev, errorMsg: `HATA: Lütfen geçerli bir sayı giriniz.`, barcodeInput: '' }));
            setQtyPrompt({ isOpen: false, foundItem: null, remaining: 0, inputVal: '' });
            return;
        }

        const currentScanned = packingVerifyState.scannedItems[foundItem.ProductId] || 0;
        const requested = parseInt(foundItem.Quantity) || 1;
        
        if (currentScanned + inputQty > requested) {
            setPackingVerifyState(prev => ({ ...prev, errorMsg: `HATA: "${foundItem.ProductName}" için en fazla ${remaining} adet daha ekleyebilirsiniz! Girdiğiniz adet sipariş miktarını aşıyor.`, barcodeInput: '' }));
            setQtyPrompt({ isOpen: false, foundItem: null, remaining: 0, inputVal: '' });
            return;
        }
        
        if (currentScanned + inputQty < requested) {
            setPackingVerifyState(prev => ({
                ...prev,
                scannedItems: { ...prev.scannedItems, [foundItem.ProductId]: currentScanned + inputQty },
                barcodeInput: '',
                errorMsg: `UYARI: "${foundItem.ProductName}" için eksik miktar girdiniz. Kutuda hala ${requested - (currentScanned + inputQty)} adet daha eksik.`
            }));
            setQtyPrompt({ isOpen: false, foundItem: null, remaining: 0, inputVal: '' });
            return;
        }
        
        setPackingVerifyState(prev => ({
            ...prev,
            scannedItems: { ...prev.scannedItems, [foundItem.ProductId]: currentScanned + inputQty },
            barcodeInput: '',
            errorMsg: ''
        }));
        setQtyPrompt({ isOpen: false, foundItem: null, remaining: 0, inputVal: '' });
    };

    const handleVerifyAndPack = () => {
        const order = packingVerifyState.order;
        for (const item of order.items) {
            const scanned = packingVerifyState.scannedItems[item.ProductId] || 0;
            const requested = parseInt(item.Quantity) || 1;
            if (scanned < requested) {
                setPackingVerifyState(prev => ({ ...prev, errorMsg: 'HATA: Tüm ürünlerin okutulması tamamlanmadan paketleme yapılamaz!' }));
                return;
            }
        }
        
        handlePackSubmit(order, packingVerifyState.selectedBoxId);
        handleClosePackingModal();
    };

    const handleDeleteOrder = async (orderId, orderNo) => {
        if (!window.confirm(`${orderNo} numaralı siparişi tamamen silmek istediğinize emin misiniz?`)) return;
        try {
            const res = await apiFetch(`http://localhost:3000/api/orders/${orderId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchInitialData();
            } else {
                alert(data.message || 'Silinemedi.');
            }
        } catch (err) {
            console.error('Silme hatası:', err);
        }
    };

    const filteredOrders = orders.filter(o => {
        if (customerId && o.CustomerId !== customerId) return false;

        // 1. Siparişin aktif sekmeye ait olup olmadığını kontrol et
        const matchesTab = activeTab === 'Tümü' || o.OrderStatus?.toLowerCase() === activeTab.toLowerCase();
        if (!matchesTab) return false;

        // 2. Eğer arama terimi varsa filtrele
        if (globalSearchTerm.trim() !== '') {
            const term = globalSearchTerm.toLowerCase();
            return (
                o.OrderNumber?.toLowerCase().includes(term) ||
                o.CustomerName?.toLowerCase().includes(term) ||
                o.CustomerPhone?.toLowerCase().includes(term) ||
                o.ShippingAddress?.toLowerCase().includes(term) ||
                o.CargoTrackingNumber?.toLowerCase().includes(term) ||
                o.CargoStatus?.toLowerCase().includes(term) ||
                (o.items && o.items.some(i => i.ProductName?.toLowerCase().includes(term) || i.ProductId?.toString().includes(term))) ||
                o.Id?.toString().includes(term)
            );
        }
        
        return true;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Beklemede': return { bg: '#f1f5f9', color: '#475569', label: 'Beklemede' };
            case 'Onaylandı': return { bg: '#e2e8f0', color: '#334155', label: 'Onaylandı' };
            case 'Hazırlanıyor': return { bg: '#f1f5f9', color: '#475569', label: 'Hazırlanıyor' };
            case 'Hazır': return { bg: '#dcfce3', color: '#16a34a', label: 'Toplandı (Hazır)' };
              case 'Paketleniyor': return { bg: '#fef3c7', color: '#d97706', label: 'Paketleniyor' };
            case 'Paketlendi': return { bg: '#e2e8f0', color: '#334155', label: 'Paketlendi' };
            case 'Kargoya Verildi': return { bg: '#f1f5f9', color: '#475569', label: 'Kargoya Verildi' };
            case 'Teslim Edildi': return { bg: '#dcfce3', color: '#166534', label: 'Teslim Edildi' };
            case 'İptal Edildi': return { bg: '#fee2e2', color: '#991b1b', label: 'İptal Edildi' };
            default: return { bg: '#f1f5f9', color: '#64748b', label: status || 'Belirsiz' };
        }
    };


    // 5. Arayüz (UI) Çizimi ve Render Edilmesi

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: `'Inter', sans-serif` }}>
            {/* Üst Başlık ve İstatistikler */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Sipariş Yönetimi (Müşteri Siparişleri)</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                        Gelen müşteri siparişlerinin takibi, çoklu ürün ekleme ve stok aşımı durumunda otomatik üretim talebi yönetimi.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>

                    {currentUser?.role === 'admin' && (
                        <button 
                            onClick={handleOpenStatsModal}
                            style={{ padding: '12px 20px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                            Toplayıcı Liderlik Tablosu
                        </button>
                    )}
                    {hasPerm('order_create') && (
                        <button 
                            onClick={() => {
                                setSelectedCustomerId('');
                                setShippingAddress('');
                                setPaymentMethod('Nakit');
                                setOrderItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
                                setIsModalOpen(true);
                                fetchInitialData();
                            }}
                            style={{ padding: '12px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Manuel Sipariş Ekle
                        </button>
                    )}
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Toplam Sipariş</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{orders.length}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Bekleyen / Hazırlanan</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                        {orders.filter(o => ['Beklemede', 'Onaylandı', 'Hazırlanıyor', 'Hazır', 'Paketleniyor', 'Paketlendi'].includes(o.OrderStatus)).length}
                    </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Tamamlanan (Teslim Edildi)</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                        {orders.filter(o => o.OrderStatus === 'Teslim Edildi').length}
                    </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Toplam Sipariş Tutarı</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                        {orders.reduce((acc, o) => acc + (parseFloat(o.TotalAmount) || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </div>
                </div>
            </div>

            {/* Filtre Sekmeleri ve Arama */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                        { id: 'Tümü', label: 'Tümü' },
                        { id: 'Beklemede', label: 'Beklemede (Yeni)' },
                        { id: 'Onaylandı', label: 'Onaylandı' },
                        { id: 'Hazırlanıyor', label: 'Hazırlanıyor' },
                        { id: 'Hazır', label: 'Toplandı (Hazır)' },
                        { id: 'Paketleniyor', label: 'Paketleniyor' },
                        { id: 'Paketlendi', label: 'Paketlendi' },
                        { id: 'Kargoya Verildi', label: 'Kargoya Verildi' },
                        { id: 'Teslim Edildi', label: 'Teslim Edildi' },
                        { id: 'İptal Edildi', label: 'İptal Edildi' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setGlobalSearchTerm(''); }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: 'none',
                                backgroundColor: activeTab === tab.id && !globalSearchTerm ? '#0f172a' : 'transparent',
                                color: activeTab === tab.id && !globalSearchTerm ? 'white' : '#64748b',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div>
                    <input 
                        type="text" 
                        placeholder="Sipariş No, Müşteri veya Ürün Ara..." 
                        value={globalSearchTerm}
                        onChange={(e) => setGlobalSearchTerm(e.target.value)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '300px', outline: 'none' }}
                    />
                </div>
            </div>

            {/* Sipariş Tablosu */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Siparişler yükleniyor...</div>
                ) : filteredOrders.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        <p style={{ margin: 0, fontSize: '15px' }}>Sipariş bulunamadı.</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>"Manuel Sipariş Ekle" butonuna basarak yeni sipariş oluşturabilirsiniz.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '12%' }}>Sipariş No & Tarih</th>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '18%' }}>Müşteri Bilgisi</th>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '35%' }}>Sipariş Kalemleri (Ürünler)</th>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '15%' }}>Sevkiyat Adresi</th>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '10%' }}>Kargo Şirketi</th>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', textAlign: 'right', width: '10%' }}>Toplam Tutar</th>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', textAlign: 'center', width: '10%' }}>Durum</th>
                                <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => {
                                const st = getStatusStyle(order.OrderStatus);
                                const recBox = order.OrderStatus === 'Hazırlanıyor' ? getRecommendedBox(order) : null;
                                const selectedBoxForOrder = manualBoxSelections[order.Id] || (recBox ? recBox.Id : '');

                                return (
                                    <tr 
                                        key={order.Id} 
                                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', cursor: 'pointer' }}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        onClick={() => {
                                            setSelectedOrderDetail(order);
                                            setIsDetailModalOpen(true);
                                        }}
                                    >
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{order.OrderNumber}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                                {new Date(order.OrderDate).toLocaleDateString('tr-TR')}
                                            </div>
                                            {order.TrackingNumber && (
                                                <div style={{ fontSize: '11px', backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', marginTop: '6px', display: 'inline-block', fontWeight: '600' }}>
                                                    📦 {order.TrackingNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{order.CustomerName || 'Bilinmeyen Müşteri'}</div>
                                            {order.CustomerPhone && <div style={{ fontSize: '12px', color: '#64748b' }}>{order.CustomerPhone}</div>}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto', paddingRight: '4px' }}>
                                                {(order.items && order.items.length > 0) ? (
                                                    order.items.map((item, idx) => {
                                                        const q = parseInt(item.Quantity) || 1;
                                                        const p = parseFloat(item.UnitPrice) || 0;
                                                        return (
                                                            <div key={idx} style={{ fontSize: '13px', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', gap: '8px' }}>
                                                                <span style={{ flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }} title={item.ProductName || `Ürün #${item.ProductId}`}>
                                                                    <strong>{q}x {item.ProductName || `Ürün #${item.ProductId}`}</strong>
                                                                </span>
                                                                <span style={{ color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '12px' }}>
                                                                    ({p.toLocaleString('tr-TR')} TL / {item.Unit || 'adet'}) = <strong style={{color:'#1e293b'}}>{(p*q).toLocaleString('tr-TR')} TL</strong>
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Kalem detayı yok</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '13px', color: '#475569', wordBreak: 'break-word' }}>
                                            {order.ShippingAddress || '-'}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>
                                            {order.CargoCompanyName || <span style={{color: '#94a3b8', fontSize: '12px'}}>Seçilmedi</span>}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            {parseFloat(order.DiscountAmount) > 0 && (
                                                <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '12px', marginBottom: '2px' }}>
                                                    {((parseFloat(order.TotalAmount) || 0) + parseFloat(order.DiscountAmount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                                </div>
                                            )}
                                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                                                {(parseFloat(order.TotalAmount) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                            </div>
                                            {order.TotalWeight && (
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                                    {order.TotalWeight} kg
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: st.bg, color: st.color, display: 'inline-block' }}>
                                                {st.label}
                                                {order.OrderStatus === 'Kargoya Verildi' && order.CargoStatus && (
                                                    <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>{order.CargoStatus}</div>
                                                )}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                                                {order.OrderStatus === 'Beklemede' && hasPerm('order_approve') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleApproveOrder(order.Id); }} 
                                                        style={{ padding: '6px 12px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                        title="Siparişi Onayla, Kutu Ata ve Kargo Barkodu Oluştur"
                                                    >
                                                        Onayla
                                                    </button>
                                                )}
                                                {order.OrderStatus === 'Hazırlanıyor' && hasPerm('order_prepare') && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Siparişi toplamayı iptal edip havuzda Onaylandı durumuna geri çekmek istediğinize emin misiniz?')) handleUpdateStatus(order.Id, 'Onaylandı'); }} 
                                                            style={{ padding: '6px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                            title="Toplamayı iptal et ve siparişi genel havuza (Onaylandı) geri döndür"
                                                        >
                                                            Toplamayı İptal Et
                                                        </button>
                                                    </div>
                                                )}
                                                {order.OrderStatus === 'Hazır' && hasPerm('order_ship') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleOpenPackingModal(order); }} 
                                                        style={{ padding: '6px 14px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                        title="Siparişi Paketle (Barkod Doğrulama)"
                                                    >
                                                        Paketlemeye Başla
                                                    </button>
                                                )}
                                                {order.OrderStatus === 'Paketlendi' && hasPerm('order_ship') && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedOrderForLabel(order);
                                                                setIsLabelModalOpen(true);
                                                            }} 
                                                            style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                            title="Kargo Etiketi Çıkar"
                                                        >
                                                            Etiket Yazdır
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.Id, 'Kargoya Verildi'); }} 
                                                            style={{ padding: '6px 12px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                            title="Siparişi kargoya ver"
                                                        >
                                                            Kargoya Ver
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.Id, 'Teslim Edildi'); }} 
                                                            style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                            title="Siparişi kargoya vermeden elden teslim et"
                                                        >
                                                            Elden Teslim
                                                        </button>
                                                    </>
                                                )}
                                                {order.OrderStatus === 'Kargoya Verildi' && hasPerm('order_ship') && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedOrderForLabel(order);
                                                                setIsLabelModalOpen(true);
                                                            }} 
                                                            style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                                            title="Kargo Etiketi Çıkar"
                                                        >
                                                            Etiket Yazdır
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.Id, 'Teslim Edildi'); }} 
                                                            style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                                                            title="Siparişi Manuel Olarak Teslim Edildiye Çek (Test/Yedek)"
                                                        >
                                                            Teslim Edildi Yap
                                                        </button>
                                                    </>
                                                )}
                                                {order.OrderStatus !== 'İptal Edildi' && order.OrderStatus !== 'Teslim Edildi' && hasPerm('order_cancel') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.Id, 'İptal Edildi'); }} 
                                                        style={{ padding: '6px 10px', backgroundColor: 'transparent', color: '#94a3b8', border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                                                        title="Siparişi İptal Et"
                                                    >
                                                        İptal Et
                                                    </button>
                                                )}

                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Manuel Sipariş Ekleme Modalı */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Manuel Sipariş Ekle</h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                    Birden fazla ürün ekleyebilirsiniz. Stoktaki adedi geçen siparişler için üretime otomatik sipariş talebi açılır!
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer', padding: '4px' }}>×</button>
                        </div>

                        <form onSubmit={handleSubmitOrder} style={{ padding: '24px' }}>
                            {/* Müşteri Seçimi & Sevkiyat Adresi */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Müşteri Seçiniz *</label>
                                    <select
                                        value={selectedCustomerId}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSelectedCustomerId(val);
                                            if (val) {
                                                const cust = customers.find(c => c.Id.toString() === val.toString() || (c.id && c.id.toString() === val.toString()));
                                                if (cust && cust.Address) {
                                                    setShippingAddress(cust.Address);
                                                } else {
                                                    setShippingAddress('');
                                                }
                                            } else {
                                                setShippingAddress('');
                                            }
                                        }}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#0f172a', backgroundColor: 'white' }}
                                    >
                                        <option value="">-- Müşteri Seçiniz --</option>
                                        {customers.map(c => (
                                            <option key={c.Id} value={c.Id}>{c.CustomerName} ({c.CustomerType || 'Bireysel'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                        Sevkiyat Adresi {selectedShipperId !== 'ELDEN_TESLIM' && '*'}
                                    </label>
                                    <input
                                        type="text"
                                        value={shippingAddress}
                                        onChange={e => setShippingAddress(e.target.value)}
                                        required={selectedShipperId !== 'ELDEN_TESLIM'}
                                        disabled={selectedShipperId === 'ELDEN_TESLIM'}
                                        placeholder={selectedShipperId === 'ELDEN_TESLIM' ? "Elden Teslim" : "Örn: Organize Sanayi Bölgesi 2. Cadde..."}
                                        style={{ 
                                            width: '100%', 
                                            padding: '10px 12px', 
                                            border: '1px solid #cbd5e1', 
                                            borderRadius: '8px', 
                                            fontSize: '14px', 
                                            color: selectedShipperId === 'ELDEN_TESLIM' ? '#94a3b8' : '#0f172a',
                                            backgroundColor: selectedShipperId === 'ELDEN_TESLIM' ? '#f1f5f9' : 'white'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Kargo Şirketi *</label>
                                    <select
                                        value={selectedShipperId}
                                        onChange={e => setSelectedShipperId(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#0f172a', backgroundColor: 'white' }}
                                    >
                                        <option value="">-- Kargo Seçiniz --</option>
                                        <option value="ELDEN_TESLIM">Elden Teslim</option>
                                        {shippers.map(s => (
                                            <option key={s.Id} value={s.Id}>{s.CompanyName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Ödeme Şekli</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#0f172a', backgroundColor: 'white' }}
                                    >
                                        <option value="Nakit">Nakit</option>
                                        <option value="Havale/EFT">Havale/EFT</option>
                                        <option value="Kredi Kartı">Kredi Kartı</option>
                                    </select>
                                </div>
                            </div>

                            {/* Sipariş Kalemleri Alanı */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Sipariş Edilecek Ürünler</label>
                                    <button
                                        type="button"
                                        onClick={handleAddItemRow}
                                        style={{
                                            padding: '8px 14px',
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        + Ürün Ekle
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {orderItems.map((item, index) => {
                                        const selectedProd = products.find(p => p.Id === parseInt(item.productId) || p.id === parseInt(item.productId));
                                        const currStock = selectedProd ? (parseInt(selectedProd.StockQuantity || selectedProd.TotalStock || selectedProd.total_stock || selectedProd.Stock || selectedProd.quantity || 0)) : null;
                                        const isExcess = currStock !== null && parseInt(item.quantity) > currStock;

                                        return (
                                            <div key={index} style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', position: 'relative' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px 130px auto', gap: '12px', alignItems: 'center' }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ürün ({index + 1}. Kalem)</label>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            {item.showBarcode ? (
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder="Barkodu okutun ve Enter'a basın..."
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            const barcode = e.target.value;
                                                                            const matched = products.find(p => {
                                                                                if (p.Category === 'Hammadde') return false;
                                                                                let barcodes = [];
                                                                                try {
                                                                                    if (p.Barcode) barcodes = typeof p.Barcode === 'string' ? JSON.parse(p.Barcode) : p.Barcode;
                                                                                } catch (err) {}
                                                                                return (barcodes && barcodes.includes(barcode)) || 
                                                                                       p.ProductCode === barcode || 
                                                                                       p.code === barcode;
                                                                            });
                                                                            if (matched) {
                                                                                handleItemChange(index, 'productId', matched.Id || matched.id);
                                                                                handleItemChange(index, 'showBarcode', false);
                                                                            } else {
                                                                                alert('Barkod ile eşleşen ürün bulunamadı!');
                                                                            }
                                                                        }
                                                                    }}
                                                                    onBlur={() => handleItemChange(index, 'showBarcode', false)}
                                                                    style={{ flex: 1, padding: '10px', border: '2px solid #0284c7', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                                                                />
                                                            ) : (
                                                                <select
                                                                    value={item.productId}
                                                                    onChange={e => handleItemChange(index, 'productId', e.target.value)}
                                                                    required
                                                                    style={{ flex: 1, minWidth: 0, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', textOverflow: 'ellipsis' }}
                                                                >
                                                                    <option value="">-- Ürün Seçiniz --</option>
                                                                    {products.filter(p => p.Category !== 'Hammadde').map(p => {
                                                                        const s = parseInt(p.StockQuantity || p.TotalStock || p.total_stock || p.Stock || p.quantity || 0);
                                                                        
                                                                        let barcodeStr = p.ProductCode || p.code;
                                                                        if (!barcodeStr && p.Barcode) {
                                                                            try {
                                                                                const bArr = typeof p.Barcode === 'string' ? JSON.parse(p.Barcode) : p.Barcode;
                                                                                if (Array.isArray(bArr) && bArr.length > 0) barcodeStr = bArr[0];
                                                                            } catch(e) {
                                                                                barcodeStr = p.Barcode;
                                                                            }
                                                                        }
                                                                        
                                                                        const pIdStr = String(p.Id || p.id);
                                                                        const isSelectedElsewhere = orderItems.some((oi, oiIdx) => oiIdx !== index && String(oi.productId) === pIdStr);
                                                                        
                                                                        return (
                                                                            <option key={p.Id || p.id} value={p.Id || p.id} disabled={isSelectedElsewhere}>
                                                                                {p.ProductName || p.name} {barcodeStr ? `(${barcodeStr})` : ''} | Stokta: {s} Adet
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            )}
                                                            <button
                                                                type="button"
                                                                title="Barkod Okut"
                                                                onClick={() => handleItemChange(index, 'showBarcode', !item.showBarcode)}
                                                                style={{ padding: '10px', backgroundColor: item.showBarcode ? '#e0f2fe' : '#f1f5f9', border: `1px solid ${item.showBarcode ? '#0284c7' : '#cbd5e1'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={item.showBarcode ? "#0284c7" : "#334155"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M3 5v14"></path>
                                                                    <path d="M8 5v14"></path>
                                                                    <path d="M12 5v14"></path>
                                                                    <path d="M17 5v14"></path>
                                                                    <path d="M21 5v14"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Miktar (Adet)</label>
                                                        <input
                                                            type="number"
                                                            disabled={item.isGift}
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={e => {
                                                                let val = Math.max(1, parseInt(e.target.value) || 1);
                                                                handleItemChange(index, 'quantity', val);
                                                            }}
                                                            required
                                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px', fontWeight: '700', textAlign: 'center', backgroundColor: item.isGift ? '#f1f5f9' : 'white' }}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Birim Fiyat (TL)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            disabled={item.isGift}
                                                            value={item.unitPrice}
                                                            onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                                                            required
                                                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', backgroundColor: item.isGift ? '#f1f5f9' : 'white', cursor: item.isGift ? 'not-allowed' : 'default' }}
                                                        />
                                                    </div>

                                                    <div style={{ paddingTop: '18px' }}>
                                                        <div style={{ textAlign: 'right', fontWeight: '900', color: '#1e293b', fontSize: '15px' }}>
                                                            {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </div>
                                                        {orderItems.length > 1 && !item.isGift && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newItems = orderItems.filter((_, i) => i !== index);
                                                                    setOrderItems(newItems);
                                                                }}
                                                                style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#ef4444', fontSize: '18px', cursor: 'pointer', padding: '4px' }}
                                                                title="Bu satırı sil"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                        {item.isGift && (
                                                            <span style={{ marginLeft: '12px', color: '#10b981', fontWeight: 'bold', fontSize: '12px' }}>🎁 HEDİYE</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Stok uyarısı / Akıllı bildirim */}
                                                {selectedProd && (
                                                    <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', backgroundColor: isExcess ? '#fff7ed' : '#f0fdf4', color: isExcess ? '#c2410c' : '#16a34a', border: `1px solid ${isExcess ? '#fdba74' : '#bbf7d0'}` }}>
                                                        {isExcess ? (
                                                            <>
                                                                <span>⚡ <strong>Otomatik Üretim Talebi Açılacak:</strong> Mevcut stok ({currStock} Adet) yetersiz. Eksik kalan <strong>{parseInt(item.quantity) - currStock} Adet</strong> için üretime otomatik sipariş emri iletilecektir (Stokla sınırlanmaz).</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>✓ Stok Yeterli (Depoda {currStock} Adet var). Doğrudan sevk edilebilir.</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Kupon Alanı */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', border: '1px solid #cbd5e1' }}>
                                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>İndirim Kuponu:</label>
                                    <input
                                        type="text"
                                        value={couponCodeInput}
                                        onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                                        disabled={appliedCoupon !== null}
                                        placeholder="Kupon Kodunu Girin..."
                                        style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                                    />
                                    {!appliedCoupon ? (
                                        <button
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            style={{ padding: '10px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Uygula
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAppliedCoupon(null);
                                                setCouponDiscount(0);
                                                setCouponCodeInput('');
                                                setOrderItems(orderItems.filter(i => !i.isGift));
                                            }}
                                            style={{ padding: '10px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            İptal Et
                                        </button>
                                    )}
                                </div>
                                {couponError && <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>{couponError}</div>}
                                {appliedCoupon && <div style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>✅ Kupon uygulandı (-{couponDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL)</div>}
                            </div>

                            {/* Toplam Özet Bilgi Alanı */}
                            <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontSize: '14px', color: '#475569' }}>
                                    Toplam Kalem Sayısı: <strong>{orderItems.length} Ürün Çeşidi</strong>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                                    {calculateTotalAndDiscount().discount > 0 && (
                                        <div style={{ fontSize: '14px', color: '#dc2626', marginBottom: '4px' }}>
                                            Kampanya İndirimi: -{calculateTotalAndDiscount().discount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>({calculateTotalAndDiscount().campaignName})</div>
                                        </div>
                                    )}
                                    Genel Toplam: <span style={{ color: '#2563eb' }}>{calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                </div>
                            </div>

                            {/* Butonlar */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ padding: '12px 20px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                                >
                                    {submitting ? 'Kaydediliyor...' : 'Siparişi Onayla ve Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Barkod Okutmalı Paketleme Modalı */}
            {packingVerifyState.isOpen && packingVerifyState.order && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        
                        <div style={{ padding: '24px 30px', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>📦 Paketleme Onayı: {packingVerifyState.order.OrderNumber}</h2>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>Lütfen kutuya koyduğunuz her ürünün barkodunu okutun.</span>
                            </div>
                            <button onClick={handleClosePackingModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        <div style={{ padding: '30px', overflowY: 'auto' }}>
                            {packingVerifyState.errorMsg && (
                                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    ⚠️ {packingVerifyState.errorMsg}
                                </div>
                            )}

                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>Barkod Okutun veya Yazıp Enter'a Basın:</label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={packingVerifyState.barcodeInput}
                                    onChange={e => setPackingVerifyState({ ...packingVerifyState, barcodeInput: e.target.value })}
                                    onKeyDown={handleBarcodeKeyDown}
                                    placeholder="Barkod tabancası ile okutun..."
                                    style={{ width: '100%', padding: '16px', fontSize: '18px', borderRadius: '12px', border: '2px solid #3b82f6', backgroundColor: '#eff6ff', color: '#1e3a8a', fontWeight: '600', outline: 'none' }}
                                />
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Ürün Adı</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Sipariş Edilen</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Okutulan</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#475569' }}>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {packingVerifyState.order.items.map((item, idx) => {
                                        const requested = parseInt(item.Quantity) || 1;
                                        const scanned = packingVerifyState.scannedItems[item.ProductId] || 0;
                                        
                                        let bg = 'white';
                                        let icon = '⏳';
                                        if (scanned === 0) {
                                            bg = '#fff1f2'; // light red
                                            icon = '❌';
                                        } else if (scanned < requested) {
                                            bg = '#fefce8'; // light yellow
                                            icon = '⚠️';
                                        } else if (scanned === requested) {
                                            bg = '#f0fdf4'; // light green
                                            icon = '✅';
                                        }
                                        
                                        return (
                                            <tr key={idx} style={{ backgroundColor: bg, borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                                    {item.ProductName}
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Stok Kodu: PRD-{item.ProductId}</div>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{requested}</td>
                                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '18px', fontWeight: '900', color: scanned === requested ? '#16a34a' : (scanned === 0 ? '#dc2626' : '#ca8a04') }}>{scanned}</td>
                                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '20px' }}>{icon}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            
                            <div style={{ marginTop: '24px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>📦 Kargo Kutusu Seçimi:</label>
                                <select 
                                    value={packingVerifyState.selectedBoxId}
                                    onChange={(e) => setPackingVerifyState({...packingVerifyState, selectedBoxId: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', color: '#0f172a', fontWeight: '600' }}
                                >
                                    {boxes.map(b => {
                                        const recBox = getRecommendedBox(packingVerifyState.order);
                                        return (
                                            <option key={b.Id} value={b.Id}>
                                                {(recBox && recBox.Id === b.Id) ? `⭐ Önerilen (Akıllı): ${b.BoxName}` : b.BoxName}
                                            </option>
                                        );
                                    })}
                                </select>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>* Kutu algoritması, ürünlerin 3 boyutlu rotasyonlarını ve boşluk paylarını hesaplayarak öneri yapar.</div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 30px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={handleClosePackingModal} style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>İptal</button>
                            <button 
                                onClick={handleVerifyAndPack}
                                disabled={packing}
                                style={{ padding: '12px 24px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '15px', cursor: packing ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)' }}
                            >
                                {packing ? 'Paketleniyor...' : '✅ Paketlemeyi Tamamla ve Kargoya Ver'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kargo Etiketi Yazdırma Modalı */}
            {isLabelModalOpen && selectedOrderForLabel && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
                        <div style={{ border: '2px dashed #cbd5e1', padding: '20px', borderRadius: '12px', marginBottom: '20px', position: 'relative' }}>
                            <h2 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: '900', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>KARGO ETİKETİ</h2>
                            
                            <div style={{ position: 'absolute', top: '15px', right: '15px', padding: '4px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <QRCodeSVG 
                                    value={`Sipariş No: ${selectedOrderForLabel.OrderNumber}\nMüşteri: ${selectedOrderForLabel.CustomerName}\n\nÜrünler:\n${selectedOrderForLabel.items?.map(i => `${parseInt(i.Quantity)}x ${i.ProductName}`).join('\n') || 'Ürün bilgisi yok'}`} 
                                    size={80} 
                                    level="L"
                                />
                            </div>
                            
                            <div style={{ textAlign: 'left', marginBottom: '20px', padding: '0 10px', paddingRight: '100px' }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#0f172a', fontWeight: '800' }}>{selectedOrderForLabel.CustomerName}</p>
                                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#475569' }}>
                                    <strong style={{color:'#64748b'}}>Adres:</strong> {selectedOrderForLabel.ShippingAddress || 'Adres Belirtilmemiş'}
                                </p>
                                {selectedOrderForLabel.customers?.Phone && (
                                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#475569' }}>
                                        <strong style={{color:'#64748b'}}>Tel:</strong> {selectedOrderForLabel.customers.Phone}
                                    </p>
                                )}
                                {selectedOrderForLabel.customers?.Email && (
                                    <p style={{ margin: '0 0 0 0', fontSize: '13px', color: '#475569' }}>
                                        <strong style={{color:'#64748b'}}>E-Posta:</strong> {selectedOrderForLabel.customers.Email}
                                    </p>
                                )}
                            </div>
                            
                            <div style={{ display: 'inline-block', width: '100%', padding: '15px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Kargo Barkodu</span>
                                {selectedOrderForLabel.CargoBarcode ? (
                                    <Barcode 
                                        value={selectedOrderForLabel.CargoBarcode} 
                                        format="CODE128" 
                                        width={2} 
                                        height={60} 
                                        displayValue={true} 
                                        fontSize={16}
                                    />
                                ) : (
                                    <strong style={{ fontSize: '18px', color: '#ef4444', letterSpacing: '1px' }}>Barkod Bulunamadı</strong>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsLabelModalOpen(false)}
                                style={{ padding: '10px 20px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Kapat
                            </button>
                            <button
                                onClick={() => {
                                    alert('Yazdırılıyor...');
                                    setIsLabelModalOpen(false);
                                }}
                                style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Yazdır
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUANTITY PROMPT MODAL */}
            {qtyPrompt.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Adet Giriniz</h3>
                        <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '14px' }}>
                            <strong>{qtyPrompt.foundItem?.ProductName}</strong> barkodu doğrulandı.<br/>
                            Lütfen kutuya koyduğunuz adedi giriniz (Siparişteki Kalan: {qtyPrompt.remaining}).
                        </p>
                        <input
                            type="number"
                            min="1"
                            max={qtyPrompt.remaining}
                            value={qtyPrompt.inputVal}
                            onChange={(e) => setQtyPrompt({ ...qtyPrompt, inputVal: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleQtyPromptSubmit();
                                }
                            }}
                            autoFocus
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '16px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setQtyPrompt({ isOpen: false, foundItem: null, remaining: 0, inputVal: '' });
                                    setPackingVerifyState(prev => ({ ...prev, barcodeInput: '' }));
                                }}
                                style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleQtyPromptSubmit}
                                style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Onayla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ORDER DETAIL MODAL */}
            {isDetailModalOpen && selectedOrderDetail && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setIsDetailModalOpen(false)}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '16px 16px 0 0' }}>
                            <div>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Sipariş Detayı: {selectedOrderDetail.OrderNumber}</h2>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>Tarih: {new Date(selectedOrderDetail.OrderDate).toLocaleString('tr-TR')}</span>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Üst Bilgiler (Müşteri ve Kargo) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                {/* Müşteri Kartı */}
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#fcfcfc' }}>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>👤 Müşteri Bilgileri</h3>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{selectedOrderDetail.CustomerName || 'Bilinmeyen Müşteri'}</div>
                                    {selectedOrderDetail.CustomerEmail && <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>{selectedOrderDetail.CustomerEmail}</div>}
                                    {selectedOrderDetail.CustomerPhone && <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>{selectedOrderDetail.CustomerPhone}</div>}
                                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px' }}>Sevkiyat Adresi:</div>
                                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>{selectedOrderDetail.ShippingAddress || 'Adres bilgisi yok'}</div>
                                </div>

                                {/* Kargo ve Ödeme Kartı */}
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#fcfcfc' }}>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>🚚 Kargo ve Ödeme</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Sipariş Durumu:</div>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', backgroundColor: getStatusStyle(selectedOrderDetail.OrderStatus).bg, color: getStatusStyle(selectedOrderDetail.OrderStatus).color, display: 'inline-block' }}>
                                                {selectedOrderDetail.OrderStatus}
                                            </span>
                                        </div>
                                        <div>
                                            
                                          <div style={{ gridColumn: '1 / -1', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>İşlem Geçmişi</div>
                                              
                                              {selectedOrderDetail.PickerName && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                      <span style={{ fontSize: '12px', color: '#64748b' }}>Toplayan: <b>{selectedOrderDetail.PickerName}</b></span>
                                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedOrderDetail.PickedDate ? new Date(selectedOrderDetail.PickedDate).toLocaleString('tr-TR') : '-'}</span>
                                                  </div>
                                              )}
                                              {selectedOrderDetail.PackerName && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                      <span style={{ fontSize: '12px', color: '#64748b' }}>Paketleyen: <b>{selectedOrderDetail.PackerName}</b></span>
                                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedOrderDetail.PackedDate ? new Date(selectedOrderDetail.PackedDate).toLocaleString('tr-TR') : '-'}</span>
                                                  </div>
                                              )}
                                              {selectedOrderDetail.ShipUserName && (
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                      <span style={{ fontSize: '12px', color: '#64748b' }}>Kargoya Veren: <b>{selectedOrderDetail.ShipUserName}</b></span>
                                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedOrderDetail.ShippedDate ? new Date(selectedOrderDetail.ShippedDate).toLocaleString('tr-TR') : '-'}</span>
                                                  </div>
                                              )}
                                              {!selectedOrderDetail.PickerName && !selectedOrderDetail.PackerName && !selectedOrderDetail.ShipUserName && (
                                                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Henüz işlem yapılmamış.</span>
                                              )}
                                          </div>
<div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Ödeme Şekli:</div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{selectedOrderDetail.PaymentMethod || 'Belirtilmedi'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Kargo Takip No:</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>{selectedOrderDetail.TrackingNumber || '-'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Kargo Durumu:</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{selectedOrderDetail.CargoStatus || 'Bekliyor'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Kampanya Bilgisi (Varsa) */}
                            {selectedOrderDetail.CampaignName && (
                                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ fontSize: '24px' }}>🎉</div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#065f46' }}>Kampanya Uygulandı</div>
                                        <div style={{ fontSize: '13px', color: '#047857' }}>
                                            <strong>{selectedOrderDetail.CampaignName}</strong> kapsamında <strong>{parseFloat(selectedOrderDetail.DiscountAmount || 0).toLocaleString('tr-TR')} TL</strong> indirim uygulandı.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Ürün Listesi */}
                            <div>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>Sipariş Kalemleri</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(selectedOrderDetail.items && selectedOrderDetail.items.length > 0) ? selectedOrderDetail.items.map((item, idx) => {
                                        const q = parseInt(item.Quantity) || 1;
                                        const p = parseFloat(item.UnitPrice) || 0;
                                        return (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>IMG</div>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{item.ProductName || `Ürün #${item.ProductId}`}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Birim Fiyat: {p.toLocaleString('tr-TR')} TL / {item.Unit || 'adet'}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{(p * q).toLocaleString('tr-TR')} TL</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>Adet: {q}</div>
                                                </div>
                                            </div>
                                        )
                                    }) : (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>Sipariş kalemi bulunamadı.</div>
                                    )}
                                </div>
                            </div>

                            {/* Toplam Tutar Alanı */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #f1f5f9', paddingTop: '16px', marginTop: '8px' }}>
                                <div style={{ width: '250px' }}>
                                    {selectedOrderDetail.DiscountAmount > 0 && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>
                                                <span>Ara Toplam:</span>
                                                <span>{((parseFloat(selectedOrderDetail.TotalAmount) || 0) + parseFloat(selectedOrderDetail.DiscountAmount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>
                                                <span>İndirim Tutarı:</span>
                                                <span style={{ color: '#dc2626' }}>- {parseFloat(selectedOrderDetail.DiscountAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
                                            </div>
                                        </>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                                        <span>Genel Toplam:</span>
                                        <span>{parseFloat(selectedOrderDetail.TotalAmount || 0).toLocaleString('tr-TR')} TL</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer (Actions) */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                style={{ padding: '10px 24px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* İSTATİSTİKLER (LİDERLİK) MODALI */}
            {isStatsModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '20px' }} onClick={() => setIsStatsModalOpen(false)}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '16px 16px 0 0' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                                🏆 {statsRange === 'daily' ? 'Günlük' : statsRange === 'weekly' ? 'Haftalık' : statsRange === 'monthly' ? 'Aylık' : 'Yıllık'} Toplayıcı Liderlik Tablosu
                            </h2>
                            <button onClick={() => setIsStatsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        
                        <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                            {['daily', 'weekly', 'monthly', 'yearly'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => handleStatsRangeChange(range)}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: statsRange === range ? '#8b5cf6' : '#f1f5f9',
                                        color: statsRange === range ? '#fff' : '#475569',
                                        border: 'none',
                                        borderRadius: '20px',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {range === 'daily' ? 'Günlük' : range === 'weekly' ? 'Haftalık' : range === 'monthly' ? 'Aylık' : 'Yıllık'}
                                </button>
                            ))}
                        </div>
                        
                        <div style={{ padding: '24px' }}>
                            {statsLoading ? (
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Yükleniyor...</div>
                            ) : statsData.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                                    Bugün henüz sipariş toplanmamış.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {statsData.map((stat, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#ffedd5' : '#e2e8f0', color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#9a3412' : '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '800', fontSize: '18px', marginRight: '16px' }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{stat.UserName}</div>
                                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                                    <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontWeight: '600', marginRight: '8px' }}>📦 {stat.TotalOrdersPicked} Sipariş</span>
                                                    <span style={{ backgroundColor: '#dcfce3', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>🛒 {stat.TotalProductsPicked} Ürün</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrders;
