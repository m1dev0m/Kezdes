import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { Search, CalendarDays, Plus, MessageSquare, RefreshCw, AlertCircle, Phone } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n/index.tsx';
import { ManualBookingForm } from '@/components/ManualBookingForm';

export default function Bookings() {
    const { t } = useI18n();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadBookings = async () => {
        setRefreshing(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            params.set('ordering', '-date,-time');
            const res = await api.get(`/bookings/my_restaurant/?${params.toString()}`);
            setBookings(res.data.results || (Array.isArray(res.data) ? res.data : []));
            setError(null);
        } catch {
            setError("Failed to fetch reservation stream");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadBookings();
        const interval = setInterval(loadBookings, 15000);
        return () => clearInterval(interval);
    }, [debouncedSearch]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'approved': return 'bg-success/10 text-success border-success/20';
            case 'seated': return 'bg-primary/10 text-primary border-primary/20';
            case 'pending': return 'bg-warning/10 text-warning border-warning/20';
            case 'rejected':
            case 'cancelled':
            case 'cancelled_by_user': return 'bg-danger/10 text-danger border-danger/20';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const handleAction = async (bookingId: number, action: string) => {
        try {
            await api.post(`/bookings/${bookingId}/${action}/`);
            toast.success(`Booking ${action} successful`);
            loadBookings();
        } catch {
            toast.error(`Failed to ${action} booking`);
        }
    };

    // Читаю DESIGN.md. Использую: bg=var(--bg-primary) text=var(--text-primary) surface=var(--bg-surface) primary=var(--color-primary)
    return (
        <div className="space-y-6 min-h-screen pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('bookings.title')}</h1>
                    <p className="text-sm text-slate-500 mt-1">Full Reservation Timeline</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> New Booking
                </button>
            </header>

            <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
                <div className="relative group flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-all" size={16} />
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Find guest by name or contact..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-md focus:border-primary transition-all shadow-sm outline-none text-sm font-medium"
                    />
                </div>
                <button onClick={loadBookings} className="h-10 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-500 hover:text-primary transition-all">
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                </button>
            </div>

            {loading && !bookings.length ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-24 bg-white rounded-md animate-pulse border border-slate-200 shadow-sm"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-4 bg-danger/10 text-danger rounded-md border border-danger/20 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p className="font-semibold text-sm">{error}</p>
                </div>
            ) : (
                <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-x-auto">
                    {bookings.length === 0 ? (
                        <div className="p-16 text-center space-y-3">
                            <CalendarDays size={48} className="mx-auto text-slate-200" />
                            <p className="text-slate-500 font-medium text-sm">No reservations found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pax</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Table</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {bookings.map((b, i) => (
                                    <motion.tr
                                        key={b.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: i * 0.03 }}
                                        className="hover:bg-slate-50 transition-colors group"
                                    >
                                        <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-700 font-bold text-xs shadow-sm">
                                                    {b.user_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-sm text-slate-900 block truncate max-w-[150px]">{b.user_name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm text-slate-600">
                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                <Phone size={12} className="text-slate-400" /> {b.user_phone}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm font-medium text-slate-900">{b.guests}</td>
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-900">{b.time?.substring(0, 5)}</span>
                                                <span className="text-xs text-slate-500">{new Date(b.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4">
                                            {b.table_number ? (
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200">T{b.table_number}</span>
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded flex items-center w-max gap-1.5 text-[11px] font-semibold border uppercase tracking-wider ${getStatusStyle(b.status)}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                {b.status_display || b.status}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5 opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-opacity">
                                                {b.status === 'pending' && (
                                                    <button onClick={() => handleAction(b.id, 'confirm')} className="px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded shadow-sm hover:bg-primary/90 transition-colors">Confirm</button>
                                                )}
                                                {(b.status === 'confirmed' || b.status === 'approved') && (
                                                    <button onClick={() => handleAction(b.id, 'seat')} className="px-2.5 py-1 bg-success text-white text-xs font-semibold rounded shadow-sm hover:bg-success/90 transition-colors">Seat</button>
                                                )}
                                                {b.status === 'seated' && (
                                                    <button onClick={() => handleAction(b.id, 'complete')} className="px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded shadow-sm hover:bg-slate-800 transition-colors">Complete</button>
                                                )}
                                                {['pending', 'confirmed', 'approved'].includes(b.status) && (
                                                    <button onClick={() => handleAction(b.id, 'cancel_by_restaurant')} className="px-2.5 py-1 bg-white border border-danger/30 text-danger text-xs font-semibold rounded shadow-sm hover:bg-danger/5 transition-colors">Cancel</button>
                                                )}
                                                {b.special_requests && (
                                                    <button onClick={() => toast("Special Request: " + b.special_requests)} className="px-2 py-1 ml-1 text-slate-400 hover:text-primary transition-colors" title="View Special Request">
                                                        <MessageSquare size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <ManualBookingForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={loadBookings}
            />
        </div>
    );
}
