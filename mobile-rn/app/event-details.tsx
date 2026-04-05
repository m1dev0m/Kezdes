import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../lib/auth-context';
import { fetchBookingDetail } from '../lib/api';

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id && user?.access) {
            setLoading(true);
            fetchBookingDetail(params.id as string, user.access)
                .then(data => {
                    setBooking(data);
                })
                .catch(err => {
                    console.error('Error fetching booking:', err);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [params.id, user]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text>Бронирование не найдено</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary }}>Вернуться назад</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isConfirmed = booking.status === 'approved';
    const isPending = booking.status === 'pending';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Детали события</Text>
                <TouchableOpacity style={styles.iconButton}>
                    <MaterialIcons name="more-horiz" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}>

                <View style={styles.statusRow}>
                    <View style={[styles.badge, isConfirmed && styles.badgeSuccess, isPending && styles.badgeWarning]}>
                        <MaterialIcons
                            name={isConfirmed ? "check-circle" : isPending ? "schedule" : "error"}
                            size={14}
                            color={isConfirmed ? '#3b82f6' : isPending ? '#f59e0b' : '#ef4444'}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.badgeText, { color: isConfirmed ? '#3b82f6' : isPending ? '#f59e0b' : '#ef4444' }]}>
                            {booking.status_display}
                        </Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.eventTitle}>{booking.event_title || `Бронь в ${booking.restaurant_name}`}</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.infoTexts}>
                            <Text style={styles.infoValue}>{booking.date}, {booking.time ? booking.time.substring(0, 5) : '--:--'}</Text>
                            <Text style={styles.infoLabel}>ДАТА И ВРЕМЯ</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <MaterialIcons name="group" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.infoTexts}>
                            <Text style={styles.infoValue}>{booking.guests} чел.</Text>
                            <Text style={styles.infoLabel}>КОЛИЧЕСТВО ГОСТЕЙ</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <MaterialIcons name="location-on" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.infoTexts}>
                            <Text style={styles.infoValue}>{booking.restaurant_name}</Text>
                            <Text style={styles.infoLabel}>ЛОКАЦИЯ</Text>
                        </View>
                    </View>
                </View>

                {booking.budget > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>БЮДЖЕТ</Text>
                        <View style={styles.card}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Примерный бюджет</Text>
                                <Text style={styles.totalValue}>{Number(booking.budget).toLocaleString()} ₸</Text>
                            </View>
                            {booking.pay_at_restaurant && (
                                <Text style={[styles.gridSubtitle, { marginTop: 8, color: '#f59e0b' }]}>
                                    ОПЛАТА В РЕСТОРАНЕ
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ЛОКАЦИЯ</Text>
                    <View style={styles.mapCard}>
                        <ImageBackground
                            source={require('../assets/images/featured_1.jpg')} // Using featured_1 as placeholder
                            style={styles.mapImage}
                            imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                        >
                            <View style={styles.mapPin}>
                                <View style={styles.mapPinInner} />
                            </View>
                        </ImageBackground>
                        <View style={styles.mapFooter}>
                            <View style={styles.mapFooterLeft}>
                                <Text style={styles.mapFooterIconMock}>P</Text>
                                <Text style={styles.mapFooterText}>Парковка доступна</Text>
                            </View>
                            <TouchableOpacity style={styles.routeBtn}>
                                <MaterialIcons name="directions" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                                <Text style={styles.routeBtnText}>Маршрут</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitleRow}>МЕНЮ И ЗАКАЗЫ</Text>
                        <TouchableOpacity>
                            <Text style={styles.editActionText}>Изменить меню</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.card}>
                        <View style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <Text style={styles.menuItemName}>Стейк Рибай (Medium Rare)</Text>
                                <Text style={styles.menuItemDesc}>4 порции</Text>
                            </View>
                            <Text style={styles.menuItemPrice}>48 000 ₸</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <Text style={styles.menuItemName}>Вино Cabernet Sauvignon</Text>
                                <Text style={styles.menuItemDesc}>2 бутылки</Text>
                            </View>
                            <Text style={styles.menuItemPrice}>32 500 ₸</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <Text style={styles.menuItemName}>Ассорти закусок VIP</Text>
                                <Text style={styles.menuItemDesc}>2 порции</Text>
                            </View>
                            <Text style={styles.menuItemPrice}>18 000 ₸</Text>
                        </View>
                        <View style={styles.dividerDashed} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Итого к оплате</Text>
                            <Text style={styles.totalValue}>98 500 ₸</Text>
                        </View>
                        <TouchableOpacity style={styles.invoiceBtn} onPress={() => router.push('/invoice/2024-0815')}>
                            <MaterialIcons name="receipt-long" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.invoiceBtnText}>Посмотреть счет</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ДОПОЛНИТЕЛЬНО</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridCard}>
                            <View style={styles.gridIconBox}>
                                <MaterialIcons name="videocam" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.gridTitle}>Проектор и экран</Text>
                            <Text style={styles.gridSubtitle}>ПОДГОТОВЛЕНО</Text>
                        </View>
                        <View style={styles.gridCard}>
                            <View style={styles.gridIconBox}>
                                <MaterialIcons name="meeting-room" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.gridTitle}>Отдельный VIP-зал</Text>
                            <Text style={styles.gridSubtitle}>БРОНЬ №4</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
                <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => router.push({ pathname: '/chat', params: { id: booking.id, name: booking.restaurant_name } })}
                >
                    <Ionicons name="chatbubble-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.chatBtnText}>Чат с менеджером</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mainActionBtn} onPress={() => router.push('/(tabs)/home')}>
                    <Text style={styles.mainActionBtnText}>Вернуться</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f7f8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
    },
    iconButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    scroll: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    statusRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 32,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: colors.border,
    },
    badgeSuccess: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    badgeWarning: {
        backgroundColor: '#fffbeb',
        borderColor: '#fef3c7',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 32,
        padding: 20,
        marginBottom: 24,
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 40,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoTexts: {
        flex: 1,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitleRow: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    editActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    mapCard: {
        backgroundColor: '#ffffff',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: colors.border,
    },
    mapImage: {
        width: '100%',
        height: 140,
        backgroundColor: '#bae6fd', // light blue mock
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPin: {
        width: 24,
        height: 24,
        borderRadius: 40,
        backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPinInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    mapFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    mapFooterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mapFooterIconMock: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    mapFooterText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    routeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 32,
    },
    routeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    menuItemLeft: {
        flex: 1,
        paddingRight: 16,
    },
    menuItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    menuItemDesc: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    menuItemPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    dividerDashed: {
        height: 1,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderStyle: 'dashed',
        marginVertical: 16,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
    },
    gridCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 32,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    gridIconBox: {
        width: 40,
        height: 40,
        borderRadius: 40,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    gridSubtitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
    },
    bottomActionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    chatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 40,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: colors.border,
    },
    chatBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
    },
    mainActionBtn: {
        flex: 1,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 40,
        paddingVertical: 16,
    },
    mainActionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
    invoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingVertical: 12,
        backgroundColor: '#eff6ff',
        borderRadius: 40,
    },
    invoiceBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    }
});
