import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Search, Users, Calendar, Clock, RefreshCw,
    MessageSquare, CheckCheck, X, Loader2, Utensils
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
    sender_name: string;
    booking: number | null;
    restaurant: number | null;
    restaurant_name: string | null;
    is_read: boolean;
}

interface Conversation {
    id: string; // "b-ID" for booking, "r-ID" for restaurant direct
    type: 'booking' | 'restaurant';
    targetId: number;
    title: string;
    subtitle?: string;
    lastMessage?: string;
    timestamp?: string;
    bookingDate?: string;
    bookingTime?: string;
    bookingGuests?: number;
    bookingStatus?: string;
}

export default function GuestMessages() {
    const { t } = useI18n();
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll conversations every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedConv) {
            fetchMessages(selectedConv);
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = setInterval(() => fetchMessages(selectedConv), 3000); // Poll messages every 3s
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [selectedConv]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchData = async () => {
        try {
            setLoadingConvs(true);
            const [msgRes, bookRes] = await Promise.all([
                api.get('/chat/messages/'),
                api.get('/bookings/')
            ]);

            const allMessages: Message[] = Array.isArray(msgRes.data) ? msgRes.data : (msgRes.data.results || []);
            const allBookings = Array.isArray(bookRes.data) ? bookRes.data : (bookRes.data.results || []);

            // Group into conversations
            const convMap = new Map<string, Conversation>();

            // Add conversations from bookings
            allBookings.forEach((b: any) => {
                const id = `b-${b.id}`;
                convMap.set(id, {
                    id,
                    type: 'booking',
                    targetId: b.id,
                    title: b.restaurant_name,
                    subtitle: `Reservation #${b.id}`,
                    bookingDate: b.date,
                    bookingTime: b.time,
                    bookingGuests: b.guests,
                    bookingStatus: b.status,
                    timestamp: b.created_at
                });
            });

            // Add or update conversations from messages
            allMessages.forEach((m: Message) => {
                const id = m.booking ? `b-${m.booking}` : `r-${m.restaurant}`;
                if (!convMap.has(id)) {
                    convMap.set(id, {
                        id,
                        type: m.booking ? 'booking' : 'restaurant',
                        targetId: (m.booking || m.restaurant) as number,
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

            // Handle initial selection from navigation state
            if (!selectedConv && locationState) {
                if (locationState.bookingId) {
                    const c = sortedConvs.find(cv => cv.id === `b-${locationState.bookingId}`);
                    if (c) setSelectedConv(c);
                } else if (locationState.restaurantId) {
                    const c = sortedConvs.find(cv => cv.id === `r-${locationState.restaurantId}`);
                    if (c) setSelectedConv(c);
                }
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoadingConvs(false);
        }
    };

    const fetchMessages = async (conv: Conversation) => {
        try {
            setLoadingMessages(true);
            const params = conv.type === 'booking' ? `booking=${conv.targetId}` : `restaurant=${conv.targetId}`;
            const res = await api.get(`/chat/messages/?${params}`);
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setMessages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSend = async () => {
        if (!newMsg.trim() || !selectedConv) return;

        const optimistic: Message = {
            id: Date.now(),
            content: newMsg.trim(),
            timestamp: new Date().toISOString(),
            sender: user?.id ?? 0,
            sender_name: user?.username || '',
            booking: selectedConv.type === 'booking' ? selectedConv.targetId : null,
            restaurant: selectedConv.type === 'restaurant' ? selectedConv.targetId : null,
            restaurant_name: selectedConv.title,
            is_read: false,
        };

        setMessages(prev => [...prev, optimistic]);
        const toSend = newMsg.trim();
        setNewMsg('');
        setSending(true);

        try {
            const payload = selectedConv.type === 'booking'
                ? { booking: selectedConv.targetId, content: toSend }
                : { restaurant: selectedConv.targetId, content: toSend };

            await api.post('/chat/messages/', payload);
            await fetchMessages(selectedConv);
        } catch {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setNewMsg(toSend);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const filteredConvs = conversations.filter(c =>
        !search || c.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-160px)] -mt-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden border border-white/20 dark:border-slate-800 rounded-[2rem] shadow-2xl">
            {/* Sidebar */}
            <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight uppercase tracking-[0.2em] italic">Messages</h1>
                        <button onClick={fetchData} className="p-2 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all">
                            <RefreshCw size={14} className={loadingConvs ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold font-display outline-none text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary/50 transition-all shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    {loadingConvs && conversations.length === 0 ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 w-full bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredConvs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-400/40">
                                    <MessageSquare size={32} strokeWidth={1.5} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">No conversations yet</p>
                                </div>
                            ) : (
                                filteredConvs.map(conv => {
                                    const isActive = selectedConv?.id === conv.id;
                                    const initial = conv.title[0].toUpperCase();
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => setSelectedConv(conv)}
                                            className={`w-full text-left flex items-center gap-4 px-4 py-4 transition-all rounded-[1.5rem] group ${isActive
                                                ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[0.98]'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border uppercase transition-all ${isActive ? 'bg-white text-primary border-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 group-hover:bg-white dark:group-hover:bg-slate-700'}`}>
                                                {initial}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className={`font-black text-xs uppercase tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        {conv.title}
                                                    </p>
                                                    {conv.timestamp && (
                                                        <span className={`text-[9px] font-bold tabular-nums shrink-0 ml-2 ${isActive ? 'text-white/60' : 'text-slate-300'}`}>
                                                            {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {conv.type === 'booking' ? (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>BOOKING</span>
                                                    ) : (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500'}`}>DIRECT</span>
                                                    )}
                                                    <p className={`text-[10px] font-bold truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                                        {conv.lastMessage || conv.subtitle}
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
            {selectedConv ? (
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/20 dark:bg-slate-900/20 relative">
                    <div className="flex items-center gap-5 px-8 py-6 border-b border-slate-200/50 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-base shadow-xl shadow-primary/20 uppercase">
                            {selectedConv.title[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight italic">{selectedConv.title}</p>
                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold tracking-[0.1em] mt-1 uppercase">
                                {selectedConv.type === 'booking' && (
                                    <>
                                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"><Calendar size={12} className="text-primary" />{selectedConv.bookingDate}</span>
                                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"><Clock size={12} className="text-primary" />{(selectedConv.bookingTime || '').slice(0, 5)}</span>
                                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full"><Users size={12} className="text-primary" />{selectedConv.bookingGuests}</span>
                                    </>
                                )}
                                {selectedConv.type === 'restaurant' && (
                                    <span className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 px-3 py-1 rounded-full"><MessageSquare size={12} /> Direct Conversation</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedConv(null)}
                            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6 no-scrollbar scroll-smooth">
                        {loadingMessages && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={3} />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-5 text-slate-300/40">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-slate-50 dark:border-slate-700 flex items-center justify-center shadow-2xl"
                                >
                                    <MessageSquare size={40} strokeWidth={1} />
                                </motion.div>
                                <p className="text-[12px] font-black uppercase tracking-[0.3em] italic">No messages in this chat</p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {messages.map((msg, i) => {
                                    const isMe = msg.sender === user?.id;
                                    const isLast = i === messages.length - 1;
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ type: "spring", damping: 20, stiffness: 200 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[70%] flex flex-col gap-2 ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && (
                                                    <span className="text-[9px] text-slate-400 font-black px-2 uppercase tracking-widest">{msg.sender_name}</span>
                                                )}
                                                <div className={`px-5 py-3.5 rounded-3xl text-[14px] font-semibold leading-relaxed shadow-xl ${isMe
                                                    ? 'bg-primary text-white rounded-tr-none shadow-primary/20'
                                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/50 dark:border-slate-700 rounded-tl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <div className={`flex items-center gap-2 px-2 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-black tabular-nums">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && <CheckCheck size={12} className="text-emerald-400" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="px-10 py-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4 max-w-4xl mx-auto w-full group/input">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Type your message..."
                                    value={newMsg}
                                    onChange={e => setNewMsg(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    className="w-full pl-6 pr-12 py-4 bg-white dark:bg-slate-800 border-2 border-white/50 dark:border-slate-700/50 rounded-[1.5rem] text-[13px] font-bold font-display outline-none text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary/50 focus:shadow-2xl transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!newMsg.trim() || sending}
                                className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl ${newMsg.trim() ? 'bg-primary text-white hover:scale-105 active:scale-95 shadow-primary/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed shadow-none'}`}
                            >
                                {sending ? <Loader2 size={24} className="animate-spin" /> : <Send size={20} strokeWidth={2.5} className={newMsg.trim() ? 'translate-x-0.5' : ''} />}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 text-slate-300 bg-slate-50/20 dark:bg-slate-900/20 relative">
                    <motion.div
                        animate={{
                            y: [0, -10, 0],
                            rotate: [0, -5, 5, 0]
                        }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="w-24 h-24 rounded-[2.5rem] bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]"
                    >
                        <MessageSquare size={40} strokeWidth={1} className="text-primary/40" />
                    </motion.div>
                    <div className="text-center space-y-3">
                        <p className="text-[12px] font-black text-slate-900 dark:text-white tracking-[0.4em] uppercase italic">Your Inbox</p>
                        <p className="text-[13px] text-slate-400 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">Select a conversation to start chatting with restaurants</p>
                    </div>
                    {/* Background decorations */}
                    <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-indigo-500/5 rounded-full blur-[120px]"></div>
                </div>
            )}
        </div>
    );
}
