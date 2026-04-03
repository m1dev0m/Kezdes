import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../lib/auth-context';
import { fetchMyRestaurantBookings } from '../../lib/api';

export default function AdminMessagesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user?.access) initData();
    }, [user]);

    const initData = async () => {
        const token = user?.access;
        if (!token) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const books = await fetchMyRestaurantBookings(token);
            setConversations(Array.isArray(books) ? books : []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить сообщения.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => router.push({ pathname: '/chat', params: { id: item.id, name: item.user_name } })}
        >
            <View style={styles.avatarBox}>
                <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{item.user_name || 'Клиент'}</Text>
                    <Text style={styles.chatTime}>{item.date}</Text>
                </View>
                <View style={styles.chatFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        Запрос на {item.guests} гостя, {item.time ? item.time.substring(0, 5) : '--:--'}
                    </Text>
                    {item.status === 'confirmed' && (
                        <View style={styles.statusDot} />
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Сообщения</Text>
                <TouchableOpacity onPress={initData} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.muted} />
                            <Text style={styles.emptyText}>Пока нет сообщений</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    refreshBtn: { padding: 4 },
    list: { paddingHorizontal: 16, paddingBottom: 40 },
    chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    chatInfo: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    chatName: { fontSize: 16, fontWeight: '600', color: colors.text },
    chatTime: { fontSize: 12, color: colors.muted },
    chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMessage: { fontSize: 14, color: colors.textSecondary, flex: 1, marginRight: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { marginTop: 16, color: colors.muted, fontSize: 16 },
});
