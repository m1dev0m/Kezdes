import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fetchRestaurants } from '../lib/api';
import MapComponent from './MapComponent';

type Restaurant = {
    id: number;
    name: string;
    address?: string | null;
    capacity?: number | null;
    average_price?: number | string | null;
    description?: string | null;
    image_url?: string | null;
    photo_url?: string | null;
    rating?: number | string | null;
};

function getDefaultVisitDate() {
    const now = new Date();
    const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function getNumericRating(value?: number | string | null) {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function extractResults<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && 'results' in payload && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function ResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const eventType = params.eventType as string || 'wedding';
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [selectedVenue, setSelectedVenue] = useState<Restaurant | null>(null);
    const [venues, setVenues] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState(typeof params.q === 'string' ? params.q : '');
    const [largeCapacityOnly, setLargeCapacityOnly] = useState(false);
    const [highRatedOnly, setHighRatedOnly] = useState(false);
    const [affordableOnly, setAffordableOnly] = useState(false);
    const bookingDate = typeof params.date === 'string' ? params.date : getDefaultVisitDate();
    const bookingTime = typeof params.time === 'string' ? params.time : '19:00';
    const bookingGuests = typeof params.guests === 'string' ? params.guests : '2';

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const city = typeof params.city === 'string' && params.city.trim() ? params.city.trim() : undefined;
            const vData = await fetchRestaurants(city ? { city } : undefined);
            setVenues(extractResults<Restaurant>(vData));
        } catch {
            setError('Не удалось загрузить рестораны. Проверьте подключение и попробуйте снова.');
            setVenues([]);
            setSelectedVenue(null);
            setViewMode('list');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData, eventType]);

    const filteredVenues = useMemo(() => {
        return venues
            .filter((venue) =>
                venue.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                venue.address?.toLowerCase().includes(searchText.toLowerCase()),
            )
            .filter((venue) => !largeCapacityOnly || Number(venue.capacity || 0) >= 100)
            .filter((venue) => !highRatedOnly || getNumericRating(venue.rating ?? 4.8) >= 4.5)
            .filter((venue) => !affordableOnly || Number(venue.average_price || 0) <= 15000);
    }, [affordableOnly, highRatedOnly, largeCapacityOnly, searchText, venues]);

    const openVenue = useCallback((venue: Restaurant) => {
        router.push({
            pathname: '/restaurant/[id]',
            params: {
                id: venue.id,
                restaurantName: venue.name,
                restaurantAddress: venue.address || '',
                restaurantImageUrl: venue.photo_url || venue.image_url || '',
                budget: params.budget,
                guests: bookingGuests,
                eventType: params.eventType,
                date: bookingDate,
                time: bookingTime,
                q: searchText.trim(),
            },
        });
    }, [bookingDate, bookingGuests, bookingTime, params.budget, params.eventType, router, searchText]);

    const renderVenueCard = (venue: Restaurant) => (
        <TouchableOpacity
            key={venue.id}
            style={styles.listCard}
            activeOpacity={0.9}
            onPress={() => openVenue(venue)}
        >
            <View style={styles.listCardImageWrap}>
                <Image source={venue.image_url ? { uri: venue.image_url } : require('../assets/images/featured_1.jpg')} style={styles.listCardImage} />
                <View style={styles.listCardRating}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.listCardRatingText}>{venue.rating ?? '4.8'}</Text>
                </View>
            </View>
            <View style={styles.listCardContent}>
                <Text style={styles.listCardTitle} numberOfLines={1}>{venue.name}</Text>
                <Text style={styles.listCardDesc}>{venue.address}</Text>
                <Text style={styles.listCardPrice}>{Number(venue.average_price || 15000).toLocaleString('ru-RU')} ₸</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {viewMode === 'map' && (
                <View style={StyleSheet.absoluteFill}>
                    <MapComponent
                        venues={venues}
                        onMarkerPress={(v) => setSelectedVenue(v)}
                    />
                </View>
            )}

            <SafeAreaView edges={['top']} style={viewMode === 'map' ? styles.floatingTopUi : styles.staticTopUi}>
                <View style={styles.searchBarWrapper}>
                    <View style={styles.topNavHeader}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <Ionicons name="chevron-back" size={20} color="#0f172a" />
                        </TouchableOpacity>
                        <Text style={styles.topNavTitle}>{viewMode === 'map' ? 'Поиск на карте' : 'Подходящие рестораны'}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Поиск по названию или адресу"
                            placeholderTextColor="#94a3b8"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>

                    <View style={styles.bookingSummaryRow}>
                        <Text style={styles.bookingSummaryText}>{bookingDate}</Text>
                        <Text style={styles.bookingSummaryDivider}>•</Text>
                        <Text style={styles.bookingSummaryText}>{bookingTime}</Text>
                        <Text style={styles.bookingSummaryDivider}>•</Text>
                        <Text style={styles.bookingSummaryText}>{bookingGuests} гостя</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity style={largeCapacityOnly ? styles.filterChipActive : styles.filterChip} onPress={() => setLargeCapacityOnly((value) => !value)}>
                            <Text style={largeCapacityOnly ? styles.filterChipTextActive : styles.filterChipText}>Большие залы</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={highRatedOnly ? styles.filterChipActive : styles.filterChip} onPress={() => setHighRatedOnly((value) => !value)}>
                            <Text style={highRatedOnly ? styles.filterChipTextActive : styles.filterChipText}>Выше 4.5</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={affordableOnly ? styles.filterChipActive : styles.filterChip} onPress={() => setAffordableOnly((value) => !value)}>
                            <Text style={affordableOnly ? styles.filterChipTextActive : styles.filterChipText}>До 15k</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={() => {
                                setLargeCapacityOnly(false);
                                setHighRatedOnly(false);
                                setAffordableOnly(false);
                            }}
                        >
                            <Ionicons name="options-outline" size={16} color="#64748b" />
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.segmentedControl}>
                        <TouchableOpacity
                            style={[styles.segmentBtn, viewMode === 'map' && styles.segmentBtnActive]}
                            onPress={() => setViewMode('map')}
                        >
                            <Text style={[styles.segmentBtnText, viewMode === 'map' && styles.segmentBtnTextActive]}>Карта</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
                            onPress={() => setViewMode('list')}
                        >
                            <Text style={[styles.segmentBtnText, viewMode === 'list' && styles.segmentBtnTextActive]}>Список</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {viewMode === 'list' && (
                <ScrollView contentContainerStyle={styles.listScrollContent} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : error ? (
                        <View style={{ paddingHorizontal: 20, paddingTop: 40 }}>
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{error}</Text>
                            <TouchableOpacity style={[styles.bookButton, { alignSelf: 'flex-start' }]} onPress={() => void loadData()}>
                                <Text style={styles.bookButtonText}>Повторить</Text>
                            </TouchableOpacity>
                        </View>
                    ) : filteredVenues.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>Ничего не найдено</Text>
                            <Text style={styles.emptyDescription}>Попробуйте другой запрос или вернитесь к общему списку ресторанов.</Text>
                            <TouchableOpacity style={styles.emptyButton} onPress={() => setSearchText('')}>
                                <Text style={styles.emptyButtonText}>Сбросить поиск</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        filteredVenues.map(renderVenueCard)
                    )}
                </ScrollView>
            )}

            {viewMode === 'map' && selectedVenue && (
                <SafeAreaView edges={['bottom']} style={styles.mapBottomCardContainer}>
                    <View style={styles.mapBottomCard}>
                        <View style={styles.cardLayoutRow}>
                            <View style={styles.cardImageContainer}>
                                <Image source={selectedVenue.image_url ? { uri: selectedVenue.image_url } : require('../assets/images/featured_1.jpg')} style={styles.bottomCardImage} />
                            </View>
                            <View style={styles.cardContentRight}>
                                <View>
                                    <View style={styles.cardHeaderRow}>
                                        <Text style={styles.bottomCardTitle} numberOfLines={2}>{selectedVenue.name}</Text>
                                        <View style={styles.ratingBadge}>
                                            <Ionicons name="star" size={10} color={colors.primary} />
                                            <Text style={styles.ratingText}>{selectedVenue.rating || 4.8}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardSubtitle}>Ресторан • До {selectedVenue.capacity || 150} чел.</Text>
                                    <View style={styles.cardMetaRow}>
                                        <Ionicons name="navigate-outline" size={14} color="#64748b" />
                                        <Text style={styles.cardMetaText}>0.5 км</Text>
                                        <View style={{ flex: 1 }} />
                                        <Text style={styles.priceTierText}>₸₸₸</Text>
                                    </View>
                                </View>
                                <View style={styles.cardActionRow}>
                                    <TouchableOpacity
                                        style={styles.selectPlaceBtn}
                                        onPress={() => openVenue(selectedVenue)}
                                    >
                                        <Text style={styles.selectPlaceBtnText}>Открыть карточку</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            )}

            {viewMode === 'map' && (
                <View style={styles.mapControls}>
                    <View style={styles.zoomControls}>
                        <TouchableOpacity style={styles.mapControlBtn}>
                            <Ionicons name="add" size={24} color="#0f172a" />
                        </TouchableOpacity>
                        <View style={styles.mapControlDivider} />
                        <TouchableOpacity style={styles.mapControlBtn}>
                            <Ionicons name="remove" size={24} color="#0f172a" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.mapControlBtn, { marginTop: 12, borderRadius: 40 }]}>
                        <Ionicons name="locate-outline" size={20} color="#0f172a" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    floatingTopUi: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    staticTopUi: {
        width: '100%',
        backgroundColor: '#f3f4f6',
    },
    searchBarWrapper: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    topNavHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    iconButton: {
        padding: 4,
    },
    topNavTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        height: 48,
        borderRadius: 40,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    bookingSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    bookingSummaryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    bookingSummaryDivider: {
        fontSize: 12,
        color: '#cbd5e1',
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        color: '#0f172a',
    },
    filterScroll: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 4,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 40,
        gap: 4,
    },
    filterChipActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0047FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 40,
        gap: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#0047FF',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0px 6px 12px rgba(0, 71, 255, 0.18)',
            },
            default: {},
        }),
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    filterChipTextActive: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 40,
        padding: 4,
        height: 44,
    },
    segmentBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 32,
    },
    segmentBtnActive: {
        backgroundColor: '#ffffff',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0px 4px 10px rgba(15, 23, 42, 0.08)',
            },
            default: {},
        }),
    },
    segmentBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
    },
    segmentBtnTextActive: {
        color: '#0f172a',
    },

    listScrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyState: {
        backgroundColor: '#ffffff',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 20,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    emptyDescription: {
        fontSize: 14,
        lineHeight: 20,
        color: '#64748b',
    },
    emptyButton: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    emptyButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },
    listCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 40,
        marginBottom: 16,
        overflow: 'hidden',
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
    listCardImageWrap: {
        width: '100%',
        height: 180,
    },
    listCardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    listCardRating: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    listCardRatingText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0f172a',
    },
    listCardContent: {
        padding: 16,
    },
    listCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    listCardDesc: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 8,
    },
    listCardPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4361ee',
    },
    bookButton: {
        backgroundColor: '#0047FF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: '#0047FF',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0px 10px 20px rgba(0, 71, 255, 0.18)',
            },
            default: {},
        }),
    },
    bookButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    mapBottomCardContainer: {
        position: 'absolute',
        bottom: 0, 
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 24, 
        justifyContent: 'flex-end',
        zIndex: 20,
    },
    mapBottomCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 24,
            },
            android: {
                elevation: 10,
            },
            web: {
                boxShadow: '0px 18px 36px rgba(15, 23, 42, 0.12)',
            },
            default: {},
        }),
        overflow: 'hidden',
    },
    cardLayoutRow: {
        flexDirection: 'row',
        height: 160,
    },
    cardImageContainer: {
        width: 120,
        height: '100%',
        position: 'relative',
    },
    bottomCardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    favoriteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 32,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContentRight: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    bottomCardTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: -0.2,
        lineHeight: 20,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 71, 255, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
        marginLeft: 8,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0047FF',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 8,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardMetaText: {
        fontSize: 12,
        color: '#475569',
    },
    priceTierText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0047FF',
    },
    cardActionRow: {
        marginTop: 12,
    },
    selectPlaceBtn: {
        width: '100%',
        backgroundColor: '#0047FF',
        paddingVertical: 12,
        borderRadius: 40,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#0047FF',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0px 10px 20px rgba(0, 71, 255, 0.18)',
            },
            default: {},
        }),
    },
    selectPlaceBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    mapControls: {
        position: 'absolute',
        bottom: 240, 
        right: 16,
        zIndex: 10,
    },
    zoomControls: {
        backgroundColor: '#ffffff',
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0px 10px 20px rgba(15, 23, 42, 0.12)',
            },
            default: {},
        }),
        width: 48,
        alignItems: 'center',
    },
    mapControlBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 40,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
            web: {
                boxShadow: '0px 10px 20px rgba(15, 23, 42, 0.12)',
            },
            default: {},
        }),
    },
    mapControlDivider: {
        width: 24,
        height: 1,
        backgroundColor: '#e2e8f0',
    }
});
