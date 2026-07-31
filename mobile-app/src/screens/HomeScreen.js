import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';

export default function HomeScreen({ navigation }) {
    const { user, logout } = useContext(AuthContext);

    const handleCollectOrder = async () => {
        try {
            // Assign a random order
            const res = await api.get(`/mobile/orders/next?userId=${user.id}`);
            if (res.data.success) {
                navigation.navigate('Picking', { order: res.data.order, items: res.data.items });
            } else {
                alert(res.data.message || 'Yeni sipariş bulunamadı.');
            }
        } catch (e) {
            console.error('Sipariş alma hatası', e);
            alert('Sipariş alınırken bir hata oluştu.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Hoş Geldin, {user?.name}</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logoutText}>Çıkış Yap</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.mainContent}>
                <TouchableOpacity style={styles.bigButton} onPress={handleCollectOrder}>
                    <Text style={styles.bigButtonText}>SİPARİŞ TOPLA</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.bigButton, { backgroundColor: '#0284c7', marginTop: 16, height: 60 }]} 
                    onPress={() => navigation.navigate('PendingOrders')}
                >
                    <Text style={[styles.bigButtonText, { fontSize: 18 }]}>SİPARİŞ SEÇ (MANUEL)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.statsButton} 
                    onPress={() => navigation.navigate('Stats')}
                >
                    <Text style={styles.statsButtonText}>Günlük İstatistikler</Text>
                </TouchableOpacity>
            </View>
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
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        alignItems: 'center'
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b'
    },
    logoutText: {
        color: '#ef4444',
        fontWeight: '600'
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        padding: 20
    },
    bigButton: {
        backgroundColor: '#10b981', // Yeşil
        height: 120,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6
    },
    bigButtonText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2
    },
    statsButton: {
        backgroundColor: '#3b82f6',
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    statsButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    }
});
