import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings, fetchTableStatus } from '../../lib/api';
import { useResponsive } from '../../hooks/useResponsive';

const START_HOUR = 9;
const END_HOUR = 23;

export default function AdminCalendarScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
    const [selectedTab, setSelectedTab] = useState('Все столы');
    const [viewMode, setViewMode] = useState('День');
    const [bookings, setBookings] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadBookings = React.useCallback(async (refresh = false) => {
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
            const today = new Date().toISOString().split('T')[0];
            const [bookingData, tableData] = await Promise.all([
                fetchMyRestaurantBookings(token),
                fetchTableStatus(token, today).catch(() => []),
            ]);
            setBookings((bookingData || []) as any[]);
            setTables(Array.isArray(tableData) ? tableData : []);
        } catch (error) {
            console.error('Calendar bookings load error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user?.access]);

    React.useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    useFocusEffect(
        React.useCallback(() => {
            void loadBookings(true);
        }, [loadBookings])
    );

    const hours = useMemo(() => {
        return Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => {
            const hour = START_HOUR + index;
            return `${hour.toString().padStart(2, '0')}:00`;
        });
    }, []);

    const tableTabs = useMemo(() => {
        const fromTables = tables
            .filter((table) => table?.is_active !== false)
            .map((table) => `Стол ${table.number || table.name || table.id}`);
        const fromBookings = bookings
            .map((booking) => booking.table_number || booking.table || booking.table_id)
            .filter(Boolean)
            .map((value) => `Стол ${value}`);
        return ['Все столы', ...Array.from(new Set([...fromTables, ...fromBookings]))];
    }, [bookings, tables]);

    const gridColumns = useMemo(() => {
        const preferred = tableTabs.filter((tab) => tab !== 'Все столы');
        return preferred.length > 0 ? preferred : ['Без стола'];
    }, [tableTabs]);

    const getBookingTableLabel = React.useCallback((booking: any) => (
        booking?.table_number || booking?.table || booking?.table_id || null
    ), []);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const visibleBookings = useMemo(() => {
        return bookings.filter((booking) => {
            const isCalendarStatus = ['confirmed', 'approved', 'pending', 'seated'].includes(booking.status);
            if (!isCalendarStatus || booking.date !== todayStr) {
                return false;
            }

            if (selectedTab === 'Все столы') {
                return true;
            }

            const bookingTableLabel = getBookingTableLabel(booking);
            return `Стол ${bookingTableLabel}` === selectedTab;
        });
    }, [bookings, getBookingTableLabel, selectedTab, todayStr]);

    const getBookingColumnKey = React.useCallback((booking: any) => {
        const bookingTableLabel = getBookingTableLabel(booking);
        return bookingTableLabel ? `Стол ${bookingTableLabel}` : 'Без стола';
    }, [getBookingTableLabel]);

    const getBookingStyle = React.useCallback((booking: any, allBookings: any[]) => {
        const [hours, mins] = booking.time.split(':').map(Number);
        const slotHeight = isTablet ? 88 : 76;
        const offsetMinutes = (hours - START_HOUR) * 60 + (mins || 0);
        const top = Math.max(0, (offsetMinutes / 60) * slotHeight);

        const duration = (booking.duration_minutes ? booking.duration_minutes / 60 : (booking.duration_hours || 2));
        const height = Math.max(slotHeight * 0.9, duration * slotHeight);
        const columnKey = getBookingColumnKey(booking);
        const columnIndex = Math.max(0, gridColumns.indexOf(columnKey));
        const columnWidthPercent = 100 / Math.max(1, gridColumns.length);

        const overlaps = allBookings.filter((candidate) => {
            return (
                candidate.id !== booking.id &&
                candidate.date === booking.date &&
                candidate.time === booking.time &&
                getBookingColumnKey(candidate) === columnKey
            );
        });

        const sameColumnAtTime = allBookings.filter(
            (candidate) => candidate.date === booking.date && candidate.time === booking.time && getBookingColumnKey(candidate) === columnKey,
        );
        const indexInOverlaps = sameColumnAtTime.findIndex((candidate) => candidate.id === booking.id);
        const overlapWidthPercent = overlaps.length > 0 ? columnWidthPercent / (overlaps.length + 1) : columnWidthPercent;
        const left = columnIndex * columnWidthPercent + Math.max(0, indexInOverlaps) * overlapWidthPercent;

        return { top, left: `${left}%`, height, width: `${Math.max(overlapWidthPercent - 1.4, 8)}%` };
    }, [getBookingColumnKey, gridColumns, isTablet]);

    const handleAddEvent = () => {
        router.push('/admin/add-booking' as any);
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Загружаем календарь смены</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
                <View style={styles.headerLeft}>
                    <Ionicons name="calendar-clear" size={24} color={colors.primary} />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.headerTitle}>Календарь</Text>
                        <Text style={styles.headerSubtitle}>
                            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                        </Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconCircleBtn} onPress={() => loadBookings(true)} disabled={isRefreshing}>
                        {isRefreshing ? (
                            <ActivityIndicator size="small" color={colors.textSecondary} />
                        ) : (
                            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconCircleBtn, { backgroundColor: colors.primary, marginLeft: 8 }]}
                        onPress={handleAddEvent}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.viewModeSwitcher, { marginHorizontal: horizontalPadding, maxWidth: isTablet ? 420 : undefined, alignSelf: isTablet ? 'center' : undefined }]}>
                {['День', 'Неделя', 'Месяц'].map(mode => (
                    <TouchableOpacity
                        key={mode}
                        style={[styles.viewModeBtn, viewMode === mode && styles.viewModeBtnActive, mode !== 'День' && styles.viewModeBtnDisabled]}
                        onPress={() => mode === 'День' && setViewMode(mode)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>{mode}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.roomTabs}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: horizontalPadding }}>
                    {tableTabs.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.roomTabItem, selectedTab === tab && styles.roomTabItemActive]}
                            onPress={() => setSelectedTab(tab)}
                        >
                            <Text style={[styles.roomTabText, selectedTab === tab && styles.roomTabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: horizontalPadding }}
            >
            <View style={[styles.calendarShell, { minWidth: isTablet ? Math.min(contentMaxWidth, 980) : 720 }]}>
            <View style={styles.gridHeaderRow}>
                <View style={styles.timeAxisHeader}>
                    <Ionicons name="time-outline" size={16} color={colors.muted} />
                </View>
                {gridColumns.map((column) => (
                    <View key={column} style={styles.gridColumnHeader}>
                        <Text style={styles.colTopText}>{column === 'Без стола' ? 'ОЧЕРЕДЬ' : 'ЗАЛ'}</Text>
                        <Text style={styles.colBotText}>{column}</Text>
                    </View>
                ))}
            </View>

            <ScrollView style={styles.gridScroll} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.gridBody}>
                    <View style={styles.timeAxisColumn}>
                        {hours.map((h, i) => (
                            <View key={i} style={styles.timeAxisCell}>
                                <Text style={styles.timeAxisText}>{h}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.columnsContainer}>
                        <View style={styles.gridLinesAbs} pointerEvents="none">
                            {hours.map((_, i) => (
                                <View key={i} style={styles.gridLineHorizontal} />
                            ))}
                            {gridColumns.slice(1).map((_, index) => (
                                <View
                                    key={`grid-col-${index}`}
                                    style={[styles.gridLineVertical, { left: `${((index + 1) * 100) / gridColumns.length}%` }]}
                                />
                            ))}
                        </View>

                        {visibleBookings.map((booking, idx, array) => {
                            const { top, left, height, width } = getBookingStyle(booking, array);
                            const isPending = booking.status === 'pending';
                            const blockStyle = isPending ? styles.bgGray : (idx % 2 === 0 ? styles.bgBlue : styles.bgYellow);

                            const durationMins = booking.duration_minutes || (booking.duration_hours || 2) * 60;
                            const timeParts = (booking.time || '').split(':');
                            const h = parseInt(timeParts[0]) || 0;
                            const m = parseInt(timeParts[1]) || 0;
                            const totalMins = h * 60 + m + durationMins;
                            const endH = Math.floor(totalMins / 60).toString().padStart(2, '0');
                            const mStr = (totalMins % 60).toString().padStart(2, '0');
                            const timeStr = `${booking.time ? booking.time.substring(0, 5) : '--:--'} - ${endH}:${mStr}`;

                            return (
                                <TouchableOpacity
                                    key={booking.id}
                                    style={[styles.bookingBlock, blockStyle, { top, left: left as any, height, width: width as any }]}
                                    onPress={() => setSelectedBooking(booking)}
                                >
                                    <Text style={[styles.bTitle, isPending && { color: '#334155' }, blockStyle === styles.bgYellow && { color: '#1e293b' }]}>
                                        {booking.user_name || 'Гость'}
                                    </Text>
                                    <Text style={[styles.bSubtitle, isPending && { color: '#64748b' }, blockStyle === styles.bgYellow && { color: '#475569' }]}>
                                        <Ionicons name="people" size={10} /> {booking.guests} чел
                                    </Text>
                                    <View style={[
                                        styles.bTimeBadge,
                                        isPending && { backgroundColor: '#e2e8f0', marginTop: 'auto' },
                                        blockStyle === styles.bgYellow && { backgroundColor: '#fff' }
                                    ]}>
                                        {isPending ? (
                                            <Text style={[styles.bTimeText, { color: '#475569' }]}>
                                                <Ionicons name="time-outline" size={10} /> Ожидание
                                            </Text>
                                        ) : (
                                            <Text style={[styles.bTimeText, blockStyle === styles.bgYellow && { color: '#000' }]}>
                                                {timeStr}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {visibleBookings.length === 0 ? (
                            <View style={styles.emptyCalendarState}>
                                <Ionicons name="calendar-outline" size={36} color={colors.muted} />
                                <Text style={styles.emptyCalendarTitle}>На сегодня активных броней нет</Text>
                                <Text style={styles.emptyCalendarText}>Нажмите обновление или добавьте новую бронь.</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </ScrollView>
            </View>
            </ScrollView>

            {selectedBooking && (
                <View style={[styles.floatingActionBox, { bottom: 100, left: isTablet ? Math.max(horizontalPadding, (contentMaxWidth - 560) / 2) : 20, right: isTablet ? Math.max(horizontalPadding, (contentMaxWidth - 560) / 2) : 20 }]}>
                    <View style={styles.fabAvatar}><Ionicons name="person" size={16} color="#fff" /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fabTitle}>{selectedBooking.user_name || 'Гость'}</Text>
                        <Text style={styles.fabSub}>
                            {selectedBooking.time} · {selectedBooking.guests} чел.
                            {getBookingTableLabel(selectedBooking) ? ` · Стол ${getBookingTableLabel(selectedBooking)}` : ''}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.fabIconBtn}
                        onPress={() => router.push({ pathname: '/chat', params: { id: selectedBooking.id, name: selectedBooking.user_name } })}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.fabIconBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push({ pathname: '/admin/bookings', params: { highlight: selectedBooking.id } })}
                    >
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={styles.fab} onPress={handleAddEvent}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 2 },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    iconCircleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    viewModeSwitcher: { flexDirection: 'row', backgroundColor: '#f8fafc', marginHorizontal: 20, borderRadius: 40, padding: 4, marginBottom: 16 },
    viewModeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 32 },
    viewModeBtnDisabled: { opacity: 0.45 },
    viewModeBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    viewModeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    viewModeTextActive: { color: colors.text },
    roomTabs: { borderBottomWidth: 1, borderBottomColor: colors.border },
    roomTabItem: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    roomTabItemActive: { borderBottomColor: colors.primary },
    roomTabText: { fontSize: 14, fontWeight: '600', color: colors.muted },
    roomTabTextActive: { color: colors.primary },

    calendarShell: { width: '100%', alignSelf: 'center' },
    gridHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fafafa' },
    timeAxisHeader: { width: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
    gridColumnHeader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
    colTopText: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginBottom: 2 },
    colBotText: { fontSize: 13, fontWeight: '700', color: colors.text },

    gridScroll: { flex: 1, backgroundColor: '#ffffff' },
    gridBody: { flexDirection: 'row', position: 'relative' },
    timeAxisColumn: { width: 60, borderRightWidth: 1, borderRightColor: colors.border },
    timeAxisCell: { height: 88, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 },
    timeAxisText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
    columnsContainer: { flex: 1, position: 'relative' },

    gridLinesAbs: { ...StyleSheet.absoluteFillObject },
    gridLineHorizontal: { height: 88, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    gridLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#f1f5f9' },
    emptyCalendarState: { position: 'absolute', left: 24, right: 24, top: 32, alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20 },
    emptyCalendarTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    emptyCalendarText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' },

    bookingBlock: {
        position: 'absolute', borderRadius: 40, padding: 12, marginHorizontal: 4, marginTop: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
    },
    bgBlue: { backgroundColor: colors.primary },
    bgYellow: { backgroundColor: '#facc15' }, 
    bgGray: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', elevation: 0, shadowOpacity: 0 },

    bTitle: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 4 },
    bSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    bTimeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
    bTimeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

    floatingActionBox: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#0f172a', borderRadius: 32, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
    fabAvatar: { width: 40, height: 40, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    fabTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
    fabSub: { color: '#94a3b8', fontSize: 11 },
    fabIconBtn: { width: 40, height: 40, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8,
    }
});
