import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

import { fetchRestaurants, fetchUnreadMessagesCount } from '../../lib/api';
import { Logo } from '../../components/ui/Logo';
import { useAuth } from '../../lib/auth-context';

interface Restaurant {
    id: number;
    name: string;
    address: string;
    capacity: number;
    average_price: number;
    description: string;
    image_url: string;
    photo_url: string;
}

function getDefaultVisitDate() {
    const now = new Date();
    const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export default function SearchScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const defaultVisitDate = useMemo(() => getDefaultVisitDate(), []);
    const tomorrowVisitDate = useMemo(() => {
        const next = new Date(`${defaultVisitDate}T12:00:00`);
        next.setDate(next.getDate() + 1);
        return next.toISOString().slice(0, 10);
    }, [defaultVisitDate]);
    const [selectedVisitDate, setSelectedVisitDate] = useState(defaultVisitDate);
    const [selectedGuests, setSelectedGuests] = useState(2);

    const openResults = useCallback(() => {
        router.push({
            pathname: '/results',
            params: {
                q: searchQuery.trim(),
                date: selectedVisitDate,
                time: '19:00',
                guests: String(selectedGuests),
            },
        });
    }, [router, searchQuery, selectedGuests, selectedVisitDate]);

    const loadRestaurants = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await fetchRestaurants();
            const list = Array.isArray(data) ? data : ((data as any)?.results || []);
            setRestaurants(list);
        } catch (error) {
            console.error('Failed to fetch restaurants:', error);
            setRestaurants([]);
            setLoadError('Не удалось загрузить рестораны. Проверьте подключение и попробуйте снова.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRestaurants();
    }, [loadRestaurants]);

    useEffect(() => {
        let mounted = true;
        const loadUnread = async () => {
            if (!user?.access) {
                if (mounted) setUnreadCount(0);
                return;
            }
            try {
                const result = await fetchUnreadMessagesCount(user.access);
                if (mounted) setUnreadCount(typeof result?.unread === 'number' ? result.unread : 0);
            } catch {
                if (mounted) setUnreadCount(0);
            }
        };

        void loadUnread();
        return () => {
            mounted = false;
        };
    }, [user?.access]);

    const visibleRestaurants = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return restaurants;
        }

        return restaurants.filter((item) =>
            item.name.toLowerCase().includes(query) ||
            item.address.toLowerCase().includes(query)
        );
    }, [restaurants, searchQuery]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={false} />

            <View style={styles.headerTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Logo />
                </View>
                <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7} onPress={() => router.push('/notifications')}>
                    <Ionicons name="notifications-outline" size={24} color="#94a3b8" />
                    {unreadCount > 0 ? (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    ) : null}
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIconLeft} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Город или название..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={openResults}
                        returnKeyType="search"
                    />
                    <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7} onPress={openResults}>
                        <Ionicons name="options" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchHintRow}>
                <TouchableOpacity
                    style={selectedVisitDate === defaultVisitDate ? styles.searchHintChipActive : styles.searchHintChip}
                    activeOpacity={0.8}
                    onPress={() => setSelectedVisitDate(defaultVisitDate)}
                >
                    <Text style={selectedVisitDate === defaultVisitDate ? styles.searchHintChipTextActive : styles.searchHintChipText}>Сегодня</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={selectedVisitDate === tomorrowVisitDate ? styles.searchHintChipActive : styles.searchHintChip}
                    activeOpacity={0.8}
                    onPress={() => setSelectedVisitDate(tomorrowVisitDate)}
                >
                    <Text style={selectedVisitDate === tomorrowVisitDate ? styles.searchHintChipTextActive : styles.searchHintChipText}>Завтра</Text>
                </TouchableOpacity>
                {[2, 4, 6].map((count) => (
                    <TouchableOpacity
                        key={count}
                        style={selectedGuests === count ? styles.searchHintChipDark : styles.searchHintChip}
                        activeOpacity={0.8}
                        onPress={() => setSelectedGuests(count)}
                    >
                        <Text style={selectedGuests === count ? styles.searchHintChipTextDark : styles.searchHintChipText}>{count} гостя</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll} style={styles.chipsContainer}>
                <TouchableOpacity style={styles.chip} onPress={openResults}>
                    <Ionicons name="people" size={16} color={colors.primary} />
                    <Text style={styles.chipText}>Вместимость</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip} onPress={openResults}>
                    <Ionicons name="card-outline" size={16} color={colors.primary} />
                    <Text style={styles.chipText}>Средний чек</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip} onPress={openResults}>
                    <Ionicons name="restaurant" size={16} color={colors.primary} />
                    <Text style={styles.chipText}>Кухня</Text>
                </TouchableOpacity>
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity activeOpacity={0.9} onPress={openResults} style={styles.bannerContainer}>
                    <LinearGradient
                        colors={['#0047FF', '#0033CC']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.bannerGradient}
                    >
                        <View style={styles.bannerLeft}>
                            <Text style={styles.bannerTitle}>Найти{'\n'}ресторан</Text>
                            <View style={styles.bannerBtn}>
                                <Text style={styles.bannerBtnText}>Перейти к поиску</Text>
                            </View>
                        </View>
                        <View style={styles.bannerRight}>
                            <Ionicons name="restaurant-outline" size={64} color="rgba(255,255,255,0.9)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>ПОПУЛЯРНЫЕ РЕСТОРАНЫ</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={openResults}>
                        <Text style={styles.seeAllText}>Все</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Загружаем рестораны…</Text>
                    </View>
                ) : loadError ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>{loadError}</Text>
                        <TouchableOpacity style={styles.reloadButton} activeOpacity={0.8} onPress={() => void loadRestaurants()}>
                            <Text style={styles.reloadButtonText}>Повторить</Text>
                        </TouchableOpacity>
                    </View>
                ) : visibleRestaurants.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>Ничего не найдено</Text>
                        <Text style={styles.emptyStateSubtitle}>Попробуйте изменить запрос или откройте общий поиск ресторанов.</Text>
                        <TouchableOpacity style={styles.reloadButton} activeOpacity={0.8} onPress={openResults}>
                            <Text style={styles.reloadButtonText}>Открыть поиск</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.venuesList}>
                        {visibleRestaurants.map((item) => (
                                <View key={item.id} style={styles.venueCard}>
                                    <ImageBackground
                                        source={item.image_url ? { uri: item.image_url } : require('../../assets/images/featured_1.jpg')}
                                        style={styles.venueImage}
                                        imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, resizeMode: 'cover' }}
                                    >
                                        <View style={styles.ratingBadge}>
                                            <Ionicons name="star-outline" size={14} color="#f59e0b" style={{ marginRight: 2 }} />
                                            <Text style={styles.ratingText}>4.9</Text>
                                        </View>
                                    </ImageBackground>

                                    <View style={styles.venueDetails}>
                                        <Text style={styles.venueName}>{item.name}</Text>
                                        <Text style={styles.venueSubtitle} numberOfLines={1}>{item.address}</Text>

                                        <View style={styles.venueSpecs}>
                                            <View style={styles.specItem}>
                                                <Ionicons name="people" size={18} color="#4361ee" />
                                                <Text style={styles.specText}>До {item.capacity || '?'} чел.</Text>
                                            </View>
                                            {item.average_price ? (
                                                <View style={styles.specItem}>
                                                    <Ionicons name="card-outline" size={18} color="#4361ee" />
                                                    <Text style={styles.specText}>{Number(item.average_price).toLocaleString('ru-RU')} ₸</Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        <TouchableOpacity
                                            style={styles.bookButton}
                                            activeOpacity={0.8}
                                            onPress={() => router.push({
                                                pathname: '/restaurant/[id]',
                                                params: {
                                                    id: item.id,
                                                    restaurantName: item.name,
                                                    restaurantAddress: item.address || '',
                                                    restaurantImageUrl: item.photo_url || item.image_url || '',
                                                    q: searchQuery.trim(),
                                                    date: selectedVisitDate,
                                                    time: '19:00',
                                                    guests: String(selectedGuests),
                                                },
                                            })}
                                        >
                                            <Text style={styles.bookButtonText}>Смотреть заведение</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', 
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
    },
    notificationBtn: {
        padding: 4,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 8,
        backgroundColor: '#ffffff',
        gap: 12,
    },
    searchHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
    },
    searchHintText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    searchHintDivider: {
        fontSize: 12,
        color: '#cbd5e1',
    },
    searchHintChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchHintChipActive: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchHintChipDark: {
        borderRadius: 999,
        backgroundColor: '#0f172a',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchHintChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    searchHintChipTextActive: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    searchHintChipTextDark: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        height: 52, 
        borderRadius: 40,
        paddingHorizontal: 16,
    },
    searchIconLeft: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        color: '#0f172a',
    },
    filterBtn: {
        padding: 4,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    emptyState: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 20,
        gap: 12,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    reloadButton: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    reloadButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    bannerContainer: {
        marginBottom: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0px 14px 28px rgba(139, 92, 246, 0.22)',
            },
            default: {},
        }),
    },
    bannerGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 32,
        padding: 24,
        overflow: 'hidden',
    },
    bannerLeft: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 16,
        lineHeight: 28,
    },
    bannerBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    bannerBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    bannerRight: {
        marginLeft: 16,
        opacity: 0.9,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 0.5,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4361ee',
    },
    venuesList: {
        gap: 20,
    },
    venueCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.06)',
            },
            default: {},
        }),
    },
    venueImage: {
        height: 180,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: 12,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 32,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    venueDetails: {
        padding: 16,
    },
    venueName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 4,
    },
    venueSubtitle: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    venueSpecs: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 20,
    },
    specItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    specText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    bookButton: {
        width: '100%',
        height: 52,
        justifyContent: 'center',
        backgroundColor: '#0047FF', 
        borderRadius: 32,
        alignItems: 'center',
    },
    bookButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    devBtn: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
    },
    devBtnText: {
        fontSize: 10,
        color: '#334155',
        fontWeight: '600',
    },
    chipsContainer: {
        marginBottom: 16,
    },
    filterChipsScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 32,
        gap: 6,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
    }
});
