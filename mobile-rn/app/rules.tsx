import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function RulesScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Правила сервиса</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Общие положения</Text>
                    <Text style={styles.paragraph}>
                        Настоящие правила определяют условия использования приложения Kezdes. Бронируя столик или зал через наше приложение, вы соглашаетесь с данными правилами и обязуетесь их соблюдать.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Бронирование и Отмена</Text>
                    <Text style={styles.paragraph}>
                        Вы можете отменить бронирование бесплатно не позднее чем за 2 часа до начала. При частых отменах (более 3 раз в месяц за менее чем 2 часа) аккаунт может быть временно ограничен в возможности бронирования.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Ответственность</Text>
                    <Text style={styles.paragraph}>
                        Kezdes выступает как информационный портал, связывающий клиента и заведение. Ответственность за качество блюд, обслуживание и соответствие фотографий реальности несет непосредственно заведение. Мы, однако, оперативно реагируем на все жалобы пользователей для поддержания высокого качества платформы.
                    </Text>
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
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
    paragraph: { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
});
