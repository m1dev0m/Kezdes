import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Search, Users, Calendar, Clock, RefreshCw,
    MessageSquare, CheckCheck, X, Loader2
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
    const activeBookingIdRef = useRef<number | null>(null);
    const fetchSeqRef = useRef(0);
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
            activeBookingIdRef.current = selectedBooking.id;
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
        const seq = ++fetchSeqRef.current;
        try {
            setLoadingMessages(true);
            const restaurantId = user?.restaurant;
            const res = restaurantId
                ? await api.get(`/chat/messages/?booking=${bookingId}`)
                : await api.get(`/chat/messages/?booking=${bookingId}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            const normalized: Message[] = (data as any[]).map((m) => ({
                id: m.id,
                content: m.content,
                timestamp: m.timestamp,
                sender: m.sender,
                sender_username: m.sender_username || m.sender_name || m.senderUsername || '',
                booking: m.booking ?? null,
                restaurant: m.restaurant ?? null,
                conversation: m.conversation ?? null,
                is_read: Boolean(m.is_read),
            }));
            if (activeBookingIdRef.current !== bookingId) return;
            if (fetchSeqRef.current !== seq) return;
            setMessages(normalized);
        } catch (error) {
            console.error(error);
        } finally {
            if (activeBookingIdRef.current === bookingId && fetchSeqRef.current === seq) {
                setLoadingMessages(false);
            }
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
        <div className="flex h-[calc(100vh-140px)] -m-6 md:-m-8 bg-white overflow-hidden border border-slate-200 rounded-xl shadow-sm">
            {/* Sidebar */}
            <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h1 className="text-base font-bold text-slate-900 leading-tight uppercase tracking-[0.2em]">{t('messages.title')}</h1>
                        <button onClick={fetchBookings} className="p-1.5 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <RefreshCw size={12} className={loadingBookings ? 'animate-spin' : ''} />
                        </button>
                    </div>
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
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {loadingBookings ? (
                        <div className="space-y-2 p-4">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 w-full bg-slate-50 rounded-lg animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {filteredBookings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400/40">
                                    <MessageSquare size={24} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">{t('messages.noBookings')}</p>
                                </div>
                            ) : (
                                filteredBookings.map(booking => {
                                    const isActive = selectedBooking?.id === booking.id;
                                    const initial = (booking.user_name || t('messages.guest'))[0].toUpperCase();
                                    return (
                                        <button
                                            key={booking.id}
                                            onClick={() => setSelectedBooking(booking)}
                                            className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition-all relative ${isActive
                                                ? 'bg-primary/5/50'
                                                : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-100 uppercase ${isActive ? 'bg-primary text-white shadow-sm border-primary' : 'bg-slate-50 text-slate-400'}`}>
                                                {initial}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className={`font-bold text-xs uppercase tracking-tight truncate ${isActive ? 'text-primary' : 'text-slate-700'}`}>
                                                        {booking.user_name || t('messages.guest')}
                                                    </p>
                                                    <span className="text-[9px] text-slate-300 font-bold tabular-nums shrink-0 ml-2">#{booking.id}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[10px] text-slate-400 font-bold tabular-nums">
                                                        {(booking.time || '').slice(0, 5)}
                                                    </p>
                                                    <div className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        {booking.guests} {t('messages.guests')}
                                                    </p>
                                                </div>
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
            {selectedBooking ? (
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
                    <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs shadow-sm uppercase">
                            {(selectedBooking.user_name || t('messages.guest'))[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-xs text-slate-900 uppercase tracking-tight">{selectedBooking.user_name || t('messages.guest')}</p>
                            <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold tracking-[0.1em] mt-0.5 uppercase">
                                <span className="flex items-center gap-1.5"><Calendar size={10} className="text-slate-300" />{selectedBooking.date}</span>
                                <span className="flex items-center gap-1.5"><Clock size={10} className="text-slate-300" />{(selectedBooking.time || '').slice(0, 5)}</span>
                                <span className="flex items-center gap-1.5"><Users size={10} className="text-slate-300" />{selectedBooking.guests}</span>
                            </div>
                        </div>

                        {/* Status chip */}
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.15em] border shadow-sm ${selectedBooking.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            selectedBooking.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>{selectedBooking.status}</div>

                        {/* Confirm / Reject */}
                        {isRestaurantRole && selectedBooking.status === 'pending' && (
                            <div className="flex items-center gap-1.5 ml-2">
                                <button
                                    onClick={() => handleBookingAction('confirm')}
                                    disabled={actionLoading !== null}
                                    className="px-2.5 py-1.5 bg-primary text-white rounded-md text-[9px] font-black underline-offset-2 hover:underline transition-all disabled:opacity-50 shadow-sm"
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

                        <button
                            onClick={() => setSelectedBooking(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg lg:hidden"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
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
                                                    <span className="text-[9px] text-slate-400 font-bold px-1 uppercase tracking-wider">{msg.sender_username}</span>
                                                )}
                                                <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${isMe
                                                    ? 'bg-primary text-white rounded-tr-sm'
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
                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none text-slate-900 placeholder-slate-400 focus:border-primary transition-all shadow-sm"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMsg.trim() || sending}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${newMsg.trim() ? 'bg-primary text-white hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
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
                        <p className="text-[10px] font-black text-slate-400 tracking-[0.25em] uppercase">{t('messages.selectReservation')}</p>
                        <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest">{t('messages.toStartConversation')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
