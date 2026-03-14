import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchDashboardAnalytics, type DashboardAnalyticsResponse } from '../../lib/api';

export default function AdminAnalyticsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [data, setData] = useState<DashboardAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.access) return;
        try {
            const res = await fetchDashboardAnalytics(user.access);
            setData(res);
        } catch (e) {
            console.warn('Failed to load analytics', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
    }, [user?.access]);

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="chevron-back" size={24} color={colors.text} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Аналитика</Text>
                <Ionicons name="calendar-outline" size={24} color={colors.text} />
            </View>

            {loading && !data ? (
                <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {data && (
                        <>
                            <View style={styles.row}>
                                <View style={styles.kpiCard}>
                                    <Text style={styles.kpiLabel}>Брони сегодня</Text>
                                    <Text style={styles.kpiValue}>{data.bookings_today}</Text>
                                </View>
                                <View style={styles.kpiCard}>
                                    <Text style={styles.kpiLabel}>В этом месяце</Text>
                                    <Text style={styles.kpiValue}>{data.bookings_month}</Text>
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={styles.kpiCard}>
                                    <Text style={styles.kpiLabel}>Загрузка</Text>
                                    <Text style={styles.kpiValue}>{data.occupancy_percent}%</Text>
                                </View>
                                <View style={styles.kpiCard}>
                                    <Text style={styles.kpiLabel}>Выручка</Text>
                                    <Text style={styles.kpiValue}>₸{data.revenue.toLocaleString('ru-RU')}</Text>
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={styles.kpiCard}>
                                    <Text style={styles.kpiLabel}>Конфирм‑рейт</Text>
                                    <Text style={styles.kpiValue}>{data.confirmation_rate}%</Text>
                                </View>
                                <View style={styles.kpiCard}>
                                    <Text style={styles.kpiLabel}>Повторные гости</Text>
                                    <Text style={styles.kpiValue}>{data.repeat_customer_rate}%</Text>
                                </View>
                            </View>

                            <View style={styles.fullCard}>
                                <View style={styles.fullCardHeader}>
                                    <MaterialIcons name="people-outline" size={20} color={colors.primary} />
                                    <Text style={styles.fullCardTitle}>Средний размер компании</Text>
                                </View>
                                <Text style={styles.fullCardValue}>{data.avg_guests}</Text>
                                <Text style={styles.fullCardHint}>в расчёте на подтверждённые брони за период</Text>
                            </View>

                            {(data.no_show_month !== undefined || data.no_show_rate !== undefined || data.retention_30_days !== undefined) && (
                                <View style={[styles.fullCard, { backgroundColor: '#111827', marginTop: 16 }]}>
                                    <View style={styles.fullCardHeader}>
                                        <MaterialIcons name="analytics" size={20} color={colors.primary} />
                                        <Text style={styles.fullCardTitle}>No‑show и удержание</Text>
                                    </View>
                                    {data.no_show_month !== undefined && (
                                        <Text style={styles.fullCardValue}>No‑show: {data.no_show_month}</Text>
                                    )}
                                    {data.no_show_rate !== undefined && (
                                        <Text style={styles.fullCardHint}>Доля no‑show: {data.no_show_rate}%</Text>
                                    )}
                                    {data.retention_30_days !== undefined && (
                                        <Text style={[styles.fullCardHint, { marginTop: 4 }]}>
                                            Retention 30д: {data.retention_30_days}%
                                        </Text>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    content: { padding: 20, paddingBottom: 32 },
    row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    kpiCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 16,
        paddingHorizontal: 14,
    },
    kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    kpiValue: { fontSize: 22, fontWeight: '800', color: colors.text },
    fullCard: {
        marginTop: 12,
        backgroundColor: '#111827',
        borderRadius: 20,
        padding: 18,
    },
    fullCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    fullCardTitle: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
    fullCardValue: { fontSize: 26, fontWeight: '900', color: '#f9fafb', marginTop: 4 },
    fullCardHint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
