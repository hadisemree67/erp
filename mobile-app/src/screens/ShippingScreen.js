/**
 * @file ShippingScreen.js
 * @description Sevkiyat (Kargo) ekranı. Kamera ile kargo barkodunu okutarak
 * veya manuel barkod girerek siparişlerin sevkiyat (kargoya verilme) işlemini gerçekleştirir.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import api from '../api/api';
import { useIsFocused } from '@react-navigation/native';

/**
 * ShippingScreen Bileşeni
 * Kamera izinlerini yönetir ve barkod tarama arayüzünü sunar.
 */
export default function ShippingScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [manualBarcode, setManualBarcode] = useState('');

    /**
     * Bileşen yüklendiğinde kamera izinlerini isteyen UseEffect hook'u.
     */
    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    /**
     * Kamera ile barkod okutulduğunda veya manuel girildiğinde tetiklenen fonksiyon.
     * Okunan barkodu API'ye göndererek kargo çıkışını kaydeder.
     * @param {Object} param0 - Okunan barkodun tipi (type) ve verisi (data)
     */
    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            const res = await api.post('/mobile/orders/ship', { cargoBarcode: data });
            if (res.data.success) {
                setLastScanned({ success: true, message: `✅ ${res.data.orderNumber} kargoya verildi!` });
            } else {
                setLastScanned({ success: false, message: `❌ ${res.data.message}` });
            }
        } catch (error) {
            setLastScanned({ success: false, message: `❌ Hata: ${error.response?.data?.message || 'Bilinmeyen hata'}` });
        }

        // 2 saniye sonra yeni taramaya izin ver
        // 2 saniye sonra yeni taramaya izin ver
        setTimeout(() => {
            setScanned(false);
        }, 2000);
    };

    /**
     * Barkod okunamadığında kullanıcının manuel olarak girdiği barkodu işleyen fonksiyon.
     */
    const handleManualSubmit = () => {
        if (!manualBarcode.trim()) return;
        handleBarCodeScanned({ type: 'manual', data: manualBarcode.trim() });
        setManualBarcode('');
    };

    if (hasPermission === null) {
        return <View style={styles.container}><Text>Kamera izni isteniyor...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.container}><Text>Kamera izni reddedildi.</Text></View>;
    }

    // Arayüz render işlemleri: Kamera görüntüsü ve manuel giriş alanı
    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Kargo Teslim (Sevkiyat)</Text>
                <View style={{ width: 40 }} />
            </View>

            {isFocused && (
                <CameraView
                    style={styles.camera}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
                    }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.scanBox} />
                        <Text style={styles.scanText}>Paketin kargo barkodunu okutun</Text>
                        
                        {lastScanned && (
                            <View style={[styles.resultBox, { backgroundColor: lastScanned.success ? '#10b981' : '#ef4444' }]}>
                                <Feather name={lastScanned.success ? 'check-circle' : 'x-circle'} size={24} color="#fff" />
                                <Text style={styles.resultText}>{lastScanned.message}</Text>
                            </View>
                        )}
                    </View>
                </CameraView>
            )}

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            >
                <View style={styles.manualEntryContainer}>
                <Text style={styles.manualEntryLabel}>veya barkodu elle girin:</Text>
                <View style={styles.manualInputRow}>
                    <TextInput 
                        style={styles.manualInput} 
                        placeholder="Barkod No..." 
                        placeholderTextColor="#94a3b8"
                        value={manualBarcode}
                        onChangeText={setManualBarcode}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit}>
                        <Feather name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={{ height: 80 }} />
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// Sayfa içi görsel stil tanımlamaları
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: { padding: 8 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanBox: {
        width: 250,
        height: 150,
        borderWidth: 2,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderRadius: 12,
        marginBottom: 24,
    },
    scanText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    resultBox: {
        position: 'absolute',
        bottom: 50,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 5,
    },
    resultText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    manualEntryContainer: {
        backgroundColor: '#1e293b',
        paddingTop: 16,
        paddingHorizontal: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    manualEntryLabel: {
        color: '#cbd5e1',
        fontSize: 13,
        marginBottom: 8,
    },
    manualInputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    manualInput: {
        flex: 1,
        backgroundColor: '#334155',
        color: '#fff',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
    },
    manualSubmitBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
