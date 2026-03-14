import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function PaymentSuccessScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const amount = (params.amount as string) || '50 000';
    const bookingId = (params.bookingId as string) || 'KZ-884920';
    const isPayAtRestaurant = params.payAtRestaurant === 'true';

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push({ pathname: '/chat', params: { id: bookingId, name: params.restaurantName || 'Restaurant' } });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.successCircle}>
                    <View style={styles.innerCircle}>
                        <Ionicons name="checkmark-done" size={60} color="#FFFFFF" />
                    </View>
                </View>

                <Text style={styles.title}>
                    {isPayAtRestaurant ? 'Бронирование создано!' : 'Оплата прошла успешно!'}
                </Text>
                <Text style={styles.subtitle}>
                    {isPayAtRestaurant
                        ? 'Ваше бронирование ожидает подтверждения. Оплата будет произведена в ресторане.'
                        : 'Ваше бронирование подтверждено и оплачено'}
                </Text>

                <View style={styles.receipt}>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Сумма платежа</Text>
                        <Text style={styles.receiptValue}>{amount} ₸</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>ID Бронирования</Text>
                        <Text style={styles.receiptValue}>{bookingId}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Статус</Text>
                        <View style={[styles.statusBadge, isPayAtRestaurant && styles.statusBadgeOrange]}>
                            <Text style={[styles.statusText, isPayAtRestaurant && styles.statusTextOrange]}>
                                {isPayAtRestaurant ? 'В РЕСТОРАНЕ' : 'ОПЛАЧЕНО'}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.redirectText}>Перенаправление в чат через 3 секунды...</Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push({ pathname: '/chat', params: { id: bookingId, name: params.restaurantName || 'Restaurant' } })}
                    >
                        <Text style={styles.primaryButtonText}>Перейти в чат сейчас</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/(tabs)/home')}
                    >
                        <Text style={styles.secondaryButtonText}>На главную</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    successCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    innerCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text || '#1F2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary || '#6B7280',
        textAlign: 'center',
        marginBottom: 48,
        paddingHorizontal: 20,
    },
    receipt: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        padding: 24,
        marginBottom: 48,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    receiptLabel: {
        fontSize: 14,
        color: colors.textSecondary || '#6B7280',
        fontWeight: '500',
    },
    receiptValue: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text || '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 16,
        borderStyle: 'dashed',
    },
    statusBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#059669',
    },
    actions: {
        width: '100%',
        gap: 16,
    },
    primaryButton: {
        backgroundColor: colors.primary || '#0047FF',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
    },
    secondaryButtonText: {
        color: colors.primary || '#0047FF',
        fontSize: 15,
        fontWeight: '600',
    },
    statusBadgeOrange: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FFEDD5',
    },
    statusTextOrange: {
        color: '#F97316',
    },
    redirectText: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 24,
        textAlign: 'center',
    },
});
