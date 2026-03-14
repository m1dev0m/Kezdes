import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';

export default function AdminSettingsScreen() {
    const router = useRouter();
    const { logout } = useAuth();

    const [autoConfirm, setAutoConfirm] = useState(true);
    const [emailNotif, setEmailNotif] = useState(true);
    const [pushNotif, setPushNotif] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Настройки</Text>
                <TouchableOpacity style={styles.backBtn}>
                    <Ionicons name="settings" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>ЗАВЕДЕНИЕ</Text>
                <TouchableOpacity
                    style={[styles.dateCard, { marginBottom: 32 }]}
                    onPress={() => router.push('/admin/setup?edit=true')}
                >
                    <View style={[styles.dateIconBox, { backgroundColor: 'rgba(67, 0, 255, 0.1)' }]}>
                        <MaterialIcons name="restaurant" size={20} color="#4300FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dateTitle}>Информация о заведении</Text>
                        <Text style={styles.dateSub}>Название, адрес, контакты</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>НАСТРОЙКИ БРОНИРОВАНИЯ</Text>

                <View style={styles.settingRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.settingLabel}>Авто-подтверждение</Text>
                        <Text style={styles.settingSub}>Мгновенное бронирование</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#e2e8f0", true: "#4300FF" }}
                        thumbColor={"#ffffff"}
                        onValueChange={setAutoConfirm}
                        value={autoConfirm}
                    />
                </View>

                <View style={{ marginBottom: 32 }}>
                    <Text style={[styles.settingLabel, { marginBottom: 8 }]}>Макс. гостей в одной брони</Text>
                    <View style={styles.inputWithIcon}>
                        <TextInput style={styles.inputIconned} defaultValue="12" keyboardType="numeric" />
                        <MaterialIcons name="people" size={20} color={colors.muted} style={styles.inputIconRight} />
                    </View>
                </View>

                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>ЗАКРЫТЫЕ ДАТЫ</Text>
                    <TouchableOpacity style={styles.addBtnRow}>
                        <Ionicons name="add" size={16} color="#4300FF" />
                        <Text style={styles.addBtnText}>Добавить</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.dateCard}>
                    <View style={styles.dateIconBox}>
                        <MaterialIcons name="calendar-today" size={20} color="#ef4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dateTitle}>31 декабря 2024</Text>
                        <Text style={styles.dateSub}>Новый год</Text>
                    </View>
                    <TouchableOpacity style={styles.trashBtn}>
                        <Ionicons name="trash-outline" size={20} color={colors.muted} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.dateCard, { marginBottom: 32 }]}>
                    <View style={styles.dateIconBox}>
                        <MaterialIcons name="calendar-today" size={20} color="#ef4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dateTitle}>1 января 2025</Text>
                        <Text style={styles.dateSub}>Праздничный выходной</Text>
                    </View>
                    <TouchableOpacity style={styles.trashBtn}>
                        <Ionicons name="trash-outline" size={20} color={colors.muted} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>УВЕДОМЛЕНИЯ</Text>

                <View style={styles.settingRow}>
                    <View style={styles.rowCentered}>
                        <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={styles.settingLabelCentered}>Email уведомления</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#e2e8f0", true: "#4300FF" }}
                        thumbColor={"#ffffff"}
                        onValueChange={setEmailNotif}
                        value={emailNotif}
                    />
                </View>

                <View style={styles.settingRow}>
                    <View style={styles.rowCentered}>
                        <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                        <Text style={styles.settingLabelCentered}>Push уведомления</Text>
                    </View>
                    <Switch
                        trackColor={{ false: "#e2e8f0", true: "#4300FF" }}
                        thumbColor={"#ffffff"}
                        onValueChange={setPushNotif}
                        value={pushNotif}
                    />
                </View>

                <TouchableOpacity style={styles.logoutBoundary} onPress={logout}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>Выйти из аккаунта</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Kezdes Admin v2.4.0</Text>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12 },
    backBtn: { padding: 8, width: 44, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

    content: { padding: 20, paddingBottom: 100 },

    sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },

    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    settingLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    settingLabelCentered: { fontSize: 14, fontWeight: '600', color: colors.text },
    settingSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
    rowCentered: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

    inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12 },
    inputIconRight: { paddingRight: 16 },
    inputIconned: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.text, fontWeight: '600' },

    addBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addBtnText: { color: '#4300FF', fontSize: 12, fontWeight: '700' },

    dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    dateIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    dateTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
    dateSub: { fontSize: 12, color: colors.muted },
    trashBtn: { padding: 8 },

    logoutBoundary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 24, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fff' },
    logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

    versionText: { textAlign: 'center', color: '#cbd5e1', fontSize: 10, marginTop: 24 },
});
