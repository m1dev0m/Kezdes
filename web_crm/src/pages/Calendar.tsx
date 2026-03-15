import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Plus, Search, Users, Clock,
    MessageSquare, ArrowRight, Calendar, X, CalendarRange
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);
const HOUR_HEIGHT = 80; // px per hour
const START_HOUR = 9;

const STATUS_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
    confirmed: { bg: 'bg-emerald-50/50 dark:bg-emerald-500/5', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-500/10' },
    approved: { bg: 'bg-emerald-50/50 dark:bg-emerald-500/5', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-500/10' },
    pending: { bg: 'bg-amber-50/50 dark:bg-amber-500/5', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-500/10' },
    payment_pending: { bg: 'bg-indigo-50/50 dark:bg-indigo-500/5', text: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-500/10' },
    cancelled: { bg: 'bg-slate-50/50 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-100 dark:bg-slate-700/40' },
};

interface CalendarBooking {
    id: number;
    date: string;
    time?: string;
    duration_hours?: number;
    duration_minutes?: number;
    guests?: number;
    comment?: string;
    user_name?: string;
    status?: keyof typeof STATUS_COLORS | string;
    table_id?: number | null;
    table_number?: string | null;
}

interface CalendarTable {
    id: number;
    number: string;
    seats: number;
}

function getBookingPosition(booking: CalendarBooking) {
    const [h, m] = (booking.time || '12:00').split(':').map(Number);
    const offsetMin = (h - START_HOUR) * 60 + (m || 0);
    const top = Math.max(0, (offsetMin / 60) * HOUR_HEIGHT);
    const durationHours = (booking.duration_minutes ? booking.duration_minutes / 60 : (booking.duration_hours || 2));
    const height = Math.max(40, durationHours * HOUR_HEIGHT - 8);
    return { top, height };
}

function formatDate(d: Date) {
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
}

function addDays(d: Date, n: number) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

export default function CalendarPage() {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<CalendarBooking[]>([]);
    const [tables, setTables] = useState<CalendarTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<string>('timeline');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTab, setSelectedTab] = useState('allHalls');
    const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    useWebSocket({
        url: `ws/bookings/${user?.restaurant}/`,
        enabled: !!user?.restaurant,
        onMessage: (data) => {
            if (data && data.type === 'booking_update' && data.booking) {
                setBookings(prev => {
                    const exists = prev.find(b => b.id === data.booking.id);
                    if (exists) {
                        return prev.map(b => b.id === data.booking.id ? { ...b, ...data.booking } : b);
                    } else {
                        return [...prev, data.booking];
                    }
                });
            }
        }
    });

    const TABS = [
        { id: 'allHalls', label: t('calendar.allHalls') },
        { id: 'vip1', label: 'VIP 1' },
        { id: 'hall1', label: 'Зал 1' },
        { id: 'veranda', label: 'Веранда' },
        { id: 'bar', label: 'Бар' },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const handleBookingAction = async (bookingId: number, action: string) => {
        if (actionSubmitting) return;
        setActionSubmitting(true);
        try {
            await api.post(`/bookings/${bookingId}/${action}/`);
            toast.success(t('bookings.successAction'));
            await fetchData();
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.response?.data?.detail || `Failed to ${action}`;
            toast.error(msg);
        } finally {
            setActionSubmitting(false);
        }
    };

    useEffect(() => {
        if (scrollRef.current && viewMode !== 'timeline') {
            const now = new Date();
            const offset = ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT;
            scrollRef.current.scrollTop = Math.max(0, offset - 80);
        }
    }, [loading, viewMode]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [bRes, tRes] = await Promise.all([
                api.get('/bookings/'),
                api.get('/restaurants/tables/')
            ]);
            const bData = Array.isArray(bRes.data) ? bRes.data : (bRes.data.results || []);
            const tData = Array.isArray(tRes.data) ? tRes.data : (tRes.data.results || []);
            setBookings(bData);
            setTables(tData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const dateStr = currentDate.toISOString().slice(0, 10);

    const filteredBookings = bookings.filter(b => {
        const matchDate = b.date === dateStr;
        const matchSearch = !search || (b.user_name || '').toLowerCase().includes(search.toLowerCase());
        return matchDate && matchSearch;
    });

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentDate);
        const day = d.getDay();
        const monday = addDays(d, -((day + 6) % 7) + i);
        return monday;
    });

    const nightNow =
        currentDate.toDateString() === new Date().toDateString()
            ? ((new Date().getHours() - START_HOUR) * 60 + new Date().getMinutes()) / 60 * HOUR_HEIGHT
            : null;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-xl shadow-slate-900/5">
            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between px-8 py-6 border-b border-slate-100 bg-white gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-[18px] flex items-center justify-center border border-slate-100">
                        <CalendarRange size={22} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.2em] italic leading-none">{t('calendar.title')}</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-60 italic">{formatDate(currentDate)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial flex items-center gap-3">
                        <AnimatePresence>
                            {showSearch && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 220, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <input
                                        placeholder={t('calendar.guestSearch')}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none text-slate-900 focus:border-indigo-600 transition-all shadow-inner"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button
                            onClick={() => setShowSearch(s => !s)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 ${showSearch ? 'bg-white border-indigo-600 text-indigo-600' : ''}`}
                        >
                            {showSearch ? <X size={16} /> : <Search size={16} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        {[
                            { id: 'timeline', label: t('calendar.timeline') },
                            { id: 'day', label: t('calendar.day') },
                            { id: 'week', label: t('calendar.week') }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setViewMode(m.id)}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === m.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentDate(d => addDays(d, viewMode === 'day' ? -1 : -7))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-600 shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-4 h-10 text-[9px] font-black uppercase tracking-widest rounded-xl bg-white text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-600 shadow-sm"
                        >
                            {t('calendar.today')}
                        </button>
                        <button
                            onClick={() => setCurrentDate(d => addDays(d, viewMode === 'day' ? 1 : 7))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-600 shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => navigate('/app/bookings')}
                        className="flex items-center gap-2 px-6 h-10 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-indigo-600/10 hover:opacity-90 active:scale-95 border-none"
                    >
                        <Plus size={16} />
                        {t('calendar.book')}
                    </button>
                </div>
            </div>

            {viewMode === 'week' && (
                <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
                    {weekDays.map((d, i) => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        const isSelected = d.toDateString() === currentDate.toDateString();
                        return (
                            <button
                                key={i}
                                onClick={() => { setCurrentDate(d); setViewMode('day'); }}
                                className={`flex flex-col items-center py-6 transition-all border-r border-slate-50 ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'} relative group`}
                            >
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] italic ${isSelected ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                </span>
                                <span className={`text-xl font-black mt-2 w-10 h-10 flex items-center justify-center rounded-xl transition-all italic tracking-tighter ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'text-slate-900'}`}>
                                    {d.getDate()}
                                </span>
                                {isSelected && (
                                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-4 px-8 py-3 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar backdrop-blur-md">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={`flex flex-1 min-h-0 bg-white ${viewMode === 'timeline' ? 'overflow-auto no-scrollbar' : ''}`}>
                <div ref={scrollRef} className={`flex-1 overflow-y-auto no-scrollbar ${viewMode === 'timeline' ? 'min-w-max' : 'overflow-x-hidden'}`}>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                    ) : viewMode === 'timeline' ? (
                        <div className="flex flex-col relative w-full">
                            <div className="flex sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100">
                                <div className="w-[140px] shrink-0 border-r border-slate-100 p-4 flex items-center justify-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{t('calendar.tables')}</span>
                                </div>
                                <div className="flex">
                                    {HOURS.map((h, i) => (
                                        <div key={i} className="w-32 shrink-0 p-4 border-r border-slate-100 text-center">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest opacity-60 tabular-nums">{h}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <div className="flex relative border-b border-slate-50 hover:bg-slate-50/50 transition-colors h-24 group">
                                    <div className="w-[140px] shrink-0 border-r border-slate-100 bg-white flex flex-col items-center justify-center sticky left-0 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.02)]">
                                        <span className="font-black text-slate-900 text-[12px] italic tracking-tight">UNASSIGNED</span>
                                        <span className="text-[8px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest opacity-40 mt-1">
                                            <Users size={10} /> —
                                        </span>
                                    </div>
                                    <div className="flex relative flex-1 p-3">
                                        {HOURS.map((_, i) => (
                                            <div key={i} className="w-32 shrink-0 border-r border-slate-50/50 h-full pointer-events-none" />
                                        ))}

                                        {filteredBookings.filter(b => !b.table_id).map((booking) => {
                                            const [h, m] = (booking.time || '12:00').split(':').map(Number);
                                            const offsetMin = (h - START_HOUR) * 60 + (m || 0);
                                            const left = Math.max(0, (offsetMin / 60) * 128);

                                            const durationHours = (booking.duration_minutes ? booking.duration_minutes / 60 : (booking.duration_hours || 2));
                                            const width = Math.max(30, durationHours * 128 - 4);

                                            const statusKey = booking.status && booking.status in STATUS_COLORS
                                                ? (booking.status as keyof typeof STATUS_COLORS)
                                                : 'pending';
                                            const colors = STATUS_COLORS[statusKey];

                                            return (
                                                <motion.div
                                                    drag={false}
                                                    key={`booking-unassigned-${booking.id}`}
                                                    style={{ left, width, top: 12, height: 60 }}
                                                    className={`absolute rounded-2xl px-5 py-2 cursor-pointer border shadow-sm backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-slate-900/5 z-10 ${colors.bg} ${colors.text} ${selectedBooking?.id === booking.id ? 'ring-2 ring-indigo-600 ring-offset-2' : 'border-slate-100'}`}
                                                    onClick={() => setSelectedBooking(booking)}
                                                    whileHover={{ zIndex: 30, scale: 1.02 }}
                                                >
                                                    <div className="flex flex-col h-full justify-center">
                                                        <p className="font-black text-[11px] truncate uppercase tracking-tight italic">
                                                            {booking.user_name || t('calendar.guest')}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest opacity-60 mt-1 truncate">
                                                            <Clock size={8} /> {booking.time?.slice(0, 5)} • {booking.guests} PAX
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {tables.filter(_t => selectedTab === 'allHalls' || true).map((table) => (
                                    <div key={table.id} className="flex relative border-b border-slate-50 hover:bg-slate-50/50 transition-colors h-24 group">
                                        <div className="w-[140px] shrink-0 border-r border-slate-100 bg-white flex flex-col items-center justify-center sticky left-0 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.02)]">
                                            <span className="font-black text-slate-900 text-[15px] italic tracking-tighter">№{table.number}</span>
                                            <span className="text-[8px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest opacity-40 mt-1">
                                                <Users size={10} /> {table.seats}
                                            </span>
                                        </div>
                                        <div className="flex relative flex-1 p-3">
                                            {HOURS.map((_, i) => (
                                                <div key={i} className="w-32 shrink-0 border-r border-slate-50/50 h-full pointer-events-none" />
                                            ))}

                                            {filteredBookings.filter(b => b.table_id === table.id).map((booking) => {
                                                const [h, m] = (booking.time || '12:00').split(':').map(Number);
                                                const offsetMin = (h - START_HOUR) * 60 + (m || 0);
                                                const left = Math.max(0, (offsetMin / 60) * 128); // 128px per hour

                                                const durationHours = (booking.duration_minutes ? booking.duration_minutes / 60 : (booking.duration_hours || 2));
                                                const width = Math.max(30, durationHours * 128 - 4);

                                                const statusKey = booking.status && booking.status in STATUS_COLORS
                                                    ? (booking.status as keyof typeof STATUS_COLORS)
                                                    : 'pending';
                                                const colors = STATUS_COLORS[statusKey];

                                                return (
                                                    <motion.div
                                                        drag={booking.status === 'approved' || booking.status === 'pending' ? "x" : false}
                                                        dragConstraints={{ left: 0, right: HOURS.length * 128 - width }}
                                                        onDragEnd={async (_e, info) => {
                                                            const minX = 0;
                                                            const maxX = HOURS.length * 128 - width;
                                                            const finalX = Math.min(Math.max(minX, left + info.offset.x), maxX);

                                                            const snapMinutes = 15;
                                                            const rawOffsetMin = (finalX / 128) * 60;
                                                            const newOffsetMin = Math.round(rawOffsetMin / snapMinutes) * snapMinutes;
                                                            const newH = String(Math.floor(newOffsetMin / 60) + START_HOUR).padStart(2, '0');
                                                            const newM = String(newOffsetMin % 60).padStart(2, '0');
                                                            const newTime = `${newH}:${newM}`;

                                                            if (newTime === (booking.time || '').slice(0, 5)) return;

                                                            try {
                                                                await api.patch(`/bookings/${booking.id}/reschedule/`, { time: newTime });
                                                                toast.success(t('bookings.successUpdate') + `: ${newTime}`);
                                                                fetchData();
                                                            } catch (err: any) {
                                                                if (err?.response?.status === 409) {
                                                                    toast.error(t('bookings.timeSlotLocked', { defaultValue: 'Это время сейчас бронируется другим пользователем. Попробуйте снова.' }));
                                                                } else {
                                                                    const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Error';
                                                                    toast.error(msg);
                                                                }
                                                                // Reset components position by forcing re-render
                                                                fetchData();
                                                            }
                                                        }}
                                                        key={`booking-${booking.id}`}
                                                        style={{ left, width, top: 12, height: 60 }}
                                                        className={`absolute rounded-2xl px-5 py-2 cursor-pointer border shadow-sm backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-slate-900/5 z-10 ${colors.bg} ${colors.text} ${selectedBooking?.id === booking.id ? 'ring-2 ring-indigo-600 ring-offset-2' : 'border-slate-100'}`}
                                                        onClick={() => setSelectedBooking(booking)}
                                                        whileHover={{ zIndex: 30, scale: 1.02 }}
                                                        whileDrag={{ zIndex: 40, scale: 1.05, opacity: 0.9 }}
                                                    >
                                                        <div className="flex flex-col h-full justify-center">
                                                            <p className="font-black text-[11px] truncate uppercase tracking-tight italic">
                                                                {booking.user_name || t('calendar.guest')}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest opacity-60 mt-1 truncate">
                                                                <Clock size={8} /> {booking.time?.slice(0, 5)} • {booking.guests} PAX
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex relative bg-white">
                            <div className="w-[100px] shrink-0 border-r border-slate-100">
                                {HOURS.map((h, i) => (
                                    <div key={i} style={{ height: HOUR_HEIGHT }} className="relative flex items-center justify-center">
                                        <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase tracking-widest opacity-60">{h}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 relative">
                                {HOURS.map((_, i) => (
                                    <div key={i} style={{ top: i * HOUR_HEIGHT }} className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none" />
                                ))}

                                {nightNow !== null && (
                                    <div style={{ top: nightNow }} className="absolute left-0 right-0 z-20 pointer-events-none">
                                        <div className="relative flex items-center">
                                            <div className="w-3 h-3 rounded-full bg-rose-500 -ml-1.5 shrink-0 shadow-lg shadow-rose-300" />
                                            <div className="flex-1 h-0.5 bg-rose-500 opacity-60" />
                                        </div>
                                    </div>
                                )}

                                <div style={{ height: HOURS.length * HOUR_HEIGHT + 40 }} className="relative p-6">
                                    {filteredBookings.map((booking) => {
                                        const { top, height } = getBookingPosition(booking);
                                        const statusKey = booking.status && booking.status in STATUS_COLORS
                                            ? (booking.status as keyof typeof STATUS_COLORS)
                                            : 'pending';
                                        const colors = STATUS_COLORS[statusKey];

                                        const durationMins = booking.duration_minutes || (booking.duration_hours || 2) * 60;
                                        const [hh, mm] = (booking.time || '12:00').split(':').map(Number);
                                        const totalStartMins = hh * 60 + (mm || 0);
                                        const totalEndMins = totalStartMins + durationMins;
                                        const endH = String(Math.floor(totalEndMins / 60) % 24).padStart(2, '0');
                                        const endM = String(totalEndMins % 60).padStart(2, '0');

                                        const timeStr = `${(booking.time || '').slice(0, 5)} – ${endH}:${endM}`;

                                        return (
                                            <motion.button
                                                key={booking.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                style={{ top: top + 24, height: height - 8, left: '2%', width: '96%' }}
                                                className={`absolute rounded-[24px] px-8 py-5 text-left border shadow-xl shadow-slate-900/5 backdrop-blur-md transition-all hover:scale-[1.01] hover:shadow-2xl z-10 ${colors.bg} ${colors.text} ${selectedBooking?.id === booking.id ? 'ring-2 ring-indigo-600 ring-offset-2' : 'border-slate-100'}`}
                                                onClick={() => setSelectedBooking(booking)}
                                            >
                                                <div className="flex justify-between items-start h-full">
                                                    <div>
                                                        <p className="font-black text-lg tracking-tight italic">
                                                            {booking.user_name || t('calendar.guest')}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2 opacity-60 font-black text-[10px] uppercase tracking-widest">
                                                            <Users size={12} />
                                                            <span>{booking.guests} {t('calendar.guestsCount')}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-4 py-2 rounded-xl italic tracking-widest ${colors.badge}`}>
                                                        {timeStr}
                                                    </span>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedBooking && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                            onClick={() => setSelectedBooking(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-slate-100">
                                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] italic">{t('calendar.booking')}</h2>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all border border-slate-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-[24px] bg-indigo-600 flex items-center justify-center text-white font-black text-3xl italic shadow-xl shadow-indigo-600/10">
                                        {(selectedBooking.user_name || 'G')[0]}
                                    </div>
                                    <div>
                                        <p className="font-black text-3xl text-slate-900 tracking-tighter italic leading-none">{selectedBooking.user_name || t('calendar.guest')}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] italic ${(selectedBooking.status && selectedBooking.status in STATUS_COLORS ? STATUS_COLORS[selectedBooking.status as keyof typeof STATUS_COLORS].bg + ' ' + STATUS_COLORS[selectedBooking.status as keyof typeof STATUS_COLORS].text : 'bg-slate-50 text-slate-400')}`}>
                                                {selectedBooking.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { icon: Calendar, label: t('calendar.date'), val: selectedBooking.date },
                                        { icon: Clock, label: t('calendar.time'), val: (selectedBooking.time || '').slice(0, 5) },
                                        { icon: Users, label: t('calendar.guests'), val: `${selectedBooking.guests} ${t('calendar.guestsCount')}` },
                                        { icon: Clock, label: t('calendar.duration'), val: `${(selectedBooking.duration_minutes ? selectedBooking.duration_minutes / 60 : (selectedBooking.duration_hours || 2))} ${t('calendar.durationHours')}` },
                                    ].map(({ icon: Icon, label, val }) => (
                                        <div key={label} className="bg-slate-50 rounded-[24px] p-5 border border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-400 mb-2 opacity-60">
                                                <Icon size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                                            </div>
                                            <p className="font-black text-slate-900 text-base italic">{val || '—'}</p>
                                        </div>
                                    ))}
                                </div>

                                {selectedBooking.comment && (
                                    <div className="bg-amber-50/50 rounded-[24px] p-6 border border-amber-100/50">
                                        <p className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest mb-2 italic">{t('calendar.comment')}</p>
                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">{selectedBooking.comment}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-slate-100 space-y-4 bg-slate-50/30">
                                {selectedBooking.status === 'pending' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleBookingAction(selectedBooking.id, 'reject')}
                                            disabled={actionSubmitting}
                                            className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-rose-600 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm border border-rose-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('bookings.reject')}
                                        </button>
                                        <button
                                            onClick={() => handleBookingAction(selectedBooking.id, 'confirm')}
                                            disabled={actionSubmitting}
                                            className="flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('bookings.confirm')}
                                        </button>
                                    </div>
                                )}

                                {selectedBooking.status === 'approved' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleBookingAction(selectedBooking.id, 'check_in')}
                                            disabled={actionSubmitting}
                                            className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-emerald-700 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm border border-emerald-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('bookings.checkIn')}
                                        </button>
                                        <button
                                            onClick={() => handleBookingAction(selectedBooking.id, 'complete')}
                                            disabled={actionSubmitting}
                                            className="flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-600/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('bookings.complete')}
                                        </button>
                                        <button
                                            onClick={() => handleBookingAction(selectedBooking.id, 'no_show')}
                                            disabled={actionSubmitting}
                                            className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-slate-700 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm border border-slate-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('bookings.noShow')}
                                        </button>
                                        <button
                                            onClick={() => handleBookingAction(selectedBooking.id, 'cancel_by_restaurant')}
                                            disabled={actionSubmitting}
                                            className="flex items-center justify-center gap-3 px-6 py-4 bg-white text-rose-600 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm border border-rose-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('bookings.cancelByRestaurant')}
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            setSelectedBooking(null);
                                            navigate('/app/messages', { state: { bookingId: selectedBooking.id, guestName: selectedBooking.user_name } });
                                        }}
                                        className="flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
                                    >
                                        <MessageSquare size={18} />
                                        {t('calendar.chat')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedBooking(null);
                                            navigate('/app/bookings');
                                        }}
                                        className="flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
                                    >
                                        {t('calendar.open')}
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
