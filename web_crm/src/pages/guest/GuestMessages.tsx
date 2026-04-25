import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Search, Calendar, RefreshCw,
    MessageSquare, CheckCheck, X, Loader2, Bell, Info
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Message {
    id: number;
    content: string;
    timestamp: string;
    sender: number;
    sender_name: string;
    booking: number | null;
    restaurant: number | null;
    restaurant_name: string | null;
    is_read: boolean;
}

interface Conversation {
    id: string; 
    type: 'booking' | 'restaurant';
    targetId: number;
    restaurantId: number | null;
    title: string;
    subtitle?: string;
    lastMessage?: string;
    timestamp?: string;
    bookingDate?: string;
    bookingTime?: string;
    bookingGuests?: number;
    bookingStatus?: string;
}

type RealtimeChatMessage = {
    id: number;
    content: string;
    sender: number;
    sender_name?: string;
    timestamp: string;
    booking_id?: number | null;
    conversation_id?: number | null;
    restaurant_id?: number | null;
};

export default function GuestMessages() {
    const { user } = useAuth();
    const location = useLocation();
    const locationState = location.state as { bookingId?: number; restaurantId?: number } | null;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'recent' | 'archived'>('recent');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const archivedStatuses = new Set(['completed', 'cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'rejected', 'no_show']);
    const [conversationError, setConversationError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);
    const activeRestaurantId = selectedConv?.restaurantId ?? null;

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); 
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchData = async () => {
        try {
            setConversationError(null);
            setLoadingConvs(true);
            const [msgRes, bookRes] = await Promise.allSettled([
                api.get('/chat/messages/'),
                api.get('/bookings/')
            ]);

            const allMessages = msgRes.status === 'fulfilled'
                ? (Array.isArray(msgRes.value.data) ? msgRes.value.data : (msgRes.value.data.results || []))
                : [];
            const allBookings = bookRes.status === 'fulfilled'
                ? (Array.isArray(bookRes.value.data) ? bookRes.value.data : (bookRes.value.data.results || []))
                : [];

            if (msgRes.status === 'rejected' && bookRes.status === 'rejected') {
                throw new Error('Не удалось загрузить диалоги');
            }

            
            const convMap = new Map<string, Conversation>();

            
            allBookings.forEach((b: any) => {
                const id = `b-${b.id}`;
                convMap.set(id, {
                    id,
                    type: 'booking',
                    targetId: b.id,
                    restaurantId: b.restaurant ?? null,
                    title: b.restaurant_name,
                    subtitle: `Reservation #${b.id}`,
                    bookingDate: b.date,
                    bookingTime: b.time,
                    bookingGuests: b.guests,
                    bookingStatus: b.status,
                    timestamp: b.created_at
                });
            });

            
            allMessages.forEach((m: Message) => {
                const id = m.booking ? `b-${m.booking}` : `r-${m.restaurant}`;
                if (!convMap.has(id)) {
                    convMap.set(id, {
                        id,
                        type: m.booking ? 'booking' : 'restaurant',
                        targetId: (m.booking || m.restaurant) as number,
                        restaurantId: m.restaurant,
                        title: m.restaurant_name || 'Restaurant',
                        subtitle: m.booking ? `Reservation #${m.booking}` : 'Direct Message',
                        lastMessage: m.content,
                        timestamp: m.timestamp
                    });
                } else {
                    const conv = convMap.get(id)!;
                    if (!conv.timestamp || new Date(m.timestamp) > new Date(conv.timestamp)) {
                        conv.lastMessage = m.content;
                        conv.timestamp = m.timestamp;
                    }
                }
            });

            const sortedConvs = Array.from(convMap.values()).sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return timeB - timeA;
            });

            setConversations(sortedConvs);

            
            if (!selectedConv && locationState) {
                if (locationState.bookingId) {
                    const c = sortedConvs.find(cv => cv.id === `b-${locationState.bookingId}`);
                    if (c) setSelectedConv(c);
                } else if (locationState.restaurantId) {
                    const c = sortedConvs.find(cv => cv.id === `r-${locationState.restaurantId}`);
                    if (c) setSelectedConv(c);
                }
            }

            if (msgRes.status === 'rejected' || bookRes.status === 'rejected') {
                setConversationError('Часть переписок не загрузилась. Обновите страницу или повторите попытку.');
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
            setConversationError('Не удалось загрузить диалоги. Проверьте подключение и попробуйте снова.');
        } finally {
            setLoadingConvs(false);
        }
    };

    const fetchMessages = async (conv: Conversation) => {
        try {
            setMessageError(null);
            setLoadingMessages(true);
            const params = conv.type === 'booking' ? `booking=${conv.targetId}` : `restaurant=${conv.targetId}`;
            const res = await api.get(`/chat/messages/?${params}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setMessages(data);
        } catch (error) {
            console.error(error);
            setMessageError('Не удалось загрузить сообщения в этом диалоге.');
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleRealtimeMessage = useCallback((payload: RealtimeChatMessage) => {
        if (!payload?.restaurant_id || !activeRestaurantId || payload.restaurant_id !== activeRestaurantId) {
            return;
        }

        void fetchData();

        if (!selectedConv) {
            return;
        }

        const matchesSelectedConversation = selectedConv.type === 'booking'
            ? payload.booking_id === selectedConv.targetId
            : payload.restaurant_id === selectedConv.restaurantId;

        if (matchesSelectedConversation) {
            void fetchMessages(selectedConv);
        }
    }, [activeRestaurantId, fetchData, fetchMessages, selectedConv]);

    const { sendMessage: wsSend, isConnected } = useWebSocket({
        url: activeRestaurantId ? `ws/chat/${activeRestaurantId}/` : '',
        enabled: Boolean(activeRestaurantId),
        onMessage: handleRealtimeMessage,
    });

    useEffect(() => {
        if (selectedConv) {
            fetchMessages(selectedConv);
            if (pollRef.current) clearInterval(pollRef.current);
            if (!isConnected) {
                pollRef.current = setInterval(() => fetchMessages(selectedConv), 3000); 
            }
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isConnected, selectedConv]);

    const handleSend = async () => {
        if (!newMsg.trim() || !selectedConv) return;

        const toSend = newMsg.trim();
        const optimistic: Message = {
            id: Date.now(),
            content: toSend,
            timestamp: new Date().toISOString(),
            sender: user?.id ?? 0,
            sender_name: user?.username || '',
            booking: selectedConv.type === 'booking' ? selectedConv.targetId : null,
            restaurant: selectedConv.type === 'restaurant' ? selectedConv.targetId : null,
            restaurant_name: selectedConv.title,
            is_read: false,
        };

        if (!(isConnected && activeRestaurantId)) {
            setMessages(prev => [...prev, optimistic]);
        }
        setNewMsg('');
        setSending(true);

        try {
            if (isConnected && activeRestaurantId) {
                wsSend(
                    selectedConv.type === 'booking'
                        ? { message: toSend, booking_id: selectedConv.targetId }
                        : { message: toSend }
                );
            } else {
                const payload = selectedConv.type === 'booking'
                    ? { booking: selectedConv.targetId, content: toSend }
                    : { restaurant: selectedConv.targetId, content: toSend };

                await api.post('/chat/messages/', payload);
                await fetchMessages(selectedConv);
            }
        } catch {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setNewMsg(toSend);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const filteredConvs = conversations.filter((c) => {
        const haystack = `${c.title} ${c.subtitle || ''} ${c.lastMessage || ''}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search.toLowerCase());
        const isArchived = c.type === 'booking' && archivedStatuses.has(c.bookingStatus || '');
        const matchesTab = activeTab === 'archived' ? isArchived : !isArchived;
        return matchesSearch && matchesTab;
    });

    return (
        <div className="mx-auto max-w-[1280px] px-6 py-4 h-[calc(100vh-100px)] flex flex-col">
            <main className="flex-1 flex flex-col overflow-hidden border border-slate-200 rounded-3xl bg-white shadow-xl shadow-slate-200/50">
                <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1d4ed8]">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-none">Сообщения</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-none">Центр поддержки и чат с ресторанами</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#1d4ed8]/20"
                                placeholder="Поиск диалогов..."
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg" aria-label="Notifications">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-[#1d4ed8] rounded-full border-2 border-white" />
                            </button>
                            <div className="w-8 h-8 rounded-full bg-blue-50 overflow-hidden border border-slate-200 flex items-center justify-center text-[#1d4ed8] font-bold text-xs">
                                {(user?.username?.[0] || 'G').toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <section className="w-80 border-r border-slate-200 flex flex-col bg-white">
                        {conversationError && (
                            <div className="m-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                                <div className="flex items-start justify-between gap-3">
                                    <span>{conversationError}</span>
                                    <button type="button" onClick={fetchData} className="font-bold uppercase tracking-widest text-[#1d4ed8] shrink-0">
                                        Повторить
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex border-b border-slate-100">
                            <button
                                type="button"
                                onClick={() => setActiveTab('recent')}
                                className={
                                    activeTab === 'recent'
                                        ? 'flex-1 py-4 text-xs font-bold border-b-2 border-[#1d4ed8] text-[#1d4ed8] uppercase tracking-widest'
                                        : 'flex-1 py-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest'
                                }
                            >
                                Последние
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('archived')}
                                className={
                                    activeTab === 'archived'
                                        ? 'flex-1 py-4 text-xs font-bold border-b-2 border-[#1d4ed8] text-[#1d4ed8] uppercase tracking-widest'
                                        : 'flex-1 py-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest'
                                }
                            >
                                Архив
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loadingConvs && conversations.length === 0 ? (
                                <div className="p-4 space-y-3">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-16 w-full bg-slate-100 rounded-xl animate-pulse" />)}
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center text-slate-400">
                                    <MessageSquare className="w-8 h-8" />
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest">Диалогов пока нет</p>
                                        <p className="text-[11px] leading-6 text-slate-400">Здесь появятся переписки по бронированиям и сообщения ресторанам.</p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        <Link to="/restaurants" className="px-4 py-2 rounded-lg bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-widest">
                                            Найти ресторан
                                        </Link>
                                        <Link to="/guest/dashboard" className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                                            Мои брони
                                        </Link>
                                    </div>
                                </div>
                            ) : filteredConvs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center text-slate-400">
                                    <MessageSquare className="w-8 h-8" />
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest">{search.trim() ? 'Ничего не найдено' : 'Нет диалогов в этой вкладке'}</p>
                                        <p className="text-[11px] leading-6 text-slate-400">{search.trim() ? 'Попробуйте другой запрос или очистите поиск.' : 'Переключитесь между последними и архивом, либо начните новый диалог из карточки брони.'}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        <Link to="/restaurants" className="px-4 py-2 rounded-lg bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-widest">
                                            Найти ресторан
                                        </Link>
                                        <Link to="/guest/dashboard" className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                                            Мои брони
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {filteredConvs.map((conv) => {
                                        const isActive = selectedConv?.id === conv.id;
                                        const timeLabel = conv.timestamp
                                            ? new Date(conv.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                            : '';
                                        return (
                                            <button
                                                key={conv.id}
                                                type="button"
                                                onClick={() => setSelectedConv(conv)}
                                                className={
                                                    isActive
                                                        ? 'w-full text-left p-4 bg-blue-50 border-l-4 border-[#1d4ed8] flex gap-4 cursor-pointer'
                                                        : 'w-full text-left p-4 hover:bg-slate-50 transition-colors flex gap-4 cursor-pointer border-b border-slate-50'
                                                }
                                            >
                                                <div className="relative shrink-0">
                                                    <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center ${isActive ? 'bg-[#1d4ed8] text-white' : 'bg-slate-200 text-slate-700'} font-bold`}>
                                                        {conv.title?.[0]?.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col overflow-hidden flex-1">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <h3 className="text-sm font-bold truncate pr-2">{conv.title}</h3>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">{timeLabel}</span>
                                                    </div>
                                                    <p className={`text-xs truncate ${isActive ? 'text-slate-600' : 'text-slate-500'} `}>
                                                        {conv.lastMessage || conv.subtitle}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="flex-1 flex flex-col bg-brand-cream">
                        {selectedConv ? (
                            <>
                                {messageError && (
                                    <div className="px-6 pt-4">
                                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 flex items-center justify-between gap-3">
                                            <span>{messageError}</span>
                                            <button type="button" onClick={() => fetchMessages(selectedConv)} className="font-bold uppercase tracking-widest text-[#1d4ed8] shrink-0">
                                                Повторить
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 overflow-hidden flex items-center justify-center font-bold text-[#1d4ed8] border border-blue-100">
                                            {selectedConv.title?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold leading-none">{selectedConv.title}</h3>
                                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-medium uppercase tracking-wider">
                                                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                                                Обычно отвечает за 15 мин
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="p-2 text-slate-400 hover:text-[#1d4ed8] transition-colors"
                                            aria-label="Info"
                                        >
                                            <Info className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={fetchData}
                                            className="p-2 text-slate-400 hover:text-[#1d4ed8] transition-colors"
                                            aria-label="Refresh"
                                        >
                                            <RefreshCw className={`w-5 h-5 ${loadingConvs ? 'animate-spin' : ''}`} />
                                        </button>
                                        {selectedConv.type === 'booking' && (
                                            <button
                                                type="button"
                                                className="px-4 py-2 bg-[#1d4ed8] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md uppercase tracking-widest"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                Бронь
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedConv(null)}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                            aria-label="Close chat"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                                    <div className="flex justify-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">Сегодня</span>
                                    </div>

                                    {loadingMessages && messages.length === 0 ? (
                                        <div className="flex items-center justify-center py-24">
                                            <Loader2 className="w-8 h-8 text-[#1d4ed8] animate-spin" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                                            <MessageSquare className="w-10 h-10" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Нет сообщений</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence initial={false}>
                                            {messages.map((msg) => {
                                                const isMe = msg.sender === user?.id;
                                                return (
                                                    <motion.div
                                                        key={msg.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={isMe ? 'flex flex-row-reverse gap-3 max-w-[80%] ml-auto' : 'flex gap-3 max-w-[80%]'}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold ${isMe ? 'bg-blue-100 text-[#1d4ed8]' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                                            {(isMe ? (user?.username?.[0] || 'G') : (msg.sender_name?.[0] || 'R')).toUpperCase()}
                                                        </div>
                                                        <div className={isMe ? 'space-y-1 text-right' : 'space-y-1'}>
                                                            <div
                                                                className={
                                                                    isMe
                                                                        ? 'bg-[#1d4ed8] text-white p-4 rounded-xl rounded-tr-none shadow-md shadow-blue-100'
                                                                        : 'bg-white p-4 rounded-xl rounded-tl-none shadow-sm border border-slate-200'
                                                                }
                                                            >
                                                                <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                                                            </div>
                                                            <div className={isMe ? 'flex items-center justify-end gap-1 text-[10px] text-slate-400 mr-1' : 'text-[10px] text-slate-400 ml-1'}>
                                                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                                    <div className="flex items-end gap-3 max-w-5xl mx-auto">
                                        <div className="flex-1 relative">
                                            <input
                                                className="w-full py-3 px-4 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#1d4ed8]/20"
                                                placeholder="Напишите сообщение..."
                                                type="text"
                                                value={newMsg}
                                                onChange={(e) => setNewMsg(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSend}
                                            disabled={!newMsg.trim() || sending}
                                            className="mb-1 p-3 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center transition-all active:scale-[0.98]"
                                            aria-label="Send"
                                        >
                                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-center text-[10px] text-slate-400 mt-2 uppercase tracking-tighter">Enter — отправить, Shift+Enter — новая строка</p>
                                </div>
                            </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 bg-slate-50/50 px-6 text-center">
                                        <MessageSquare className="w-12 h-12" />
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-widest">Выберите диалог</p>
                                            <p className="text-[11px] leading-6 text-slate-400 max-w-md">Откройте бронирование или ресторан, чтобы перейти в чат без лишних шагов.</p>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-3">
                                            <Link to="/restaurants" className="px-4 py-2 rounded-lg bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-widest">
                                                Перейти к ресторанам
                                            </Link>
                                            <Link to="/guest/dashboard" className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                                                Мои брони
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </section>
                </div>
            </main>
        </div>
    );
}
