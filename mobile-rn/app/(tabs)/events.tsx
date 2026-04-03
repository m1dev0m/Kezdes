import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../lib/auth-context';
import { fetchBookings, cancelBooking } from '../../lib/api';
import { colors } from '../../theme/colors';

export default function EventsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadBookings = useCallback(async () => {
        if (!user?.access) {
            setBookings([]);
            setLoading(false);
            setRefreshing(false);
            setError(null);
            return;
        }
        try {
            setError(null);
            const data = await fetchBookings(user.access);
            setBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            setBookings([]);
            setError('Не удалось загрузить бронирования. Проверьте подключение и попробуйте снова.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.access]);

    useFocusEffect(
        useCallback(() => {
            void loadBookings();
        }, [loadBookings])
    );

    const onRefresh = () => {
        setRefreshing(true);
        void loadBookings();
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'approved':
                return [styles.statusBadge, { backgroundColor: '#E8F5E9' }];
            case 'pending': return [styles.statusBadge, { backgroundColor: '#fef3c7' }];
            case 'rejected': return [styles.statusBadge, { backgroundColor: '#fee2e2' }];
            default: return styles.statusBadge;
        }
    };

    const getStatusTextStyle = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'approved':
                return [styles.statusText, { color: '#2E7D32' }];
            case 'pending': return [styles.statusText, { color: '#d97706' }];
            case 'rejected': return [styles.statusText, { color: '#b91c1c' }];
            default: return styles.statusText;
        }
    };

    const getStatusTextRussian = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'approved':
                return 'Подтверждено';
            case 'pending': return 'В ожидании';
            case 'rejected': return 'Отклонено';
            default: return status;
        }
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#0047FF" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Бронирования</Text>
                    <Text style={styles.headerSubtitle}>Управляйте вашими визитами</Text>
                </View>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => router.push('/results')}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {error ? (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => void loadBookings()}>
                        <Text style={styles.retryText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {!user?.access ? (
                <View style={styles.emptyAccess}>
                    <Text style={styles.emptyAccessTitle}>Войдите, чтобы видеть свои бронирования</Text>
                    <Text style={styles.emptyAccessSubtitle}>После входа здесь появится история визитов, статусы и быстрый доступ к подтверждению.</Text>
                    <TouchableOpacity style={styles.accessBtn} onPress={() => router.push('/onboarding')}>
                        <Text style={styles.accessBtnText}>Перейти к входу</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            <FlatList
                contentContainerStyle={styles.list}
                data={bookings}
                keyExtractor={item => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={({ item }) => {
                    const canCancel = item.status === 'pending' || item.status === 'approved';
                    return (
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.7}
                    onPress={() => router.push({
                        pathname: '/booking/confirmation',
                        params: {
                            bookingId: String(item.id),
                            restaurantName: item.restaurant_name || 'Ресторан',
                            date: item.date,
                            time: item.time,
                            guests: String(item.guests || 2),
                            eventTitle: item.restaurant_name || '',
                            payAtRestaurant: item.pay_at_restaurant ? 'true' : 'false',
                        },
                    })}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.restaurantInfo}>
                                    <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
                    <Text style={styles.eventType}>Бронь</Text>
                                </View>
                                <View style={getStatusStyle(item.status)}>
                                    <Text style={getStatusTextStyle(item.status)}>{getStatusTextRussian(item.status)}</Text>
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <View style={styles.infoRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                                    <Text style={styles.infoText}>{item.date}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Ionicons name="people-outline" size={16} color="#64748b" />
                                    <Text style={styles.infoText}>{item.guests} чел</Text>
                                </View>
                            </View>

                            {canCancel && (
                                <View style={styles.actionsRow}>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            Alert.alert(
                                                'Отмена брони',
                                                'Вы уверены, что хотите отменить эту бронь?',
                                                [
                                                    { text: 'Нет' },
                                                    {
                                                        text: 'Да, отменить',
                                                        style: 'destructive',
                                                        onPress: async () => {
                                                            if (!user?.access) return;
                                                            try {
                                                                await cancelBooking(item.id, user.access);
                                                                onRefresh();
                                                            } catch (e: any) {
                                                                Alert.alert('Ошибка', e?.message || 'Не удалось отменить бронь.');
                                                            }
                                                        },
                                                    },
                                                ],
                                            );
                                        }}
                                    >
                                        <Text style={styles.cancelBtnText}>Отменить бронь</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    !error && user?.access ? (
                        <EmptyState
                            title="У вас пока нет бронирований"
                            description="Найдите ресторан и создайте первую бронь."
                            iconName="calendar-clear-outline"
                            iconType="Ionicons"
                            buttonText="Найти ресторан"
                            onPress={() => router.push('/results')}
                        />
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    errorBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 14,
        borderRadius: 24,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        flex: 1,
        color: '#b91c1c',
        fontSize: 13,
        lineHeight: 18,
    },
    retryBtn: {
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#fecaca',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    retryText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
    emptyAccess: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 18,
        borderRadius: 28,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    emptyAccessTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    emptyAccessSubtitle: { marginTop: 6, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    accessBtn: {
        marginTop: 12,
        alignSelf: 'flex-start',
        borderRadius: 18,
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    accessBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    createButton: {
        width: 48,
        height: 48,
        borderRadius: 32,
        backgroundColor: '#0047FF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0047FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    list: {
        padding: 20,
        gap: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 40,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    restaurantInfo: {
        flex: 1,
    },
    restaurantName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    eventType: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 32,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardBody: {
        flexDirection: 'row',
        gap: 24,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    actionsRow: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#f8fafc',
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ef4444',
    },
});
