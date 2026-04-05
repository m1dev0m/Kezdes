import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function PaymentSuccessScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.successIconBox}>
                    <Ionicons name="checkmark-circle" size={100} color="#16a34a" />
                </View>

                <Text style={styles.title}>Оплата успешно прошла!</Text>
                <Text style={styles.subtitle}>
                    Ваше бронирование подтверждено. Мы отправили детали на вашу электронную почту.
                </Text>

                <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Сумма платежа</Text>
                        <Text style={styles.detailValue}>25,000 ₸</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Метод оплаты</Text>
                        <Text style={styles.detailValue}>Kaspi.kz</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>ID транзакции</Text>
                        <Text style={styles.detailValue}>#TXN-882190</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.mainBtn}
                    onPress={() => router.replace('/(tabs)/events')}
                >
                    <Text style={styles.mainBtnText}>Мои события</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => router.replace('/(tabs)/home')}
                >
                    <Text style={styles.secondaryBtnText}>На главную</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
    successIconBox: { marginBottom: 32 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 40, paddingHorizontal: 20 },
    detailsCard: { width: '100%', backgroundColor: colors.surface, borderRadius: 40, padding: 24, marginBottom: 40, borderWidth: 1, borderColor: colors.border },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 14, color: colors.muted, fontWeight: '600' },
    detailValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
    mainBtn: { backgroundColor: colors.primary, width: '100%', paddingVertical: 18, borderRadius: 32, alignItems: 'center', marginBottom: 16 },
    mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: { width: '100%', paddingVertical: 18, borderRadius: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    secondaryBtnText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
