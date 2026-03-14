import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';

const TIMELINE_EVENTS = [
    { id: '1', title: 'Заявка отправлена', desc: 'Ожидает ответа от ресторана', time: 'Вчера, 12:45', status: 'completed' },
    { id: '2', title: 'Бронь подтверждена', desc: 'Успешная оплата депозита: 25 000 ₸', time: 'Сегодня, 10:30', status: 'completed' },
    { id: '3', title: 'Событие начинается', desc: '15 Августа в 19:30', time: '', status: 'current' },
    { id: '4', title: 'Завершение вечера', desc: 'Оставьте отзыв о заведении', time: '', status: 'upcoming' },
];

export default function TimelineScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Статус бронирования</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.summaryCard}>
                    <Image source={require('../assets/images/featured_1.jpg')} style={styles.venueImage} />
                    <View style={styles.summaryContent}>
                        <View style={styles.badgeSuccess}>
                            <MaterialIcons name="check-circle" size={14} color="#2E7D32" />
                            <Text style={styles.badgeSuccessText}>Подтверждено</Text>
                        </View>
                        <Text style={styles.venueName}>hhal</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                                <Text style={styles.statText}>15 Авг</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="time-outline" size={16} color="#64748b" />
                                <Text style={styles.statText}>19:30</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={16} color="#64748b" />
                                <Text style={styles.statText}>50 чел</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push({ pathname: '/chat', params: { id: '1', name: 'hhal' } })}
                        >
                            <Ionicons name="chatbubble-outline" size={18} color="#0047FF" />
                            <Text style={styles.actionButtonText}>Чат с менеджером</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>История статусов</Text>

                <View style={styles.timelineContainer}>
                    {TIMELINE_EVENTS.map((item, index) => {
                        const isLast = index === TIMELINE_EVENTS.length - 1;
                        let dotColor = '#e2e8f0';
                        if (item.status === 'completed') dotColor = '#10b981';
                        if (item.status === 'current') dotColor = '#0047FF';

                        return (
                            <View key={item.id} style={styles.timelineRow}>
                                <View style={styles.timelineVisual}>
                                    <View style={[styles.timelineDot, { borderColor: dotColor }, item.status === 'current' && styles.timelineDotActive]}>
                                        {item.status === 'completed' && <Ionicons name="checkmark" size={12} color="#10b981" />}
                                    </View>
                                    {!isLast && <View style={[styles.timelineLine, item.status === 'completed' && styles.timelineLineActive]} />}
                                </View>

                                <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                                    <View style={styles.timelineHeader}>
                                        <Text style={[styles.timelineTitle, item.status === 'current' && { color: '#0f172a' }]}>{item.title}</Text>
                                        {!!item.time && <Text style={styles.timelineTime}>{item.time}</Text>}
                                    </View>
                                    <Text style={styles.timelineDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    iconButton: { padding: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    scroll: { padding: 20, paddingBottom: 40 },
    summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, marginBottom: 32 },
    venueImage: { width: '100%', height: 140 },
    summaryContent: { padding: 20, alignItems: 'center' },
    badgeSuccess: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6, marginBottom: 12 },
    badgeSuccessText: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
    venueName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
    statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, width: '100%', justifyContent: 'center', marginBottom: 20 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statText: { fontSize: 14, fontWeight: '600', color: '#475569' },
    statDivider: { width: 1, height: 16, backgroundColor: '#cbd5e1', marginHorizontal: 16 },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 52, backgroundColor: 'rgba(0, 71, 255, 0.1)', borderRadius: 16, gap: 8 },
    actionButtonText: { fontSize: 15, fontWeight: '700', color: '#0047FF' },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
    timelineContainer: { paddingLeft: 8 },
    timelineRow: { flexDirection: 'row' },
    timelineVisual: { alignItems: 'center', width: 24, marginRight: 16 },
    timelineDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
    timelineDotActive: { backgroundColor: '#0047FF', borderWidth: 4, borderColor: '#bfdbfe' },
    timelineLine: { flex: 1, width: 2, backgroundColor: '#e2e8f0', marginVertical: 4, minHeight: 40 },
    timelineLineActive: { backgroundColor: '#10b981' },
    timelineContent: { flex: 1, paddingBottom: 32, paddingTop: -2 },
    timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    timelineTitle: { fontSize: 15, fontWeight: '700', color: '#64748b' },
    timelineTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
    timelineDesc: { fontSize: 13, color: '#475569', lineHeight: 20 }
});
