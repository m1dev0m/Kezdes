import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';
import {
    Users,
    Store,
    ClipboardList,
    CheckCircle2,
    XCircle,
    BarChart3,
    CalendarDays,
    Shield,
    Clock,
    Loader2,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';

interface RestaurantRequest {
    id: number;
    name: string;
    email: string;
    phone: string;
    city: string;
    address: string;
    status: string;
    created_at: string;
}

interface SystemStats {
    total_restaurants: number;
    active_restaurants: number;
    total_users: number;
    total_bookings: number;
    bookings_today: number;
    pending_requests: number;
}

interface Restaurant {
    id: number;
    name: string;
    city: string;
    address: string;
    is_verified: boolean;
    capacity: number;
}

export default function GlobalAdmin() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [tab, setTab] = useState<'applications' | 'stats' | 'restaurants'>('applications');
    const [requests, setRequests] = useState<RestaurantRequest[]>([]);
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'applications') {
                const res = await api.get('/restaurants/requests/?status=pending');
                setRequests(Array.isArray(res.data) ? res.data : res.data.results || []);
            } else if (tab === 'stats') {
                const res = await api.get('/analytics/system/');
                setStats(res.data);
            } else if (tab === 'restaurants') {
                const res = await api.get('/restaurants/');
                setRestaurants(Array.isArray(res.data) ? res.data : res.data.results || []);
            }
        } catch {
            toast.error(t('globalAdmin.failedToLoadStats'));
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        setActionLoading(id);
        try {
            await api.post(`/restaurants/requests/${id}/approve/`);
            toast.success(t('globalAdmin.successApprove', { defaultValue: 'Restaurant approved! Admin account created.' }));
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.detail || t('common.error'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: number) => {
        setActionLoading(id);
        try {
            await api.post(`/restaurants/requests/${id}/reject/`);
            toast.success(t('globalAdmin.successReject', { defaultValue: 'Application rejected.' }));
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.detail || t('common.error'));
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">{t('globalAdmin.title')}</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('globalAdmin.systemOverview')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{user?.username}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
                <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit shadow-sm">
                    {[
                        { key: 'applications', label: t('globalAdmin.requests'), icon: ClipboardList },
                        { key: 'stats', label: t('globalAdmin.systemStats', { defaultValue: 'Система' }), icon: BarChart3 },
                        { key: 'restaurants', label: t('globalAdmin.restaurants'), icon: Store },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === key
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'applications' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('globalAdmin.pendingRequestsTitle')}</h2>
                                <p className="text-slate-500 text-sm mt-1">{t('globalAdmin.requestsSubtitle', { defaultValue: 'Проверьте и одобрите заявки от ресторанов.' })}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
                                <span className="text-amber-700 font-black text-sm">{requests.length} {t('globalAdmin.pending', { defaultValue: 'Ожидает' })}</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-slate-100" />
                                ))}
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-24 text-center">
                                <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-6" />
                                <h3 className="text-xl font-black text-slate-900 mb-2">{t('globalAdmin.allCaughtUp', { defaultValue: 'Все проверено!' })}</h3>
                                <p className="text-slate-500 text-sm">{t('globalAdmin.noPending', { defaultValue: 'Нет новых заявок.' })}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {requests.map((req) => (
                                    <div
                                        key={req.id}
                                        className="bg-white border border-slate-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                            <div className="flex items-center gap-5 flex-1">
                                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-xl shrink-0">
                                                    {req.name?.charAt(0) || 'R'}
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight truncate">{req.name}</h3>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                        <span className="font-medium">{req.email}</span>
                                                        <span>•</span>
                                                        <span className="font-medium">{req.phone}</span>
                                                        <span>•</span>
                                                        <span className="font-medium">{req.city}{req.address ? `, ${req.address}` : ''}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-4">
                                                    <Clock size={12} />
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </div>
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    disabled={actionLoading === req.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50"
                                                >
                                                    {actionLoading === req.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                    {t('globalAdmin.reject')}
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(req.id)}
                                                    disabled={actionLoading === req.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-200 disabled:opacity-50"
                                                >
                                                    {actionLoading === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    {t('globalAdmin.approve')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'stats' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('globalAdmin.globalMetrics')}</h2>
                            <p className="text-slate-500 text-sm mt-1">{t('globalAdmin.globalMetricsDesc', { defaultValue: 'Показатели всей платформы.' })}</p>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-slate-100" />)}
                            </div>
                        ) : stats ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { label: t('globalAdmin.totalRestaurants'), value: stats.total_restaurants, icon: Store, color: 'text-primary bg-primary/10' },
                                    { label: t('globalAdmin.activeRestaurants', { defaultValue: 'Активные рестораны' }), value: stats.active_restaurants, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                                    { label: t('globalAdmin.activeUsers'), value: stats.total_users, icon: Users, color: 'text-purple-600 bg-purple-50' },
                                    { label: t('globalAdmin.totalBookings'), value: stats.total_bookings, icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
                                    { label: t('globalAdmin.bookingsToday', { defaultValue: 'Сегодня' }), value: stats.bookings_today, icon: Clock, color: 'text-amber-600 bg-amber-50' },
                                    { label: t('globalAdmin.pendingRequests'), value: stats.pending_requests, icon: ClipboardList, color: 'text-rose-600 bg-rose-50' },
                                ].map((card, i) => (
                                    <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${card.color}`}>
                                            <card.icon size={24} />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{card.value.toLocaleString()}</h3>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                )}

                {tab === 'restaurants' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('globalAdmin.restaurants')}</h2>
                            <p className="text-slate-500 text-sm mt-1">{restaurants.length} {t('globalAdmin.restaurantsInSystem', { defaultValue: 'ресторанов в системе' })}.</p>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-100" />)}
                            </div>
                        ) : restaurants.length === 0 ? (
                            <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-20 text-center">
                                <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 font-bold">{t('globalAdmin.noRestaurants', { defaultValue: 'Рестораны не найдены.' })}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {restaurants.map((rest) => (
                                    <div key={rest.id} className="bg-white border border-slate-100 rounded-2xl px-6 py-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900 font-black text-lg">
                                                {rest.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 tracking-tight">{rest.name}</h3>
                                                <p className="text-xs font-medium text-slate-400">{rest.city}{rest.address ? ` · ${rest.address}` : ''}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${rest.is_verified
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                }`}>
                                                {rest.is_verified ? t('common.verified', { defaultValue: 'Проверен' }) : t('common.pending', { defaultValue: 'Ожидает' })}
                                            </div>
                                            {rest.capacity > 0 && (
                                                <span className="text-xs font-bold text-slate-400">{rest.capacity} {t('tables.seatsCount')}</span>
                                            )}
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

