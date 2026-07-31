import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../api/api';

export default function StatsScreen() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await api.get('/mobile/stats/daily');
            if (res.data.success) {
                setStats(res.data.stats);
            }
        } catch (error) {
            console.error('İstatistik yükleme hatası', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }) => (
        <View style={styles.card}>
            <View style={styles.rankContainer}>
                <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.nameText}>{item.UserName}</Text>
                <Text style={styles.detailText}>
                    Toplanan Sipariş: {item.TotalOrdersPicked} | Ürün: {item.TotalProductsPicked}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Günlük Liderlik Tablosu</Text>
            {stats.length === 0 ? (
                <Text style={styles.emptyText}>Henüz tamamlanan sipariş yok.</Text>
            ) : (
                <FlatList
                    data={stats}
                    keyExtractor={(item) => item.UserId.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        color: '#1e293b'
    },
    list: {
        paddingHorizontal: 15
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    rankContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    rankText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    infoContainer: {
        flex: 1
    },
    nameText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#334155'
    },
    detailText: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#94a3b8',
        fontSize: 16
    }
});
