import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings, fetchTableStatus, seatBooking, updateBookingStatus } from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';

import BookingCard from '../../components/BookingCard';

export default function AdminBookingsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ highlight?: string; filter?: string; today?: string }>();
    const { user } = useAuth();
    const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending'>('all');
    const [onlyToday, setOnlyToday] = useState(false);
    const highlightId = useMemo(() => {
        const raw = params.highlight;
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }, [params.highlight]);

    const initData = React.useCallback(async (refresh = false) => {
        const token = user?.access;
        if (!token) return;
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        try {
            const books = await fetchMyRestaurantBookings(token) as any[];
            setBookings(books || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить список бронирований.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user?.access]);

    useEffect(() => {
        initData();
    }, [initData]);

    useFocusEffect(
        React.useCallback(() => {
            void initData(true);
        }, [initData])
    );

    useEffect(() => {
        if (params.filter === 'pending') {
            setFilter('pending');
        }
        if (params.today === '1') {
            setOnlyToday(true);
        }
    }, [params.filter, params.today]);

    const handleAction = React.useCallback(async (bookingId: string | number, action: 'confirm' | 'reject') => {
        const token = user?.access;
        if (!token) {
            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
            return;
        }
        try {
            const updated = await updateBookingStatus(bookingId, action, token) as any;
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updated } : b));
        } catch (error: any) {
            Alert.alert('Ошибка', error?.message || 'Не удалось обновить статус');
        }
    }, [user?.access]);

    const handlePatchStatus = React.useCallback(async (bookingId: string | number, status: 'no_show' | 'complete') => {
        const token = user?.access;
        if (!token) {
            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
            return;
        }
        try {
            const updated = await updateBookingStatus(bookingId, status, token) as any;
            const nextStatus = status === 'complete' ? 'completed' : 'no_show';
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updated, status: updated?.status || nextStatus } : b));
        } catch (error: any) {
            Alert.alert('Ошибка', error?.message || 'Не удалось обновить статус');
        }
    }, [user?.access]);

    const handleSeat = React.useCallback(async (bookingId: string | number) => {
        const token = user?.access;
        if (!token) {
            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
            return;
        }

        const booking = bookings.find((item) => item.id === bookingId);
        if (!booking) {
            Alert.alert('Ошибка', 'Не удалось найти бронь в текущем списке.');
            return;
        }

        const assignAndSeat = async (tableId?: number | null) => {
            const updated = await seatBooking(bookingId, token, tableId);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...(updated as any), status: (updated as any)?.status || 'seated' } : b));
        };

        try {
            if (booking.table_number || booking.table || booking.table_id) {
                await assignAndSeat(null);
                return;
            }

            const tableStatus = await fetchTableStatus(token, booking.date, booking.time);
            const freeTables = (Array.isArray(tableStatus) ? tableStatus : [])
                .filter((table: any) => table?.status === 'free')
                .filter((table: any) => {
                    const seats = Number(table?.seats || table?.capacity || 0);
                    return seats >= Number(booking.guests || 0);
                })
                .sort((left: any, right: any) => {
                    const leftSeats = Number(left?.seats || left?.capacity || 0);
                    const rightSeats = Number(right?.seats || right?.capacity || 0);
                    return leftSeats - rightSeats;
                });

            if (freeTables.length === 0) {
                Alert.alert('Нет свободного стола', 'На это время нет подходящего свободного стола для посадки.');
                return;
            }

            if (freeTables.length === 1) {
                await assignAndSeat(freeTables[0].id);
                return;
            }

            const alertButtons = freeTables.slice(0, 5).map((table: any) => {
                const label = table.number || table.name || `#${table.id}`;
                const seats = table.seats || table.capacity || '?';
                return {
                    text: `Стол ${label} · ${seats} мест`,
                    onPress: () => {
                        void assignAndSeat(table.id).catch((error: any) => {
                            Alert.alert('Ошибка', error?.message || 'Не удалось посадить гостя');
                        });
                    },
                };
            });

            Alert.alert(
                'Выберите стол',
                'Для этой брони ещё не назначен стол. Выберите свободный стол для посадки.',
                [
                    ...alertButtons,
                    { text: 'Отмена', style: 'cancel' },
                ],
            );
        } catch (error: any) {
            Alert.alert('Ошибка', error?.message || 'Не удалось посадить гостя');
        }
    }, [bookings, user?.access]);

    const handleChat = React.useCallback((id: string | number, name: string) => {
        router.push({ pathname: '/chat', params: { id, name } });
    }, [router]);

    const handleEdit = React.useCallback((id: string | number) => {
        router.push({ pathname: '/admin/edit', params: { id } });
    }, [router]);

    const handleDetails = React.useCallback((id: string | number) => {
        router.push({ pathname: '/event-details', params: { id } });
    }, [router]);

    const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

    const pendingCount = useMemo(() => bookings.filter((b) => b.status === 'pending').length, [bookings]);
    const activeCount = useMemo(
        () => bookings.filter((b) => ['approved', 'confirmed', 'seated', 'pending'].includes(b.status)).length,
        [bookings],
    );

    const filteredBookings = React.useMemo(() => {
        const next = bookings.filter(b => {
            if (highlightId && Number(b.id) === highlightId) return true;
            const statusMatch = filter === 'all' ? true : b.status === filter;
            const dateMatch = onlyToday ? b.date === todayStr : true;
            return statusMatch && dateMatch;
        });
        if (!highlightId) return next;
        return [...next].sort((left, right) => {
            if (Number(left.id) === highlightId) return -1;
            if (Number(right.id) === highlightId) return 1;
            return 0;
        });
    }, [bookings, filter, onlyToday, todayStr, highlightId]);

    const renderItem = React.useCallback(({ item }: { item: any }) => (
        <View style={[styles.cardColumn, isTablet && styles.cardColumnTablet]}>
            <BookingCard
                booking={item}
                isTablet={isTablet}
                highlighted={highlightId === Number(item.id)}
                onAction={handleAction}
                onSeat={handleSeat}
                onPatchStatus={handlePatchStatus}
                onChat={handleChat}
                onEdit={handleEdit}
                onDetails={handleDetails}
            />
        </View>
    ), [handleAction, handleSeat, handlePatchStatus, handleChat, handleEdit, handleDetails, isTablet]);

    const keyExtractor = React.useCallback((item: any) => item.id.toString(), []);

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
                <View>
                    <Text style={styles.headerTitle}>Брони</Text>
                    <Text style={styles.headerSubtitle}>Подтверждение, статусы и текущая смена</Text>
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={() => initData(true)}>
                    <Ionicons name="refresh" size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={[styles.filtersRow, { paddingHorizontal: horizontalPadding }]}>
                <TouchableOpacity
                    style={[styles.filterBtn, onlyToday && styles.filterBtnActive]}
                    onPress={() => setOnlyToday(!onlyToday)}
                >
                    <Ionicons name="today-outline" size={14} color={onlyToday ? "#fff" : "#64748b"} />
                    <Text style={[styles.filterText, onlyToday && styles.filterTextActive]}>Сегодня</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'pending' && styles.filterBtnActive]}
                    onPress={() => setFilter(filter === 'all' ? 'pending' : 'all')}
                >
                    <Ionicons name="flash-outline" size={14} color={filter === 'pending' ? "#fff" : "#64748b"} />
                    <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                        {filter === 'all' ? 'Все' : 'Новые'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.summaryRow, { paddingHorizontal: horizontalPadding }]}>
                <View style={styles.summaryChip}>
                    <Text style={styles.summaryChipValue}>{activeCount}</Text>
                    <Text style={styles.summaryChipLabel}>в работе</Text>
                </View>
                <View style={[styles.summaryChip, styles.summaryChipAccent]}>
                    <Text style={[styles.summaryChipValue, styles.summaryChipValueAccent]}>{pendingCount}</Text>
                    <Text style={[styles.summaryChipLabel, styles.summaryChipLabelAccent]}>новые заявки</Text>
                </View>
                {highlightId ? (
                    <View style={styles.summaryChip}>
                        <Text style={styles.summaryChipValue}>#{highlightId}</Text>
                        <Text style={styles.summaryChipLabel}>открыта из календаря</Text>
                    </View>
                ) : null}
            </View>

            <FlatList
                data={filteredBookings}
                numColumns={isTablet ? 2 : 1}
                key={isTablet ? 'tablet' : 'phone'}
                keyExtractor={keyExtractor}
                style={{ alignSelf: 'center', width: '100%', maxWidth: contentMaxWidth }}
                contentContainerStyle={[styles.content, styles.listContent]}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={() => initData(true)} />
                }
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={48} color="#e2e8f0" />
                        <Text style={styles.emptyText}>Бронирований не найдено</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: colors.text, fontStyle: 'italic', letterSpacing: -1 },
    headerSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: -4 },
    searchBtn: { width: 48, height: 48, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },

    filtersRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 40, borderWidth: 1, borderColor: '#f1f5f9' },
    filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
    filterTextActive: { color: '#fff' },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
    summaryChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    summaryChipAccent: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    summaryChipValue: { fontSize: 16, fontWeight: '900', color: colors.text },
    summaryChipValueAccent: { color: colors.primary },
    summaryChipLabel: { marginTop: 2, fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    summaryChipLabelAccent: { color: '#1d4ed8' },

    content: { paddingBottom: 100 },
    listContent: { paddingHorizontal: 8 },
    cardColumn: { width: '100%' },
    cardColumnTablet: { width: '50%', paddingHorizontal: 8 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
});
