import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantOrders, OrderResponse } from '../../lib/api';
import { colors } from '../../theme/colors';

export default function AdminOrdersScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadOrders = async () => {
        if (!user?.access) return;
        try {
            const data = await fetchMyRestaurantOrders(user.access);
            setOrders(data);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return '#10b981';
            case 'CANCELLED': return '#ef4444';
            case 'DRAFT': return '#64748b';
            default: return '#64748b';
        }
    };

    const renderOrderItem = ({ item }: { item: OrderResponse }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.userText}>Заказ от {item.user_name || 'Клиент'}</Text>
                    <Text style={styles.orderId}>
                        #{item.id} {item.reservation ? `• Бронь #${item.reservation}` : ''} • {new Date(item.created_at).toLocaleDateString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '10' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.itemsList}>
                {item.items.map((it, idx) => (
                    <View key={idx} style={styles.menuItemRow}>
                        <Text style={styles.itemQuantity}>{it.quantity}x</Text>
                        <Text style={styles.itemName} numberOfLines={1}>{it.menu_item_name}</Text>
                        <Text style={styles.itemPrice}>{parseInt(it.price_snapshot).toLocaleString()} ₸</Text>
                    </View>
                ))}
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.paymentInfo}>
                    <Text style={styles.paymentStatus}>Статус оплаты: {item.payment_status === 'PAID' ? 'Оплачено' : 'Не оплачено'}</Text>
                </View>
                <Text style={styles.totalAmount}>{parseInt(item.total_amount).toLocaleString()} ₸</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Управление заказами</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#4300FF" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="receipt-long" size={64} color={colors.border} />
                            <Text style={styles.emptyText}>Заказов пока нет</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f5f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    list: {
        padding: 16,
        gap: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    userText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    orderId: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    itemsList: {
        backgroundColor: '#f8fafc',
        borderRadius: 40,
        padding: 12,
        marginBottom: 12,
        gap: 8,
    },
    menuItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemQuantity: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4300FF',
        width: 25,
    },
    itemName: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
    },
    itemPrice: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentInfo: {
        flex: 1,
    },
    paymentStatus: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#4300FF',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        color: colors.textSecondary,
    },
});
