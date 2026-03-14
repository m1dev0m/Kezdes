import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings } from '../../lib/api';

const { width } = Dimensions.get('window');
const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
const ROOMS = ['VIP 1', 'Зал 1', 'Веранда', 'Бар'];
const TABS = ['Все залы', 'VIP 1', 'Зал 1', 'Веранда', 'Бар'];

export default function AdminCalendarScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState('Все залы');
    const [viewMode, setViewMode] = useState('День');
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    React.useEffect(() => {
        if (user?.access) {
            fetchMyRestaurantBookings(user.access).then((b: any) => setBookings(b || [])).catch(console.error);
        }
    }, [user]);

    const getBookingStyle = (booking: any, allBookings: any[]) => {
        const [hours, mins] = booking.time.split(':').map(Number);
        const offsetMinutes = (hours - 9) * 60 + (mins || 0);
        const top = (offsetMinutes / 60) * 80;

        const duration = (booking.duration_minutes ? booking.duration_minutes / 60 : (booking.duration_hours || 2));
        const height = duration * 80;

        const overlaps = allBookings.filter(b =>
            b.id !== booking.id &&
            b.date === booking.date &&
            b.time === booking.time
        );

        const indexInOverlaps = allBookings.filter(b => b.date === booking.date && b.time === booking.time).indexOf(booking);
        const widthPercent = overlaps.length > 0 ? (100 / (overlaps.length + 1)) : 100;
        const left = indexInOverlaps * widthPercent;

        return { top, left: `${left}%`, height, width: `${widthPercent - 2}%` };
    };

    const handleAddEvent = () => {
        router.push('/admin/add-booking' as any);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
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
                    <TouchableOpacity style={styles.iconCircleBtn}>
                        <Ionicons name="search" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconCircleBtn, { backgroundColor: colors.primary, marginLeft: 8 }]}
                        onPress={handleAddEvent}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.viewModeSwitcher}>
                {['День', 'Неделя', 'Месяц'].map(mode => (
                    <TouchableOpacity
                        key={mode}
                        style={[styles.viewModeBtn, viewMode === mode && styles.viewModeBtnActive]}
                        onPress={() => setViewMode(mode)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>{mode}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.roomTabs}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    {TABS.map(tab => (
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

            <View style={styles.gridHeaderRow}>
                <View style={styles.timeAxisHeader}>
                    <Ionicons name="time-outline" size={16} color={colors.muted} />
                </View>
                <View style={styles.gridColumnHeader}>
                    <Text style={styles.colTopText}>VIP 1</Text>
                    <Text style={styles.colBotText}>Стол 1</Text>
                </View>
                <View style={styles.gridColumnHeader}>
                    <Text style={styles.colTopText}>VIP 1</Text>
                    <Text style={styles.colBotText}>Стол 2</Text>
                </View>
                <View style={styles.gridColumnHeader}>
                    <Text style={styles.colTopText}>ЗАЛ 1</Text>
                    <Text style={styles.colBotText}>Стол 3</Text>
                </View>
            </View>

            <ScrollView style={styles.gridScroll} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.gridBody}>
                    <View style={styles.timeAxisColumn}>
                        {HOURS.map((h, i) => (
                            <View key={i} style={styles.timeAxisCell}>
                                <Text style={styles.timeAxisText}>{h}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.columnsContainer}>
                        <View style={styles.gridLinesAbs} pointerEvents="none">
                            {HOURS.map((_, i) => (
                                <View key={i} style={styles.gridLineHorizontal} />
                            ))}
                            <View style={styles.gridLineVertical} />
                            <View style={[styles.gridLineVertical, { left: '33.33%' }]} />
                            <View style={[styles.gridLineVertical, { left: '66.66%' }]} />
                        </View>

                        {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending' || b.status === 'approved').map((booking, idx, array) => {
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
                                                <MaterialIcons name="schedule" size={10} /> Ожидание
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
                    </View>
                </View>
            </ScrollView>

            {selectedBooking && (
                <View style={[styles.floatingActionBox, { bottom: 100 }]}>
                    <View style={styles.fabAvatar}><Ionicons name="person" size={16} color="#fff" /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fabTitle}>{selectedBooking.user_name || 'Гость'}</Text>
                        <Text style={styles.fabSub}>{selectedBooking.time} - {selectedBooking.guests} чел.</Text>
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
                        <MaterialIcons name="arrow-forward" size={18} color="#fff" />
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 2 },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    iconCircleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    viewModeSwitcher: { flexDirection: 'row', backgroundColor: '#f8fafc', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 16 },
    viewModeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    viewModeBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    viewModeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    viewModeTextActive: { color: colors.text },
    roomTabs: { borderBottomWidth: 1, borderBottomColor: colors.border },
    roomTabItem: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    roomTabItemActive: { borderBottomColor: colors.primary },
    roomTabText: { fontSize: 14, fontWeight: '600', color: colors.muted },
    roomTabTextActive: { color: colors.primary },

    gridHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fafafa' },
    timeAxisHeader: { width: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
    gridColumnHeader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: colors.border },
    colTopText: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginBottom: 2 },
    colBotText: { fontSize: 13, fontWeight: '700', color: colors.text },

    gridScroll: { flex: 1, backgroundColor: '#ffffff' },
    gridBody: { flexDirection: 'row', position: 'relative' },
    timeAxisColumn: { width: 60, borderRightWidth: 1, borderRightColor: colors.border },
    timeAxisCell: { height: 80, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 },
    timeAxisText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
    columnsContainer: { flex: 1, position: 'relative' },

    gridLinesAbs: { ...StyleSheet.absoluteFillObject },
    gridLineHorizontal: { height: 80, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    gridLineVertical: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#f1f5f9' },

    bookingBlock: {
        position: 'absolute', borderRadius: 12, padding: 12, marginHorizontal: 4, marginTop: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
    },
    bgBlue: { backgroundColor: colors.primary },
    bgYellow: { backgroundColor: '#facc15' }, // vibrant yellow from mockup
    bgGray: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', elevation: 0, shadowOpacity: 0 },

    bTitle: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 4 },
    bSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    bTimeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
    bTimeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

    floatingActionBox: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#0f172a', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
    fabAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    fabTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
    fabSub: { color: '#94a3b8', fontSize: 11 },
    fabIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
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
