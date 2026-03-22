import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const MOCK_CHATS = [
    { id: '1', name: 'hhal', lastMessage: 'Ваша бронь подтверждена!', time: '12:45', unread: 1, avatar: null },
    { id: '2', name: 'Sky Lounge', lastMessage: 'Будем ждать вас!', time: 'Вчера', unread: 0, avatar: null },
];

export default function MessagesScreen() {
    const router = useRouter();

    const renderChat = ({ item }: { item: typeof MOCK_CHATS[0] }) => (
        <TouchableOpacity
            style={styles.chatCard}
            onPress={() => router.push({ pathname: '/chat', params: { id: item.id, name: item.name } })}
        >
            <View style={styles.avatarBox}>
                <Ionicons name="restaurant" size={24} color={colors.primary} />
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    <Text style={styles.chatTime}>{item.time}</Text>
                </View>
                <View style={styles.chatFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
                    {item.unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Сообщения</Text>
            </View>
            <FlatList
                data={MOCK_CHATS}
                renderItem={renderChat}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={64} color={colors.muted} />
                        <Text style={styles.emptyText}>У вас пока нет переписок</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
    list: { padding: 16 },
    chatCard: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    chatInfo: { flex: 1, justifyContent: 'center' },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    chatName: { fontSize: 16, fontWeight: '600', color: colors.text },
    chatTime: { fontSize: 12, color: colors.muted },
    chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMessage: { fontSize: 14, color: colors.textSecondary, flex: 1, marginRight: 8 },
    unreadBadge: { backgroundColor: colors.primary, width: 20, height: 20, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    empty: { marginTop: 100, alignItems: 'center' },
    emptyText: { marginTop: 16, color: colors.muted, fontSize: 16 },
});
