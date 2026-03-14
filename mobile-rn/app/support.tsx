import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const HELP_TOPICS = [
    { title: 'Как забронировать?', icon: 'book-online' },
    { title: 'Отмена бронирования', icon: 'cancel' },
    { title: 'Оплата и счета', icon: 'payments' },
    { title: 'Регистрация заведения', icon: 'storefront' },
];

export default function SupportScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Поддержка</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <Text style={styles.heroTitle}>Чем мы можем помочь?</Text>
                    <Text style={styles.heroSubtitle}>Мы ответим на ваши вопросы максимально быстро</Text>
                </View>

                <View style={styles.grid}>
                    {HELP_TOPICS.map((topic, idx) => (
                        <TouchableOpacity key={idx} style={styles.topicCard}>
                            <MaterialIcons name={topic.icon as any} size={32} color={colors.primary} />
                            <Text style={styles.topicTitle}>{topic.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.contactSection}>
                    <Text style={styles.sectionTitle}>Связаться с нами</Text>

                    <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:support@kezdes.kz')}>
                        <Ionicons name="mail-outline" size={24} color={colors.primary} />
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Email</Text>
                            <Text style={styles.contactValue}>support@kezdes.kz</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('tel:+77770000000')}>
                        <Ionicons name="call-outline" size={24} color={colors.primary} />
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Телефон</Text>
                            <Text style={styles.contactValue}>+7 (777) 000-00-00</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactBtn}>
                        <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>WhatsApp</Text>
                            <Text style={styles.contactValue}>Написать в чат</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    content: { paddingBottom: 40 },
    hero: { padding: 24, backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: 24, alignItems: 'center', marginBottom: 32 },
    heroTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
    heroSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
    topicCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, alignItems: 'center' },
    topicTitle: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 12 },
    contactSection: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    contactBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    contactInfo: { flex: 1, marginLeft: 16 },
    contactLabel: { fontSize: 12, color: colors.muted, marginBottom: 2 },
    contactValue: { fontSize: 15, fontWeight: '600', color: colors.text },
});
