import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';

export default function PendingOrdersScreen({ navigation }) {
    const { user } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPendingOrders();
        const intervalId = setInterval(() => {
            fetchPendingOrders();

        }, 60000);
        return () => clearInterval(intervalId);

    }, []);

    const fetchPendingOrders = async () => {
        setLoading(true);
        try {
            const res = await api.get('/mobile/orders/pending');
            if (res.data.success) {
                setOrders(res.data.data);
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

    const handleAssignOrder = async (orderId) => {
        if (assigning) return;
        setAssigning(true);
        try {
            const res = await api.post(`/mobile/orders/assign/${orderId}`, {
                userId: user.id
            });
            if (res.data.success) {
                navigation.replace('Picking', { order: res.data.order, items: res.data.items });
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

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.orderCard}
            onPress={() => {
                Alert.alert(
                    'Siparişi Al',
                    `${item.OrderNumber} numaralı siparişi toplamaya başlamak istediğinize emin misiniz?`,
                    [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Başla', onPress: () => handleAssignOrder(item.Id) }
                    ]
                );
            }}
        >
            <View style={styles.cardLeft}>
                <Feather name="package" size={24} color="#4f46e5" />
                <Text style={styles.orderNumber}>{item.OrderNumber}</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bekleyen Siparişler</Text>
                <TouchableOpacity onPress={fetchPendingOrders} style={styles.refreshButton}>
                    <Feather name="refresh-cw" size={20} color="#4f46e5" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Feather name="search" size={20} color="#64748b" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Sipariş No Ara (Örn: SIP-123)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Feather name="inbox" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyText}>Bekleyen (Onaylanmış) sipariş bulunmuyor.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item.Id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                />
            )}
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
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        padding: 4,
    },
    refreshButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0f172a',
    },
    listContainer: {
        padding: 16,
    },
    orderCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    orderNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 16,
    }
});
