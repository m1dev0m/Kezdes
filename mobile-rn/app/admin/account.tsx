import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function AdminAccountScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="chevron-back" size={24} color={colors.text} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Настройки кабинета</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>ОРГАНИЗАЦИЯ</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/edit')}>
                        <View style={styles.menuIcon}>
                            <MaterialIcons name="storefront" size={22} color={colors.primary} />
                        </View>
                        <Text style={styles.menuText}>Профиль заведения</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin/verification')}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="shield-checkmark-outline" size={22} color="#16a34a" />
                        </View>
                        <Text style={styles.menuText}>Верификация</Text>
                        <Text style={styles.statusText}>Подтверждено</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>УВЕДОМЛЕНИЯ</Text>
                    <View style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="notifications-outline" size={22} color="#f59e0b" />
                        </View>
                        <Text style={styles.menuText}>Новые бронирования</Text>
                        <Switch value={true} trackColor={{ true: colors.primary, false: '#ccc' }} />
                    </View>
                    <View style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="chatbubble-outline" size={22} color="#06b6d4" />
                        </View>
                        <Text style={styles.menuText}>Сообщения</Text>
                        <Switch value={true} trackColor={{ true: colors.primary, false: '#ccc' }} />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/auth/login')}>
                    <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                    <Text style={styles.logoutText}>Выйти из системы</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    content: { padding: 20 },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginBottom: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 32, marginBottom: 12 },
    menuIcon: { width: 40, height: 40, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: colors.border },
    menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    statusText: { fontSize: 13, color: '#16a34a', fontWeight: '700' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderBottomWidth: 0 },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
});
