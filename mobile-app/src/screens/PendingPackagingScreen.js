/**
 * ============================================================================
 * BİLEŞEN ADI: PendingPackagingScreen
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Mobil uygulamanın ana ekran bileşeni. Kullanıcı arayüzünü ve navigasyonu barındırır.
 * ============================================================================
 */
/**
 * @file PendingPackagingScreen.js
 * @description Paketleme işlemi için taşıma arabası (cart) seçimi ve 
 * arabadaki bölümlere atanan siparişlerin paketlemeye başlanması ekranı.
 */
import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

/**
 * PendingPackagingScreen Bileşeni
 * Araba barkodunu okutup içindeki sipariş bölümlerini listeler.
 */
export default function PendingPackagingScreen({ navigation }) {
    const [cartBarcode, setCartBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [cartData, setCartData] = useState(null);
    const [assigningId, setAssigningId] = useState(null);
    const { user } = useContext(AuthContext);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    // Elden Teslim ve Arama için state'ler
    const [searchQuery, setSearchQuery] = useState('');
    const [readyOrders, setReadyOrders] = useState([]);
    const [fetchingReady, setFetchingReady] = useState(false);

    React.useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        getBarCodeScannerPermissions();
    }, []);

    const cartBarcodeRef = React.useRef(cartBarcode);
    cartBarcodeRef.current = cartBarcode;
    const searchQueryRef = React.useRef(searchQuery);
    searchQueryRef.current = searchQuery;

    useFocusEffect(
        React.useCallback(() => {
            if (cartBarcodeRef.current && cartBarcodeRef.current.trim() !== '') {
                handleScanCartWithData(cartBarcodeRef.current);
            }
            fetchReadyOrders(searchQueryRef.current);
        }, [])
    );

    const fetchReadyOrders = async (query = '') => {
        setFetchingReady(true);
        try {
            const res = await api.get(`/mobile/orders/ready-for-packaging?searchQuery=${query}`);
            if (res.data.success) {
                setReadyOrders(res.data.data || []);
            }
        } catch (error) {
            console.error('Ready orders fetch error:', error);
        } finally {
            setFetchingReady(false);
        }
    };

    /**
     * Arabasız / Elden teslim olan siparişleri doğrudan paketlemeye alır.
     */
    const handleSelectDirectOrder = async (order) => {
        setAssigningId(order.Id);
        try {
            const res = await api.post(`/mobile/orders/package/assign/${order.Id}`);
            if (res.data.success) {
                navigation.navigate('Packaging', { order: res.data.order, items: res.data.items });
            } else {
                Alert.alert('Hata', res.data.message || 'Sipariş atanamadı.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'İşlem başarısız.');
        } finally {
            setAssigningId(null);
        }
    };

    const handleSearchSubmit = () => {
        fetchReadyOrders(searchQuery);
    };

    const handleBarcodeScanned = ({ type, data }) => {
        if (scanned || loading) return;
        setScanned(true);
        setCartBarcode(data);
        // Otomatik sorgula
        handleScanCartWithData(data);
        setTimeout(() => {
            setScanned(false);
            setIsCameraActive(false);
        }, 1500);
    };

    const handleScanCartWithData = async (barcode) => {
        if (!barcode.trim()) return;
        setLoading(true);
        try {
            const response = await api.get(`/mobile/picking_carts/scan-for-packaging?cart_barcode=${barcode.trim()}`);
            if (response.data.success) {
                const data = response.data;
                setCartData(data);

                // Araba boş mu kontrolü
                if (data.sections && data.sections.length > 0) {
                    const allEmpty = data.sections.every(sec => !sec.orders || sec.orders.length === 0);
                    if (allEmpty) {
                        Alert.alert(
                            'Taşıma Arabası Boş',
                            'Tüm siparişler paketlendi. Arabanın tamamen boş olduğunu onaylıyor musunuz?',
                            [
                                { text: 'Hala sipariş var', style: 'cancel' },
                                {
                                    text: 'Onayla',
                                    style: 'destructive',
                                    onPress: () => handleEmptyCart(data.cart.id)
                                }
                            ]
                        );
                    }
                }
            } else {
                Alert.alert('Bilgi', response.data.message || 'Araba bulunamadı.');
                setCartData(null);
            }
        } catch (error) {
            console.error('Araba okutma hatası', error);
            if (error.response && error.response.status === 404) {
                Alert.alert('Hata', 'Geçersiz bir barkod okuttunuz. Lütfen taşıma arabası veya bölüm barkodu okutun.');
            } else {
                Alert.alert('Hata', 'Sunucuya bağlanılamadı veya bir hata oluştu.');
            }
            setCartData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleEmptyCart = async (cartId) => {
        try {
            const res = await api.post('/mobile/picking_carts/empty-cart', { cart_id: cartId });
            if (res.data.success) {
                Alert.alert('Başarılı', 'Araba boşaltıldı.');
                setCartData(null);
                setCartBarcode('');
            } else {
                Alert.alert('Hata', res.data.message || 'Araba boşaltılamadı.');
            }
        } catch (error) {
            Alert.alert('Hata', 'Sunucu hatası.');
        }
    };

    const handleScanCart = () => {
        if (!cartBarcode.trim()) {
            Alert.alert('Uyarı', 'Lütfen araba barkodu girin.');
            return;
        }
        handleScanCartWithData(cartBarcode);
    };

    /**
     * Arabadaki belirli bir bölümü seçip, o bölümdeki siparişi paketlemeye atayan fonksiyon.
     * İşlem başarılı olursa Packaging (Paketleme) ekranına yönlendirir.
     * @param {Object} section - Seçilen raf/bölüm objesi
     */
    const handleSelectSection = async (section) => {
        if (!section.orders || section.orders.length === 0) {
            Alert.alert('Uyarı', 'Bu bölümde sipariş bulunmuyor.');
            return;
        }

        // Use the first order in the section (assuming 1 order per section for now, or multiple sections for 1 order)
        const orderId = section.orders[0].Id;
        setAssigningId(section.id);

        try {
            const res = await api.post(`/mobile/orders/package/assign/${orderId}`);
            if (res.data.success) {
                navigation.navigate('Packaging', { order: res.data.order, items: res.data.items });
            } else {
                Alert.alert('Hata', res.data.message || 'Sipariş atanamadı.');
                handleScanCart(); // Refresh
            }
        } catch (error) {
            console.error('Paketleme atama hatası', error);
            Alert.alert('Hata', 'Bu siparişi paketlemek için seçerken bir hata oluştu.');
        } finally {
            setAssigningId(null);
        }
    };

    const renderSectionItem = ({ item }) => {
        const hasOrders = item.orders && item.orders.length > 0;
        return (
            <TouchableOpacity
                style={[styles.card, !hasOrders && { opacity: 0.5 }]}
                onPress={() => hasOrders && handleSelectSection(item)}
                activeOpacity={hasOrders ? 0.8 : 1}
                disabled={!hasOrders || assigningId === item.id}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="layers" size={18} color={hasOrders ? "#f59e0b" : "#94a3b8"} style={{ marginRight: 6 }} />
                        <Text style={styles.orderNumber}>{item.section_name || item.name} ({item.barcode})</Text>
                    </View>
                    {assigningId === item.id ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                    ) : (
                        <View style={[styles.statusBadge, { backgroundColor: hasOrders ? '#fef3c7' : '#f1f5f9' }]}>
                            <Text style={[styles.statusText, { color: hasOrders ? '#d97706' : '#64748b' }]}>
                                {hasOrders ? `${item.orders.length} Sipariş` : 'Boş'}
                            </Text>
                        </View>
                    )}
                </View>

                {hasOrders && (
                    <View style={styles.cardBody}>
                        {item.orders.map(order => (
                            <View key={order.Id} style={styles.infoRow}>
                                <Feather name="package" size={14} color="#64748b" />
                                <Text style={styles.infoText}>{order.OrderNumber} - {order.customers?.CustomerName || 'Müşteri Bilinmiyor'}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderDirectOrderItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleSelectDirectOrder(item)}
                disabled={assigningId === item.Id}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="box" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
                        <Text style={styles.orderNumber}>{item.OrderNumber}</Text>
                    </View>
                    {assigningId === item.Id ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                    ) : (
                        <View style={[styles.statusBadge, { backgroundColor: '#fef08a' }]}>
                            <Text style={[styles.statusText, { color: '#854d0e' }]}>{item.ShippingAddress || 'Kargo'}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Feather name="user" size={14} color="#64748b" />
                        <Text style={styles.infoText}>{item.customers?.CustomerName || 'Bilinmiyor'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Arayüz render işlemleri: Barkod okuma alanı ve bölümlerin listesi
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Paketlemeye Başla</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.scanContainer}>
                    {isCameraActive ? (
                        hasPermission ? (
                            <View style={{ width: '100%', height: 250, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                                <CameraView
                                    style={StyleSheet.absoluteFillObject}
                                    facing="back"
                                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                                />
                                {scanned && (
                                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                                        <Feather name="check-circle" size={48} color="#4ade80" />
                                        <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 8 }}>Okundu!</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 }}
                                    onPress={() => setIsCameraActive(false)}
                                >
                                    <Feather name="x" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={{ textAlign: 'center', marginBottom: 16, color: '#ef4444' }}>Kamera izni verilmedi.</Text>
                        )
                    ) : (
                        <TouchableOpacity
                            style={{ width: '100%', height: 60, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' }}
                            onPress={() => setIsCameraActive(true)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Feather name="camera" size={20} color="#4f46e5" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#4f46e5', fontWeight: '600', fontSize: 16 }}>Barkod Okutmak İçin Kamerayı Aç</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Taşıma Arabası veya Sipariş Ara</Text>
                    <View style={styles.inputWrapper}>
                        <Feather name="search" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.input}
                            placeholder="Araba barkodu veya Sipariş No (SIP-123)"
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                setCartBarcode(text); // İkisini de aynı inputta tutuyoruz
                            }}
                            onSubmitEditing={() => {
                                handleScanCart();
                                handleSearchSubmit();
                            }}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={() => {
                            handleScanCart();
                            handleSearchSubmit();
                        }}
                        disabled={loading || fetchingReady}
                    >
                        {loading || fetchingReady ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanButtonText}>Sorgula</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    {cartData && (
                        <View style={{ marginBottom: 20 }}>
                            <View style={styles.cartInfoBox}>
                                <Text style={styles.cartInfoTitle}>Seçili Araba: {cartData.cart.name}</Text>
                                <Text style={styles.cartInfoSubtitle}>Lütfen paketleyeceğiniz bölümü seçin.</Text>
                            </View>
                            <View style={styles.listContent}>
                                {cartData.sections && cartData.sections.length > 0 ? (
                                    cartData.sections.map(item => (
                                        <React.Fragment key={item.id.toString()}>
                                            {renderSectionItem({ item })}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Bu arabaya ait bölüm bulunamadı.</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={{ flex: 1 }}>
                        <View style={styles.cartInfoBox}>
                            <Text style={styles.cartInfoTitle}>{searchQuery ? 'Arama Sonuçları' : 'Elden Teslim Bekleyenler'}</Text>
                            <Text style={styles.cartInfoSubtitle}>Araba seçmeden doğrudan paketlemeye başlayabilirsiniz.</Text>
                        </View>
                        <View style={styles.listContent}>
                            {readyOrders && readyOrders.length > 0 ? (
                                readyOrders.map(item => (
                                    <React.Fragment key={item.Id.toString()}>
                                        {renderDirectOrderItem({ item })}
                                    </React.Fragment>
                                ))
                            ) : (
                                !fetchingReady && searchQuery ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Aranan sipariş bulunamadı.</Text>
                                    </View>
                                ) : null
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Sayfa içi görsel stil tanımlamaları
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },

    scanContainer: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
    input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0f172a' },
    scanButton: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    cartInfoBox: { padding: 16, backgroundColor: '#eef2ff' },
    cartInfoTitle: { fontSize: 16, fontWeight: 'bold', color: '#4f46e5', marginBottom: 4 },
    cartInfoSubtitle: { fontSize: 13, color: '#64748b' },

    listContent: { padding: 16, flexGrow: 1 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    orderNumber: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 12, fontWeight: '600' },
    cardBody: { gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 14, color: '#475569', fontWeight: '500' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, color: '#64748b', fontWeight: '500' }
});


