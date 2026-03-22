import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../lib/auth-context';
import { API_BASE_URL } from '../lib/api';

export default function ChatScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const bookingId = params.id as string;
    const name = params.name as string || 'Chat';

    const fetchMessages = async () => {
        if (!user?.access || !bookingId) return;
        try {
            const url = `${API_BASE_URL}/chat/messages/?booking=${bookingId}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 500); // Faster polling for real-time feel
        return () => clearInterval(interval);
    }, [bookingId, user]);

    const handleSend = async () => {
        if (!message.trim() || !user?.access || !bookingId) return;
        const optimisticMsg = {
            id: Date.now().toString(),
            content: message.trim(),
            timestamp: new Date().toISOString(),
            sender_username: user.username,
            isOptimistic: true,
        };
        setMessages(prev => [...prev, optimisticMsg]);
        const currentMsg = message;
        setMessage('');

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
                    <Text style={styles.headerStatus}>В сети (Booking #{bookingId})</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn}>
                    <Ionicons name="call-outline" size={20} color={colors.text} />
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
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
                        {sending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="send" size={20} color="#fff" />}
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
});
