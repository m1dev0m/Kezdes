import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchDashboardAnalytics, type DashboardAnalyticsResponse } from '../../lib/api';

import KpiMiniCard from '../../components/KpiMiniCard';

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

    if (loading && !data) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Аналитика</Text>
                <View style={styles.headerRight}>
                    <Ionicons name="stats-chart" size={20} color={colors.primary} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {data && (
                    <>
                        <View style={styles.row}>
                            <KpiMiniCard label="БРОНИ СЕГОДНЯ" value={data.bookings_today} />
                            <KpiMiniCard label="ЗА МЕСЯЦ" value={data.bookings_month} />
                        </View>

                        <View style={styles.row}>
                            <KpiMiniCard label="ЗАГРУЗКА" value={data.occupancy_percent} suffix="%" />
                            <KpiMiniCard label="ВЫРУЧКА" value={Math.floor(data.revenue / 1000)} suffix="k" />
                        </View>

                        <View style={styles.row}>
                            <KpiMiniCard label="CONFIRM %" value={data.confirmation_rate} suffix="%" />
                            <KpiMiniCard label="REPEAT %" value={data.repeat_customer_rate} suffix="%" />
                        </View>

                        <View style={styles.premiumCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="people-outline" size={20} color={colors.primary} />
                                <Text style={styles.cardTitle}>Average Party Size</Text>
                            </View>
                            <Text style={styles.cardValue}>{data.avg_guests.toFixed(1)} PAX</Text>
                            <Text style={styles.cardHint}>Среднее количество человек в подтвержденных бронях</Text>
                        </View>

                        {(data.no_show_month !== undefined || data.no_show_rate !== undefined) && (
                            <View style={styles.premiumCard}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                                    <Text style={styles.cardTitle}>No‑Shows Analysis</Text>
                                </View>
                                <View style={styles.statsGrid}>
                                    <View>
                                        <Text style={styles.statLabel}>Total (Mo)</Text>
                                        <Text style={styles.statValue}>{data.no_show_month}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.statLabel}>Rate %</Text>
                                        <Text style={styles.statValue}>{data.no_show_rate}%</Text>
                                    </View>
                                    {data.retention_30_days !== undefined && (
                                        <View>
                                            <Text style={styles.statLabel}>Retention</Text>
                                            <Text style={styles.statValue}>{data.retention_30_days}%</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 40, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: colors.text, fontStyle: 'italic', marginLeft: 12, flex: 1 },
    headerRight: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

    content: { paddingHorizontal: 24, paddingBottom: 40 },
    row: { flexDirection: 'row', gap: 12, marginBottom: 12 },

    premiumCard: {
        marginTop: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' },
    cardValue: { fontSize: 36, fontWeight: '900', color: colors.text, fontStyle: 'italic', marginBottom: 8 },
    cardHint: { fontSize: 12, color: '#64748b', lineHeight: 18 },

    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    statLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '900', color: colors.text, fontStyle: 'italic' },
});
