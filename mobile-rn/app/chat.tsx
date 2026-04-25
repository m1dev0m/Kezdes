import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../lib/auth-context';
import { API_BASE_URL } from '../lib/api';
import { useFocusEffect } from '@react-navigation/native';

export default function ChatScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const shouldAutoScrollRef = useRef(true);

    const bookingId = params.id as string;
    const name = params.name as string || 'Chat';

    const markRead = useCallback(async () => {
        if (!user?.access || !bookingId) return;
        try {
            await fetch(`${API_BASE_URL}/chat/messages/mark_read/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.access}`
                },
                body: JSON.stringify({ booking: bookingId })
            });
        } catch {
            
        }
    }, [bookingId, user?.access]);

    const fetchMessages = useCallback(async (silent = false) => {
        if (!user?.access || !bookingId) return;
        try {
            if (!silent) setRefreshing(true);
            setError(null);
            const url = `${API_BASE_URL}/chat/messages/?booking=${bookingId}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            if (res.ok) {
                const data = await res.json();
                const payload = Array.isArray(data) ? data : (data?.results || []);
                setMessages(payload);
                void markRead();
            } else {
                setError('Не удалось загрузить сообщения');
            }
        } catch (err) {
            setError('Не удалось загрузить сообщения');
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    }, [bookingId, markRead, user?.access]);

    useEffect(() => {
        void fetchMessages();
        const interval = setInterval(() => {
            void fetchMessages(true);
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useFocusEffect(
        useCallback(() => {
            void fetchMessages(true);
            void markRead();
            return () => {};
        }, [fetchMessages, markRead])
    );

    const handleSend = async () => {
        if (!message.trim() || !user?.access || !bookingId) return;
        const optimisticMsg = {
            id: Date.now().toString(),
            content: message.trim(),
            timestamp: new Date().toISOString(),
            sender_username: user.username,
            isOptimistic: true,
        };
        shouldAutoScrollRef.current = true;
        setMessages(prev => [...prev, optimisticMsg]);
        const currentMsg = message;
        setMessage('');
        setSending(true);

        try {
            const res = await fetch(`${API_BASE_URL}/chat/messages/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.access}`
                },
                body: JSON.stringify({
                    booking: bookingId,
                    content: currentMsg.trim()
                })
            });
            if (res.ok) {
                fetchMessages();
            } else {
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                setMessage(currentMsg);
                Alert.alert('Ошибка', 'Не удалось отправить сообщение');
            }
        } catch (err) {
            console.error('Error sending message:', err);
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setMessage(currentMsg);
            Alert.alert('Ошибка', 'Не удалось отправить сообщение');
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.sender === user?.id || item.sender_username === user?.username;
        return (
            <View style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
                <View style={[styles.msgBubble, isMe ? styles.bubbleUser : styles.bubbleOther]}>
                    <Text style={[styles.msgText, isMe ? styles.textUser : styles.textOther]}>{item.content}</Text>
                    <Text style={[styles.msgTime, isMe ? styles.timeUser : styles.timeOther]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{name}</Text>
                    <Text style={styles.headerStatus}>Чат по брони #{bookingId}</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={() => void fetchMessages(true)}>
                    <Ionicons name="refresh" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        onScroll={({ nativeEvent }) => {
                            const distanceFromBottom =
                                nativeEvent.contentSize.height - (nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height);
                            shouldAutoScrollRef.current = distanceFromBottom < 80;
                        }}
                        scrollEventThrottle={16}
                        onContentSizeChange={() => {
                            if (shouldAutoScrollRef.current) {
                                flatListRef.current?.scrollToEnd({ animated: true });
                            }
                        }}
                        refreshing={refreshing}
                        onRefresh={() => void fetchMessages(true)}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="chatbubble-ellipses-outline" size={42} color={colors.muted} />
                                <Text style={styles.emptyTitle}>{error ? 'Ошибка загрузки' : 'Сообщений пока нет'}</Text>
                                <Text style={styles.emptyText}>{error || 'Напишите первым, чтобы открыть диалог по этой брони.'}</Text>
                            </View>
                        }
                    />
                )}

                <View style={styles.inputArea}>
                    <TouchableOpacity style={styles.attachBtn}>
                        <Ionicons name="add" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Написать сообщение..."
                        value={message}
                        onChangeText={setMessage}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!message.trim() || sending) && { opacity: 0.5 }]}
                        onPress={handleSend}
                        disabled={!message.trim() || sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, marginLeft: 8 },
    headerName: { fontSize: 16, fontWeight: '700', color: colors.text },
    headerStatus: { fontSize: 12, color: colors.primary },
    list: { padding: 16, gap: 12 },
    msgWrapper: { width: '100%', flexDirection: 'row' },
    msgLeft: { justifyContent: 'flex-start' },
    msgRight: { justifyContent: 'flex-end' },
    msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 32 },
    bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
    msgText: { fontSize: 15, lineHeight: 20 },
    textUser: { color: '#fff' },
    textOther: { color: colors.text },
    msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: colors.muted },
    inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
    attachBtn: { width: 40, height: 40, borderRadius: 32, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
    input: { flex: 1, backgroundColor: colors.surface, borderRadius: 32, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 15 },
    sendBtn: { width: 40, height: 40, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: colors.text },
    emptyText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' },
});
