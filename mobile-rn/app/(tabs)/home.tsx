import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
    StatusBar,
    TextInput,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

import { fetchRestaurants } from '../../lib/api';
import { Logo } from '../../components/ui/Logo';

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

export default function SearchScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

    React.useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchRestaurants();
                const list = Array.isArray(data) ? data : ((data as any)?.results || []);
                setRestaurants(list);
            } catch (error) {
                console.error('Failed to fetch restaurants:', error);
            }
        };
        load();
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={false} />

            <View style={styles.headerTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Logo />
                </View>
                <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
                    <Ionicons name="notifications-outline" size={24} color="#94a3b8" />
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
                    />
                    <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
                        <Ionicons name="options" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll} style={styles.chipsContainer}>
                <TouchableOpacity style={styles.chip}>
                    <Ionicons name="people" size={16} color={colors.primary} />
                    <Text style={styles.chipText}>Вместимость</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip}>
                    <MaterialIcons name="payments" size={16} color={colors.primary} />
                    <Text style={styles.chipText}>Средний чек</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.chip}>
                    <Ionicons name="restaurant" size={16} color={colors.primary} />
                    <Text style={styles.chipText}>Кухня</Text>
                </TouchableOpacity>
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/wizard')} style={styles.bannerContainer}>
                    <LinearGradient
                        colors={['#0047FF', '#0033CC']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.bannerGradient}
                    >
                        <View style={styles.bannerLeft}>
                            <Text style={styles.bannerTitle}>Организовать{'\n'}событие</Text>
                            <View style={styles.bannerBtn}>
                                <Text style={styles.bannerBtnText}>Организовать событие</Text>
                            </View>
                        </View>
                        <View style={styles.bannerRight}>
                            <MaterialIcons name="event" size={64} color="rgba(255,255,255,0.9)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>РЕКОМЕНДУЕМЫЕ МЕСТА</Text>
                    <TouchableOpacity activeOpacity={0.7}>
                        <Text style={styles.seeAllText}>Все</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.venuesList}>
                    {restaurants
                        .filter(item =>
                            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.address.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((item) => (
                            <View key={item.id} style={styles.venueCard}>
                                <ImageBackground
                                    source={item.image_url ? { uri: item.image_url } : require('../../assets/images/featured_1.jpg')}
                                    style={styles.venueImage}
                                    imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, resizeMode: 'cover' }}
                                >
                                    <View style={styles.ratingBadge}>
                                        <MaterialIcons name="star" size={14} color="#f59e0b" style={{ marginRight: 2 }} />
                                        <Text style={styles.ratingText}>4.9</Text>
                                    </View>
                                </ImageBackground>

                                <View style={styles.venueDetails}>
                                    <Text style={styles.venueName}>{item.name}</Text>
                                    <Text style={styles.venueSubtitle} numberOfLines={1}>{item.address}</Text>

                                    <View style={styles.venueSpecs}>
                                        <View style={styles.specItem}>
                                            <MaterialIcons name="groups" size={18} color="#4361ee" />
                                            <Text style={styles.specText}>До {item.capacity || '?'} чел.</Text>
                                        </View>
                                        {item.average_price ? (
                                            <View style={styles.specItem}>
                                                <MaterialIcons name="payments" size={18} color="#4361ee" />
                                                <Text style={styles.specText}>{Number(item.average_price).toLocaleString('ru-RU')} ₸</Text>
                                            </View>
                                        ) : null}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.bookButton}
                                        activeOpacity={0.8}
                                        onPress={() => router.push(`/restaurant/${item.id}`)}
                                    >
                                        <Text style={styles.bookButtonText}>Смотреть заведение</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Pure White Minimalist
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
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#ffffff',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        height: 52, // adjust height slightly for inputs if needed, or keep 44. User said 52 for buttons. Let's make it 44 but radius 14.
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
    bannerContainer: {
        marginBottom: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
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
        backgroundColor: '#0047FF', // Deep Blue CTA
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
