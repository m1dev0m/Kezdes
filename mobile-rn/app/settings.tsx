import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';


export default function SettingsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Настройки</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Основные</Text>
                    <View style={styles.item}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.itemLabel}>Уведомления</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                    <View style={styles.item}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="language-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.itemLabel}>Язык приложения</Text>
                        </View>
                        <TouchableOpacity style={styles.itemRight} onPress={() => router.push('/')}>
                            <Text style={styles.itemValue}>Русский</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Оформление</Text>
                    <View style={styles.item}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="moon-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.itemLabel}>Темная тема</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Безопасность</Text>
                    <TouchableOpacity style={styles.item}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="lock-closed-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.itemLabel}>Изменить пароль</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.item}>
                        <View style={styles.itemLeft}>
                            <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.itemLabel}>Конфиденциальность</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Об аккаунте</Text>
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => {
                            router.replace('/onboarding');
                        }}
                    >
                        <View style={styles.itemLeft}>
                            <Ionicons name="help-circle-outline" size={22} color={colors.textSecondary} />
                            <Text style={styles.itemLabel}>Показать обучение</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.item, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.itemLabel, { color: colors.error }]}>Удалить аккаунт</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    backButton: { padding: 8 },
    scrollContent: {
        paddingVertical: 20,
    },
    section: {
        marginBottom: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemLabel: {
        fontSize: 16,
        color: colors.text,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemValue: {
        fontSize: 14,
        color: colors.textSecondary,
    },
});
