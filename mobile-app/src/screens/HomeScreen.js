import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
    const { user, logout } = useContext(AuthContext);
    const isFocused = useIsFocused();

    const [pendingCount, setPendingCount] = useState(0);
    const [stats, setStats] = useState({ totalOrders: 0, totalItems: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const resPending = await api.get('/mobile/orders/pending');
            if (resPending.data.success) {
                setPendingCount(resPending.data.data ? resPending.data.data.length : 0);
            }

            const resStats = await api.get('/mobile/stats/daily');
            if (resStats.data.success && resStats.data.stats) {
                const myStats = resStats.data.stats.find(s => s.UserId === user.id);
                if (myStats) {
                    setStats({
                        totalOrders: myStats.TotalOrdersPicked || 0,
                        totalItems: myStats.TotalProductsPicked || 0
                    });
                } else {
                    setStats({ totalOrders: 0, totalItems: 0 });
                }
            }
        } catch (e) {
            console.error('Veri alınamadı:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }

        // Auto-refresh every 15 seconds
        const intervalId = setInterval(() => {
            if (isFocused) {
                fetchData();
            }
        }, 15000);

        return () => clearInterval(intervalId);
    }, [isFocused]);

    const handleCollectOrder = async () => {
        try {
            const res = await api.get(`/mobile/orders/next?userId=${user.id}`);
            if (res.data.success) {
                // Navigate to PendingOrders and tell it to auto-start the cart modal for this order
                navigation.navigate('PendingOrders', { autoStartOrderId: res.data.order.Id });
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
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#4f46e5" />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerProfile}>
                        <View style={styles.avatarCircle}>
                            <Feather name="user" size={24} color="#4f46e5" />
                        </View>
                        <View>
                            <Text style={styles.greetingText}>Merhaba,</Text>
                            <Text style={styles.welcomeText}>{user?.name || 'Kullanıcı'} 👋</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                        <Feather name="log-out" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={styles.logoutText}>Çıkış Yap</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content */}
                <View style={styles.mainContent}>
                    {/* Banner */}
                    <LinearGradient
                        colors={['#6366f1', '#4f46e5', '#3730a3']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bannerContainer}
                    >
                        <View style={styles.bannerIconWrapper}>
                            <Feather name="box" size={20} color="#fff" />
                        </View>
                        <Text style={styles.bannerTextSmall}>Bugün sizi bekleyen</Text>
                        <Text style={styles.bannerTextLarge}>
                            <Text style={{ fontSize: 36, fontWeight: '800' }}>{pendingCount}</Text> sipariş
                        </Text>
                        <Text style={styles.bannerTextSmall}>bulunuyor.</Text>

                        {/* Decorative elements in banner */}
                        <Feather name="layers" size={120} color="rgba(255,255,255,0.1)" style={styles.bannerDecoIcon} />
                    </LinearGradient>

                    {/* Quick Actions */}
                    <Text style={styles.sectionTitle}>Görev İşlemleri</Text>

                    {(user?.permissions?.includes('order_prepare') || user?.role === 'admin') && (
                        <>
                            <TouchableOpacity onPress={handleCollectOrder} activeOpacity={0.9}>
                                <LinearGradient
                                    colors={['#7c3aed', '#5b21b6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.actionCard}
                                >
                                    <View style={styles.cardContent}>
                                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                            <Feather name="zap" size={28} color="#fff" />
                                        </View>
                                        <View style={styles.cardTextContainer}>
                                            <Text style={styles.cardTitle}>Otomatik Sipariş Topla</Text>
                                            <Text style={styles.cardSubtitle}>Sıradaki siparişi al ve toplamaya başla</Text>
                                        </View>
                                    </View>
                                    <Feather name="chevron-right" size={24} color="#fff" style={{ opacity: 0.8 }} />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => navigation.navigate('PendingOrders')} activeOpacity={0.9}>
                                <LinearGradient
                                    colors={['#3b82f6', '#1d4ed8']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.actionCard}
                                >
                                    <View style={styles.cardContent}>
                                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                            <Feather name="clipboard" size={28} color="#fff" />
                                        </View>
                                        <View style={styles.cardTextContainer}>
                                            <Text style={styles.cardTitle}>Manuel Sipariş Seç</Text>
                                            <Text style={styles.cardSubtitle}>Sipariş numarası seçerek toplamaya başla</Text>
                                        </View>
                                    </View>
                                    <Feather name="chevron-right" size={24} color="#fff" style={{ opacity: 0.8 }} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}

                    {(user?.permissions?.includes('order_package') || user?.role === 'admin') && (
                        <TouchableOpacity onPress={() => navigation.navigate('PendingPackaging')} activeOpacity={0.9}>
                            <LinearGradient
                                colors={['#f59e0b', '#b45309']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.actionCard}
                            >
                                <View style={styles.cardContent}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <Feather name="package" size={28} color="#fff" />
                                    </View>
                                    <View style={styles.cardTextContainer}>
                                        <Text style={styles.cardTitle}>Paketlenecek Siparişler</Text>
                                        <Text style={styles.cardSubtitle}>Toplanmış siparişleri paketle ve etiketle</Text>
                                    </View>
                                </View>
                                <Feather name="chevron-right" size={24} color="#fff" style={{ opacity: 0.8 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {(user?.permissions?.includes('order_ship') || user?.role === 'admin') && (
                        <TouchableOpacity onPress={() => navigation.navigate('Shipping')} activeOpacity={0.9}>
                            <LinearGradient
                                colors={['#10b981', '#047857']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.actionCard}
                            >
                                <View style={styles.cardContent}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <Feather name="truck" size={28} color="#fff" />
                                    </View>
                                    <View style={styles.cardTextContainer}>
                                        <Text style={styles.cardTitle}>Kargoya Teslim Et</Text>
                                        <Text style={styles.cardSubtitle}>Paket barkodunu okutarak sevkiyatı tamamla</Text>
                                    </View>
                                </View>
                                <Feather name="chevron-right" size={24} color="#fff" style={{ opacity: 0.8 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Günlük Özet (Daily Stats) */}
                    <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Günlük Özet</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <View style={styles.statIconWrapper}>
                                <Feather name="shopping-bag" size={20} color="#4f46e5" />
                            </View>
                            <Text style={styles.statValue}>{stats.totalItems}</Text>
                            <Text style={styles.statLabel}>Ürün Toplandı</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.statIconWrapper, { backgroundColor: '#dcfce3' }]}>
                                <Feather name="check-circle" size={20} color="#16a34a" />
                            </View>
                            <Text style={styles.statValue}>{stats.totalOrders}</Text>
                            <Text style={styles.statLabel}>Sipariş Tamamlandı</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.statIconWrapper, { backgroundColor: '#fef3c7' }]}>
                                <Feather name="clock" size={20} color="#d97706" />
                            </View>
                            <Text style={styles.statValue}>{pendingCount}</Text>
                            <Text style={styles.statLabel}>Devam Eden</Text>
                        </View>
                    </View>

                </View>
            </ScrollView>
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
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
        alignItems: 'center',
    },
    headerProfile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#e0e7ff',
    },
    greetingText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 2,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a'
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    logoutText: {
        color: '#ef4444',
        fontWeight: '700',
        fontSize: 13,
    },
    mainContent: {
        paddingHorizontal: 24,
    },
    bannerContainer: {
        borderRadius: 24,
        padding: 24,
        marginTop: 8,
        marginBottom: 32,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    bannerIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    bannerTextSmall: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    bannerTextLarge: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 2,
    },
    bannerDecoIcon: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        transform: [{ rotate: '-15deg' }]
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 16,
    },
    actionCard: {
        borderRadius: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 24,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardTextContainer: {
        justifyContent: 'center',
        flex: 1,
        paddingRight: 10,
    },
    cardTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6,
    },
    cardSubtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    statIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'center',
    }
});
