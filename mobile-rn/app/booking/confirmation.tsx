import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground, Animated, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchBookingDetail } from '../../lib/api';
import StatusModal from '../../components/StatusModal';

export default function BookingConfirmationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const accessToken = user?.access;

    const restaurantName = (params.restaurantName as string) || (params.venueName as string) || 'Выбранный ресторан';
    const dateString = (params.date as string) || 'Дата не указана';
    const timeString = (params.time as string) || '19:00';
    const guestString = (params.guests as string) ? `${params.guests} гостей` : '2 человека';
    const bookingId = (params.bookingId as string) || '';
    const depositRequired = (params.depositRequired as string) === 'true';
    const depositAmount = Number(params.depositAmount || 0);
    const initialBookingStatus = (params.bookingStatus as string) || 'pending';

    const [bookingStatus, setBookingStatus] = useState<string>(initialBookingStatus);
    const [fullBooking, setFullBooking] = useState<any>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (bookingStatus === 'pending' || bookingStatus === 'payment_pending') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [bookingStatus]);

    useEffect(() => {
        if (!accessToken || !bookingId) return;

        const pollStatus = async () => {
            try {
                const bookingData = await fetchBookingDetail(bookingId, accessToken) as any;
                if (bookingData) {
                    setFullBooking(bookingData);
                    if (bookingData.status && bookingStatus !== bookingData.status) {
                        setBookingStatus(bookingData.status);

                        if (bookingData.status === 'confirmed' && !isRedirecting) {
                            setIsRedirecting(true);
                            setShowStatusModal(true);
                        }

                        if (bookingData.status === 'rejected') {
                            setShowStatusModal(true);
                        }
                    }
                }
            } catch (e) {
            }
        };

        pollStatus(); 
        const interval = setInterval(pollStatus, 2000); 
        const timeout = setTimeout(() => clearInterval(interval), 120000); 

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [accessToken, bookingId, bookingStatus, isRedirecting]);

    const getStatusConfig = () => {
        switch (bookingStatus) {
            case 'confirmed':
                return { label: 'ПОДТВЕРЖДЕНО', color: '#10b981', icon: 'check-circle' as const };
            case 'payment_pending':
                return { label: 'ЖДЁТ ОПЛАТЫ', color: '#f59e0b', icon: 'payment' as const };
            case 'rejected':
                return { label: 'ОТКЛОНЕНО', color: '#ef4444', icon: 'cancel' as const };
            case 'cancelled':
                return { label: 'ОТМЕНЕНО', color: '#94a3b8', icon: 'block' as const };
            case 'expired':
                return { label: 'ИСТЕКЛО', color: '#f59e0b', icon: 'schedule' as const };
            default:
                return { label: 'В ОЖИДАНИИ', color: '#94a3b8', icon: 'hourglass-empty' as const };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.iconButton}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Подтверждение</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.card}>
                    <ImageBackground
                        source={require('../../assets/images/featured_1.jpg')}
                        style={styles.cardCover}
                        imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                    >
                        <Animated.View style={[
                            styles.statusBadge,
                            { backgroundColor: statusConfig.color },
                bookingStatus === 'pending' || bookingStatus === 'payment_pending' ? { opacity: pulseAnim } : null
                        ]}>
                            <MaterialIcons name={statusConfig.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={styles.statusBadgeText}>{statusConfig.label}</Text>
                        </Animated.View>
                    </ImageBackground>

                    <View style={styles.cardBody}>
                        <View style={styles.placeHeader}>
                            <View style={styles.placeIconBox}>
                                <Text style={styles.placeIconText}>{restaurantName.substring(0, 2).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.placeTitle}>{params.eventTitle || restaurantName}</Text>
                                <Text style={styles.placeSubtitle}>{params.eventTitle ? restaurantName : 'Выбранное заведение'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>ДАТА</Text>
                                <View style={styles.valRow}>
                                    <Ionicons name="calendar" size={16} color={colors.primary} />
                                    <Text style={styles.valText}>{dateString}</Text>
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>ВРЕМЯ</Text>
                                <View style={styles.valRow}>
                                    <Ionicons name="time" size={16} color={colors.primary} />
                                    <Text style={styles.valText}>{timeString}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.dividerDashed} />

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Количество гостей</Text>
                            <Text style={styles.detailVal}>{guestString}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>ID бронирования</Text>
                            <Text style={styles.detailVal}>#KZ-{bookingId}</Text>
                        </View>
                        {(fullBooking?.table_number || fullBooking?.table || fullBooking?.table_id) && (
                            <View style={[styles.detailRow, { marginTop: 12 }]}>
                                <Text style={styles.detailLabel}>Ваш столик</Text>
                                <View style={styles.tableBadge}>
                                    <Text style={styles.tableBadgeText}>СТОЛ {fullBooking.table_number || fullBooking.table || fullBooking.table_id}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.dividerDashed} />

                        <View style={styles.paymentSection}>
                            <View style={styles.receiptHeader}>
                                <Text style={styles.paymentTitle}>ДЕТАЛИЗАЦИЯ ОПЛАТЫ</Text>
                                <MaterialIcons name="receipt" size={16} color="#94a3b8" />
                            </View>

                            <View style={styles.receiptContainer}>
                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>Базовое бронирование</Text>
                                    <Text style={styles.paymentVal}>{Number(params.reservationPrice || 0).toLocaleString()} ₸</Text>
                                </View>

                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>Сервисный сбор (0%)</Text>
                                    <Text style={styles.paymentVal}>0 ₸</Text>
                                </View>

                                {Number(params.addonsPrice || 0) > 0 && (
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Дополнительные услуги</Text>
                                        <Text style={styles.paymentVal}>+{Number(params.addonsPrice || 0).toLocaleString()} ₸</Text>
                                    </View>
                                )}

                                {depositRequired && depositAmount > 0 && (
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Депозит</Text>
                                        <Text style={styles.paymentVal}>{depositAmount.toLocaleString()} ₸</Text>
                                    </View>
                                )}

                                <View style={styles.receiptDivider} />

                                <View style={[styles.paymentRow, { marginBottom: 0 }]}>
                                    <Text style={styles.totalLabelText}>ИТОГО К ОПЛАТЕ</Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.totalValueText}>{Number(params.totalPrice || 0).toLocaleString()} ₸</Text>
                                        <Text style={styles.vatText}>Включая НДС</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={[
                            styles.infoNote,
                            bookingStatus === 'confirmed' && { backgroundColor: 'rgba(16, 185, 129, 0.08)' }
                        ]}>
                            <Ionicons
                                name={bookingStatus === 'confirmed' ? 'checkmark-circle' : 'information-circle-outline'}
                                size={18}
                                color={bookingStatus === 'confirmed' ? '#10b981' : colors.primary}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={[
                                styles.infoNoteText,
                                bookingStatus === 'confirmed' && { color: '#10b981' }
                            ]}>
                                {bookingStatus === 'confirmed'
                                    ? 'Бронирование подтверждено! Переход к вашим бронированиям...'
                                    : bookingStatus === 'payment_pending' || depositRequired
                                        ? 'Бронь создана. Для подтверждения может потребоваться депозит.'
                                    : bookingStatus === 'rejected'
                                        ? 'Бронирование отклонено рестораном.'
                                        : 'Ваша заявка отправлена. Ожидаем подтверждения от ресторана...'}
                            </Text>
                        </View>
                    </View>
                </View>

                {bookingStatus === 'pending' && (
                    <Text style={styles.footerNote}>Обычно подтверждение занимает менее 5 минут</Text>
                )}
            </ScrollView>

            <View style={[styles.bottomNav, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/home')}>
                    <Ionicons name="home" size={24} color={colors.textSecondary} />
                    <Text style={styles.navText}>Главная</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/events')}>
                    <MaterialIcons name="event-note" size={24} color={colors.textSecondary} />
                    <Text style={styles.navText}>Бронирования</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/profile')}>
                    <Ionicons name="person-outline" size={24} color={colors.textSecondary} />
                    <Text style={styles.navText}>Профиль</Text>
                </TouchableOpacity>
            </View>

            <StatusModal
                visible={showStatusModal}
                type={bookingStatus === 'confirmed' ? 'success' : 'error'}
                title={bookingStatus === 'confirmed' ? 'Успешно' : 'Отклонено'}
                message={
                    bookingStatus === 'confirmed'
                        ? 'Ваша бронь подтверждена и добавлена в список бронирований'
                        : 'К сожалению, ресторан отклонил вашу заявку'
                }
                buttonText={bookingStatus === 'confirmed' ? 'К бронированиям' : 'Мои бронирования'}
                onClose={() => setShowStatusModal(false)}
                onAction={() => {
                    setShowStatusModal(false);
                    router.push('/(tabs)/events');
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 32,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0px 18px 36px rgba(15, 23, 42, 0.12)',
            },
            default: {},
        }),
        marginBottom: 24,
    },
    cardCover: {
        height: 160,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 32,
    },
    statusBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800',
    },
    cardBody: {
        padding: 24,
    },
    placeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    placeIconBox: {
        width: 40,
        height: 40,
        borderRadius: 32,
        backgroundColor: '#8b5cf6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeIconText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '800',
    },
    placeTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 2,
    },
    placeSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    col: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94a3b8',
        marginBottom: 8,
    },
    valRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    valText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    dividerDashed: {
        height: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    detailVal: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },
    paymentSection: {
        marginTop: 4,
    },
    paymentTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    paymentLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    paymentVal: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },
    infoNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(67, 97, 238, 0.05)',
        padding: 16,
        borderRadius: 40,
        marginTop: 32,
        marginBottom: 8,
    },
    infoNoteText: {
        flex: 1,
        color: colors.primary,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    footerNote: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94a3b8',
        paddingHorizontal: 32,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
        justifyContent: 'space-around',
    },
    navItem: {
        alignItems: 'center',
        flex: 1,
    },
    navText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
        color: colors.textSecondary,
    },
    receiptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    receiptContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 40,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    receiptDivider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 12,
        borderStyle: 'dashed',
    },
    totalLabelText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f172a',
    },
    totalValueText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },
    vatText: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 2,
    },
    tableBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tableBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    }
});
