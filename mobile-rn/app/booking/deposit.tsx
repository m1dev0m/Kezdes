import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { payDeposit } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function DepositPaymentScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [isPaying, setIsPaying] = useState(false);

    const bookingId = params.bookingId as string;
    const depositAmount = params.depositAmount ? Number(params.depositAmount) : 0;
    const restaurantName = params.restaurantName as string;

    const handlePayment = async () => {
        setIsPaying(true);
        try {
            await payDeposit(bookingId, user?.access || '');
            // Go to payment success
            router.push({
                pathname: '/booking/payment-success' as any,
                params: {
                    restaurantName,
                    amount: depositAmount.toString()
                }
            });
        } catch (error) {
            console.error('Payment failed', error);
            alert('Ошибка при оплате депозита. Пожалуйста, попробуйте снова.');
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="chevron-left" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Оплата депозита</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconWrapper}>
                    <View style={styles.iconBg}>
                        <MaterialIcons name="security" size={48} color={colors.primary} />
                    </View>
                </View>

                <Text style={styles.title}>Требуется предоплата</Text>
                <Text style={styles.description}>
                    Ресторан <Text style={{ fontWeight: '700', color: colors.text }}>{restaurantName}</Text> требует внесения депозита для подтверждения бронирования на большие компании.
                </Text>

                <View style={styles.receiptCard}>
                    <Text style={styles.receiptLabel}>Сумма к оплате</Text>
                    <Text style={styles.receiptAmount}>{depositAmount.toLocaleString()} ₸</Text>

                    <View style={styles.divider} />

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptRowLabel}>Дата</Text>
                        <Text style={styles.receiptRowValue}>{params.date}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptRowLabel}>Время</Text>
                        <Text style={styles.receiptRowValue}>{params.time}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptRowLabel}>Гости</Text>
                        <Text style={styles.receiptRowValue}>{params.guests} чел.</Text>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <MaterialIcons name="info-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                        Депозит будет вычтен из вашего итогового счета в ресторане. При отмене брони за 24 часа депозит возвращается в полном объеме.
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payBtn, isPaying && styles.payBtnDisabled]}
                    activeOpacity={0.8}
                    onPress={handlePayment}
                    disabled={isPaying}
                >
                    {isPaying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={styles.payBtnContent}>
                            <MaterialIcons name="credit-card" size={20} color="#fff" />
                            <Text style={styles.payBtnText}>Оплатить {depositAmount.toLocaleString()} ₸</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {Platform.OS === 'ios' && (
                    <TouchableOpacity
                        style={styles.applePayBtn}
                        activeOpacity={0.8}
                        onPress={handlePayment}
                        disabled={isPaying}
                    >
                        <MaterialIcons name="apple" size={24} color="#fff" />
                        <Text style={styles.applePayText}>Pay</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        alignItems: 'center',
    },
    iconWrapper: {
        marginBottom: 24,
    },
    iconBg: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(0, 71, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    receiptCard: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: 40,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    receiptLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    receiptAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        letterSpacing: -1,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        borderStyle: 'dashed',
        marginVertical: 20,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    receiptRowLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    receiptRowValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 16,
        borderRadius: 32,
        marginTop: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 0 : 24,
        gap: 12,
    },
    payBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payBtnDisabled: {
        opacity: 0.7,
    },
    payBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    payBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    applePayBtn: {
        backgroundColor: '#000000',
        paddingVertical: 16,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    applePayText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
});
