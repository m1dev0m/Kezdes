import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    SectionList,
    Image,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { fetchRestaurantMenu, PublicMenuItem, RestaurantMenuResponse } from '../lib/api';
import { useRestaurantCart } from '../lib/useRestaurantCart';
import { money } from '../lib/utils';

type MenuSection = {
    id: number | 'uncategorized';
    title: string;
    data: PublicMenuItem[];
};

export default function MenuScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const restaurantId = params.restaurantId as string | undefined;
    const restaurantName = (params.restaurantName as string) || 'Меню';

    const listRef = useRef<SectionList<PublicMenuItem, MenuSection>>(null);
    const [menu, setMenu] = useState<RestaurantMenuResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState<MenuSection['id']>('uncategorized');

    const cart = useRestaurantCart(restaurantId);

    React.useEffect(() => {
        if (!restaurantId) return;
        let cancelled = false;
        setLoading(true);
        fetchRestaurantMenu(restaurantId)
            .then((data) => {
                if (cancelled) return;
                setMenu(data);
                const firstCat = data.categories[0]?.id;
                setActiveSectionId(firstCat ?? (data.uncategorized_items.length ? 'uncategorized' : firstCat ?? 'uncategorized'));
            })
            .catch((e) => {
                if (__DEV__) console.warn(e);
                Alert.alert('Ошибка', 'Не удалось загрузить меню.');
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [restaurantId]);

    const sections: MenuSection[] = useMemo(() => {
        if (!menu) return [];
        const out: MenuSection[] = menu.categories.map((c) => ({
            id: c.id,
            title: c.name,
            data: c.items,
        }));
        if (menu.uncategorized_items.length) {
            out.push({ id: 'uncategorized', title: 'Другое', data: menu.uncategorized_items });
        }
        return out;
    }, [menu]);

    const totalSum = useMemo(() => {
        if (!menu) return 0;
        const itemMap = new Map<number, PublicMenuItem>();
        for (const s of sections) for (const it of s.data) itemMap.set(it.id, it);
        return Object.entries(cart.items).reduce((sum, [idStr, q]) => {
            const it = itemMap.get(Number(idStr));
            if (!it) return sum;
            const price = Number(it.price);
            if (!Number.isFinite(price)) return sum;
            return sum + price * (q || 0);
        }, 0);
    }, [cart.items, menu, sections]);

    const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
        const first = viewableItems?.find((v: any) => v.section)?.section as MenuSection | undefined;
        if (!first) return;
        setActiveSectionId(first.id);
    });

    const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 50 });

    const scrollToSection = (sectionId: MenuSection['id']) => {
        const idx = sections.findIndex((s) => s.id === sectionId);
        if (idx < 0) return;
        listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true, viewPosition: 0 });
    };

    if (loading || !menu) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
                    <View style={styles.iconBtn} />
                </View>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
                <View style={styles.iconBtn} />
            </View>

            <View style={styles.categoryBar}>
                <SectionList
                    ref={listRef}
                    sections={sections}
                    keyExtractor={(item) => String(item.id)}
                    stickySectionHeadersEnabled={true}
                    contentContainerStyle={{ paddingBottom: cart.totalCount > 0 ? 120 : 24 }}
                    renderSectionHeader={({ section }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{section.title}</Text>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        const qty = cart.items[String(item.id)] || 0;
                        const disabled = !item.is_available;
                        return (
                            <View style={styles.itemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemName, disabled && { color: colors.muted }]} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                    {item.description ? (
                                        <Text style={[styles.itemDesc, disabled && { color: colors.muted }]} numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                    ) : null}
                                    <View style={styles.itemMetaRow}>
                                        <Text style={[styles.itemPrice, disabled && { color: colors.muted }]}>{money(item.price)}</Text>
                                        {item.preparation_time ? (
                                            <Text style={styles.itemPrep}>• {item.preparation_time} мин</Text>
                                        ) : null}
                                        {!item.is_available ? <Text style={styles.badgeUnavailable}>Недоступно</Text> : null}
                                    </View>
                                </View>

                                {item.image ? (
                                    <Image source={{ uri: item.image }} style={[styles.itemImage, disabled && { opacity: 0.5 }]} />
                                ) : (
                                    <View style={[styles.itemImage, styles.itemImagePlaceholder, disabled && { opacity: 0.5 }]}>
                                        <MaterialIcons name="restaurant" size={22} color={colors.muted} />
                                    </View>
                                )}

                                <View style={styles.stepper}>
                                    <TouchableOpacity
                                        style={[styles.stepBtn, qty === 0 && styles.stepBtnDisabled]}
                                        activeOpacity={0.8}
                                        disabled={qty === 0}
                                        onPress={() => cart.decrement(item.id)}
                                    >
                                        <MaterialIcons name="remove" size={18} color={qty === 0 ? colors.muted : colors.text} />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{qty}</Text>
                                    <TouchableOpacity
                                        style={[styles.stepBtn, disabled && styles.stepBtnDisabled]}
                                        activeOpacity={0.8}
                                        disabled={disabled}
                                        onPress={() => cart.increment(item.id)}
                                    >
                                        <MaterialIcons name="add" size={18} color={disabled ? colors.muted : colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                    onViewableItemsChanged={onViewableItemsChanged.current}
                    viewabilityConfig={viewabilityConfig.current}
                    ListHeaderComponent={() => (
                        <View style={styles.categoryScroll}>
                            <SectionTabs
                                sections={sections}
                                activeId={activeSectionId}
                                onPress={(id) => {
                                    setActiveSectionId(id);
                                    scrollToSection(id);
                                }}
                            />
                        </View>
                    )}
                />
            </View>

            {cart.totalCount > 0 ? (
                <View style={styles.cartBar}>
                    <TouchableOpacity
                        style={styles.cartBarBtn}
                        activeOpacity={0.9}
                        onPress={() =>
                            router.push({
                                pathname: '/checkout',
                                params: { restaurantId, restaurantName },
                            })
                        }
                    >
                        <View style={styles.cartLeft}>
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{cart.totalCount}</Text>
                            </View>
                            <Text style={styles.cartText}>Корзина</Text>
                        </View>
                        <Text style={styles.cartSum}>{money(totalSum)}</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </SafeAreaView>
    );
}

function SectionTabs({
    sections,
    activeId,
    onPress,
}: {
    sections: MenuSection[];
    activeId: MenuSection['id'];
    onPress: (id: MenuSection['id']) => void;
}) {
    return (
        <SectionTabsScroller>
            <View style={styles.tabsRow}>
                {sections.map((s) => {
                    const active = s.id === activeId;
                    return (
                        <TouchableOpacity
                            key={String(s.id)}
                            style={[styles.tab, active ? styles.tabActive : null]}
                            activeOpacity={0.8}
                            onPress={() => onPress(s.id)}
                        >
                            <Text style={[styles.tabText, active ? styles.tabTextActive : null]} numberOfLines={1}>
                                {s.title}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </SectionTabsScroller>
    );
}

function SectionTabsScroller({ children }: { children: React.ReactNode }) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {children}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: '#fff',
    },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    categoryBar: { flex: 1 },
    categoryScroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff' },
    tabsRow: { flexDirection: 'row', gap: 8, paddingRight: 12 },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: '#fff' },

    sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff' },
    sectionHeaderText: { fontSize: 14, fontWeight: '900', color: colors.text, letterSpacing: 0.2 },

    itemRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        backgroundColor: '#fff',
    },
    itemName: { fontSize: 15, fontWeight: '800', color: colors.text },
    itemDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
    itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
    itemPrice: { fontSize: 14, fontWeight: '900', color: colors.primary },
    itemPrep: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    badgeUnavailable: {
        marginLeft: 6,
        fontSize: 11,
        fontWeight: '800',
        color: '#ef4444',
    },
    itemImage: { width: 70, height: 70, borderRadius: 14, backgroundColor: colors.surface },
    itemImagePlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },

    stepper: { alignItems: 'center', justifyContent: 'center', gap: 6 },
    stepBtn: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBtnDisabled: { opacity: 0.45 },
    qtyText: { fontSize: 12, fontWeight: '900', color: colors.text, minWidth: 18, textAlign: 'center' },

    cartBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
    },
    cartBarBtn: {
        backgroundColor: '#0f172a',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
        elevation: 12,
    },
    cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cartBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    cartBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    cartText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    cartSum: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
