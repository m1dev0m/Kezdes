import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { confirmOrder, createDraftOrder, fetchRestaurantMenu, OrderPaymentMode, PublicMenuItem, setOrderItem } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useRestaurantCart } from '../lib/useRestaurantCart';
import { money } from '../lib/utils';

export default function CheckoutScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const restaurantId = params.restaurantId as string | undefined;
    const restaurantName = (params.restaurantName as string) || 'Оформление';

    const { user } = useAuth();
    const cart = useRestaurantCart(restaurantId);

    const [menuItems, setMenuItems] = useState<Map<number, PublicMenuItem>>(new Map());
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMode, setPaymentMode] = useState<OrderPaymentMode>('pay_later');

    useEffect(() => {
        if (!restaurantId) return;
        let cancelled = false;
        setLoading(true);
        fetchRestaurantMenu(restaurantId)
            .then((data) => {
                if (cancelled) return;
                const m = new Map<number, PublicMenuItem>();
                for (const c of data.categories) for (const it of c.items) m.set(it.id, it);
                for (const it of data.uncategorized_items) m.set(it.id, it);
                setMenuItems(m);
            })
            .catch(() => Alert.alert('Ошибка', 'Не удалось обновить меню.'))
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [restaurantId]);

    const cartLines = useMemo(() => {
        return Object.entries(cart.items)
            .map(([idStr, qty]) => {
                const id = Number(idStr);
                const it = menuItems.get(id);
                return { id, qty, item: it };
            })
            .filter((x) => x.qty > 0);
    }, [cart.items, menuItems]);

    const hasUnavailable = useMemo(() => {
        return cartLines.some((l) => !l.item || !l.item.is_available);
    }, [cartLines]);

    const total = useMemo(() => {
        return cartLines.reduce((sum, l) => {
            const p = l.item ? Number(l.item.price) : 0;
            if (!Number.isFinite(p)) return sum;
            return sum + p * l.qty;
        }, 0);
    }, [cartLines]);

    const handleProceed = async () => {
        if (!restaurantId) return;
        if (!user?.access) {
            Alert.alert('Вход', 'Чтобы оформить предзаказ, нужно войти в аккаунт.');
            router.push('/auth/login');
            return;
        }
        if (cart.totalCount === 0) return;
        if (hasUnavailable) {
            Alert.alert('Некоторые блюда недоступны', 'Удалите недоступные блюда из корзины, чтобы продолжить.');
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const rid = Number(restaurantId);
            const draft = await createDraftOrder(rid, user.access);

            for (const line of cartLines) {
                if (!line.item) continue;
                await setOrderItem(draft.id, line.item.id, line.qty, user.access);
            }

            const confirmed = await confirmOrder(draft.id, paymentMode, user.access);

            if (confirmed.price_changes && confirmed.price_changes.length) {
                Alert.alert('Цены обновились', 'Некоторые цены изменились перед подтверждением. Итог пересчитан.');
            }

            await cart.reset();

            router.push({
                pathname: '/wizard',
                params: {
                    restaurantId,
                    restaurantName,
                    orderId: String(confirmed.id),
                    payAtRestaurant: paymentMode === 'pay_later' ? 'true' : 'false',
                },
            });
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : 'Не удалось оформить предзаказ';
            Alert.alert('Ошибка', msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
                <View style={styles.iconBtn} />
            </View>

            {loading || !cart.isHydrated ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.sectionTitle}>Корзина</Text>

                    {cartLines.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <MaterialIcons name="shopping-bag" size={40} color={colors.border} />
                            <Text style={styles.emptyTitle}>Корзина пустая</Text>
                            <Text style={styles.emptyText}>Добавьте блюда в меню, чтобы оформить предзаказ.</Text>
                        </View>
                    ) : (
                        <View style={styles.cartList}>
                            {cartLines.map((l) => {
                                const it = l.item;
                                const unavailable = !it || !it.is_available;
                                return (
                                    <View key={l.id} style={[styles.cartItem, unavailable && { opacity: 0.6 }]}>
                                        {it?.image ? (
                                            <Image source={{ uri: it.image }} style={styles.cartImg} />
                                        ) : (
                                            <View style={[styles.cartImg, styles.cartImgPlaceholder]}>
                                                <MaterialIcons name="restaurant" size={20} color={colors.muted} />
                                            </View>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cartName} numberOfLines={2}>{it?.name || 'Блюдо'}</Text>
                                            <Text style={styles.cartMeta}>
                                                {money(it?.price || 0)} • x{l.qty}
                                                {unavailable ? ' • недоступно' : ''}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeBtn}
                                            activeOpacity={0.8}
                                            onPress={() => cart.setQuantity(l.id, 0)}
                                        >
                                            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Оплата</Text>
                    <View style={styles.payRow}>
                        <TouchableOpacity
                            style={[styles.payBtn, paymentMode === 'pay_later' && styles.payBtnActive]}
                            activeOpacity={0.85}
                            onPress={() => setPaymentMode('pay_later')}
                        >
                            <Text style={[styles.payText, paymentMode === 'pay_later' && styles.payTextActive]}>Оплатить позже</Text>
                            <Text style={[styles.paySub, paymentMode === 'pay_later' && styles.paySubActive]}>В ресторане</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.payBtn, paymentMode === 'pay_now' && styles.payBtnActive]}
                            activeOpacity={0.85}
                            onPress={() => setPaymentMode('pay_now')}
                        >
                            <Text style={[styles.payText, paymentMode === 'pay_now' && styles.payTextActive]}>Оплатить сейчас</Text>
                            <Text style={[styles.paySub, paymentMode === 'pay_now' && styles.paySubActive]}>Онлайн</Text>
                        </TouchableOpacity>
                    </View>

                    {hasUnavailable ? (
                        <View style={styles.warnBox}>
                            <MaterialIcons name="warning" size={18} color="#ef4444" />
                            <Text style={styles.warnText}>
                                В корзине есть недоступные блюда — удалите их, чтобы продолжить.
                            </Text>
                        </View>
                    ) : null}

                    <View style={{ height: 32 }} />
                </ScrollView>
            )}

            <View style={styles.bottomBar}>
                <View>
                    <Text style={styles.totalLabel}>Итого</Text>
                    <Text style={styles.totalValue}>{money(total)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.primaryBtn, (cart.totalCount === 0 || hasUnavailable || isSubmitting) && styles.primaryBtnDisabled]}
                    activeOpacity={0.9}
                    disabled={cart.totalCount === 0 || hasUnavailable || isSubmitting}
                    onPress={handleProceed}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryBtnText}>К бронированию</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
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
    content: { padding: 16, paddingBottom: 140 },

    sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 12 },
    emptyBox: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 20, alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
    emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 16 },

    cartList: { gap: 10 },
    cartItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 32, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
    cartImg: { width: 54, height: 54, borderRadius: 40, backgroundColor: colors.surface },
    cartImgPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    cartName: { fontSize: 13, fontWeight: '900', color: colors.text },
    cartMeta: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
    removeBtn: { width: 34, height: 34, borderRadius: 40, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

    payRow: { flexDirection: 'row', gap: 10 },
    payBtn: { flex: 1, borderRadius: 32, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14 },
    payBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
    payText: { fontSize: 13, fontWeight: '900', color: colors.text },
    payTextActive: { color: colors.primary },
    paySub: { fontSize: 12, marginTop: 6, color: colors.textSecondary, fontWeight: '600' },
    paySubActive: { color: colors.primary },

    warnBox: { marginTop: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 40, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
    warnText: { flex: 1, fontSize: 12, color: '#991b1b', fontWeight: '700', lineHeight: 16 },

    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    totalLabel: { fontSize: 12, color: colors.muted, fontWeight: '700' },
    totalValue: { fontSize: 16, color: colors.text, fontWeight: '900', marginTop: 2 },
    primaryBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 32, alignItems: 'center', justifyContent: 'center', minWidth: 160 },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

