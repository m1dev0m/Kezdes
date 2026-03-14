import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function EventDateTimeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [selectedDate, setSelectedDate] = useState('2024-08-15');
    const [selectedTime, setSelectedTime] = useState('19:00');

    const handleNext = () => {
        router.push({
            pathname: '/events/details',
            params: { ...params, date: selectedDate, time: selectedTime }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Дата и время</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Когда состоится ваше событие?</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Выбор даты</Text>
                    <View style={styles.dateTimeCard}>
                        <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
                        <Text style={styles.dateTimeValue}>15 Августа, Четверг</Text>
                        <TouchableOpacity style={styles.changeBtn}>
                            <Text style={styles.changeBtnText}>Изм.</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Выбор времени</Text>
                    <View style={styles.timeGrid}>
                        {['12:00', '14:00', '16:00', '18:00', '19:00', '20:00'].map((time) => (
                            <TouchableOpacity
                                key={time}
                                style={[styles.timeChip, selectedTime === time && styles.timeChipActive]}
                                onPress={() => setSelectedTime(time)}
                            >
                                <Text style={[styles.timeChipText, selectedTime === time && styles.timeTextActive]}>
                                    {time}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: '66%' }]} />
                </View>
                <View style={styles.footerActions}>
                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextBtnText}>Продолжить</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    content: { padding: 24 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 32 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
    dateTimeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    dateTimeValue: { flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '600', color: colors.text },
    changeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    changeBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    timeChip: { width: '30%', height: 48, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    timeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    timeChipText: { fontSize: 15, fontWeight: '700', color: colors.text },
    timeTextActive: { color: '#fff' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: colors.border },
    progressContainer: { height: 6, backgroundColor: colors.surface, borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: colors.primary },
    footerActions: { flexDirection: 'row' },
    nextBtn: { flex: 1, height: 56, backgroundColor: colors.primary, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
