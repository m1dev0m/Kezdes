import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function AdminVerificationScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Верификация</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <View style={styles.statusIcon}>
                            <Ionicons name="checkmark-circle" size={32} color="#16a34a" />
                        </View>
                        <View>
                            <Text style={styles.statusTitle}>Верифицировано</Text>
                            <Text style={styles.statusSub}>Ваше заведение подтверждено</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.benefits}>
                    <Text style={styles.sectionTitle}>Преимущества верификации</Text>

                    <View style={styles.benefitItem}>
                        <Ionicons name="star-outline" size={24} color={colors.primary} />
                        <Text style={styles.benefitText}>Приоритет в поисковой выдаче</Text>
                    </View>

                    <View style={styles.benefitItem}>
                        <Ionicons name="shield-outline" size={24} color={colors.primary} />
                        <Text style={styles.benefitText}>Статус доверенного партнера</Text>
                    </View>

                    <View style={styles.benefitItem}>
                        <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
                        <Text style={styles.benefitText}>Доступ к расширенной аналитике</Text>
                    </View>
                </View>

                <View style={styles.docsSection}>
                    <Text style={styles.sectionTitle}>Загруженные документы</Text>
                    <View style={styles.docItem}>
                        <MaterialIcons name="description" size={24} color={colors.muted} />
                        <Text style={styles.docName}>Свидетельство о регистрации.pdf</Text>
                        <Ionicons name="checkmark" size={20} color="#16a34a" />
                    </View>
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
    content: { padding: 24 },
    statusCard: { backgroundColor: '#f0fdf4', padding: 20, borderRadius: 40, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 32 },
    statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    statusIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    statusTitle: { fontSize: 18, fontWeight: '700', color: '#166534' },
    statusSub: { fontSize: 13, color: '#16a34a' },
    benefits: { marginBottom: 32 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
    benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16, backgroundColor: colors.surface, padding: 16, borderRadius: 32 },
    benefitText: { fontSize: 14, color: colors.text, fontWeight: '600' },
    docsSection: {},
    docItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.surface, borderRadius: 32, borderWidth: 1, borderColor: colors.border },
    docName: { flex: 1, fontSize: 14, color: colors.textSecondary },
});
