import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings, fetchUnreadMessagesCount } from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';

function formatStatus(status?: string) {
    switch (status) {
        case 'pending':
            return 'Ожидает ответа';
        case 'approved':
        case 'confirmed':
            return 'Подтверждено';
        case 'seated':
            return 'Гость в зале';
        default:
            return 'Переписка по брони';
    }
}

export default function AdminMessagesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [summary, setSummary] = useState({ total: 0, unread: 0 });

    useEffect(() => {
        if (user?.access) {
            void initData();
        }
    }, [user?.access]);

    const initData = useCallback(async (refresh = false) => {
        const token = user?.access;
        if (!token) {
            setIsLoading(false);
            return;
        }
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        try {
            const [books, unread] = await Promise.all([
                fetchMyRestaurantBookings(token),
                fetchUnreadMessagesCount(token).catch(() => ({ unread: 0 })),
            ]);
            const next = ((Array.isArray(books) ? books : []) as any[])
                .filter((booking) => ['pending', 'approved', 'confirmed', 'seated'].includes(booking.status))
                .sort((left, right) => {
                    const leftTime = `${left.date || ''} ${left.time || ''}`;
                    const rightTime = `${right.date || ''} ${right.time || ''}`;
                    return rightTime.localeCompare(leftTime);
                });
            setConversations(next);
            setSummary({ total: next.length, unread: typeof unread?.unread === 'number' ? unread.unread : 0 });
        } catch (error) {
            console.error('Error fetching conversations:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить сообщения.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user?.access]);

    const pendingCount = useMemo(() => conversations.filter((item) => item.status === 'pending').length, [conversations]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => router.push({ pathname: '/chat', params: { id: item.id, name: item.user_name } })}
        >
            <View style={styles.avatarBox}>
                <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{item.user_name || 'Клиент'}</Text>
                    <Text style={styles.chatTime}>{item.time ? item.time.substring(0, 5) : item.date}</Text>
                </View>
                <View style={styles.chatFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {formatStatus(item.status)} · {item.guests} гостей
                    </Text>
                    <View style={[styles.statusPill, item.status === 'pending' ? styles.statusPillPending : styles.statusPillActive]}>
                        <Text style={[styles.statusPillText, item.status === 'pending' ? styles.statusPillTextPending : styles.statusPillTextActive]}>
                            {item.status === 'pending' ? 'Новая' : 'Активна'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.metaText}>
                    {item.date || 'Сегодня'}{!!item.table_number ? ` · Стол ${item.table_number}` : ''}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Сообщения</Text>
                    <Text style={styles.headerSubtitle}>
                        {summary.unread > 0 ? `${summary.unread} непрочитанных` : `${summary.total} активных диалогов`}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => void initData(true)} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={[styles.summaryRow, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
                <View style={styles.summaryChip}>
                    <Text style={styles.summaryValue}>{summary.total}</Text>
                    <Text style={styles.summaryLabel}>диалогов</Text>
                </View>
                <View style={[styles.summaryChip, styles.summaryChipAccent]}>
                    <Text style={[styles.summaryValue, styles.summaryValueAccent]}>{pendingCount}</Text>
                    <Text style={[styles.summaryLabel, styles.summaryLabelAccent]}>ожидают ответа</Text>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={[styles.list, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void initData(true)} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.muted} />
                            <Text style={styles.emptyText}>Пока нет сообщений</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    headerCenter: { flex: 1, marginHorizontal: 12 },
    headerSubtitle: { marginTop: 2, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    refreshBtn: { padding: 4 },
    list: { paddingBottom: 40 },
    summaryRow: { flexDirection: 'row', gap: 10, paddingVertical: 14, flexWrap: 'wrap' },
    summaryChip: { borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10 },
    summaryChipAccent: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    summaryValue: { fontSize: 16, fontWeight: '900', color: colors.text },
    summaryValueAccent: { color: colors.primary },
    summaryLabel: { marginTop: 2, fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    summaryLabelAccent: { color: '#1d4ed8' },
    chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    chatInfo: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    chatName: { fontSize: 16, fontWeight: '600', color: colors.text },
    chatTime: { fontSize: 12, color: colors.muted },
    chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMessage: { fontSize: 14, color: colors.textSecondary, flex: 1, marginRight: 8 },
    statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    statusPillPending: { backgroundColor: '#fff7ed' },
    statusPillActive: { backgroundColor: '#ecfdf5' },
    statusPillText: { fontSize: 10, fontWeight: '800' },
    statusPillTextPending: { color: '#c2410c' },
    statusPillTextActive: { color: '#15803d' },
    metaText: { marginTop: 6, fontSize: 12, color: colors.muted },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { marginTop: 16, color: colors.muted, fontSize: 16 },
});
