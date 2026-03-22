import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { format, parseISO, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ArrowRight, Bell, CalendarDays, Heart, Loader2, MapPin, Star, Users, XCircle } from 'lucide-react';
import { useI18n } from '@/i18n';

interface Booking {
    id: number;
    restaurant_name: string;
    restaurant_photo_url?: string;
    restaurant_city?: string;
    date: string;
    time: string;
    guests: number;
    status: string;
    status_display: string;
}

export default function GuestDashboard() {
    const { t } = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

    useEffect(() => { loadBookings(); }, []);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bookings/');
            setBookings(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch {
            toast.error(t('guestDashboard.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id: number) => {
        setCancellingId(id);
        setConfirmCancelId(null);
        try {
            await api.post(`/bookings/${id}/cancel/`);
            toast.success(t('guestDashboard.reservationCancelled'));
            loadBookings();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || t('guestDashboard.couldNotCancel'));
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (d: string) => {
        const dt = parseISO(`${d}T00:00:00`);
        return isValid(dt) ? format(dt, 'EEE, d MMM', { locale: ru }) : d;
    };

    const activeBookings = bookings.filter(b => ['pending', 'approved', 'confirmed', 'payment_pending', 'arrived', 'seated'].includes(b.status));
    const pastBookings = bookings.filter(b => ['completed', 'no_show', 'cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'rejected'].includes(b.status));

    const upcomingBooking = activeBookings[0];

    const loyaltyPoints = useMemo(() => bookings.length * 150, [bookings.length]);
    const favoriteRestaurants = useMemo(() => {
        const map = new Map<string, { name: string; city?: string; photo?: string; rating?: number }>();
        for (const b of bookings) {
            if (!b.restaurant_name) continue;
            if (!map.has(b.restaurant_name)) {
                map.set(b.restaurant_name, {
                    name: b.restaurant_name,
                    city: b.restaurant_city,
                    photo: b.restaurant_photo_url,
                    rating: 4.8,
                });
            }
        }
        return Array.from(map.values()).slice(0, 2);
    }, [bookings]);

    const recentActivity = useMemo(() => {
        const items: Array<{ title: string; subtitle: string; badge?: string }> = [];
        const past = pastBookings.slice(0, 2);
        if (past[0]) {
            items.push({
                title: `Visited '${past[0].restaurant_name}'`,
                subtitle: `${formatDate(past[0].date)}`,
                badge: `EARNED +150 PTS`,
            });
        }
        if (past[1]) {
            items.push({
                title: `New Review: ${past[1].restaurant_name}`,
                subtitle: `${formatDate(past[1].date)}`,
            });
        }
        if (items.length === 0) {
            items.push({ title: 'Discover your next table', subtitle: 'Start exploring premium restaurants' });
        }
        return items.slice(0, 3);
    }, [pastBookings]);

    return (
        <div className="space-y-8 pb-20">
            <header className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Welcome back, {user?.username || 'Guest'}
                    </h1>
                    <p className="text-slate-500">
                        {activeBookings.length > 0
                            ? t('guestDashboard.upcomingReservations', { count: activeBookings.length })
                            : t('guestDashboard.noUpcomingReservations')}
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        className="relative text-slate-500 hover:text-brand-green transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand-green" />
                    </button>
                    <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                        <div className="text-right">
                            <p className="text-sm font-bold leading-none">{user?.username || 'Guest'}</p>
                            <p className="text-xs text-gold font-semibold">Gold Tier Member</p>
                        </div>
                        <div
                            className="size-10 rounded-full bg-brand-accent/30 ring-2 ring-brand-green/20 flex items-center justify-center text-brand-green font-bold text-sm"
                        >
                            {(user?.username?.charAt(0) || 'G').toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-brand-green" />
                            Upcoming Reservation
                        </h2>

                        {loading ? (
                            <div className="h-52 rounded-xl bg-white border border-slate-200 animate-pulse" />
                        ) : !upcomingBooking ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                                <p className="text-slate-500">{t('guestDashboard.noUpcomingReservations')}</p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/discover')}
                                    className="mt-6 bg-brand-green hover:bg-brand-green/90 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                                >
                                    {t('guestDashboard.findRestaurants')}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex flex-col md:flex-row">
                                <div className="w-full md:w-1/3 h-48 md:h-auto bg-slate-200 overflow-hidden">
                                    {upcomingBooking.restaurant_photo_url ? (
                                        <img
                                            src={upcomingBooking.restaurant_photo_url}
                                            alt={upcomingBooking.restaurant_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200" />
                                    )}
                                </div>

                                <div className="flex-1 p-6 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold tracking-widest text-brand-green uppercase">Confirmed • Upcoming</span>
                                            <span className="px-2 py-1 bg-brand-green/10 text-brand-green text-[10px] font-bold rounded uppercase tracking-wider">PREMIUM SEATING</span>
                                        </div>

                                        <h3 className="text-2xl font-bold mb-1">{upcomingBooking.restaurant_name}</h3>
                                        <p className="text-slate-500 flex items-center gap-2 text-sm mb-4">
                                            <MapPin className="w-4 h-4" />
                                            {upcomingBooking.restaurant_city || '—'}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <CalendarDays className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Date</p>
                                                    <p className="text-sm font-medium">{formatDate(upcomingBooking.date)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-slate-400">schedule</span>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Time</p>
                                                    <p className="text-sm font-medium">{upcomingBooking.time.substring(0, 5)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-6">
                                        <div className="flex -space-x-2">
                                            <div className="size-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">AT</div>
                                            <div className="size-8 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700">JT</div>
                                        </div>

                                        <div className="flex gap-2">
                                            {(['pending', 'approved', 'confirmed', 'payment_pending'].includes(upcomingBooking.status)) && (
                                                confirmCancelId === upcomingBooking.id ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmCancelId(null)}
                                                            className="px-4 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
                                                        >
                                                            {t('guestDashboard.keep')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancel(upcomingBooking.id)}
                                                            disabled={cancellingId === upcomingBooking.id}
                                                            className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-60"
                                                        >
                                                            {cancellingId === upcomingBooking.id
                                                                ? <Loader2 size={14} className="animate-spin" />
                                                                : <><XCircle size={14} /> {t('guestDashboard.cancel')}</>
                                                            }
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmCancelId(upcomingBooking.id)}
                                                        className="px-4 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
                                                    >
                                                        {t('guestDashboard.cancel')}
                                                    </button>
                                                )
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => navigate(`/guest/bookings/${upcomingBooking.id}`)}
                                                className="bg-brand-green hover:bg-[#2D5A4C] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Favorite Restaurants</h2>
                            <Link to="/guest/favorites" className="text-brand-green text-sm font-bold hover:underline">View All</Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(favoriteRestaurants.length ? favoriteRestaurants : [{ name: 'Oumi Sushi' }, { name: 'Terra E Mare' }]).map((r) => (
                                <div
                                    key={r.name}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 hover:border-brand-green/30 transition-all cursor-pointer group"
                                    onClick={() => navigate('/discover')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="size-20 rounded-lg bg-slate-200 shrink-0 overflow-hidden">
                                        {r.photo ? (
                                            <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold group-hover:text-brand-green transition-colors">{r.name}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{r.city || 'Premium'} • Discover</p>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-xs font-bold">{(r.rating ?? 4.8).toFixed(1)}</span>
                                            <span className="text-[10px] text-slate-400">(reviews)</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold mb-4">Dining Summary</h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-brand-green/5 p-5 rounded-xl border border-brand-green/10">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-brand-green flex items-center justify-center text-white">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black">{bookings.length}</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Bookings</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-slate-100 flex items-center justify-center text-brand-green">
                                        <Star className="w-6 h-6 fill-brand-green" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black">{loyaltyPoints.toLocaleString('ru-RU')}</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loyalty Points</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-slate-100 flex items-center justify-center text-brand-green">
                                        <Heart className="w-6 h-6 fill-brand-green" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black">French</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Top Cuisine</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {recentActivity.map((a, idx) => (
                                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                                        <p className="text-sm font-bold">{a.title}</p>
                                        <p className="text-xs text-slate-400 mb-2">{a.subtitle}</p>
                                        {a.badge && (
                                            <div className="flex items-center gap-1">
                                                <div className="bg-brand-green/10 text-brand-green text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight">{a.badge}</div>
                                            </div>
                                        )}
                                        {!a.badge && idx === 1 && (
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <Star key={i} className="w-3 h-3 text-brand-green fill-brand-green" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate('/guest/dashboard')}
                                className="w-full py-3 text-sm font-bold text-slate-500 hover:text-brand-green border-t border-slate-100 transition-colors"
                            >
                                View History
                            </button>
                        </div>
                    </section>

                    <section className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden text-white">
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-brand-green to-gold" />
                        <div className="relative z-10">
                            <h4 className="text-lg font-bold mb-2">{t('guestDashboard.weekendSpecial')}</h4>
                            <p className="text-sm text-slate-300 mb-4">{t('guestDashboard.promoText')}</p>
                            <button
                                type="button"
                                onClick={() => navigate('/discover')}
                                className="inline-flex items-center gap-2 text-gold font-bold text-sm hover:gap-3 transition-all"
                            >
                                {t('guestDashboard.exploreRestaurants')}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

