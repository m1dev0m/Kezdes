import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL, fetchBookings, fetchUnreadMessagesCount } from '../../lib/api';

type BookingThread = {
    id: number;
    restaurant_name?: string;
    date?: string;
    time?: string;
    guests?: number;
    status?: string;
    restaurant?: number | null;
    updated_at?: string;
    created_at?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
};

function formatStatus(status?: string) {
    switch (status) {
        case 'confirmed':
        case 'approved':
            return 'Подтверждено';
        case 'payment_pending':
            return 'Ждёт оплаты';
        case 'seated':
            return 'За столом';
        case 'pending':
            return 'Ожидает подтверждения';
        case 'cancelled_by_user':
        case 'cancelled_by_restaurant':
            return 'Отменено';
        case 'rejected':
            return 'Отклонено';
        default:
            return 'Активная бронь';
    }
}

function formatThreadTime(value?: string) {
    if (!value) return 'Недавно';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Недавно';
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
}

export default function MessagesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [threads, setThreads] = useState<BookingThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadThreads = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
        if (!user?.access) {
            setThreads([]);
            setUnreadCount(0);
            setError(null);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            if (!silent) setLoading(true);
            setError(null);

            const [bookings, unread] = await Promise.all([
                fetchBookings(user.access),
                fetchUnreadMessagesCount(user.access).catch(() => ({ unread: 0 })),
            ]);

            const recentBookings = bookings.slice(0, 8);
            const threadResults = await Promise.allSettled(
                recentBookings.map(async (booking: any) => {
                    const response = await fetch(`${API_BASE_URL}/chat/messages/?booking=${booking.id}`, {
                        headers: { Authorization: `Bearer ${user.access}` },
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to load chat for booking ${booking.id}`);
                    }

                    const payload = await response.json().catch(() => null);
                    const messages = Array.isArray(payload) ? payload : (payload?.results || []);
                    const lastMessage = messages[messages.length - 1];
                    const lastMessageAt = lastMessage?.timestamp || booking.updated_at || booking.created_at || booking.date || '';
                    const preview =
                        typeof lastMessage?.content === 'string' && lastMessage.content.trim()
                            ? lastMessage.content.trim()
                            : booking.status
                                ? `Бронь ${formatStatus(booking.status).toLowerCase()}`
                                : 'Переписка по брони';
                    const unreadCountForThread = messages.filter(
                        (message: any) => !message.is_read && message.sender !== user.id,
                    ).length;

                    return {
                        id: booking.id,
                        restaurant_name: booking.restaurant_name,
                        date: booking.date,
                        time: booking.time,
                        guests: booking.guests,
                        status: booking.status,
                        restaurant: booking.restaurant ?? null,
                        updated_at: booking.updated_at,
                        created_at: booking.created_at,
                        lastMessage: preview,
                        lastMessageAt,
                        unreadCount: unreadCountForThread,
                    } as BookingThread;
                }),
            );

            const mappedThreads = threadResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
            mappedThreads.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());

            setThreads(mappedThreads);
            setUnreadCount(typeof unread?.unread === 'number' ? unread.unread : 0);
        } catch (loadError) {
            console.error('Failed to load messages:', loadError);
            setError('Не удалось загрузить переписки. Проверьте подключение и попробуйте снова.');
            setThreads([]);
        } finally {
            if (!silent) setLoading(false);
            setRefreshing(false);
        }
    }, [user?.access, user?.id]);

    useEffect(() => {
        void loadThreads();
    }, [loadThreads]);

    const onRefresh = () => {
        setRefreshing(true);
        void loadThreads({ silent: true });
    };

    const summaryLabel = useMemo(() => {
        if (!user?.access) return 'Войдите, чтобы видеть переписки по бронированиям';
        return unreadCount > 0 ? `${unreadCount} непрочитанных сообщений` : 'Новых сообщений нет';
    }, [unreadCount, user?.access]);

    const renderThread = ({ item }: { item: BookingThread }) => (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() =>
                router.push({
                    pathname: '/chat',
                    params: { id: String(item.id), name: item.restaurant_name || 'Бронь' },
                })
            }
        >
            <View style={styles.avatarBox}>
                <Ionicons name="restaurant" size={24} color={colors.primary} />
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName} numberOfLines={1}>
                        {item.restaurant_name || 'Ресторан'}
                    </Text>
                    <Text style={styles.chatTime}>{formatThreadTime(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.chatFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage}
                    </Text>
                    <View style={styles.metaRow}>
                        {item.unreadCount > 0 ? (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                        ) : null}
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                    </View>
                </View>
                <Text style={styles.threadHint}>
                    {item.date ? `${item.date}${item.time ? ` · ${item.time}` : ''}${item.guests ? ` · ${item.guests} гостей` : ''}` : formatStatus(item.status)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Сообщения</Text>
                    <Text style={styles.headerSubtitle}>{summaryLabel}</Text>
                </View>
                <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/support')}>
                    <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {error ? (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => void loadThreads()}>
                        <Text style={styles.retryText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            <FlatList
                data={threads}
                renderItem={renderThread}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={64} color={colors.muted} />
                        <Text style={styles.emptyText}>У вас пока нет переписок по бронированиям</Text>
                        <Text style={styles.emptySubtext}>После брони ресторан сможет писать вам в чате, а новые диалоги появятся здесь.</Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/home')}>
                            <Text style={styles.emptyButtonText}>Найти ресторан</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
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
    errorText: { flex: 1, color: '#b91c1c', fontSize: 13, lineHeight: 18 },
    retryBtn: {
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#fecaca',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    retryText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
    list: { padding: 16, gap: 12, paddingBottom: 24 },
    chatCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'flex-start',
        gap: 12,
    },
    avatarBox: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatInfo: { flex: 1, gap: 6 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    chatName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    chatTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
    chatFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    lastMessage: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
    unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    threadHint: { fontSize: 12, color: colors.muted },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { marginTop: 80, alignItems: 'center', paddingHorizontal: 24 },
    emptyText: { marginTop: 16, color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    emptySubtext: { marginTop: 8, color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    emptyButton: {
        marginTop: 18,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: colors.primary,
    },
    emptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
