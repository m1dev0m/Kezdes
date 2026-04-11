import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { isAdminRole, isRestaurantRole, useAuth } from '../../lib/auth-context';
import { useResponsive } from '../../hooks/useResponsive';
import { API_BASE_URL, fetchBookings } from '../../lib/api';

type ProfileStats = {
    totalBookings: number;
    activeBookings: number;
    favorites: number;
};

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
    const [stats, setStats] = useState<ProfileStats>({ totalBookings: 0, activeBookings: 0, favorites: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
        if (!user?.access) {
            setStats({ totalBookings: 0, activeBookings: 0, favorites: 0 });
            setError(null);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            if (!silent) setLoading(true);
            setError(null);

            const [bookings, favoritesResponse] = await Promise.all([
                fetchBookings(user.access).catch(() => []),
                fetch(`${API_BASE_URL}/restaurants/favorites/`, {
                    headers: { Authorization: `Bearer ${user.access}` },
                })
                    .then((response) => (response.ok ? response.json() : []))
                    .catch(() => []),
            ]);

            const totalBookings = Array.isArray(bookings) ? bookings.length : 0;
            const activeBookings = Array.isArray(bookings)
                ? bookings.filter((booking: any) =>
                    ['pending', 'confirmed', 'approved', 'payment_pending', 'seated'].includes(booking.status),
                ).length
                : 0;
            const favorites = Array.isArray(favoritesResponse)
                ? favoritesResponse.length
                : Array.isArray(favoritesResponse?.results)
                    ? favoritesResponse.results.length
                    : 0;

            setStats({ totalBookings, activeBookings, favorites });
        } catch (loadError) {
            console.error('Failed to load profile stats:', loadError);
            setError('Не удалось загрузить данные профиля. Проверьте подключение и попробуйте снова.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.access]);

    useEffect(() => {
        void loadStats();
    }, [loadStats]);

    const onRefresh = () => {
        setRefreshing(true);
        void loadStats({ silent: true });
    };

    const displayName = useMemo(() => {
        if (user?.username) return user.username;
        return 'Гость Kezdes';
    }, [user?.username]);

    const canOpenAdmin = isRestaurantRole(user?.role) || isAdminRole(user?.role);

    const accountLabel = isAdminRole(user?.role)
        ? 'Администратор'
        : isRestaurantRole(user?.role)
            ? 'Ресторан'
            : 'Гость Kezdes';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Профиль</Text>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                <View style={[styles.pageInner, { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarWrap}>
                            <Image
                                source={require('../../assets/images/featured_1.jpg')}
                                style={styles.avatar}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => router.push('/settings')}
                        >
                            <Ionicons name="create-outline" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userCompany}>{accountLabel}</Text>

                    <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
                        <StatBox label="Активных" value={loading ? '—' : String(stats.activeBookings)} />
                        <View style={styles.statDivider} />
                        <StatBox label="Всего броней" value={loading ? '—' : String(stats.totalBookings)} />
                        <View style={styles.statDivider} />
                        <StatBox label="Избранных" value={loading ? '—' : String(stats.favorites)} />
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <View style={styles.mainContent}>
                    <View style={styles.group}>
                        <View style={styles.groupCard}>
                            {canOpenAdmin && (
                                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin')}>
                                    <View style={[styles.menuIconBox, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                                        <Ionicons name="grid-outline" size={20} color="#4f46e5" />
                                    </View>
                                    <Text style={styles.menuText}>Панель управления</Text>
                                    <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/events')}>
                                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(0, 71, 255, 0.1)' }]}>
                                    <Ionicons name="calendar" size={20} color={colors.primary} />
                                </View>
                                <Text style={styles.menuText}>Мои бронирования</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/orders/history')}>
                                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Ionicons name="bag-outline" size={20} color="#10b981" />
                                </View>
                                <Text style={styles.menuText}>История заказов</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#e0e7ff' }]}>
                                    <Ionicons name="settings-outline" size={20} color="#4f46e5" />
                                </View>
                                <Text style={styles.menuText}>Настройки и уведомления</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/support')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#dcfce7' }]}>
                                    <Ionicons name="help-circle-outline" size={20} color="#16a34a" />
                                </View>
                                <Text style={styles.menuText}>Служба поддержки</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/favorites')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#fce7f3' }]}>
                                    <Ionicons name="heart-outline" size={20} color="#db2777" />
                                </View>
                                <Text style={styles.menuText}>Избранные рестораны</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.group}>
                        <Text style={styles.groupTitle}>ИНФОРМАЦИЯ</Text>
                        <View style={styles.groupCard}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/about')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#f3e8ff' }]}>
                                    <Ionicons name="information-circle-outline" size={20} color="#a855f7" />
                                </View>
                                <Text style={styles.menuText}>О приложении</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/rules')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#fce7f3' }]}>
                                    <Ionicons name="hammer-outline" size={20} color="#ec4899" />
                                </View>
                                <Text style={styles.menuText}>Правила сервиса</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.group}>
                        <Text style={styles.groupTitle}>АККАУНТ</Text>
                        <View style={styles.groupCard}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/support')}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#fef3c7' }]}>
                                    <Ionicons name="person-outline" size={20} color="#d97706" />
                                </View>
                                <Text style={styles.menuText}>Помощь по аккаунту</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => void logout()}>
                                <View style={[styles.menuIconBox, { backgroundColor: '#fee2e2' }]}>
                                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                                </View>
                                <Text style={[styles.menuText, { color: colors.error }]}>Выйти из аккаунта</Text>
                                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.versionText}>
                        Kezdes v3.0.0 (Premium){'\n'}© 2026 Kezdes SaaS Solutions
                    </Text>
                </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.statBox}>
            <Text style={styles.statNumber}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconButton: {
        padding: 8,
        borderRadius: 32,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    scroll: {
        paddingBottom: 40,
    },
    pageInner: {
        width: '100%',
    },
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
        backgroundColor: '#ffffff',
        marginBottom: 8,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarWrap: {
        width: 112,
        height: 112,
        borderRadius: 56,
        borderWidth: 4,
        borderColor: 'rgba(0, 71, 255, 0.1)',
        overflow: 'hidden',
        backgroundColor: colors.border,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    editButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    userCompany: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textSecondary,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        width: '100%',
    },
    statsRowTablet: {
        maxWidth: 520,
        alignSelf: 'center',
    },
    statBox: {
        alignItems: 'center',
        paddingHorizontal: 20,
        minWidth: 92,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
    },
    mainContent: {
        padding: 16,
        gap: 24,
    },
    group: {},
    groupTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    versionText: {
        fontSize: 12,
        color: colors.muted,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 8,
    },
    errorText: {
        marginTop: 16,
        fontSize: 13,
        lineHeight: 18,
        color: colors.warning,
        textAlign: 'center',
    },
});
