import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const EVENT_TYPES = [
    { id: 'birthday', name: 'День рождения', icon: 'cake', color: '#6366f1' },
    { id: 'wedding', name: 'Свадьба', icon: 'favorite', color: '#ec4899' },
    { id: 'corporate', name: 'Корпоратив', icon: 'business', color: '#0ea5e9' },
    { id: 'banquet', name: 'Банкет', icon: 'restaurant', color: '#f59e0b' },
    { id: 'party', name: 'Вечеринка', icon: 'celebration', color: '#8b5cf6' },
    { id: 'other', name: 'Другое', icon: 'more-horiz', color: '#64748b' },
];

export default function EventTypeScreen() {
    const router = useRouter();

    const handleSelect = (type: string) => {
        router.push({ pathname: '/events/date-time', params: { type } });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Тип события</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Какое событие вы планируете?</Text>
                <Text style={styles.subtitle}>Выберите категорию, чтобы мы подобрали лучшие условия</Text>

                <View style={styles.grid}>
                    {EVENT_TYPES.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.typeCard}
                            onPress={() => handleSelect(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                                <MaterialIcons name={item.icon as any} size={32} color={item.color} />
                            </View>
                            <Text style={styles.typeLabel}>{item.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: '33%' }]} />
                </View>
                <Text style={styles.progressText}>Шаг 1 из 3</Text>
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
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12 },
    subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 32, lineHeight: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
    typeCard: {
        width: (Dimensions.get('window').width - 64) / 2,
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconBox: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    typeLabel: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: colors.border },
    progressContainer: { height: 6, backgroundColor: colors.surface, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: colors.primary },
    progressText: { fontSize: 12, fontWeight: '600', color: colors.muted, textAlign: 'center' },
});
