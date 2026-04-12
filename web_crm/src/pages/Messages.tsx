import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Search, Users, Calendar, Clock, RefreshCw,
    MessageSquare, CheckCheck, X, Loader2
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { isRestaurantRole } from '@/modules/auth/logic/roles';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { extractResults, getApiErrorMessage } from '@/features/reservations/shared';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Message {
    id: number;
    content: string;
    timestamp: string;
    sender: number;
    sender_username: string;
    sender_name?: string;
    booking: number | null;
    restaurant?: number | null;
    conversation?: number | null;
    is_read: boolean;
}

interface BookingSummary {
    id: number;
    user_name?: string;
    date: string;
    time?: string;
    guests: number;
    status: string;
    restaurant?: number | null;
}

interface Conversation {
    id: string; // "b-ID" or "c-ID"
    type: 'booking' | 'direct';
    targetId: number;
    title: string;
    subtitle?: string;
    lastMessage?: string;
    timestamp?: string;
    booking?: BookingSummary;
    guestName?: string;
    restaurant?: number | null;
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

export default function MessagesPage() {
    const { t } = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = (location.state as any) || null;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activeConvIdRef = useRef<string | null>(null);
    const fetchSeqRef = useRef(0);
    const appliedInitialSelectionRef = useRef(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [startingDirectThread, setStartingDirectThread] = useState(false);
    const activeRestaurantId = selectedConv?.restaurant ?? selectedConv?.booking?.restaurant ?? user?.restaurant ?? null;
    const hasRestaurantRole = isRestaurantRole(user?.role);

    const fetchAll = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            setMessageError(null);
            const [bookRes, convRes] = await Promise.all([
                api.get('/bookings/my_restaurant/?ordering=-date,-time'),
                api.get('/chat/conversations/')
            ]);

            const allBookings = extractResults<BookingSummary>(bookRes.data);
            const directConvs = extractResults<{
                id: number;
                guest_name?: string;
                restaurant?: number | null;
                last_message?: { content?: string; timestamp?: string };
                updated_at?: string;
            }>(convRes.data);

            const merged: Conversation[] = [];

            allBookings
                .filter((booking) => ['pending', 'approved', 'confirmed', 'seated'].includes(booking.status))
                .forEach((booking) => {
                    merged.push({
                        id: `b-${booking.id}`,
                        type: 'booking',
                        targetId: booking.id,
                        title: booking.user_name || 'Guest',
                        subtitle: `Бронь #${booking.id}`,
                        booking,
                        guestName: booking.user_name,
                        timestamp: booking.date,
                        restaurant: booking.restaurant ?? null,
                    });
                });

            directConvs.forEach((c) => {
                merged.push({
                    id: `c-${c.id}`,
                    type: 'direct',
                    targetId: c.id,
                    title: c.guest_name || 'Guest',
                    subtitle: 'Прямая связь',
                    lastMessage: c.last_message?.content,
                    timestamp: c.last_message?.timestamp || c.updated_at,
                    guestName: c.guest_name,
                    restaurant: c.restaurant ?? null,
                });
            });

            // Sort by latest activity
            const sorted = merged.sort((a, b) => {
                const tA = new Date(a.timestamp || 0).getTime();
                const tB = new Date(b.timestamp || 0).getTime();
                return tB - tA;
            });

            const targetBookingId = Number(locationState?.bookingId);
            if (!appliedInitialSelectionRef.current && Number.isFinite(targetBookingId)) {
                const targetKey = `b-${targetBookingId}`;
                const target = sorted.find((conversation) => conversation.id === targetKey);

                if (target) {
                    setConversations(sorted);
                    setSelectedConv(target);
                    appliedInitialSelectionRef.current = true;
                    return;
                }

                try {
                    const detailRes = await api.get(`/bookings/${targetBookingId}/`);
                    const booking = detailRes.data as BookingSummary;
                    if (booking?.id === targetBookingId) {
                        const hydratedTarget: Conversation = {
                            id: targetKey,
                            type: 'booking',
                            targetId: booking.id,
                            title: booking.user_name || 'Guest',
                            subtitle: `Бронь #${booking.id}`,
                            booking,
                            guestName: booking.user_name,
                            timestamp: booking.date,
                            restaurant: booking.restaurant ?? null,
                        };

                        const nextConversations = [hydratedTarget, ...sorted.filter((conversation) => conversation.id !== targetKey)];
                        setConversations(nextConversations);
                        setSelectedConv(hydratedTarget);
                        appliedInitialSelectionRef.current = true;
                        return;
                    }
                } catch {
                    // Fall through to the normal list if the selected booking cannot be hydrated.
                }
            }

            setConversations(sorted);
        } catch (error) {
            setError(getApiErrorMessage(error, 'Не удалось загрузить переписки.'));
            toast.error('Не удалось загрузить переписки.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [locationState?.bookingId]);

    useEffect(() => {
        void fetchAll();
        const interval = setInterval(() => {
            void fetchAll({ silent: true });
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    const markConversationRead = useCallback(async (conv: Conversation) => {
        try {
            if (conv.type === 'booking') {
                await api.post('/chat/messages/mark_read/', { booking: conv.targetId });
                return;
            }

            await api.post('/chat/messages/mark_read/', { conversation: conv.targetId });
        } catch {
            // Marking read is best-effort; the chat must remain usable even if the badge update fails.
        }
    }, []);

    const handleStartDirectThread = useCallback(async () => {
        if (!selectedConv?.booking) return;
        setStartingDirectThread(true);
        try {
            const response = await api.post('/chat/conversations/start/', { booking_id: selectedConv.booking.id });
            const conversationData = response.data as {
                id: number;
                guest_name?: string;
                restaurant?: number | null;
                last_message?: { content?: string; timestamp?: string };
                updated_at?: string;
            };
            const nextConversation: Conversation = {
                id: `c-${conversationData.id}`,
                type: 'direct',
                targetId: conversationData.id,
                title: conversationData.guest_name || selectedConv.title || 'Guest',
                subtitle: 'Прямая связь',
                lastMessage: conversationData.last_message?.content,
                timestamp: conversationData.last_message?.timestamp || conversationData.updated_at || new Date().toISOString(),
                guestName: conversationData.guest_name || selectedConv.guestName,
                restaurant: conversationData.restaurant ?? selectedConv.restaurant ?? null,
            };
            setConversations((current) => {
                const withoutDuplicate = current.filter((conversation) => conversation.id !== nextConversation.id);
                return [nextConversation, ...withoutDuplicate];
            });
            setSelectedConv(nextConversation);
            toast.success('Открыт прямой диалог.');
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Не удалось открыть прямой диалог.'));
        } finally {
            setStartingDirectThread(false);
        }
    }, [selectedConv]);

    const fetchMessages = async (conv: Conversation) => {
        const seq = ++fetchSeqRef.current;
        try {
            setLoadingMessages(true);
            setMessageError(null);
            const params = conv.type === 'booking' ? `booking=${conv.targetId}` : `conversation=${conv.targetId}`;
            const res = await api.get(`/chat/messages/?${params}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);

            if (activeConvIdRef.current !== conv.id) return;
            if (fetchSeqRef.current !== seq) return;
            setMessages(data);
        } catch (error) {
            console.error(error);
            setMessageError(getApiErrorMessage(error, 'Не удалось загрузить сообщения.'));
        } finally {
            if (activeConvIdRef.current === conv.id && fetchSeqRef.current === seq) {
                setLoadingMessages(false);
            }
        }
    };

    const handleRealtimeMessage = useCallback((payload: RealtimeChatMessage) => {
        if (!payload?.restaurant_id || !activeRestaurantId || payload.restaurant_id !== activeRestaurantId) {
            return;
        }

        void fetchAll({ silent: true });

        if (!selectedConv) {
            return;
        }

        const matchesSelectedConversation = selectedConv.type === 'booking'
            ? payload.booking_id === selectedConv.targetId
            : payload.conversation_id === selectedConv.targetId;

        if (matchesSelectedConversation) {
            void fetchMessages(selectedConv);
            void markConversationRead(selectedConv);
        }
    }, [activeRestaurantId, fetchAll, fetchMessages, markConversationRead, selectedConv]);

    const { sendMessage: wsSend, isConnected } = useWebSocket({
        url: activeRestaurantId ? `ws/chat/${activeRestaurantId}/` : '',
        enabled: hasRestaurantRole && Boolean(activeRestaurantId),
        onMessage: handleRealtimeMessage,
    });

    useEffect(() => {
        if (selectedConv) {
            activeConvIdRef.current = selectedConv.id;
            void fetchMessages(selectedConv);
            void markConversationRead(selectedConv);
            if (pollRef.current) clearInterval(pollRef.current);
            if (!isConnected) {
                pollRef.current = setInterval(() => void fetchMessages(selectedConv), 3000);
            }
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isConnected, selectedConv, markConversationRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleBookingAction = async (action: 'confirm' | 'reject') => {
        if (!selectedConv?.booking) return;
        setActionLoading(action);
        try {
            await api.post(`/bookings/${selectedConv.booking.id}/${action}/`);
            toast.success(action === 'confirm' ? 'Бронирование подтверждено!' : 'Бронирование отклонено');
            fetchAll();
        } catch {
            toast.error(`Не удалось ${action === 'confirm' ? 'подтвердить' : 'отклонить'} бронирование`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSend = async () => {
        if (!newMsg.trim() || !selectedConv) return;
        const toSend = newMsg.trim();
        setNewMsg('');
        setSending(true);

        try {
            if (isConnected && activeRestaurantId) {
                wsSend(
                    selectedConv.type === 'booking'
                        ? { message: toSend, booking_id: selectedConv.targetId }
                        : { message: toSend, conversation_id: selectedConv.targetId }
                );
            } else {
                const payload = selectedConv.type === 'booking'
                    ? { booking: selectedConv.targetId, content: toSend }
                    : { conversation: selectedConv.targetId, content: toSend };

                await api.post('/chat/messages/', payload);
                await fetchMessages(selectedConv);
            }
        } catch {
            toast.error('Ошибка при отправке');
            setNewMsg(toSend);
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = conversations.filter(c =>
        !search || `${c.title} ${c.subtitle || ''} ${c.lastMessage || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    const bookingCount = conversations.filter((conversation) => conversation.type === 'booking').length;
    const directCount = conversations.filter((conversation) => conversation.type === 'direct').length;

    return (
        <div className="flex h-[calc(100vh-140px)] -m-6 md:-m-8 bg-white overflow-hidden border border-slate-200 rounded-xl shadow-sm">
            {/* Sidebar */}
            <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h1 className="text-base font-bold text-slate-900 leading-tight uppercase tracking-[0.2em]">{t('messages.title')}</h1>
                        <button onClick={() => { void fetchAll(); }} className="p-1.5 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                        Booking threads and direct guest follow-up in one inbox.
                    </p>
                    <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('messages.search')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium outline-none text-slate-900 placeholder-slate-400 focus:border-slate-300 transition-colors"
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                            {bookingCount} bookings
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                            {directCount} direct
                        </span>
                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            {isConnected ? 'realtime' : 'polling'}
                        </span>
                    </div>
                </div>

                {error ? (
                    <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => { void fetchAll(); }}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
                        >
                            <RefreshCw size={12} />
                            Повторить
                        </button>
                    </div>
                ) : null}

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {loading && conversations.length === 0 ? (
                        <div className="space-y-2 p-4">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 w-full bg-slate-50 rounded-lg animate-pulse" />)}
                        </div>
                    ) : error && conversations.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
                            <MessageSquare size={24} />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Не удалось загрузить переписки</p>
                            <button
                                type="button"
                                onClick={() => { void fetchAll(); }}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
                            >
                                Повторить
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {hasRestaurantRole && activeRestaurantId && !isConnected && (
                                <div className="mx-4 my-2 flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-red-600 shadow-sm">
                                    <span className="material-symbols-outlined text-[14px]">wifi_off</span>
                                    <span>Connection lost. Please refresh to receive new messages.</span>
                                </div>
                            )}
                            {filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400/40">
                                    <MessageSquare size={24} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Нет диалогов</p>
                                </div>
                            ) : (
                                filteredConversations.map(conv => {
                                    const isActive = selectedConv?.id === conv.id;
                                    const initial = (conv.title || 'G')[0].toUpperCase();
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => setSelectedConv(conv)}
                                            className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition-all relative ${isActive
                                                ? 'bg-blue-50/50 border-l-4 border-blue-600'
                                                : 'hover:bg-slate-50 border-l-4 border-transparent'
                                                }`}
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-100 uppercase ${isActive ? 'bg-blue-600 text-white shadow-sm border-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                                {initial}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className={`font-bold text-xs uppercase tracking-tight truncate ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>
                                                        {conv.title}
                                                    </p>
                                                    <span className="text-[9px] text-slate-300 font-bold tabular-nums shrink-0 ml-2">
                                                        {conv.type === 'booking' ? `#${conv.targetId}` : 'DIRECT'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                                    {conv.lastMessage || conv.subtitle}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedConv ? (
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
                    <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm uppercase">
                            {(selectedConv.title || 'G')[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-xs text-slate-900 uppercase tracking-tight">{selectedConv.title}</p>
                            {selectedConv.type === 'booking' && selectedConv.booking ? (
                                <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold tracking-[0.1em] mt-0.5 uppercase">
                                    <span className="flex items-center gap-1.5"><Calendar size={10} className="text-slate-300" />{selectedConv.booking.date}</span>
                                    <span className="flex items-center gap-1.5"><Clock size={10} className="text-slate-300" />{(selectedConv.booking.time || '').slice(0, 5)}</span>
                                    <span className="flex items-center gap-1.5"><Users size={10} className="text-slate-300" />{selectedConv.booking.guests}</span>
                                </div>
                            ) : (
                                <p className="text-[9px] text-slate-400 font-bold tracking-[0.1em] mt-0.5 uppercase">Прямая связь с клиентом</p>
                            )}
                        </div>

                        {selectedConv.type === 'booking' && selectedConv.booking && (
                            <>
                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.15em] border shadow-sm ${selectedConv.booking.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    selectedConv.booking.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                        'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>{selectedConv.booking.status}</div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/app/bookings?id=${selectedConv.booking?.id}`)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    Открыть бронь
                                </button>
                                {hasRestaurantRole ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleStartDirectThread()}
                                        disabled={startingDirectThread}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {startingDirectThread ? 'ОТКРЫВАЕМ...' : 'ПРЯМОЙ ДИАЛОГ'}
                                    </button>
                                ) : null}

                                {hasRestaurantRole && selectedConv.booking.status === 'pending' && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <button
                                            onClick={() => handleBookingAction('confirm')}
                                            disabled={actionLoading !== null}
                                            className="px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-[9px] font-black underline-offset-2 hover:underline transition-all disabled:opacity-50 shadow-sm"
                                        >
                                            {actionLoading === 'confirm' ? <Loader2 size={10} className="animate-spin" /> : 'ПРИНЯТЬ'}
                                        </button>
                                        <button
                                            onClick={() => handleBookingAction('reject')}
                                            disabled={actionLoading !== null}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 text-rose-500 rounded-md text-[9px] font-black hover:bg-rose-50 transition-all disabled:opacity-50 shadow-sm"
                                        >
                                            {actionLoading === 'reject' ? <Loader2 size={10} className="animate-spin" /> : 'ОТКЛОНИТЬ'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            onClick={() => setSelectedConv(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg lg:hidden"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
                        {messageError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <span>{messageError}</span>
                                    <button
                                        type="button"
                                        onClick={() => selectedConv && fetchMessages(selectedConv)}
                                        className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100"
                                    >
                                        <RefreshCw size={14} />
                                        Повторить
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {loadingMessages && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300/40">
                                <MessageSquare size={32} strokeWidth={1} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">{t('messages.noMessagesYet')}</p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {messages.map(msg => {
                                    const isMe = msg.sender === user?.id || msg.sender_username === user?.username;
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[75%] flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && (
                                                    <span className="text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wider">{msg.sender_username || msg.sender_name}</span>
                                                )}
                                                <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${isMe
                                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                                    : 'bg-white text-slate-800 border border-slate-200/60 rounded-tl-sm'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <div className={`flex items-center gap-1.5 px-1 mt-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-[8px] text-slate-300 font-black tabular-nums uppercase">
                                                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && <CheckCheck size={10} className="text-slate-300" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-white/80 backdrop-blur-md">
                        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
                            <input
                                type="text"
                                placeholder={t('messages.typeMessage')}
                                value={newMsg}
                                onChange={e => setNewMsg(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none text-slate-900 placeholder-slate-400 focus:border-blue-600 transition-all shadow-sm"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMsg.trim() || sending}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${newMsg.trim() ? 'bg-blue-600 text-white hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                            >
                                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 text-slate-300 bg-slate-50/20">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                        <MessageSquare size={24} strokeWidth={1.5} className="text-slate-200" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-[10px] font-black text-slate-400 tracking-[0.25em] uppercase">Выберите переписку</p>
                        <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest">чтобы начать общение</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/app/bookings')}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-[#1e40af]"
                    >
                        Перейти к бронированиям
                    </button>
                </div>
            )}
        </div>
    );
}
