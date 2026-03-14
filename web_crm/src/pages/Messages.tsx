import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Search, Users, Calendar, Clock, RefreshCw,
    MessageSquare, CheckCheck, X, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n';

interface Message {
    id: number;
    content: string;
    timestamp: string;
    sender: number;
    sender_username: string;
    booking: number;
    is_read: boolean;
}

interface BookingSummary {
    id: number;
    user_name?: string;
    date: string;
    time?: string;
    guests: number;
    status: string;
}

interface MessagesLocationState {
    bookingId?: number;
}

export default function MessagesPage() {
    const { t } = useI18n();
    const { user } = useAuth();
    const location = useLocation();
    const locationState = (location.state as MessagesLocationState | null) || null;

    const [bookings, setBookings] = useState<BookingSummary[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<BookingSummary | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [search, setSearch] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        if (locationState?.bookingId && bookings.length > 0) {
            const b = bookings.find(bk => bk.id === locationState.bookingId);
            if (b) setSelectedBooking(b);
        }
    }, [locationState, bookings]);

    useEffect(() => {
        if (selectedBooking) {
            fetchMessages(selectedBooking.id);
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(() => fetchMessages(selectedBooking.id), 3000);
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [selectedBooking]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchBookings = async () => {
        try {
            setLoadingBookings(true);
            const res = await api.get('/bookings/');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setBookings(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingBookings(false);
        }
    };

    const fetchMessages = async (bookingId: number) => {
        try {
            setLoadingMessages(true);
            const res = await api.get(`/chat/messages/?booking=${bookingId}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setMessages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleBookingAction = async (action: 'confirm' | 'reject') => {
        if (!selectedBooking) return;
        setActionLoading(action);
        try {
            await api.post(`/bookings/${selectedBooking.id}/${action}/`);
            toast.success(action === 'confirm' ? 'Бронирование подтверждено!' : 'Бронирование отклонено');
            setSelectedBooking({ ...selectedBooking, status: action === 'confirm' ? 'approved' : 'rejected' });
            fetchBookings();
        } catch {
            toast.error(`Не удалось ${action === 'confirm' ? 'подтвердить' : 'отклонить'} бронирование`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSend = async () => {
        if (!newMsg.trim() || !selectedBooking) return;
        const optimistic: Message = {
            id: Date.now(),
            content: newMsg.trim(),
            timestamp: new Date().toISOString(),
            sender: user?.id ?? 0,
            sender_username: user?.username || '',
            booking: selectedBooking.id,
            is_read: false,
        };
        setMessages(prev => [...prev, optimistic]);
        const toSend = newMsg.trim();
        setNewMsg('');
        setSending(true);

        try {
            await api.post('/chat/messages/', { booking: selectedBooking.id, content: toSend });
            await fetchMessages(selectedBooking.id);
        } catch {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setNewMsg(toSend);
        } finally {
            setSending(false);
        }
    };

    const filteredBookings = bookings.filter(b =>
        !search || (b.user_name || '').toLowerCase().includes(search.toLowerCase())
    );

    const isRestaurantRole = user?.role && ['owner', 'restaurant_admin', 'restaurant_owner', 'manager', 'hostess', 'host', 'worker'].includes(user.role);

    return (
        <div className="flex h-full -m-10 bg-white dark:bg-slate-950 overflow-hidden">

            <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white">{t('messages.title')}</h1>
                        <button onClick={fetchBookings} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <RefreshCw size={15} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('messages.search')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingBookings ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
                            <MessageSquare size={40} />
                            <p className="text-sm font-medium">{t('messages.noBookings')}</p>
                        </div>
                    ) : (
                        filteredBookings.map(booking => {
                            const isActive = selectedBooking?.id === booking.id;
                            const initial = (booking.user_name || t('messages.guest'))[0].toUpperCase();
                            return (
                                <button
                                    key={booking.id}
                                    onClick={() => setSelectedBooking(booking)}
                                    className={`w-full text-left flex items-center gap-3 px-5 py-4 border-b border-slate-50 dark:border-slate-800/60 transition-colors ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                        {initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className={`font-bold text-sm truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                                                {booking.user_name || t('messages.guest')}
                                            </p>
                                            <span className="text-xs text-slate-400 font-medium shrink-0 ml-2">{booking.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">
                                            {booking.guests} {t('messages.guests')} · {(booking.time || '').slice(0, 5)}
                                        </p>
                                    </div>
                                    {booking.status === 'confirmed' && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                    )}
                                    {booking.status === 'pending' && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {selectedBooking ? (
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                            {(selectedBooking.user_name || t('messages.guest'))[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-slate-900 dark:text-white">{selectedBooking.user_name || t('messages.guest')}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-400 font-medium mt-0.5">
                                <span className="flex items-center gap-1"><Calendar size={11} />{selectedBooking.date}</span>
                                <span className="flex items-center gap-1"><Clock size={11} />{(selectedBooking.time || '').slice(0, 5)}</span>
                                <span className="flex items-center gap-1"><Users size={11} />{selectedBooking.guests}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedBooking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        selectedBooking.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-slate-100 text-slate-500'
                                    }`}>{selectedBooking.status}</span>
                            </div>
                        </div>

                        {/* Confirm / Reject from chat */}
                        {isRestaurantRole && selectedBooking.status === 'pending' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleBookingAction('confirm')}
                                    disabled={actionLoading !== null}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                >
                                    {actionLoading === 'confirm' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Принять
                                </button>
                                <button
                                    onClick={() => handleBookingAction('reject')}
                                    disabled={actionLoading !== null}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20"
                                >
                                    {actionLoading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                    Отклонить
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedBooking(null)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors lg:hidden"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50 dark:bg-slate-950 space-y-3">
                        {loadingMessages && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                                <MessageSquare size={48} strokeWidth={1.5} />
                                <p className="text-sm font-medium">{t('messages.noMessagesYet')}</p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {messages.map(msg => {
                                    const isMe = msg.sender === user?.id || msg.sender_username === user?.username;
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && (
                                                    <span className="text-xs text-slate-400 font-semibold px-2">{msg.sender_username}</span>
                                                )}
                                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm rounded-bl-md'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <div className={`flex items-center gap-1 px-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && <CheckCheck size={12} className="text-indigo-400" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder={t('messages.typeMessage')}
                                value={newMsg}
                                onChange={e => setNewMsg(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-medium border-none outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSend}
                                disabled={!newMsg.trim() || sending}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white transition-colors ${newMsg.trim() ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 dark:shadow-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                            >
                                {sending ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                            </motion.button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 bg-slate-50 dark:bg-slate-950">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <MessageSquare size={36} strokeWidth={1.5} />
                    </div>
                    <p className="text-base font-bold text-slate-500">{t('messages.selectReservation')}</p>
                    <p className="text-sm text-slate-400">{t('messages.toStartConversation')}</p>
                </div>
            )}
        </div>
    );
}
