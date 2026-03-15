import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings, updateBookingStatus } from '../../lib/api';

import BookingCard from '../../components/BookingCard';

export default function AdminBookingsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending'>('all');
    const [onlyToday, setOnlyToday] = useState(false);

    const initData = React.useCallback(async () => {
        if (!user?.access) return;
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
    }, [user?.access]);

    useEffect(() => {
        initData();
    }, [initData]);

    const handleAction = React.useCallback(async (bookingId: string | number, action: 'confirm' | 'reject') => {
        try {
            await updateBookingStatus(bookingId, action, user.access);
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action === 'confirm' ? 'approved' : 'rejected' } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
        }
    }, [user?.access]);

    const handlePatchStatus = React.useCallback(async (bookingId: string | number, status: 'no_show' | 'complete') => {
        try {
            await updateBookingStatus(bookingId, status, user.access);
            const nextStatus = status === 'complete' ? 'completed' : 'no_show';
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: nextStatus } : b));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
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
        <BookingCard
            booking={item}
            onAction={handleAction}
            onPatchStatus={handlePatchStatus}
            onChat={handleChat}
            onEdit={handleEdit}
            onDetails={handleDetails}
        />
    ), [handleAction, handlePatchStatus, handleChat, handleEdit, handleDetails]);

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
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Брони</Text>
                    <Text style={styles.headerSubtitle}>Управление заказами заведения</Text>
                </View>
                <TouchableOpacity style={styles.searchBtn}>
                    <Ionicons name="search" size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.filtersRow}>
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
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.content}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
    headerTitle: { fontSize: 32, fontWeight: '900', color: colors.text, fontStyle: 'italic', letterSpacing: -1 },
    headerSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: -4 },
    searchBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },

    filtersRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
    filterTextActive: { color: '#fff' },

    content: { paddingHorizontal: 24, paddingBottom: 100 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
});
