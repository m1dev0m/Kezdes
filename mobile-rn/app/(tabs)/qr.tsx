import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function QRScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Мой QR</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.qrContainer}>
                    <View style={styles.qrBox}>
                        <Ionicons name="qr-code" size={200} color={colors.text} />
                    </View>
                    <Text style={styles.userName}>Александр Иванов</Text>
                    <Text style={styles.userRole}>Клиент Kezdes</Text>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                    <Text style={styles.infoText}>
                        Покажите этот QR-код администратору при входе в заведение для быстрого чекина.
                    </Text>
                </View>

                <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/events')}>
                    <Text style={styles.historyBtnText}>История бронирований</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    content: { flex: 1, alignItems: 'center', paddingHorizontal: 40, paddingTop: 40 },
    qrContainer: { alignItems: 'center', marginBottom: 40 },
    qrBox: { padding: 20, backgroundColor: '#fff', borderRadius: 40, borderWidth: 1, borderColor: colors.border, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
    userName: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
    userRole: { fontSize: 14, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
    infoBox: { flexDirection: 'row', backgroundColor: colors.surface, padding: 16, borderRadius: 32, alignItems: 'center', gap: 12 },
    infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    historyBtn: { marginTop: 'auto', marginBottom: 40, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 32, backgroundColor: colors.surface },
    historyBtnText: { color: colors.primary, fontWeight: '600' },
});
