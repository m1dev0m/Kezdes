import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fetchRestaurantDetail } from '../../lib/api';

const { width } = Dimensions.get('window');

const MENU_ITEMS = [
    { id: '1', name: 'Рибай стейк', price: '8 500 ₸', image: require('../../assets/images/menu_1.jpg') },
    { id: '2', name: 'Салат Цезарь', price: '4 200 ₸', image: require('../../assets/images/menu_2.jpg') },
    { id: '3', name: 'Паста Карбонара', price: '3 800 ₸', image: require('../../assets/images/menu_3.jpg') },
];

export default function RestaurantDetailScreen() {
    const params = useLocalSearchParams();
    const id = params.id;
    const router = useRouter();
    const [restaurant, setRestaurant] = React.useState<any>(null);

    React.useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const data = await fetchRestaurantDetail(id as string);
                setRestaurant(data);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, [id]);

    if (!restaurant) return <View style={styles.container} />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={styles.headerOverlay}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
                        <MaterialIcons name="share" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
                        <MaterialIcons name="favorite-border" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.coverWrapper}>
                    <Image source={restaurant.image_url ? { uri: restaurant.image_url } : require('../../assets/images/rest_bg.jpg')} style={styles.coverImage} />
                    <View style={styles.gradientOverlay} />
                </View>

                <View style={styles.infoWrapper}>
                    <View style={styles.infoCard}>
                        <View style={styles.titleRow}>
                            <Text style={styles.restaurantName}>{restaurant.name}</Text>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>Открыто</Text>
                            </View>
                        </View>

                        <View style={styles.locationRow}>
                            <MaterialIcons name="location-on" size={18} color={colors.primary} />
                            <Text style={styles.locationText}>{restaurant.address}</Text>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Вместимость</Text>
                                <Text style={styles.statValue}>до {restaurant.capacity} чел.</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Оценка</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialIcons name="star" size={16} color="#FBBF24" />
                                    <Text style={styles.statValue}>{restaurant.average_rating ? Number(restaurant.average_rating).toFixed(1) : 'Новый'}</Text>
                                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>({restaurant.reviews_count || 0})</Text>
                                </View>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Средний чек</Text>
                                <Text style={styles.statValue}>{restaurant.average_price?.toLocaleString() || '15 000'} ₸</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>О заведении</Text>
                    <Text style={styles.descriptionText}>
                        {restaurant.description || 'Идеальное место для проведения деловых встреч и корпоративных ужинов.'}
                    </Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Отзывы ({restaurant.reviews_count || 0})</Text>
                        <TouchableOpacity
                            style={styles.seeAllBtn}
                            activeOpacity={0.8}
                            onPress={() => router.push(`/restaurant/${restaurant.id}/reviews/new`)}
                        >
                            <Text style={styles.seeAllText}>Написать отзыв</Text>
                            <MaterialIcons name="rate-review" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.menuSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Меню</Text>
                        <TouchableOpacity
                            style={styles.seeAllBtn}
                            activeOpacity={0.8}
                            onPress={() =>
                                router.push({
                                    pathname: '/menu',
                                    params: { restaurantId: restaurant.id, restaurantName: restaurant.name },
                                })
                            }
                        >
                            <Text style={styles.seeAllText}>Смотреть все</Text>
                            <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuScroll}>
                        {MENU_ITEMS.map((item) => (
                            <View key={item.id} style={styles.menuItem}>
                                <View style={styles.menuItemImageWrap}>
                                    <Image source={item.image} style={styles.menuItemImage} />
                                </View>
                                <View style={styles.menuItemInfo}>
                                    <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.menuItemPrice}>{item.price}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Расположение</Text>
                    <View style={styles.mapContainer}>
                        <Image source={require('../../assets/images/map_bg.jpg')} style={styles.mapImage} />
                        <View style={styles.mapOverlay}>
                            <View style={styles.pinWrapper}>
                                <View style={styles.pinMarker}>
                                    <MaterialIcons name="location-on" size={24} color="#fff" />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomCTA}>
                <View style={styles.bottomRow}>
                    <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        activeOpacity={0.9}
                        onPress={() =>
                            router.push({
                                pathname: '/menu',
                                params: { restaurantId: restaurant.id, restaurantName: restaurant.name },
                            })
                        }
                    >
                        <MaterialIcons name="restaurant-menu" size={20} color={colors.primary} />
                        <Text style={styles.secondaryActionText}>Предзаказ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bookActionBtn}
                        activeOpacity={0.9}
                        onPress={() => {
                            const hasWizardData = params.date || params.eventType;
                            if (hasWizardData) {
                                router.push({
                                    pathname: '/review',
                                    params: {
                                        restaurantId: restaurant.id,
                                        restaurantName: restaurant.name,
                                        date: params.date,
                                        time: params.time,
                                        guests: params.guests,
                                        budget: params.budget,
                                        eventType: params.eventType,
                                    },
                                });
                            } else {
                                router.push({
                                    pathname: '/wizard',
                                    params: {
                                        restaurantId: restaurant.id,
                                        restaurantName: restaurant.name,
                                    },
                                });
                            }
                        }}
                    >
                        <MaterialIcons name="check-circle-outline" size={20} color="#fff" />
                        <Text style={styles.bookActionText}>Забронировать</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 48, // Safe area approx
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)', // Simulating bg-white/80 backdrop-blur
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    scrollContent: {
        paddingBottom: 120, // Space for bottom CTA
    },
    coverWrapper: {
        height: 288, // h-72 = 18rem = 288px
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 96,
        backgroundColor: 'rgba(0,0,0,0.4)', // Simplified gradient simulation
    },
    infoWrapper: {
        paddingHorizontal: 20,
        marginTop: -24, // -mt-6
        zIndex: 20,
    },
    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    restaurantName: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
        letterSpacing: -0.5,
    },
    statusBadge: {
        backgroundColor: '#DCFCE7', // green-100
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        color: '#16A34A', // green-600
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    locationText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'rgba(19,127,236,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(19,127,236,0.1)',
        borderRadius: 8,
        padding: 12,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(19,127,236,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    descriptionText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    menuSection: {
        marginTop: 32,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    menuScroll: {
        paddingHorizontal: 20,
        gap: 16,
    },
    menuItem: {
        width: 160,
        gap: 8,
        marginRight: 16,
    },
    menuItemImageWrap: {
        width: '100%',
        aspectRatio: 4 / 5,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.border,
    },
    menuItemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    menuItemInfo: {
        paddingHorizontal: 2,
    },
    menuItemName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    menuItemPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    mapContainer: {
        width: '100%',
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.border,
        position: 'relative',
    },
    mapImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        opacity: 0.8,
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    pinMarker: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 32, // Safe area + padding
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    bottomRow: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryActionBtn: {
        width: 124,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    secondaryActionText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '800',
    },
    bookActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    bookActionText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
});
