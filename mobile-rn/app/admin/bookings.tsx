import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings, seatBooking, updateBookingStatus } from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';

import BookingCard from '../../components/BookingCard';

export default function AdminBookingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending'>('all');
    const [onlyToday, setOnlyToday] = useState(false);

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

    const handleAction = React.useCallback(async (bookingId: string | number, action: 'confirm' | 'reject') => {
        const token = user?.access;
        if (!token) {
            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
            return;
        }
        try {
            await updateBookingStatus(bookingId, action, token);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action === 'confirm' ? 'approved' : 'rejected' } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
        }
    }, [user?.access]);

    const handlePatchStatus = React.useCallback(async (bookingId: string | number, status: 'no_show' | 'complete') => {
        const token = user?.access;
        if (!token) {
            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
            return;
        }
        try {
            await updateBookingStatus(bookingId, status, token);
            const nextStatus = status === 'complete' ? 'completed' : 'no_show';
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
        }
    }, [user?.access]);

    const handleSeat = React.useCallback(async (bookingId: string | number) => {
        const token = user?.access;
        if (!token) {
            Alert.alert('Ошибка', 'Сессия истекла. Войдите заново.');
            return;
        }
        try {
            await seatBooking(bookingId, token);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'seated' } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось посадить гостя');
        }
    }, [user?.access]);

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

    const filteredBookings = React.useMemo(() => {
        return bookings.filter(b => {
            const statusMatch = filter === 'all' ? true : b.status === filter;
            const dateMatch = onlyToday ? b.date === todayStr : true;
            return statusMatch && dateMatch;
        });
    }, [bookings, filter, onlyToday, todayStr]);

    const renderItem = React.useCallback(({ item }: { item: any }) => (
        <View style={[styles.cardColumn, isTablet && styles.cardColumnTablet]}>
            <BookingCard
                booking={item}
                isTablet={isTablet}
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
                    <MaterialIcons name="today" size={14} color={onlyToday ? "#fff" : "#64748b"} />
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

    content: { paddingBottom: 100 },
    listContent: { paddingHorizontal: 8 },
    cardColumn: { width: '100%' },
    cardColumnTablet: { width: '50%', paddingHorizontal: 8 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
});
