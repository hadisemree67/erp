import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Dimensions, Image, Modal } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Barcode from 'react-native-barcode-svg';

const { width } = Dimensions.get('window');

export default function PackagingScreen({ route, navigation }) {
    const { order, items } = route.params;
    const { user } = useContext(AuthContext);
    const isFocused = useIsFocused();

    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [manualBarcode, setManualBarcode] = useState('');
    const [packagingList, setPackagingList] = useState(items.map(item => ({ ...item, packagedQuantity: 0 })) || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Barcode Modal
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [generatedBarcode, setGeneratedBarcode] = useState('');

    const isCompletedRef = useRef(false);

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getBarCodeScannerPermissions();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (isCompletedRef.current) {
                return;
            }

            e.preventDefault();

            Alert.alert(
                'Paketlemeyi İptal Et',
                'Çıkarsanız paketleme işlemi iptal edilecek. Emin misiniz?',
                [
                    { text: 'Hayır', style: 'cancel', onPress: () => {} },
                    {
                        text: 'Evet, Çık',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await api.post(`/mobile/orders/package/cancel/${order.Id}`);
                            } catch (err) {
                                console.log('Sipariş iptali sırasında uyarı', err);
                            }
                            isCompletedRef.current = true;
                            navigation.dispatch(e.data.action);
                        },
                    },
                ]
            );
        });
        return unsubscribe;
    }, [navigation, order.Id, user.id]);

    const handleBarcodeScanned = ({ type, data }) => {
        setScanned(true);
        processBarcode(data);
    };

    const processBarcode = (scannedCode) => {
        let found = false;

        const isMatch = (item, code) => {
            if (!item.Barcode && item.Barcode !== 0) return false;
            const itemBarcodeStr = String(item.Barcode).trim();
            const scannedCodeStr = String(code).trim();
            if (itemBarcodeStr === scannedCodeStr) return true;
            try {
                const parsed = JSON.parse(itemBarcodeStr);
                if (Array.isArray(parsed)) {
                    if (parsed.some(b => String(b).trim() === scannedCodeStr)) return true;
                }
            } catch(e) {}
            const parts = itemBarcodeStr.split(',').map(s => s.trim());
            if (parts.includes(scannedCodeStr)) return true;
            return false;
        };

        const newList = packagingList.map(item => {
            if (!found && isMatch(item, scannedCode) && item.packagedQuantity < item.Quantity) {
                found = true;
                return { ...item, packagedQuantity: item.packagedQuantity + 1 };
            }
            return item;
        });

        if (found) {
            setPackagingList(newList);
            setTimeout(() => setScanned(false), 1500);
        } else {
            const exists = packagingList.find(i => isMatch(i, scannedCode));
            if (exists) {
                Alert.alert('Uyarı', 'Bu üründen kutuya eklenecek miktar tamamlandı.', [
                    { text: 'Tamam', onPress: () => setScanned(false) }
                ]);
            } else {
                Alert.alert('Hata', 'Bu ürün siparişte bulunmuyor veya yanlış barkod okutuldu!', [
                    { text: 'Tamam', onPress: () => setScanned(false) }
                ]);
            }
        }
        setManualBarcode('');
    };

    const handleManualSubmit = () => {
        if (manualBarcode.trim() !== '') {
            processBarcode(manualBarcode.trim());
        }
    };

    const isOrderComplete = () => {
        return packagingList.every(item => item.packagedQuantity === item.Quantity);
    };

    const handleGenerateBarcode = () => {
        if (!isOrderComplete()) {
            Alert.alert('Uyarı', 'Lütfen tüm ürünleri kutuya yerleştirin.');
            return;
        }
        const barcodeStr = `CRG-${order.Id}-${Date.now().toString().slice(-4)}`;
        setGeneratedBarcode(barcodeStr);
        setShowBarcodeModal(true);
    };

    const handleCompletePackaging = async () => {
        setIsSubmitting(true);
        try {
            const res = await api.post(`/mobile/orders/package/complete/${order.Id}`, {
                scannedBarcode: generatedBarcode
            });

            if (res.data.success) {
                isCompletedRef.current = true;
                Alert.alert('Başarılı', 'Sipariş başarıyla paketlendi ve kargoya hazır.', [
                    { text: 'Tamam', onPress: () => { setShowBarcodeModal(false); navigation.replace('Home'); } }
                ]);
            } else {
                Alert.alert('Hata', res.data.message);
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Paketleme hatası', error);
            const errorMsg = error.response?.data?.message || error.message || 'Bilinmeyen bir hata oluştu.';
            Alert.alert('Hata', 'Detay: ' + errorMsg);
            setIsSubmitting(false);
        }
    };

    const totalItems = packagingList.reduce((acc, curr) => acc + curr.Quantity, 0);
    const packagedItems = packagingList.reduce((acc, curr) => acc + curr.packagedQuantity, 0);
    const progressPercent = totalItems === 0 ? 0 : Math.round((packagedItems / totalItems) * 100);

    const renderItem = ({ item, index }) => {
        const isCompletedItem = item.packagedQuantity === item.Quantity;
        const isActiveStep = packagingList.findIndex(i => i.packagedQuantity < i.Quantity) === index;
        
        let imgUri = null;
        if (item.ImagePath) {
            let path = item.ImagePath.trim();
            if (!path.startsWith('http')) {
                const host = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:3000';
                path = `${host}${path.startsWith('/') ? '' : '/'}${path}`;
            }
            imgUri = encodeURI(path);
        }
        
        return (
            <View style={[styles.stepWrapper, isActiveStep && styles.activeStepWrapper]}>
                <View style={styles.stepHeader}>
                    <View style={[styles.stepNumberBadge, isActiveStep && styles.activeStepBadge, isCompletedItem && styles.completedStepBadge]}>
                        {isCompletedItem ? (
                            <Feather name="check" size={12} color="#fff" />
                        ) : (
                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                        )}
                    </View>
                    <Text style={[styles.stepTitle, isActiveStep && styles.activeStepTitle]}>
                        Paketle
                    </Text>
                </View>

                <View style={[styles.itemCard, isCompletedItem && styles.itemCardCompleted]}>
                    <View style={styles.itemImagePlaceholder}>
                        {imgUri ? (
                            <Image source={{ uri: imgUri }} style={{ width: 60, height: 60, borderRadius: 12 }} resizeMode="cover" />
                        ) : (
                            <Feather name="image" size={24} color="#94a3b8" />
                        )}
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={2}>{item.ProductName}</Text>
                        <Text style={styles.itemBarcode}>{item.Barcode || 'Barkodsuz'}</Text>
                        <View style={styles.locationBadge}>
                            <Text style={styles.locationText}>{item.Location || 'Raf Belirsiz'}</Text>
                        </View>
                    </View>
                    <View style={styles.itemQtyWrapper}>
                        <Text style={[styles.qtyText, isCompletedItem && {color: '#16a34a'}]}>
                            {item.packagedQuantity} <Text style={{fontSize: 12, color: '#64748b'}}>/ {item.Quantity}</Text>
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (hasPermission === null) {
        return <View style={styles.center}><Text>Kamera izni isteniyor...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.center}><Text>Kamera izni reddedildi.</Text></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Paketleme: {order.OrderNumber}</Text>
                <View style={styles.flashButton}>
                    <Feather name="box" size={24} color="#64748b" />
                </View>
            </View>

            <View style={styles.cameraWrapper}>
                <View style={styles.cameraContainer}>
                    {isFocused && hasPermission && (
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        />
                    )}
                    <View style={styles.scannerFrame}>
                        <View style={[styles.frameCorner, styles.topLeft]} />
                        <View style={[styles.frameCorner, styles.topRight]} />
                        <View style={[styles.frameCorner, styles.bottomLeft]} />
                        <View style={[styles.frameCorner, styles.bottomRight]} />
                        <View style={styles.scanLine} />
                    </View>
                    {scanned && (
                        <View style={styles.scanOverlay}>
                            <Feather name="check-circle" size={48} color="#fff" style={{ marginBottom: 8 }} />
                            <Text style={styles.scanText}>Okundu!</Text>
                        </View>
                    )}
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.listContainer}>
                    <FlatList
                        data={packagingList}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListHeaderComponent={
                            <View style={styles.progressCard}>
                                <View style={styles.progressHeader}>
                                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                        <View style={styles.boxIconWrapper}>
                                            <Feather name="package" size={20} color="#4f46e5" />
                                        </View>
                                        <View>
                                            <Text style={styles.progressTitle}>Paketleme Durumu</Text>
                                            <Text style={styles.progressSubtitle}>{order.CustomerName}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.progressStats}>
                                    <Text style={styles.progressLabel}>Kutuya Giren</Text>
                                    <Text style={styles.progressValue}>{packagedItems} / {totalItems}</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                                </View>
                            </View>
                        }
                    />
                </View>
            </KeyboardAvoidingView>

            <View style={styles.manualInputWrapper}>
                <View style={styles.inputGroup}>
                    <Feather name="edit-2" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Elle barkod gir..."
                        value={manualBarcode}
                        onChangeText={setManualBarcode}
                        onSubmitEditing={handleManualSubmit}
                        returnKeyType="send"
                    />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={handleManualSubmit}>
                    <Feather name="plus" size={24} color="#ffffff" />
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.completeButton, !isOrderComplete() && styles.completeButtonDisabled]}
                    onPress={handleGenerateBarcode}
                    disabled={!isOrderComplete()}
                >
                    <Text style={styles.completeButtonText}>Barkod Oluştur ve Kapat</Text>
                </TouchableOpacity>
            </View>

            {/* Barkod Gösterme Modalı */}
            <Modal visible={showBarcodeModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Feather name="printer" size={28} color="#4f46e5" />
                            <Text style={styles.modalTitle}>Kargo Etiketi Oluşturuldu</Text>
                        </View>
                        
                        <View style={styles.barcodeContainer}>
                            {generatedBarcode ? (
                                <Barcode value={generatedBarcode} format="CODE128" maxWidth={width * 0.7} />
                            ) : null}
                            <Text style={styles.barcodeText}>{generatedBarcode}</Text>
                        </View>
                        
                        <View style={styles.infoBox}>
                            <Feather name="info" size={20} color="#4f46e5" style={{marginRight: 8}} />
                            <Text style={styles.infoText}>Lütfen bu barkodu kutuya yapıştırın. Fatura çıktısını kutunun içine eklemeyi unutmayın.</Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.finalCompleteButton} 
                            onPress={handleCompletePackaging}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.finalCompleteButtonText}>
                                {isSubmitting ? 'Paketleniyor...' : 'İşlemi Bitir'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: '#ffffff' },
    backButton: { padding: 8, marginLeft: -8 },
    flashButton: { padding: 8, marginRight: -8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    cameraContainer: { height: Dimensions.get('window').height * 0.35, backgroundColor: '#000', marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', marginTop: 8, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
    cameraWrapper: { flex: 1, position: 'relative' },
    scannerFrame: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 40 },
    frameCorner: { position: 'absolute', width: 40, height: 40, borderColor: '#4ade80' },
    topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
    topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
    bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
    bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
    scanLine: { width: '100%', height: 2, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10 },
    scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16, 185, 129, 0.8)', justifyContent: 'center', alignItems: 'center' },
    scanText: { color: '#fff', fontSize: 24, fontWeight: '800' },
    manualInputWrapper: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 12, marginBottom: 8 },
    inputGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, height: 56 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },
    addButton: { width: 56, height: 56, backgroundColor: '#4f46e5', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    progressCard: { backgroundColor: '#ffffff', marginBottom: 16, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    boxIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    progressTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
    progressSubtitle: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    progressStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
    progressValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 3 },
    listContainer: { flex: 1, marginTop: 16, paddingHorizontal: 16 },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 2 },
    itemCardCompleted: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
    stepWrapper: { marginBottom: 12, paddingLeft: 12, borderLeftWidth: 2, borderColor: '#e2e8f0', position: 'relative' },
    activeStepWrapper: { borderColor: '#4f46e5' },
    stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    stepNumberBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', position: 'absolute', left: -13, top: -4, zIndex: 10 },
    activeStepBadge: { backgroundColor: '#4f46e5' },
    completedStepBadge: { backgroundColor: '#16a34a' },
    stepNumberText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
    activeStepTitle: { color: '#4f46e5', fontWeight: '600' },
    stepTitle: { fontSize: 14, color: '#64748b', fontWeight: '500' },
    itemImagePlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    itemBarcode: { fontSize: 11, color: '#64748b', marginBottom: 6 },
    locationBadge: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    locationText: { fontSize: 11, fontWeight: '700', color: '#475569' },
    itemQtyWrapper: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12 },
    qtyText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    footer: { padding: 20, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    completeButton: { backgroundColor: '#4f46e5', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    completeButtonDisabled: { backgroundColor: '#94a3b8' },
    completeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
    modalHeader: { alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 12 },
    barcodeContainer: { alignItems: 'center', padding: 24, backgroundColor: '#f8fafc', borderRadius: 16, width: '100%', marginBottom: 24 },
    barcodeText: { fontSize: 24, fontWeight: '800', letterSpacing: 2, color: '#0f172a', marginTop: 16 },
    infoBox: { flexDirection: 'row', backgroundColor: '#eef2ff', padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center' },
    infoText: { flex: 1, color: '#4338ca', fontSize: 14, fontWeight: '500', lineHeight: 20 },
    finalCompleteButton: { backgroundColor: '#16a34a', width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    finalCompleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
