import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SummaryScreen({ route, navigation }) {
    const { cargoBarcode, finalWeight, boxInfo } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
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
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 20,
        justifyContent: 'center'
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 30
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981',
        marginBottom: 20
    },
    infoRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    label: {
        fontSize: 16,
        color: '#64748b'
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155'
    },
    barcodeBox: {
        marginTop: 30,
        padding: 20,
        borderWidth: 2,
        borderColor: '#000',
        borderStyle: 'dashed',
        alignItems: 'center',
        width: '100%',
        backgroundColor: '#f8fafc'
    },
    barcodeLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 10
    },
    barcodeText: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2
    },
    button: {
        backgroundColor: '#3b82f6',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    }
});
