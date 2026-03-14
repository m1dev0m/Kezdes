import React, { useState, useEffect } from 'react';
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

    const loadBookings = async () => {
        if (!user?.access) return;
        try {
            const data = await fetchBookings(user.access);
            setBookings(data.results || data);
        } catch (error) {
            console.error('Failed to load bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadBookings();
        }, [user])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadBookings();
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
                    <Text style={styles.headerTitle}>События</Text>
                    <Text style={styles.headerSubtitle}>Управляйте вашими планами</Text>
                </View>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => router.push('/events/type')}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

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
                            onPress={() => router.push({ pathname: '/timeline', params: { id: item.id } })}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.restaurantInfo}>
                                    <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
                                    <Text style={styles.eventType}>Встреча</Text>
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
                    <EmptyState
                        title="У вас пока нет событий"
                        description="Создайте первое событие, чтобы начать планирование."
                        iconName="calendar-clear-outline"
                        iconType="Ionicons"
                        buttonText="Создать событие"
                        onPress={() => router.push('/events/type')}
                    />
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
    createButton: {
        width: 48,
        height: 48,
        borderRadius: 16,
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
        borderRadius: 24,
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
        borderRadius: 8,
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
