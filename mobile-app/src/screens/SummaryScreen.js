/**
 * ============================================================================
 * BİLEŞEN ADI: SummaryScreen
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Mobil uygulamanın ana ekran bileşeni. Kullanıcı arayüzünü ve navigasyonu barındırır.
 * ============================================================================
 */
/**
 * @file SummaryScreen.js
 * @description Sipariş paketleme işlemi tamamlandıktan sonra gösterilen özet (başarı) ekranı.
 * Kutu bilgisi, toplam ağırlık ve oluşturulan kargo barkodunu ekranda görüntüler.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

/**
 * SummaryScreen Bileşeni
 * Paketleme sonrası sonuç detaylarını kullanıcıya sunar ve ana menüye dönüş butonu içerir.
 */
export default function SummaryScreen({ route, navigation }) {
    const { cargoBarcode, finalWeight, boxInfo } = route.params;

    // Arayüz render işlemleri: Gelen verileri ekrana yazar.
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <View style={styles.iconCircle}>
                    <Feather name="check" size={40} color="#10b981" />
                </View>
                <Text style={styles.title}>Sipariş Tamamlandı!</Text>
                
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Önerilen Kutu:</Text>
                    <Text style={styles.value}>{boxInfo?.boxDetails?.BoxName || 'Standart'}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Toplam Ağırlık:</Text>
                    <Text style={styles.value}>{parseFloat(finalWeight).toFixed(2)} kg</Text>
                </View>

                <View style={styles.barcodeBox}>
                    <Text style={styles.barcodeLabel}>KARGO BARKODU</Text>
                    <Text style={styles.barcodeText}>{cargoBarcode}</Text>
                </View>
            </View>

            <TouchableOpacity 
                style={styles.button} 
                onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
            >
                <Text style={styles.buttonText}>Ana Ekrana Dön</Text>
                <Feather name="home" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

// Sayfa içi görsel stil tanımlamaları
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 24,
        justifyContent: 'center'
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#d1fae5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 24,
        letterSpacing: -0.5,
    },
    infoRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    label: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '500',
    },
    value: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a'
    },
    barcodeBox: {
        marginTop: 32,
        padding: 24,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        borderStyle: 'dashed',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#f8fafc'
    },
    barcodeLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
        letterSpacing: 1,
    },
    barcodeText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0f172a',
        letterSpacing: 2
    },
    button: {
        backgroundColor: '#4f46e5',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    }
});


