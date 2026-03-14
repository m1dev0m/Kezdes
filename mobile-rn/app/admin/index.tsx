import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurant, fetchMyRestaurantBookings, updateBookingStatus, fetchMyRestaurantApplication } from '../../lib/api';

export default function AdminDashboardScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user?.access) {
            initData();
            const interval = setInterval(() => {
                fetchMyRestaurantBookings(user.access)
                    .then(setBookings)
                    .catch(e => console.error('Polling error:', e));
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const initData = async () => {
        setIsLoading(true);
        try {
            const rest = await fetchMyRestaurant(user.access);
            setRestaurant(rest);
            const books = await fetchMyRestaurantBookings(user.access);
            setBookings(books);
        } catch (error: any) {
            if (error?.message?.includes('404')) {
                try {
                    const app = await fetchMyRestaurantApplication(user.access);
                    if (app && app.status === 'pending') {
                        Alert.alert(
                            'Заявка на модерации',
                            'Ваша заявка на подключение ресторана находится на рассмотрении. Мы уведомим вас после одобрения.'
                        );
                        setRestaurant(null);
                        setBookings([]);
                    } else {
                        router.replace('/admin/setup');
                    }
                } catch {
                    router.replace('/admin/setup');
                }
            } else {
                console.error('Error fetching admin data:', error);
                Alert.alert('Ошибка', 'Не удалось загрузить данные ресторана.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (bookingId: string, action: 'confirm' | 'reject') => {
        try {
            await updateBookingStatus(bookingId, action, user.access);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action === 'confirm' ? 'approved' : 'rejected' } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4300FF" />
            </View>
        );
    }

    const unhandledCount = bookings.filter(b => b.status === 'pending').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todaysCount = bookings.filter(b => b.date === todayStr && (b.status === 'approved' || b.status === 'confirmed')).length;

const today = new Date();
const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
const greetingSub = `Сегодня: ${dateStr}`;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.rIconBox}>
                        <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#4300FF" />
                    </View>
                    <View>
                        <Text style={styles.rName}>{restaurant?.name || 'Grand Cafe'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={styles.statusDot} />
                            <Text style={styles.rStatus}>ОТКРЫТО</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.notifBtn}>
                    <Ionicons name="notifications" size={24} color={colors.text} />
                    {unhandledCount > 0 && <View style={styles.notifBadge} />}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.greetingTitle}>Привет, Админ! 👋</Text>
                <Text style={styles.greetingSub}>{greetingSub}</Text>

                <View style={styles.kpiRow}>
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

                {bookings.filter(b => b.status === 'pending').slice(0, 5).map(booking => (
                    <View key={booking.id} style={styles.requestCard}>
                        <View style={styles.reqTopRow}>
                            <View style={styles.reqUserBox}>
                                <View style={styles.reqAvatar}><Text style={styles.reqAvText}>{booking.user_name?.charAt(0) || 'U'}</Text></View>
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.reqUserName}>{booking.user_name || 'Клиент'}</Text>
                                        <View style={styles.vipBadge}><Text style={styles.vipText}>VIP</Text></View>
                                    </View>
                                    <View style={styles.reqMetaRow}>
                                        <Ionicons name="people" size={14} color={colors.textSecondary} />
                                        <Text style={styles.reqMetaText}>{booking.guests} гостя</Text>
                                        <Ionicons name="warning" size={14} color="#ef4444" style={{ marginLeft: 8 }} />
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

                {bookings.filter(b => b.status === 'pending').length === 0 && (
                    <Text style={styles.emptyText}>Нет новых запросов</Text>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f5f9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(67, 0, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
    rName: { fontSize: 16, fontWeight: '700', color: colors.text },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
    rStatus: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 },
    notifBtn: { position: 'relative', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#f4f5f9' },

    content: { paddingHorizontal: 20, paddingBottom: 100 },
    greetingTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12 },
    greetingSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 24 },

    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
    kpiCard: { flex: 1, padding: 16, borderRadius: 16, borderCurve: 'continuous', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
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

    requestCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 },
    reqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    reqUserBox: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    reqAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    reqAvText: { fontSize: 16, fontWeight: '700', color: colors.text },
    reqUserName: { fontSize: 15, fontWeight: '700', color: colors.text },
    vipBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    vipText: { fontSize: 9, fontWeight: '800', color: '#d97706' },
    reqMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    reqMetaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    reqTime: { fontSize: 18, fontWeight: '800', color: '#4300FF', textAlign: 'right' },
    reqDateText: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },

    reqComment: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 20 },

    reqActions: { flexDirection: 'row', gap: 12 },
    btnPrimary: { flex: 1, backgroundColor: '#4300FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    btnSecondary: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    btnSecondaryText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

    emptyText: { textAlign: 'center', marginTop: 40, color: colors.muted, fontSize: 14 }
});
