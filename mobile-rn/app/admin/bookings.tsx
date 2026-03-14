import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings, updateBookingStatus } from '../../lib/api';

export default function AdminBookingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, confirmed, rejected
    const [onlyToday, setOnlyToday] = useState(false);

    useEffect(() => {
        if (user?.access) initData();
    }, [user]);

    const initData = async () => {
        setIsLoading(true);
        try {
            const books = await fetchMyRestaurantBookings(user.access) as any[];
            setBookings(books || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список бронирований.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (bookingId: string | number, action: 'confirm' | 'reject') => {
        try {
            await updateBookingStatus(bookingId, action, user.access);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action === 'confirm' ? 'approved' : 'rejected' } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
        }
    };

    const handlePatchStatus = async (bookingId: string | number, status: 'no_show' | 'complete') => {
        try {
            await updateBookingStatus(bookingId, status, user.access);
            const nextStatus = status === 'complete' ? 'completed' : 'no_show';
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const filteredBookings = bookings.filter(b => {
        const statusMatch = filter === 'all' ? true : b.status === filter;
        const dateMatch = onlyToday ? b.date === todayStr : true;
        return statusMatch && dateMatch;
    });

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4300FF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Бронирования</Text>
                <TouchableOpacity style={styles.searchBtn}>
                    <Ionicons name="search" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.filtersRow}>
                <TouchableOpacity
                    style={[styles.filterDateBtn, { backgroundColor: onlyToday ? '#4300FF' : '#ffffff', borderWidth: onlyToday ? 0 : 1, borderColor: '#e2e8f0' }]}
                    onPress={() => setOnlyToday(!onlyToday)}
                >
                    <MaterialIcons name="calendar-today" size={16} color={onlyToday ? "#fff" : colors.textSecondary} />
                    <Text style={[styles.filterDateText, { color: onlyToday ? '#fff' : colors.textSecondary }]}>Сегодня</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterStatusBtn} onPress={() => setFilter(filter === 'all' ? 'pending' : 'all')}>
                    <Text style={styles.filterStatusText}>{filter === 'all' ? 'Все статусы' : 'Только новые'}</Text>
                    <Ionicons name="filter" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.content}
                renderItem={({ item: b }) => {
                    const isConfirmed = b.status === 'confirmed' || b.status === 'approved';
                    const isRejected = b.status === 'rejected';

                    return (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.timeLabel}>{b.time ? b.time.substring(0, 5) : '--:--'} - СЕГОДНЯ</Text>
                                <View style={[styles.statusBadge,
                                isConfirmed && styles.statusBadgeGreen,
                                isRejected && styles.statusBadgeRed
                                ]}>
                                    <Text style={[styles.statusText,
                                    isConfirmed && styles.statusTextGreen,
                                    isRejected && styles.statusTextRed
                                    ]}>
                                        {b.status === 'pending' ? 'ОЖИДАНИЕ' : isConfirmed ? 'ПОДТВЕРЖДЕНО' : b.status === 'completed' ? 'ЗАВЕРШЕНО' : 'ОТМЕНЕНО'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.userNameRow}>
                                <View>
                                    <Text style={styles.userName}>{b.user_name || b.customer_name || 'Клиент'}</Text>
                                    {(b.user_phone || b.customer_phone) && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 }}>
                                            <Ionicons name="call" size={12} color={colors.textSecondary} />
                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{b.user_phone || b.customer_phone}</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.chatIconBtn}
                                    onPress={() => router.push({ pathname: '/chat', params: { id: b.id, name: b.user_name || b.customer_name } })}
                                >
                                    <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="people" size={16} color={colors.textSecondary} />
                                    <Text style={styles.metaText}>{b.guests} гостя</Text>
                                </View>
                                {b.event_type && (
                                    <>
                                        <View style={styles.metaDot} />
                                        <View style={styles.metaItem}>
                                            <MaterialIcons name="event" size={14} color={colors.primary} />
                                            <Text style={styles.metaText}>{b.event_type === 'business' ? 'Бизнес' : 'Частное'}</Text>
                                        </View>
                                    </>
                                )}
                                {b.pay_at_restaurant && (
                                    <View style={styles.statusBadgeOrangeSmall}>
                                        <Text style={styles.statusTextOrangeSmall}>В РЕСТОРАНЕ</Text>
                                    </View>
                                )}
                            </View>

                            {b.status === 'pending' ? (
                                <View style={styles.pendingActions}>
                                    <TouchableOpacity style={styles.btnOutline} onPress={() => handleAction(b.id, 'reject')}>
                                        <Text style={styles.btnOutlineText}>Отклонить</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnPrimary} onPress={() => handleAction(b.id, 'confirm')}>
                                        <Text style={styles.btnPrimaryText}>Подтвердить</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : b.status === 'confirmed' || b.status === 'approved' ? (
                                <View style={styles.pendingActions}>
                                    <TouchableOpacity style={styles.btnOutlineFull} onPress={() => handlePatchStatus(b.id, 'no_show')}>
                                        <Text style={styles.btnOutlineText}>Не пришел</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.btnPrimaryFull} onPress={() => handlePatchStatus(b.id, 'complete')}>
                                        <Text style={styles.btnPrimaryText}>Завершить</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.pendingActions}>
                                    <TouchableOpacity
                                        style={styles.btnOutlineFull}
                                        onPress={() => router.push({ pathname: '/admin/edit', params: { id: b.id } })}
                                    >
                                        <Text style={styles.btnOutlineText}>{isRejected ? 'Посмотреть' : 'Изменить'}</Text>
                                    </TouchableOpacity>
                                    {!isRejected && (
                                        <TouchableOpacity
                                            style={styles.btnPrimaryFull}
                                            onPress={() => router.push({ pathname: '/event-details', params: { id: b.id } })}
                                        >
                                            <Text style={styles.btnPrimaryText}>Детали</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f5f9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
    searchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

    filtersRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20 },
    filterDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    filterDateText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    filterStatusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    filterStatusText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },

    content: { paddingHorizontal: 20, paddingBottom: 100 },

    card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    timeLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
    statusBadge: { backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#ffedd5' },
    statusText: { fontSize: 10, fontWeight: '800', color: '#f97316' }, // Pending orange
    statusBadgeGreen: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
    statusTextGreen: { color: '#16a34a' },
    statusBadgeRed: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
    statusTextRed: { color: '#ef4444' },

    userName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' },

    pendingActions: { flexDirection: 'row', gap: 12 },
    btnOutline: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    btnOutlineFull: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    btnOutlineText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },

    btnPrimary: { flex: 1, backgroundColor: '#4300FF', paddingVertical: 14, borderRadius: 16, alignItems: 'center', shadowColor: '#4300FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    btnPrimaryFull: { flex: 1, backgroundColor: '#4300FF', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    userNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    chatIconBtn: { padding: 4 },
    statusBadgeOrangeSmall: { backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#ffedd5', marginLeft: 'auto' },
    statusTextOrangeSmall: { fontSize: 10, fontWeight: '700', color: '#f97316' },
});
