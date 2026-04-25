import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { useResponsive } from '../../hooks/useResponsive';
import { fetchMyRestaurant, fetchMyRestaurantBookings, updateBookingStatus, fetchMyRestaurantApplication } from '../../lib/api';

type RestaurantState = 'loading' | 'ready' | 'pending' | 'needs_setup' | 'error';

export default function AdminDashboardScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [restaurantState, setRestaurantState] = useState<RestaurantState>('loading');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const initData = useCallback(async (refresh = false) => {
        const access = user?.access;
        if (!access) {
            return;
        }

        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setRestaurantState('loading');
        setStatusMessage(null);
        try {
            const rest = await fetchMyRestaurant(access);
            setRestaurant(rest);
            setRestaurantState('ready');
            const books = await fetchMyRestaurantBookings(access);
            setBookings(books);
        } catch (error: any) {
            if (error?.message?.includes('404')) {
                try {
                    const app = await fetchMyRestaurantApplication(access);
                    if (app && app.status === 'pending') {
                        setRestaurant(null);
                        setBookings([]);
                        setRestaurantState('pending');
                        setStatusMessage('Ваша заявка на подключение ресторана сейчас на рассмотрении. Вы можете проверить настройки и обратиться в поддержку, если данные изменились.');
                    } else {
                        setRestaurantState('needs_setup');
                        router.replace('/admin/setup');
                    }
                } catch {
                    setRestaurantState('needs_setup');
                    router.replace('/admin/setup');
                }
            } else {
                console.error('Error fetching admin data:', error);
                setRestaurantState('error');
                setStatusMessage('Не удалось загрузить данные ресторана. Проверьте соединение и попробуйте снова.');
                Alert.alert('Ошибка', 'Не удалось загрузить данные ресторана.');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [router, user?.access]);

    useEffect(() => {
        const access = user?.access;
        if (!access) {
            setIsLoading(false);
            setRestaurantState('error');
            setStatusMessage('Сессия не найдена. Войдите заново, чтобы открыть панель ресторана.');
            return;
        }

        initData();
        const interval = setInterval(() => {
            fetchMyRestaurantBookings(access)
                .then(setBookings)
                .catch(e => console.error('Polling error:', e));
        }, 15000);

        return () => clearInterval(interval);
    }, [initData, user?.access]);

    useFocusEffect(
        useCallback(() => {
            void initData(true);
        }, [initData])
    );

    const handleAction = useCallback(async (bookingId: string, action: 'confirm' | 'reject') => {
        const access = user?.access;
        if (!access) {
            return;
        }

        try {
            await updateBookingStatus(bookingId, action, access);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action === 'confirm' ? 'approved' : 'rejected' } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
        }
    }, [user?.access]);

    const pendingBookings = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);
    const unhandledCount = pendingBookings.length;

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const todaysCount = useMemo(() => {
        return bookings.filter((b) => b.date === todayStr && (b.status === 'approved' || b.status === 'confirmed')).length;
    }, [bookings, todayStr]);

    const greetingSub = useMemo(() => {
        const today = new Date();
        const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
        return `Сегодня: ${dateStr}`;
    }, []);

    const openSetup = useCallback(() => {
        router.push('/admin/setup');
    }, [router]);

    const openSupport = useCallback(() => {
        router.push('/support');
    }, [router]);

    const openNotifications = useCallback(() => {
        router.push('/notifications');
    }, [router]);

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4300FF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
                <View style={styles.headerLeft}>
                    <View style={styles.rIconBox}>
                        <Ionicons name="restaurant-outline" size={20} color="#4300FF" />
                    </View>
                    <View>
                        <Text style={styles.rName}>{restaurant?.name || 'Grand Cafe'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={styles.statusDot} />
                            <Text style={styles.rStatus}>ОТКРЫТО</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.notifBtn} onPress={openNotifications} activeOpacity={0.8}>
                    <Ionicons name="notifications" size={24} color={colors.text} />
                    {unhandledCount > 0 && <View style={styles.notifBadge} />}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={() => initData(true)} />
                }
            >
                <View style={[styles.contentInner, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
                <Text style={styles.greetingTitle}>Привет, Админ! 👋</Text>
                <Text style={styles.greetingSub}>{greetingSub}</Text>

                {restaurantState !== 'ready' && (
                    <View style={styles.noticeCard}>
                        <View style={styles.noticeRow}>
                            <View style={[styles.noticeDot, restaurantState === 'pending' ? styles.noticeDotAmber : styles.noticeDotBlue]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.noticeTitle}>
                                    {restaurantState === 'pending'
                                        ? 'Заявка на модерации'
                                        : restaurantState === 'needs_setup'
                                            ? 'Ресторан еще не настроен'
                                            : 'Не удалось обновить данные'}
                                </Text>
                                <Text style={styles.noticeText}>
                                    {statusMessage || 'Проверьте настройки ресторана и повторите загрузку.'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.noticeActions}>
                            <TouchableOpacity style={styles.noticeSecondaryBtn} onPress={openSupport}>
                                <Text style={styles.noticeSecondaryText}>Поддержка</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.noticePrimaryBtn} onPress={openSetup}>
                                <Text style={styles.noticePrimaryText}>Открыть настройки</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {restaurantState === 'ready' ? (
                    <>
                        <View style={[styles.kpiRow, isTablet && styles.kpiRowTablet]}>
                            <View style={[styles.kpiCard, styles.kpiCardWhite]}>
                                <Text style={styles.kpiLabel}>СЕГОДНЯ</Text>
                                <View style={styles.kpiValRow}>
                                    <Text style={styles.kpiValBlack}>{todaysCount}</Text>
                                    <Text style={styles.kpiValText}>броней</Text>
                                </View>
                            </View>
                            <View style={[styles.kpiCard, styles.kpiCardPurple]}>
                                <Text style={[styles.kpiLabel, { color: 'rgba(255,255,255,0.7)' }]}>ОЖИДАЮТ</Text>
                                <View style={styles.kpiValRow}>
                                    <Text style={styles.kpiValWhite}>{unhandledCount}</Text>
                                    <Text style={[styles.kpiValText, { color: '#fff' }]}>запроса</Text>
                                </View>
                            </View>
                            <View style={[styles.kpiCard, styles.kpiCardWhite]}>
                                <Text style={styles.kpiLabel}>ПРОСМОТРЫ</Text>
                                <View style={styles.kpiValRow}>
                                    <Text style={styles.kpiValBlack}>{restaurant?.views_count || 0}</Text>
                                    <Text style={styles.kpiValText}>профиля</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Новые запросы</Text>
                            <TouchableOpacity onPress={() => router.push('/admin/bookings')}>
                                <Text style={styles.sectionLink}>Все ›</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.quickActionsRow, isTablet && styles.quickActionsRowTablet]}>
                            <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/admin/tables')}>
                                <Ionicons name="grid-outline" size={20} color={colors.primary} />
                                <Text style={styles.quickActionTitle}>Столы</Text>
                                <Text style={styles.quickActionText}>Список и редактирование</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/admin/calendar')}>
                                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                                <Text style={styles.quickActionTitle}>Календарь</Text>
                                <Text style={styles.quickActionText}>Быстрый просмотр смены</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push('/admin/messages')}>
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                                <Text style={styles.quickActionTitle}>Сообщения</Text>
                                <Text style={styles.quickActionText}>Переписка с гостями</Text>
                            </TouchableOpacity>
                        </View>

                        {pendingBookings.slice(0, 5).map(booking => (
                            <View key={booking.id} style={styles.requestCard}>
                                <View style={styles.reqTopRow}>
                                    <View style={styles.reqUserBox}>
                                        <View style={styles.reqAvatar}><Text style={styles.reqAvText}>{booking.user_name?.charAt(0) || 'U'}</Text></View>
                                        <View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.reqUserName}>{booking.user_name || 'Клиент'}</Text>
                                            </View>
                                            <View style={styles.reqMetaRow}>
                                                <Ionicons name="people" size={14} color={colors.textSecondary} />
                                                <Text style={styles.reqMetaText}>{booking.guests} гостя</Text>
                                                {!!(booking.table_number || booking.table || booking.table_id) && (
                                                    <>
                                                        <Ionicons name="grid-outline" size={14} color={colors.primary} style={{ marginLeft: 8 }} />
                                                        <Text style={styles.reqMetaText}>Стол {booking.table_number || booking.table || booking.table_id}</Text>
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.reqTime}>{booking.time ? booking.time.substring(0, 5) : '--:--'}</Text>
                                        <Text style={styles.reqDateText}>сегодня</Text>
                                    </View>
                                </View>

                                {booking.special_requests ? (
                                    <Text style={styles.reqComment}>
                                        <Text style={{ fontWeight: '600', color: colors.text }}>Комментарий: </Text>
                                        {booking.special_requests}
                                    </Text>
                                ) : null}

                                {(booking.customer_summary?.is_vip || booking.customer_summary?.risk_label === 'no_show_risk') ? (
                                    <View style={styles.reqSignalRow}>
                                        {booking.customer_summary?.is_vip ? (
                                            <View style={styles.reqVipBadge}>
                                                <Text style={styles.reqVipBadgeText}>VIP</Text>
                                            </View>
                                        ) : null}
                                        {booking.customer_summary?.risk_label === 'no_show_risk' ? (
                                            <Text style={styles.reqSignalText}>Есть риск no-show</Text>
                                        ) : null}
                                    </View>
                                ) : null}

                                <View style={styles.reqActions}>
                                    <TouchableOpacity style={styles.btnPrimary} onPress={() => handleAction(booking.id, 'confirm')}>
                                        <Text style={styles.btnPrimaryText}>Подтвердить</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnSecondary} onPress={() => handleAction(booking.id, 'reject')}>
                                        <Text style={styles.btnSecondaryText}>Отклонить</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {pendingBookings.length === 0 && (
                            <Text style={styles.emptyText}>Нет новых запросов</Text>
                        )}
                    </>
                ) : (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateTitle}>
                            {restaurantState === 'pending' ? 'Заявка на модерации' : restaurantState === 'needs_setup' ? 'Ресторан еще не настроен' : 'Данные ресторана не загружены'}
                        </Text>
                        <Text style={styles.emptyStateText}>
                            {statusMessage || 'Откройте настройки, чтобы завершить подключение ресторана и вернуться к рабочей панели.'}
                        </Text>
                        <View style={styles.noticeActions}>
                            <TouchableOpacity style={styles.noticeSecondaryBtn} onPress={openSupport}>
                                <Text style={styles.noticeSecondaryText}>Поддержка</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.noticePrimaryBtn} onPress={openSetup}>
                                <Text style={styles.noticePrimaryText}>Открыть настройки</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f5f9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rIconBox: { width: 40, height: 40, borderRadius: 32, backgroundColor: 'rgba(67, 0, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
    rName: { fontSize: 16, fontWeight: '700', color: colors.text },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
    rStatus: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    notifBtn: { position: 'relative', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#f4f5f9' },

    content: { paddingBottom: 100 },
    contentInner: { width: '100%' },
    greetingTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12 },
    greetingSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },

    noticeCard: { backgroundColor: '#fff7ed', borderRadius: 28, padding: 18, borderWidth: 1, borderColor: '#fed7aa', marginBottom: 24 },
    noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    noticeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
    noticeDotAmber: { backgroundColor: '#f59e0b' },
    noticeDotBlue: { backgroundColor: colors.primary },
    noticeTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
    noticeText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    noticeActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    noticeSecondaryBtn: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fde68a', paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
    noticeSecondaryText: { fontSize: 13, fontWeight: '700', color: '#b45309' },
    noticePrimaryBtn: { flex: 1, backgroundColor: '#4300FF', paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
    noticePrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    kpiRow: { flexDirection: 'column', gap: 10, marginBottom: 32 },
    kpiRowTablet: { flexDirection: 'row', gap: 12 },
    kpiCard: { flex: 1, padding: 16, borderRadius: 32, borderCurve: 'continuous', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    kpiCardWhite: { backgroundColor: '#ffffff' },
    kpiCardPurple: { backgroundColor: '#4300FF' },
    kpiLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
    kpiValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    kpiValBlack: { fontSize: 24, fontWeight: '800', color: colors.text },
    kpiValWhite: { fontSize: 24, fontWeight: '800', color: '#fff' },
    kpiValText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    sectionLink: { fontSize: 14, fontWeight: '600', color: '#4300FF' },
    quickActionsRow: { flexDirection: 'column', gap: 12, marginBottom: 24 },
    quickActionsRowTablet: { flexDirection: 'row' },
    quickActionCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    quickActionTitle: { marginTop: 12, fontSize: 14, fontWeight: '800', color: colors.text },
    quickActionText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSecondary },

    emptyStateCard: { backgroundColor: '#ffffff', borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, marginBottom: 24 },
    emptyStateTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
    emptyStateText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 16 },

    requestCard: { backgroundColor: '#ffffff', borderRadius: 32, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 },
    reqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    reqUserBox: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    reqAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    reqAvText: { fontSize: 16, fontWeight: '700', color: colors.text },
    reqUserName: { fontSize: 15, fontWeight: '700', color: colors.text },
    reqMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    reqMetaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    reqTime: { fontSize: 18, fontWeight: '800', color: '#4300FF', textAlign: 'right' },
    reqDateText: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },

    reqComment: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, backgroundColor: '#f8fafc', padding: 12, borderRadius: 40, marginBottom: 20 },
    reqSignalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    reqVipBadge: { backgroundColor: '#fdf4ff', borderWidth: 1, borderColor: '#f5d0fe', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    reqVipBadgeText: { fontSize: 10, fontWeight: '900', color: '#a21caf' },
    reqSignalText: { fontSize: 12, fontWeight: '700', color: '#c2410c' },

    reqActions: { flexDirection: 'row', gap: 12 },
    btnPrimary: { flex: 1, backgroundColor: '#4300FF', paddingVertical: 14, borderRadius: 40, alignItems: 'center' },
    btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    btnSecondary: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 14, borderRadius: 40, alignItems: 'center' },
    btnSecondaryText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

    emptyText: { textAlign: 'center', marginTop: 40, color: colors.muted, fontSize: 14 }
});
