import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../api/api';

export default function StatsScreen({ navigation }) {
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
            <View style={[styles.rankContainer, index === 0 && styles.firstRankContainer, index === 1 && styles.secondRankContainer, index === 2 && styles.thirdRankContainer]}>
                {index < 3 ? (
                    <Feather name="award" size={20} color={index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#b45309'} />
                ) : (
                    <Text style={styles.rankText}>{index + 1}</Text>
                )}
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.nameText}>{item.UserName}</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statBadge}>
                        <Feather name="package" size={14} color="#4f46e5" />
                        <Text style={styles.statBadgeText}>{item.TotalOrdersPicked} Sipariş</Text>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: '#f0fdf4' }]}>
                        <Feather name="layers" size={14} color="#10b981" />
                        <Text style={[styles.statBadgeText, { color: '#10b981' }]}>{item.TotalProductsPicked} Ürün</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Günlük Liderlik</Text>
                <TouchableOpacity onPress={loadStats} style={styles.refreshButton}>
                    <Feather name="refresh-cw" size={20} color="#4f46e5" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : stats.length === 0 ? (
                <View style={styles.center}>
                    <View style={styles.emptyIconCircle}>
                        <Feather name="award" size={48} color="#94a3b8" />
                    </View>
                    <Text style={styles.emptyTitle}>Henüz Veri Yok</Text>
                    <Text style={styles.emptyText}>Bugün henüz sipariş toplanmamış.</Text>
                </View>
            ) : (
                <FlatList
                    data={stats}
                    keyExtractor={(item) => item.UserId.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    list: {
        padding: 16
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    rankContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    firstRankContainer: {
        backgroundColor: '#fef3c7',
    },
    secondRankContainer: {
        backgroundColor: '#f1f5f9',
    },
    thirdRankContainer: {
        backgroundColor: '#ffedd5',
    },
    rankText: {
        color: '#64748b',
        fontSize: 18,
        fontWeight: '800'
    },
    infoContainer: {
        flex: 1
    },
    nameText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: -0.2,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 8,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4f46e5',
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
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
    }
});
