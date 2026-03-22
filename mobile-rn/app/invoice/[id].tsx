import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function InvoiceScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Счет на оплату</Text>
                <TouchableOpacity style={styles.shareBtn}>
                    <Ionicons name="share-outline" size={24} color="#0047FF" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.invoiceCard}>
                    <View style={styles.invoiceHeader}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>ОЖИДАЕТ ОПЛАТЫ</Text>
                        </View>
                        <Text style={styles.invoiceNumber}>Счет #{id || '10294'}</Text>
                        <Text style={styles.date}>23 февраля 2026</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ДЕТАЛИ ЗАКАЗА</Text>
                        <View style={styles.itemRow}>
                            <Text style={styles.itemLabel}>Ресторан "hhal"</Text>
                            <Text style={styles.itemValue}>Бронирование VIP</Text>
                        </View>
                        <View style={styles.itemRow}>
                            <Text style={styles.itemLabel}>Количество гостей</Text>
                            <Text style={styles.itemValue}>12 человек</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalSection}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Итого к оплате</Text>
                            <Text style={styles.totalAmount}>145 000 ₸</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={styles.payBtn}>
                    <Text style={styles.payBtnText}>Перейти к оплате</Text>
                    <MaterialIcons name="payment" size={20} color="#fff" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    shareBtn: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    invoiceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 40,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 24,
    },
    invoiceHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    statusBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 40,
        marginBottom: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#d97706',
    },
    invoiceNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    date: {
        fontSize: 14,
        color: '#64748b',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 24,
    },
    section: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 8,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    itemLabel: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    itemValue: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '700',
    },
    totalSection: {
        marginTop: 8,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0047FF',
    },
    payBtn: {
        backgroundColor: '#0047FF',
        flexDirection: 'row',
        height: 60,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    payBtnText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    }
});
