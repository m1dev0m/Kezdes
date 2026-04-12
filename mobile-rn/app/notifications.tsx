import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth, isGuestRole, isRestaurantRole } from '../lib/auth-context';
import { fetchBookings, fetchMyRestaurantBookings } from '../lib/api';

type InAppNotification = {
    id: string;
    type: 'admin_booking' | 'guest_status' | 'info';
    title: string;
    message: string;
    timestamp: number;
    route?: string;
};

type NotificationContextValue = {
    notifications: InAppNotification[];
    pushNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

function buildNotificationId(prefix: string, suffix: string | number) {
    return `${prefix}:${suffix}:${Date.now()}`;
}

function formatBookingStatus(status?: string) {
    switch (status) {
        case 'approved':
        case 'confirmed':
            return 'подтверждена';
        case 'rejected':
            return 'отклонена';
        case 'cancelled_by_restaurant':
            return 'отменена рестораном';
        case 'seated':
            return 'посадка выполнена';
        case 'completed':
            return 'завершена';
        case 'no_show':
            return 'отмечена как неявка';
        default:
            return status || 'обновлена';
    }
}

function InAppBanner({
    notification,
    onHide,
    onPress,
}: {
    notification: InAppNotification | null;
    onHide: () => void;
    onPress: (notification: InAppNotification) => void;
}) {
    const insets = useSafeAreaInsets();
    const progress = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!notification) return;
        progress.setValue(1);
        const animation = Animated.timing(progress, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: false,
        });
        animation.start(({ finished }) => {
            if (finished) onHide();
        });
        return () => animation.stop();
    }, [notification, onHide, progress]);

    if (!notification) return null;

    const accentColor = notification.type === 'admin_booking' ? '#f59e0b' : colors.primary;

    return (
        <View style={[styles.bannerWrap, { top: insets.top + 8 }]}>
            <TouchableOpacity activeOpacity={0.95} style={styles.bannerCard} onPress={() => onPress(notification)}>
                <View style={[styles.bannerIconBox, { backgroundColor: `${accentColor}1A` }]}>
                    <Ionicons
                        name={notification.type === 'admin_booking' ? 'notifications-outline' : 'checkmark-circle-outline'}
                        size={20}
                        color={accentColor}
                    />
                </View>
                <View style={styles.bannerBody}>
                    <Text style={styles.bannerTitle}>{notification.title}</Text>
                    <Text style={styles.bannerMessage}>{notification.message}</Text>
                </View>
                <TouchableOpacity onPress={onHide} style={styles.bannerClose}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <Animated.View
                    style={[
                        styles.bannerProgress,
                        {
                            backgroundColor: accentColor,
                            transform: [
                                {
                                    scaleX: progress,
                                },
                            ],
                        },
                    ]}
                />
            </TouchableOpacity>
        </View>
    );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [activeBanner, setActiveBanner] = useState<InAppNotification | null>(null);
    const previousAdminPendingIds = useRef<Set<number>>(new Set());
    const previousGuestStatuses = useRef<Map<number, string>>(new Map());
    const initializedAdmin = useRef(false);
    const initializedGuest = useRef(false);

    const pushNotification = React.useCallback((notification: Omit<InAppNotification, 'id' | 'timestamp'>) => {
        const next: InAppNotification = {
            ...notification,
            id: buildNotificationId(notification.type, notification.title),
            timestamp: Date.now(),
        };
        setNotifications((current) => [next, ...current].slice(0, 50));
        setActiveBanner(next);
    }, []);

    useEffect(() => {
        const token = user?.access;
        if (!token || !user?.role) {
            previousAdminPendingIds.current = new Set();
            previousGuestStatuses.current = new Map();
            initializedAdmin.current = false;
            initializedGuest.current = false;
            return;
        }

        let cancelled = false;

        const poll = async () => {
            try {
                if (isRestaurantRole(user.role)) {
                    const bookings = await fetchMyRestaurantBookings(token);
                    if (cancelled) return;
                    const pending = (bookings || []).filter((booking: any) => booking.status === 'pending');
                    const nextIds = new Set<number>(pending.map((booking: any) => Number(booking.id)));
                    if (initializedAdmin.current) {
                        pending.forEach((booking: any) => {
                            const bookingId = Number(booking.id);
                            if (!previousAdminPendingIds.current.has(bookingId)) {
                                pushNotification({
                                    type: 'admin_booking',
                                    title: 'Новая заявка на бронь',
                                    message: `${booking.user_name || 'Гость'} · ${booking.guests || 0} гостей · ${booking.time?.slice?.(0, 5) || '--:--'}`,
                                    route: `/admin/bookings?filter=pending&today=1&highlight=${bookingId}`,
                                });
                            }
                        });
                    }
                    previousAdminPendingIds.current = nextIds;
                    initializedAdmin.current = true;
                } else if (isGuestRole(user.role)) {
                    const bookings = await fetchBookings(token);
                    if (cancelled) return;
                    const nextStatuses = new Map<number, string>();
                    (bookings || []).forEach((booking: any) => {
                        const bookingId = Number(booking.id);
                        const nextStatus = String(booking.status || '');
                        const prevStatus = previousGuestStatuses.current.get(bookingId);
                        if (initializedGuest.current && prevStatus && prevStatus !== nextStatus) {
                            pushNotification({
                                type: 'guest_status',
                                title: 'Статус брони изменился',
                                message: `${booking.restaurant_name || 'Ресторан'}: бронь ${formatBookingStatus(nextStatus)}.`,
                                route: '/(tabs)/events',
                            });
                        }
                        nextStatuses.set(bookingId, nextStatus);
                    });
                    previousGuestStatuses.current = nextStatuses;
                    initializedGuest.current = true;
                }
            } catch (error) {
                console.error('Notification polling failed:', error);
            }
        };

        void poll();
        const interval = setInterval(() => {
            void poll();
        }, 15000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [pushNotification, user?.access, user?.role]);

    const value = useMemo(() => ({ notifications, pushNotification }), [notifications, pushNotification]);
    const openNotification = React.useCallback((notification: InAppNotification) => {
        setActiveBanner(null);
        if (notification.route) {
            router.push(notification.route as Parameters<typeof router.push>[0]);
            return;
        }
        router.push('/notifications');
    }, [router]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <InAppBanner
                notification={activeBanner}
                onHide={() => setActiveBanner(null)}
                onPress={openNotification}
            />
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used inside NotificationProvider');
    }
    return context;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications } = useNotifications();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.screenHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Уведомления</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-outline" size={52} color={colors.muted} />
                        <Text style={styles.emptyTitle}>Пока пусто</Text>
                        <Text style={styles.emptyText}>Здесь появятся новые заявки и изменения по бронированиям.</Text>
                    </View>
                ) : (
                    notifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            activeOpacity={0.85}
                            style={styles.notificationCard}
                            onPress={() => {
                                if (notification.route) {
                                    router.push(notification.route as Parameters<typeof router.push>[0]);
                                    return;
                                }
                                router.back();
                            }}
                        >
                            <View style={styles.notificationHeader}>
                                <Text style={styles.notificationTitle}>{notification.title}</Text>
                                <Text style={styles.notificationTime}>
                                    {new Date(notification.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            <Text style={styles.notificationMessage}>{notification.message}</Text>
                            {notification.route ? (
                                <View style={styles.notificationHintRow}>
                                    <Text style={styles.notificationHint}>Открыть</Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    bannerWrap: {
        position: 'absolute',
        left: 12,
        right: 12,
        zIndex: 1000,
    },
    bannerCard: {
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    bannerIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    bannerBody: { flex: 1, paddingRight: 8 },
    bannerTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    bannerMessage: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    bannerClose: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    bannerProgress: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 3,
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    screenTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    scroll: { padding: 16, gap: 14, paddingBottom: 40 },
    notificationCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
    },
    notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    notificationTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text },
    notificationTime: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    notificationMessage: { marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    notificationHintRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    notificationHint: { fontSize: 12, fontWeight: '700', color: colors.primary },
    emptyState: { marginTop: 120, alignItems: 'center', paddingHorizontal: 32 },
    emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '800', color: colors.text },
    emptyText: { marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20, color: colors.textSecondary },
});
