/**
 * @file PickingScreen.js
 * @description Depo içerisinde atanmış siparişlerin ürün bazlı toplama (picking) işleminin yapıldığı ekran.
 * Kamera ile barkod okutularak ürünlerin toplanması sağlanır.
 */
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreventRemove, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

/**
 * PickingScreen Bileşeni
 * Sipariş içerisindeki ürünlerin raftan alınarak barkodlarının okutulmasını yönetir.
 */
export default function PickingScreen({ route, navigation }) {
    const { order, items, initialSections } = route.params;
    const { user } = useContext(AuthContext);
    const isFocused = useIsFocused();

    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [manualBarcode, setManualBarcode] = useState('');
    const [pickingList, setPickingList] = useState(items.map(item => ({ ...item, pickedQuantity: 0 })) || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cameraFacing, setCameraFacing] = useState('back');
    const isCompletedRef = useRef(false);
    const isScanningRef = useRef(false);

    // Section logic
    const [activeSections, setActiveSections] = useState(initialSections || []);
    const [isSectionModalVisible, setIsSectionModalVisible] = useState(false);
    const [newSectionBarcode, setNewSectionBarcode] = useState('');
    const [isAddingSection, setIsAddingSection] = useState(false);

    useEffect(() => {
        const getBarCodeScannerPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        const loadCameraPref = async () => {
            try {
                const saved = await AsyncStorage.getItem('cameraFacingPref');
                if (saved) setCameraFacing(saved);
            } catch (e) {}
        };

        getBarCodeScannerPermissions();
        loadCameraPref();
    }, []);

    const toggleCameraFacing = async () => {
        const next = cameraFacing === 'back' ? 'front' : 'back';
        setCameraFacing(next);
        try {
            await AsyncStorage.setItem('cameraFacingPref', next);
        } catch (e) {}
    };

    /**
     * Toplama bitmeden sayfadan çıkılırsa siparişi iptal durumuna döndüren güvenlik mekanizması (UseEffect).
     */
    useEffect(() => {
        // Prevent going back unless explicitly canceled
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (isCompletedRef.current) {
                return;
            }

            e.preventDefault();

            Alert.alert(
                'Toplamayı İptal Et',
                'Çıkarsanız sipariş Onaylandı statüsüne geri dönecek ve topladığınız ürünler sıfırlanacaktır. Emin misiniz?',
                [
                    { text: 'Hayır', style: 'cancel', onPress: () => {} },
                    {
                        text: 'Evet, Çık',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await api.post(`/mobile/orders/cancel/${order.Id}`, { userId: user.id });
                            } catch (err) {
                                // Eğer sipariş zaten iptal edildiyse 400 döner, bu beklenen bir durumdur.
                                console.log('Sipariş iptali sırasında uyarı (Zaten iptal edilmiş olabilir)');
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
        if (isScanningRef.current) return;
        isScanningRef.current = true;
        setScanned(true);
        processBarcode(data);
    };

    /**
     * Okutulan barkodun listedeki ürünlerle (ve JSON formatındaki ekstra barkodlarla)
     * eşleşip eşleşmediğini kontrol edip toplama listesini (pickingList) günceller.
     * @param {string} scannedCode - Kamera veya elle girilen barkod
     */
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

        const newList = pickingList.map(item => {
            if (!found && isMatch(item, scannedCode) && item.pickedQuantity < item.Quantity) {
                found = true;
                return { ...item, pickedQuantity: item.pickedQuantity + 1 };
            }
            return item;
        });

        if (found) {
            setPickingList(newList);
            setTimeout(() => {
                setScanned(false);
                isScanningRef.current = false;
            }, 1500);
        } else {
            const exists = pickingList.find(i => isMatch(i, scannedCode));
            if (exists) {
                Alert.alert('Uyarı', 'Bu üründen siparişte istenen miktarı zaten topladınız.', [
                    { text: 'Tamam', onPress: () => { setScanned(false); isScanningRef.current = false; } }
                ]);
            } else {
                Alert.alert('Hata', 'Bu ürün siparişte bulunmuyor veya yanlış barkod okutuldu!', [
                    { text: 'Tamam', onPress: () => { setScanned(false); isScanningRef.current = false; } }
                ]);
            }
        }
        setManualBarcode('');
    };

    const handleManualSubmit = () => {
        if (manualBarcode.trim() !== '') {
            if (isScanningRef.current) return;
            isScanningRef.current = true;
            processBarcode(manualBarcode.trim());
        }
    };

    const handleAddSection = async () => {
        if (!newSectionBarcode.trim()) {
            Alert.alert('Uyarı', 'Lütfen geçerli bir bölüm barkodu girin.');
            return;
        }
        setIsAddingSection(true);
        try {
            const res = await api.post(`/mobile/orders/${order.Id}/add-section`, {
                section_barcode: newSectionBarcode.trim()
            });

            if (res.data.success) {
                setActiveSections(prev => [...prev, newSectionBarcode.trim()]);
                setIsSectionModalVisible(false);
                setNewSectionBarcode('');
                Alert.alert('Başarılı', 'Yeni bölüm eklendi.');
            } else {
                Alert.alert('Hata', res.data.message || 'Bölüm eklenemedi.');
            }
        } catch (error) {
            console.error('Bölüm ekleme hatası', error);
            Alert.alert('Hata', 'Bölüm eklenirken bir hata oluştu.');
        } finally {
            setIsAddingSection(false);
        }
    };

    const handleModalBarcodeScanned = ({ type, data }) => {
        if (!isSectionModalVisible || isAddingSection) return;
        setNewSectionBarcode(data);
        // We could automatically submit, but let's just populate the input for now
        // or actually, let's just trigger submit automatically after scanning for maximum speed:
        handleAddSectionWithData(data);
    };

    const handleAddSectionWithData = async (barcodeData) => {
        if (!barcodeData.trim()) return;
        setIsAddingSection(true);
        try {
            const res = await api.post(`/mobile/orders/${order.Id}/add-section`, {
                section_barcode: barcodeData.trim()
            });

            if (res.data.success) {
                setActiveSections(prev => [...prev, barcodeData.trim()]);
                setIsSectionModalVisible(false);
                setNewSectionBarcode('');
                Alert.alert('Başarılı', 'Yeni bölüm eklendi.');
            } else {
                Alert.alert('Hata', res.data.message || 'Bölüm eklenemedi.');
            }
        } catch (error) {
            console.error('Bölüm ekleme hatası', error);
            Alert.alert('Hata', 'Bölüm eklenirken bir hata oluştu.');
        } finally {
            setIsAddingSection(false);
        }
    };

    const isOrderComplete = () => {
        return pickingList.every(item => item.pickedQuantity === item.Quantity);
    };

    /**
     * Tüm ürünler toplandığında işlemi sonlandıran ve API'ye tamamlandı bilgisini ileten fonksiyon.
     * Kullanıcının paketleme yetkisi varsa doğrudan Packaging (Paketleme) sayfasına yönlendirir.
     */
    const handleCompleteOrder = async () => {
        if (!isOrderComplete()) {
            Alert.alert('Uyarı', 'Lütfen siparişteki tüm ürünleri okutun.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post(`/mobile/orders/complete/${order.Id}`, {
                userId: user.id
            });

            if (res.data.success) {
                isCompletedRef.current = true; // Senkron olarak güncelle
                
                setIsSubmitting(false);
                Alert.alert('Başarılı', 'Sipariş başarıyla toplandı. Paketleme ekibine devredildi.', [
                    { text: 'Tamam', onPress: () => { navigation.replace('Home'); } }
                ]);
            } else {
                Alert.alert('Hata', res.data.message);
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Tamamlama hatası', error);
            const errorMsg = error.response?.data?.message || error.message || 'Bilinmeyen bir hata oluştu.';
            Alert.alert('Hata', 'Detay: ' + errorMsg);
            setIsSubmitting(false);
        }
    };

    const totalItems = pickingList.reduce((acc, curr) => acc + curr.Quantity, 0);
    const pickedItems = pickingList.reduce((acc, curr) => acc + curr.pickedQuantity, 0);
    const progressPercent = totalItems === 0 ? 0 : Math.round((pickedItems / totalItems) * 100);

    const renderItem = ({ item, index }) => {
        const isCompletedItem = item.pickedQuantity === item.Quantity;
        // Mevcut aktif adımı bulmak için (henüz tamamlanmamış ilk adım)
        const isActiveStep = pickingList.findIndex(i => i.pickedQuantity < i.Quantity) === index;
        
        let imgUri = null;
        if (item.ImagePath) {
            let path = item.ImagePath.trim();
            if (!path.startsWith('http')) {
                // Remove trailing /api from baseURL to get the root host
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
                        Adım {index + 1}: <Text style={{fontWeight: '700'}}>{item.Location || 'Raf Belirsiz'}</Text>'e git
                    </Text>
                </View>
                
                <View style={[styles.itemCard, isCompletedItem && styles.itemCardCompleted, { marginTop: 8 }]}>
                    <View style={styles.itemImagePlaceholder}>
                        {imgUri ? (
                            <Image source={{ uri: imgUri }} style={{ width: 60, height: 60, borderRadius: 8 }} resizeMode="contain" />
                        ) : (
                            <Feather name="image" size={24} color="#cbd5e1" />
                        )}
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.ProductName}</Text>
                        <Text style={styles.itemBarcode}>Barkod: {item.Barcode}</Text>
                        <View style={styles.locationBadge}>
                            <Text style={styles.locationText}>{item.Location || 'Raf Belirsiz'}</Text>
                        </View>
                    </View>
                    <View style={styles.itemQtyWrapper}>
                        <Text style={[styles.qtyText, isCompletedItem && { color: '#16a34a' }]}>
                            {item.pickedQuantity} / {item.Quantity}
                        </Text>
                        <Feather name="chevron-right" size={16} color="#cbd5e1" style={{ marginLeft: 8 }} />
                    </View>
                </View>
            </View>
        );
    };

    if (hasPermission === null) {
        return <View style={styles.center}><Text>Kamera izni isteniyor...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.center}><Text>Kameraya erişim reddedildi.</Text></View>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Arayüz render işlemleri: Kamera görüntüsü, sipariş detayları ve toplama adımları
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sipariş Toplama</Text>
                <TouchableOpacity style={styles.flashButton}>
                    <Feather name="zap" size={20} color="#4f46e5" />
                </TouchableOpacity>
            </View>

            <View style={styles.cameraWrapper}>
                <View style={styles.cameraContainer}>
                    {isFocused && hasPermission && (
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing={cameraFacing}
                            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        />
                    )}

                    {/* Kamera Değiştirme Butonu */}
                    <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}>
                        <TouchableOpacity 
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }}
                            onPress={toggleCameraFacing}
                        >
                            <Feather name="refresh-cw" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

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
                        data={pickingList}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListHeaderComponent={
                            <View>
                                <View style={styles.manualInputWrapper}>
                                    <View style={styles.inputGroup}>
                                        <Feather name="cpu" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Barkodu elle girin"
                                            placeholderTextColor="#94a3b8"
                                            value={manualBarcode}
                                            onChangeText={setManualBarcode}
                                            onSubmitEditing={handleManualSubmit}
                                        />
                                    </View>
                                    <TouchableOpacity style={styles.addButton} onPress={handleManualSubmit}>
                                        <Feather name="plus" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {/* Sections UI */}
                                {activeSections.length > 0 && (
                                    <View style={styles.sectionsContainer}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={styles.sectionsTitle}>Kullanılan Bölümler</Text>
                                            <TouchableOpacity style={styles.addSectionButton} onPress={() => setIsSectionModalVisible(true)}>
                                                <Feather name="plus" size={16} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {activeSections.map((sec, idx) => (
                                                <View key={idx} style={styles.sectionBadge}>
                                                    <Feather name="layers" size={14} color="#4f46e5" style={{ marginRight: 4 }} />
                                                    <Text style={styles.sectionBadgeText}>{sec}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <View style={styles.progressCard}>
                                    <View style={styles.progressHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={styles.boxIconWrapper}>
                                                <Feather name="package" size={20} color="#4f46e5" />
                                            </View>
                                            <View>
                                                <Text style={styles.progressTitle}>{order.OrderNumber}</Text>
                                                <Text style={styles.progressSubtitle}>Oluşturulma: {formatDate(order.OrderDate)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.badgeNew}>
                                            <Text style={styles.badgeNewText}>Yeni</Text>
                                        </View>
                                    </View>
                                    <View style={styles.progressStats}>
                                        <View>
                                            <Text style={styles.progressLabel}>Toplanan</Text>
                                            <Text style={styles.progressValue}>{pickedItems} / {totalItems} <Text style={{ fontSize: 13, color: '#64748b' }}>Ürün</Text></Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.progressLabel}>İlerleme</Text>
                                            <Text style={styles.progressValue}>%{progressPercent}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                                    </View>
                                </View>

                                <View style={styles.listHeaderRow}>
                                    <Text style={styles.listTitle}>Ürünler</Text>
                                    <TouchableOpacity style={styles.viewAllButton}>
                                        <Text style={styles.viewAllText}>Tümünü Gör</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }
                    />
                </View>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.completeButton, !isOrderComplete() && styles.completeButtonDisabled]}
                    onPress={handleCompleteOrder}
                    disabled={!isOrderComplete() || isSubmitting}
                >
                    <Text style={styles.completeButtonText}>
                        {isSubmitting ? 'İşleniyor...' : 'Siparişi Tamamla'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Add Section Modal */}
            {isSectionModalVisible && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, zIndex: 100 }]}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>Yeni Bölüm Ekle</Text>
                            <TouchableOpacity onPress={() => setIsSectionModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
                            Eğer sipariş bulunduğunuz bölüme sığmıyorsa, yeni bir bölüm (raf) okutarak bu siparişi o bölüme de dahil edebilirsiniz.
                        </Text>

                        {isFocused && hasPermission && (
                            <View style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                                <CameraView
                                    style={StyleSheet.absoluteFillObject}
                                    facing="back"
                                    onBarcodeScanned={isAddingSection ? undefined : handleModalBarcodeScanned}
                                />
                            </View>
                        )}

                        <TextInput
                            style={[styles.input, { marginBottom: 16 }]}
                            placeholder="Yeni Bölüm Barkodu"
                            value={newSectionBarcode}
                            onChangeText={setNewSectionBarcode}
                            autoCapitalize="characters"
                        />
                        <TouchableOpacity 
                            style={[styles.completeButton, isAddingSection && { opacity: 0.5 }]} 
                            onPress={handleAddSection}
                            disabled={isAddingSection}
                        >
                            <Text style={styles.completeButtonText}>{isAddingSection ? 'Ekleniyor...' : 'Bölümü Ekle'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

// Sayfa içi görsel stil tanımlamaları
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
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
    flashButton: {
        padding: 8,
        marginRight: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    cameraWrapper: {
        height: 220,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    cameraContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerFrame: {
        width: 260,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    frameCorner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#4ade80',
    },
    topLeft: {
        top: 0, left: 0,
        borderTopWidth: 4, borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    topRight: {
        top: 0, right: 0,
        borderTopWidth: 4, borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    bottomLeft: {
        bottom: 0, left: 0,
        borderBottomWidth: 4, borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    bottomRight: {
        bottom: 0, right: 0,
        borderBottomWidth: 4, borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#4ade80',
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
    },
    manualInputWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 16,
        gap: 12,
    },
    inputGroup: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        fontWeight: '500',
    },
    addButton: {
        width: 56,
        height: 56,
        backgroundColor: '#4f46e5',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    progressCard: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    boxIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 2,
    },
    progressSubtitle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    badgeNew: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeNewText: {
        color: '#4f46e5',
        fontSize: 11,
        fontWeight: '700',
    },
    progressStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 4,
    },
    progressValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4f46e5',
        borderRadius: 3,
    },
    listContainer: {
        flex: 1,
        marginTop: 20,
        paddingHorizontal: 16,
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    viewAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4f46e5',
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemCardCompleted: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    stepWrapper: {
        marginBottom: 12,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderColor: '#e2e8f0',
        position: 'relative',
    },
    activeStepWrapper: {
        borderColor: '#4f46e5',
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    stepNumberBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        left: -13, // Align exactly over the border
        top: -4,
        zIndex: 10,
    },
    activeStepBadge: {
        backgroundColor: '#4f46e5',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    completedStepBadge: {
        backgroundColor: '#16a34a',
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b',
    },
    activeStepTitle: {
        color: '#4f46e5',
        fontWeight: '600',
    },
    stepTitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    itemImagePlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    itemBarcode: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 6,
    },
    locationBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    locationText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    itemQtyWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
    },
    qtyText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    footer: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    completeButton: {
        backgroundColor: '#4f46e5',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    completeButtonDisabled: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0,
        elevation: 0,
    },
    completeButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    sectionsContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    addSectionButton: {
        backgroundColor: '#10b981',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    sectionBadgeText: {
        color: '#4f46e5',
        fontWeight: '600',
        fontSize: 14,
    }
});
