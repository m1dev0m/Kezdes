import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Venue, Contractor, generateVenues, generateContractors } from '../lib/mock-data';
import { fetchRestaurants } from '../lib/api';
import MapComponent from './MapComponent';

const { width, height } = Dimensions.get('window');

export default function ResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const eventType = params.eventType as string || 'wedding';
    const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
    const [selectedVenue, setSelectedVenue] = useState<any | null>(null);

    const [venues, setVenues] = useState<any[]>([]); // FIXME: replace any with Venue interface after API is stable
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const vData = await fetchRestaurants({ city: 'Алматы' });
                const list = Array.isArray(vData) ? vData : ((vData as any)?.results || vData || []);
                setVenues(Array.isArray(list) ? list : []);
            } catch (error) {
                const guestCountNum = parseInt(params.guests as string) || 100;
                const budgetNum = parseInt(params.budget as string) || 50000;
                const wizardState = {
                    eventType: eventType as any,
                    city: 'Алматы' as any,
                    guestCount: guestCountNum,
                    budget: budgetNum,
                    contractorTypes: [],
                };
                if (__DEV__) {
                    console.log("API failed, generating mock venues with: ", wizardState);
                }
                setVenues(generateVenues(wizardState));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [eventType]);

    const filteredVenues = venues.filter(v =>
        v.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        v.address?.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderVenueCard = (venue: any) => (
        <TouchableOpacity
            key={venue.id}
            style={styles.listCard}
            activeOpacity={0.9}
            onPress={() => router.push({
                pathname: '/restaurant/[id]',
                params: {
                    id: venue.id,
                    restaurantName: venue.name,
                    budget: params.budget,
                    guests: params.guests,
                    eventType: params.eventType,
                    date: params.date,
                    time: params.time
                }
            })}
        >
            <View style={styles.listCardImageWrap}>
                <Image source={venue.image_url ? { uri: venue.image_url } : require('../assets/images/featured_1.jpg')} style={styles.listCardImage} />
                <View style={styles.listCardRating}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.listCardRatingText}>{venue.rating}</Text>
                </View>
            </View>
            <View style={styles.listCardContent}>
                <Text style={styles.listCardTitle} numberOfLines={1}>{venue.name}</Text>
                <Text style={styles.listCardDesc}>{venue.address}</Text>
                <Text style={styles.listCardPrice}>{venue.average_price?.toLocaleString() || '15 000'} ₸</Text>
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
                            <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
                        </TouchableOpacity>
                        <Text style={styles.topNavTitle}>Поиск на карте</Text>
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

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity style={styles.filterChipActive}>
                            <Text style={styles.filterChipTextActive}>Вместимость</Text>
                            <MaterialIcons name="keyboard-arrow-down" size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.filterChip}>
                            <Text style={styles.filterChipText}>Рейтинг</Text>
                            <MaterialIcons name="keyboard-arrow-down" size={16} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.filterChip}>
                            <Text style={styles.filterChipText}>Кухня</Text>
                            <MaterialIcons name="keyboard-arrow-down" size={16} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.filterChip}>
                            <MaterialIcons name="tune" size={16} color="#64748b" />
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
                                <TouchableOpacity style={styles.favoriteButton}>
                                    <MaterialIcons name="favorite-border" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.cardContentRight}>
                                <View>
                                    <View style={styles.cardHeaderRow}>
                                        <Text style={styles.bottomCardTitle} numberOfLines={2}>{selectedVenue.name}</Text>
                                        <View style={styles.ratingBadge}>
                                            <MaterialIcons name="star" size={10} color={colors.primary} />
                                            <Text style={styles.ratingText}>{selectedVenue.rating || 4.8}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cardSubtitle}>Ресторан • До {selectedVenue.capacity || 150} чел.</Text>
                                    <View style={styles.cardMetaRow}>
                                        <MaterialIcons name="near-me" size={14} color="#64748b" />
                                        <Text style={styles.cardMetaText}>0.5 км</Text>
                                        <View style={{ flex: 1 }} />
                                        <Text style={styles.priceTierText}>₸₸₸</Text>
                                    </View>
                                </View>
                                <View style={styles.cardActionRow}>
                                    <TouchableOpacity
                                        style={styles.selectPlaceBtn}
                                        onPress={() => router.push({
                                            pathname: '/review',
                                            params: {
                                                restaurantId: selectedVenue.id,
                                                restaurantName: selectedVenue.name,
                                                budget: params.budget,
                                                guests: params.guests,
                                                eventType: params.eventType,
                                                date: params.date,
                                                time: params.time
                                            }
                                        })}
                                    >
                                        <Text style={styles.selectPlaceBtnText}>Выбрать это место</Text>
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
                    <TouchableOpacity style={[styles.mapControlBtn, { marginTop: 12, borderRadius: 24 }]}>
                        <MaterialIcons name="my-location" size={20} color="#0f172a" />
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
        borderRadius: 14,
        paddingHorizontal: 16,
        marginBottom: 12,
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
        borderRadius: 12,
        gap: 4,
    },
    filterChipActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0047FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 4,
        shadowColor: '#0047FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
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
        borderRadius: 14,
        padding: 4,
        height: 44,
    },
    segmentBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentBtnActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
    listCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
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
        borderRadius: 8,
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

    mapBottomCardContainer: {
        position: 'absolute',
        bottom: 0, // Adjusted to sit above tab bar if needed, or 0 since it might have safe area
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 24, // extra clearance
        justifyContent: 'flex-end',
        zIndex: 20,
    },
    mapBottomCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 10,
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
        borderRadius: 16,
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
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#0047FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    selectPlaceBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    mapControls: {
        position: 'absolute',
        bottom: 240, // above the bottom card
        right: 16,
        zIndex: 10,
    },
    zoomControls: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        width: 48,
        alignItems: 'center',
    },
    mapControlBtn: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    mapControlDivider: {
        width: 24,
        height: 1,
        backgroundColor: '#e2e8f0',
    }
});
