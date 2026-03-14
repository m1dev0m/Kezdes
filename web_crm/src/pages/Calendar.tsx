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
    confirmed: { bg: 'bg-indigo-600', text: 'text-white', badge: 'bg-indigo-800/60' },
    pending: { bg: 'bg-amber-400', text: 'text-amber-950', badge: 'bg-amber-600/30' },
    approved: { bg: 'bg-emerald-600', text: 'text-white', badge: 'bg-emerald-800/60' },
    cancelled: { bg: 'bg-slate-300', text: 'text-slate-600', badge: 'bg-slate-400/30' },
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
        <div className="flex flex-col h-full -m-10 bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                        <CalendarRange size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white">{t('calendar.title')}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{formatDate(currentDate)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <AnimatePresence>
                        {showSearch && (
                            <motion.input
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 200, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                placeholder={t('calendar.guestSearch')}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium border-none outline-none text-slate-900 dark:text-white"
                            />
                        )}
                    </AnimatePresence>
                    <button
                        onClick={() => setShowSearch(s => !s)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        {showSearch ? <X size={18} /> : <Search size={18} />}
                    </button>

                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                        {[
                            { id: 'timeline', label: t('calendar.timeline') },
                            { id: 'day', label: t('calendar.day') },
                            { id: 'week', label: t('calendar.week') }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setViewMode(m.id)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === m.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentDate(d => addDays(d, viewMode === 'day' ? -1 : -7))}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-3 h-9 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            {t('calendar.today')}
                        </button>
                        <button
                            onClick={() => setCurrentDate(d => addDays(d, viewMode === 'day' ? 1 : 7))}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => navigate('/app/bookings')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <Plus size={16} />
                        {t('calendar.book')}
                    </button>
                </div>
            </div>

            {viewMode === 'week' && (
                <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <div className="w-16 shrink-0" />
                    {weekDays.map((d, i) => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        const isSelected = d.toDateString() === currentDate.toDateString();
                        return (
                            <button
                                key={i}
                                onClick={() => { setCurrentDate(d); setViewMode('day'); }}
                                className={`flex flex-col items-center py-3 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <span className="text-xs font-bold text-slate-400 uppercase">
                                    {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                </span>
                                <span className={`text-lg font-black mt-0.5 w-9 h-9 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {d.getDate()}
                                </span>
                                <span className="text-xs text-slate-400 mt-0.5">
                                    {bookings.filter(b => b.date === d.toISOString().slice(0, 10)).length || ''}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-1 px-6 pt-3 pb-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-colors border-b-2 -mb-px ${selectedTab === tab.id
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={`flex flex-1 min-h-0 bg-white dark:bg-slate-950 ${viewMode === 'timeline' ? 'overflow-auto' : ''}`}>
                <div ref={scrollRef} className={`flex-1 overflow-y-auto ${viewMode === 'timeline' ? 'min-w-max' : 'overflow-x-hidden'}`}>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                    ) : viewMode === 'timeline' ? (
                        <div className="flex flex-col relative w-full border-t border-slate-200 dark:border-slate-800">
                            <div className="flex sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="w-32 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-bold text-xs text-slate-500 uppercase">
                                    {t('calendar.tables')}
                                </div>
                                <div className="flex">
                                    {HOURS.map((h, i) => (
                                        <div key={i} className="w-32 shrink-0 p-3 border-r border-slate-100 dark:border-slate-800 text-center text-xs font-bold text-slate-500">
                                            {h}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                {tables.filter(_t => selectedTab === 'allHalls' || true).map((table, tIdx) => (
                                    <div key={table.id} className="flex relative border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors h-16 group">
                                        <div className="w-32 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center justify-center sticky left-0 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                                            <span className="font-black text-slate-900 dark:text-white text-lg">№{table.number}</span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                <Users size={10} /> {table.seats}
                                            </span>
                                        </div>
                                        <div className="flex relative">
                                            {HOURS.map((_, i) => (
                                                <div key={i} className="w-32 shrink-0 border-r border-slate-50 dark:border-slate-900/50 h-full pointer-events-none" />
                                            ))}

                                            {filteredBookings.filter(b => b.table_id === table.id || (!b.table_id && tIdx === 0)).map((booking) => {
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
                                                        drag="x"
                                                        dragConstraints={{ left: 0, right: HOURS.length * 128 - width }}
                                                        onDragEnd={(_e, info) => {
                                                            // Calculate new time based on x offset
                                                            const newOffsetMin = Math.round((left + info.offset.x) / 128 * 60);
                                                            const newH = Math.floor(newOffsetMin / 60) + START_HOUR;
                                                            const newM = newOffsetMin % 60;
                                                            // TODO: Call API to update booking time
                                                            toast(`Moved to ${newH}:${newM}`, { icon: '🕒' });
                                                        }}
                                                        key={'rt-' + booking.id}
                                                        layoutId={`booking-${booking.id}`}
                                                        style={{ left, width, top: 4, height: 56 }}
                                                        className={`absolute rounded-xl px-3 py-1 cursor-pointer flex flex-col justify-center shadow-md hover:shadow-lg transition-shadow border border-white/10 ${colors.bg}`}
                                                        onClick={() => setSelectedBooking(booking)}
                                                        whileHover={{ zIndex: 30, scale: 1.02 }}
                                                        whileDrag={{ zIndex: 40, scale: 1.05, opacity: 0.9 }}
                                                    >
                                                        <p className={`font-bold text-xs truncate ${colors.text}`}>
                                                            {booking.user_name || t('calendar.guest')}
                                                        </p>
                                                        <div className={`flex items-center gap-1 text-[10px] uppercase font-black tracking-widest mt-0.5 ${colors.text} opacity-80 truncate`}>
                                                            {booking.time?.substring(0, 5)} • {booking.guests} {t('calendar.guestsCount')}
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
                        <div className="flex relative">
                            <div className="w-16 shrink-0 border-r border-slate-100 dark:border-slate-800">
                                {HOURS.map((h, i) => (
                                    <div key={i} style={{ height: HOUR_HEIGHT }} className="relative flex items-start pt-2 pl-2">
                                        <span className="text-xs text-slate-400 font-medium tabular-nums">{h}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 relative">
                                {HOURS.map((_, i) => (
                                    <div key={i} style={{ top: i * HOUR_HEIGHT }} className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800 pointer-events-none" />
                                ))}
                                {HOURS.map((_, i) => (
                                    <div key={`h-${i}`} style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} className="absolute left-0 right-0 border-t border-dashed border-slate-50 dark:border-slate-900 pointer-events-none" />
                                ))}

                                {nightNow !== null && (
                                    <div style={{ top: nightNow }} className="absolute left-0 right-0 z-20 pointer-events-none">
                                        <div className="relative flex items-center">
                                            <div className="w-3 h-3 rounded-full bg-rose-500 -ml-1.5 shrink-0 shadow-lg shadow-rose-300" />
                                            <div className="flex-1 h-0.5 bg-rose-500 opacity-60" />
                                        </div>
                                    </div>
                                )}

                                <div style={{ height: HOURS.length * HOUR_HEIGHT + 40 }} className="relative">
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
                                                layoutId={`booking-${booking.id}`}
                                                style={{ top, height, left: '1%', width: '97%' }}
                                                className={`absolute rounded-2xl px-4 py-3 text-left overflow-hidden cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow ${colors.bg}`}
                                                onClick={() => setSelectedBooking(booking)}
                                                whileHover={{ scale: 1.01 }}
                                            >
                                                <div>
                                                    <p className={`font-bold text-sm truncate ${colors.text}`}>
                                                        {booking.user_name || t('calendar.guest')}
                                                    </p>
                                                    <div className={`flex items-center gap-1 mt-0.5 ${colors.text} opacity-80`}>
                                                        <Users size={11} />
                                                        <span className="text-xs">{booking.guests} {t('calendar.guestsCount')}</span>
                                                    </div>
                                                </div>
                                                <span className={`self-start text-xs font-bold px-2 py-0.5 rounded-lg ${colors.badge} ${colors.text}`}>
                                                    {timeStr}
                                                </span>
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
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                            onClick={() => setSelectedBooking(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                            className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">{t('calendar.booking')}</h2>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-black text-xl">
                                        {(selectedBooking.user_name || t('calendar.guest'))[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white text-lg">{selectedBooking.user_name || t('calendar.guest')}</p>
                                        <p className="text-sm text-slate-500 capitalize">#{selectedBooking.id}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { icon: Calendar, label: t('calendar.date'), val: selectedBooking.date },
                                        { icon: Clock, label: t('calendar.time'), val: (selectedBooking.time || '').slice(0, 5) },
                                        { icon: Users, label: t('calendar.guests'), val: `${selectedBooking.guests} ${t('calendar.guestsCount')}` },
                                        { icon: Clock, label: t('calendar.duration'), val: `${(selectedBooking.duration_minutes ? selectedBooking.duration_minutes / 60 : (selectedBooking.duration_hours || 2))} ${t('calendar.durationHours')}` },
                                    ].map(({ icon: Icon, label, val }) => (
                                        <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                                            <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                                                <Icon size={14} />
                                                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
                                            </div>
                                            <p className="font-black text-slate-900 dark:text-white text-sm">{val || '—'}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">{t('calendar.status')}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-black capitalize ${(selectedBooking.status && selectedBooking.status in STATUS_COLORS ? STATUS_COLORS[selectedBooking.status as keyof typeof STATUS_COLORS].bg : 'bg-slate-200')} ${(selectedBooking.status && selectedBooking.status in STATUS_COLORS ? STATUS_COLORS[selectedBooking.status as keyof typeof STATUS_COLORS].text : 'text-slate-800')}`}>
                                        {selectedBooking.status}
                                    </span>
                                </div>

                                {selectedBooking.comment && (
                                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-100 dark:border-amber-900">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">{t('calendar.comment')}</p>
                                        <p className="text-sm text-amber-900 dark:text-amber-200">{selectedBooking.comment}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedBooking(null);
                                        navigate('/app/messages', { state: { bookingId: selectedBooking.id, guestName: selectedBooking.user_name } });
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity"
                                >
                                    <MessageSquare size={16} />
                                    {t('calendar.chat')}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedBooking(null);
                                        navigate('/app/bookings');
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                                >
                                    {t('calendar.open')}
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
