import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';

export default function PendingOrdersScreen({ navigation, route }) {
    const { user } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Section tracking state
    const [isScannerModalVisible, setIsScannerModalVisible] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [sectionBarcodes, setSectionBarcodes] = useState(['']);
    
    // Camera state
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        getBarCodeScannerPermissions();
        
        fetchPendingOrders();
        
        // Check for autoStart from HomeScreen
        if (route.params?.autoStartOrderId) {
            startOrderSession(route.params.autoStartOrderId);
            // Clear the param so it doesn't re-trigger on re-focus unnecessarily
            navigation.setParams({ autoStartOrderId: null });
        }

        const intervalId = setInterval(() => {
            fetchPendingOrders();
        }, 60000);
        return () => clearInterval(intervalId);
    }, [route.params?.autoStartOrderId]);

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            const res = await api.get('/mobile/orders/pending');
            if (res.data.success) {
                setOrders(res.data.data || res.data.orders || []);
            } else {
                Alert.alert('Hata', 'Siparişler getirilemedi.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    const startOrderSession = (orderId) => {
        setSelectedOrderId(orderId);
        setSectionBarcodes(['']); // Reset sections
        setScanned(false);
        setIsScannerModalVisible(true);
    };

    const handleBarcodeScanned = ({ type, data }) => {
        if (scanned) return;
        setScanned(true);
        const newBarcodes = [...sectionBarcodes];
        const emptyIndex = newBarcodes.findIndex(b => b.trim() === '');
        if (emptyIndex !== -1) {
            newBarcodes[emptyIndex] = data;
        } else {
            if (!newBarcodes.includes(data)) {
                newBarcodes.push(data);
            }
        }
        setSectionBarcodes(newBarcodes);
        setTimeout(() => setScanned(false), 1500);
    };

    const handleAssignOrder = async () => {
        if (assigning || !selectedOrderId) return;
        
        // Validate inputs
        const validSections = sectionBarcodes.filter(b => b.trim() !== '');

        if (validSections.length === 0) {
            Alert.alert('Uyarı', 'Lütfen en az bir bölüm (raf) barkodu girin.');
            return;
        }

        setAssigning(true);
        try {
            const res = await api.post(`/mobile/orders/assign/${selectedOrderId}`, {
                userId: user.id,
                section_barcodes: validSections
            });
            if (res.data.success) {
                setIsScannerModalVisible(false);
                navigation.navigate('Picking', { order: res.data.order, items: res.data.items, initialSections: validSections });
            } else {
                Alert.alert('Bilgi', res.data.message || 'Sipariş alınamadı.');
                fetchPendingOrders(); // Listeyi yenile
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Sipariş atanamadı.');
        } finally {
            setAssigning(false);
        }
    };

    const filteredOrders = orders.filter(o =>
        o.OrderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getBadgeStyle = (item) => {
        if (item.IsMyOngoing === 1) return { bg: '#fef08a', color: '#854d0e', text: 'Kaldığım Yerden Devam' };
        return { bg: '#eef2ff', color: '#4f46e5', text: 'Yeni' };
    };

    const renderItem = ({ item }) => {
        const badge = getBadgeStyle(item);
        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => startOrderSession(item.Id)}
                activeOpacity={0.7}
            >
                <View style={styles.cardLeft}>
                    <View style={styles.iconWrapper}>
                        <Feather name="box" size={24} color="#4f46e5" />
                    </View>
                    <View style={styles.cardInfo}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.orderNumber}>{item.OrderNumber}</Text>
                            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                            </View>
                        </View>
                        <Text style={styles.orderSubtitle}>Oluşturulma: {formatDate(item.OrderDate || item.created_at)}</Text>
                    </View>
                </View>
                <Feather name="chevron-right" size={20} color="#cbd5e1" style={styles.chevron} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bekleyen Siparişler</Text>
                <TouchableOpacity onPress={fetchPendingOrders} style={styles.refreshButton}>
                    <Feather name="refresh-cw" size={20} color="#4f46e5" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Sipariş No Ara (Örn: SIP-123)"
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Feather name="filter" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => (item.Id || Math.random()).toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        !loading && filteredOrders.length > 0 && (
                            <View style={styles.listFooter}>
                                <Feather name="info" size={14} color="#94a3b8" />
                                <Text style={styles.footerText}>Toplam {filteredOrders.length} sipariş listeleniyor</Text>
                            </View>
                        )
                    }
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Feather name="inbox" size={48} color="#94a3b8" />
                            </View>
                            <Text style={styles.emptyTitle}>Sipariş Bulunamadı</Text>
                            <Text style={styles.emptyText}>Şu an bekleyen veya onaylanmış sipariş yok.</Text>
                        </View>
                    }
                />
            )}

            {/* Cart & Section Scanner Modal */}
            <Modal visible={isScannerModalVisible} transparent={true} animationType="slide">
                <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Siparişi Arabaya Ata</Text>
                            <TouchableOpacity onPress={() => setIsScannerModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>

                            {hasPermission && (
                                <View style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
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
                                </View>
                            )}

                            <View style={styles.sectionsHeader}>
                                <Text style={styles.inputLabel}>Bölüm (Raf) Barkodları</Text>
                                <TouchableOpacity onPress={() => setSectionBarcodes([...sectionBarcodes, ''])} style={styles.addSectionBtn}>
                                    <Feather name="plus" size={14} color="#3b82f6" />
                                    <Text style={styles.addSectionText}>Bölüm Ekle</Text>
                                </TouchableOpacity>
                            </View>

                            {sectionBarcodes.map((barcode, index) => (
                                <View key={index} style={styles.inputGroup}>
                                    <View style={styles.inputWrapper}>
                                        <Feather name="layers" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder={`Bölüm barkodu okutun...`}
                                            value={barcode}
                                            onChangeText={(val) => {
                                                const newBarcodes = [...sectionBarcodes];
                                                newBarcodes[index] = val;
                                                setSectionBarcodes(newBarcodes);
                                            }}
                                            autoFocus={index === 0 && !hasPermission}
                                        />
                                        {sectionBarcodes.length > 1 && (
                                            <TouchableOpacity onPress={() => {
                                                const newBarcodes = [...sectionBarcodes];
                                                newBarcodes.splice(index, 1);
                                                setSectionBarcodes(newBarcodes);
                                            }} style={{ padding: 8 }}>
                                                <Feather name="trash-2" size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity 
                            style={[styles.startSessionButton, assigning && { opacity: 0.7 }]} 
                            onPress={handleAssignOrder}
                            disabled={assigning}
                        >
                            {assigning ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.startSessionButtonText}>Toplama İşlemine Başla</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: '#ffffff',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    refreshButton: {
        padding: 8,
        marginRight: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 400,
        maxHeight: '80%',
        alignItems: 'center',
    },
    modalHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    inputGroup: {
        width: '100%',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    modalInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#0f172a',
    },
    sectionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 8,
        marginBottom: 8,
    },
    addSectionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addSectionText: {
        color: '#3b82f6',
        fontWeight: '600',
        fontSize: 13,
        marginLeft: 4,
    },
    startSessionButton: {
        width: '100%',
        backgroundColor: '#4f46e5',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    startSessionButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        marginTop: 12,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        height: 48,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        height: '100%',
        fontWeight: '500',
    },
    filterButton: {
        width: 48,
        height: 48,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    orderCard: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardInfo: {
        flex: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    orderNumber: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.3,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    orderItemsCount: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 2,
    },
    orderSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 12,
    },
    listFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
        gap: 6,
    },
    footerText: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '500',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
    }
});
