import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

const NOTIFICATIONS = [
    {
        id: '1',
        type: 'booking_confirmed',
        title: 'hhal',
        message: 'Ваша бронь подтверждена. Ждем вас сегодня в 19:00.',
        time: 'сейчас',
        icon: 'check-circle',
        iconColor: '#10b981', // emerald-500
        iconBg: '#d1fae5', // emerald-100
        appIconBg: '#3b82f6',
        appName: 'KEZDES'
    },
    {
        id: '2',
        type: 'admin_request',
        title: 'Новая заявка на банкет',
        message: 'Деловой обед, 15 чел. Требуется подтверждение менеджера.',
        time: '5 мин. назад',
        icon: 'event',
        iconColor: '#3b82f6', // blue-500
        iconBg: '#dbeafe', // blue-100
        appIconBg: '#4f46e5',
        appName: 'KEZDES ADMIN'
    },
    {
        id: '3',
        type: 'reminder',
        title: 'Напоминание о событии',
        message: 'Событие начнется через 2 часа. Подготовьте QR-код для входа.',
        time: '12 мин. назад',
        icon: 'schedule',
        iconColor: '#f59e0b', // amber-500
        iconBg: '#fef3c7', // amber-100
        appIconBg: '#6366f1',
        appName: 'KEZDES'
    }
];

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop' }}
                style={styles.bgImage}
                blurRadius={20}
            >
                <View style={[styles.overlay, { paddingTop: insets.top }]} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="close" size={28} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Уведомления</Text>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}>
                    {NOTIFICATIONS.map(notif => (
                        <View key={notif.id} style={styles.notificationCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.appInfo}>
                                    <View style={[styles.appIconContainer, { backgroundColor: notif.appIconBg }]}>
                                        <Ionicons name="restaurant" size={12} color="#ffffff" />
                                    </View>
                                    <Text style={styles.appNameText}>{notif.appName}</Text>
                                </View>
                                <Text style={styles.timeText}>{notif.time}</Text>
                            </View>

                            <View style={styles.cardContent}>
                                <View style={[styles.statusIconBox, { backgroundColor: notif.iconBg }]}>
                                    <MaterialIcons name={notif.icon as any} size={18} color={notif.iconColor} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.titleText}>{notif.title}</Text>
                                    <Text style={styles.messageText}>{notif.message}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </ImageBackground>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    bgImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // dark overlay
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        zIndex: 10,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
    },
    notificationCard: {
        backgroundColor: 'rgba(241, 245, 249, 0.95)', // slate-100 very slight transparency
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    appInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appNameText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#475569', // slate-600
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: 12,
        color: '#94a3b8', // slate-400
        fontWeight: '500',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    statusIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    textContainer: {
        flex: 1,
    },
    titleText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a', // slate-900
        marginBottom: 6,
    },
    messageText: {
        fontSize: 14,
        color: '#475569', // slate-600
        lineHeight: 20,
    }
});
