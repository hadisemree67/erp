import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';

export default function PickingScreen({ route, navigation }) {
    const { order, items } = route.params;
    const { user } = useContext(AuthContext);

    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [pickingList, setPickingList] = useState([]);
    const [manualBarcode, setManualBarcode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isCompletedRef = useRef(false);

    useEffect(() => {
        // Initialize the picking list with pickedQuantity = 0
        const initialList = items.map(item => ({
            ...item,
            pickedQuantity: 0
        }));
        setPickingList(initialList);

        const getCameraPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        getCameraPermissions();

        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (isCompletedRef.current) {
                return;
            }

            e.preventDefault();

            Alert.alert(
                'Toplama İşlemini İptal Et',
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
                                console.error('İptal hatası:', err);
                            }
                            isCompletedRef.current = true; // prevent loop
                            navigation.dispatch(e.data.action);
                        },
                    },
                ]
            );
        });

        return unsubscribe;
    }, [navigation, order.Id, user.id, items]);

    const handleBarcodeScanned = ({ type, data }) => {
        setScanned(true);
        processBarcode(data);
        // Reset scanner after 1.5 seconds
        setTimeout(() => setScanned(false), 1500);
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

        const newList = pickingList.map(item => {
            if (!found && isMatch(item, scannedCode) && item.pickedQuantity < item.Quantity) {
                found = true;
                return { ...item, pickedQuantity: item.pickedQuantity + 1 };
            }
            return item;
        });

        if (found) {
            setPickingList(newList);
        } else {
            // Check if it's already fully picked or invalid
            const exists = pickingList.find(i => isMatch(i, scannedCode));
            if (exists) {
                Alert.alert('Uyarı', 'Bu üründen siparişte istenen miktarı zaten topladınız.');
            } else {
                Alert.alert('Hata', 'Bu ürün siparişte bulunmuyor!');
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
        return pickingList.every(item => item.pickedQuantity === item.Quantity);
    };

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
                isCompletedRef.current = true;
                navigation.replace('Summary', {
                    cargoBarcode: res.data.cargoBarcode,
                    finalWeight: res.data.finalWeight,
                    boxInfo: res.data.boxInfo
                });
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

    const renderItem = ({ item }) => {
        const isCompleted = item.pickedQuantity === item.Quantity;
        return (
            <View style={[styles.itemCard, isCompleted && styles.itemCardCompleted]}>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.ProductName}</Text>
                    <Text style={styles.itemLocation}>Konum: {item.Location || 'Belirsiz'}</Text>
                    <Text style={styles.itemBarcode}>Barkod: {item.Barcode}</Text>
                </View>
                <View style={styles.itemQty}>
                    <Text style={[styles.qtyText, isCompleted && styles.qtyTextCompleted]}>
                        {item.pickedQuantity} / {item.Quantity}
                    </Text>
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

    return (
        <View style={styles.container}>
            <View style={styles.cameraContainer}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                />
                {scanned && (
                    <View style={styles.scanOverlay}>
                        <Text style={styles.scanText}>Okundu!</Text>
                    </View>
                )}
            </View>

            <View style={styles.manualInputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Barkodu elle girin"
                    value={manualBarcode}
                    onChangeText={setManualBarcode}
                    onSubmitEditing={handleManualSubmit}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleManualSubmit}>
                    <Text style={styles.addButtonText}>Ekle</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Toplanacak Ürünler (Rota Sırası)</Text>
                <FlatList
                    data={pickingList}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderItem}
                />
            </View>

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
        </View>
    );
}

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
    cameraContainer: {
        height: 250,
        backgroundColor: '#000',
        overflow: 'hidden'
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    scanText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold'
    },
    manualInputContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    input: {
        flex: 1,
        height: 45,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginRight: 10,
        backgroundColor: '#f8fafc'
    },
    addButton: {
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderRadius: 8
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold'
    },
    listContainer: {
        flex: 1,
        padding: 15
    },
    listTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#334155'
    },
    itemCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#ef4444', // Kırmızı (henüz toplanmadı)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    itemCardCompleted: {
        borderLeftColor: '#10b981', // Yeşil
        backgroundColor: '#ecfdf5'
    },
    itemInfo: {
        flex: 1
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b'
    },
    itemLocation: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4
    },
    itemBarcode: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2
    },
    itemQty: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 10
    },
    qtyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ef4444'
    },
    qtyTextCompleted: {
        color: '#10b981'
    },
    footer: {
        padding: 15,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },
    completeButton: {
        backgroundColor: '#10b981',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    completeButtonDisabled: {
        backgroundColor: '#94a3b8'
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    }
});
