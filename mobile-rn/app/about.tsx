import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function AboutScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>О приложении</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoContainer}>
                    <Ionicons name="restaurant" size={64} color={colors.primary} />
                    <Text style={styles.appName}>Kezdes</Text>
                    <Text style={styles.version}>Версия 3.0.0</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Наша миссия</Text>
                    <Text style={styles.paragraph}>
                        Kezdes (от каз. "кездесу" - встреча) — это инновационная платформа для мгновенного бронирования лучших столов и залов в ресторанах вашего города. Мы стираем границы между гостями и заведениями, делая процесс организации деловых встреч, свиданий и праздников быстрым, прозрачным и удобным.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Контакты для партнеров</Text>
                    <Text style={styles.paragraph}>
                        Хотите подключить свой ресторан к нашей системе? У нас есть гибкая и мощная панель администратора для управления бронированиями.
                    </Text>
                    <Text style={styles.contactEmail}>partners@kezdes.kz</Text>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.copyright}>© 2026 Kezdes SaaS Solutions. Все права защищены.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: 8, width: 44, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    content: { padding: 24 },
    logoContainer: { alignItems: 'center', marginVertical: 32 },
    appName: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 16, letterSpacing: -0.5 },
    version: { fontSize: 14, color: colors.muted, marginTop: 4 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
    paragraph: { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
    contactEmail: { fontSize: 16, fontWeight: '600', color: colors.primary, marginTop: 12 },
    footer: { marginTop: 40, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 },
    copyright: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
