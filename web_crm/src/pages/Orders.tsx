import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ShoppingBag, Clock, ChevronRight, ChevronLeft,
    Receipt, DollarSign, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
    useRestaurantSubscriptionSummary,
    type RestaurantSubscriptionSummary,
} from '@/features/subscription/useRestaurantSubscriptionSummary';
import { useI18n } from '@/i18n';

interface OrderItem {
    id: number;
    menu_item_name?: string;
    menu_item: { name: string; price: number } | number;
    quantity: number;
    price_snapshot: number;
}

interface Order {
    id: number;
    user_name?: string;
    user_email?: string;
    status: string;
    payment_status: string;
    total: number;
    total_amount?: number;
    reservation?: number;
    reservation_id?: number;
    items: OrderItem[];
    created_at: string;
}

function hasFeature(summary: RestaurantSubscriptionSummary | null, key: string): boolean {
    if (!summary) return false;
    const flag = summary.feature_flags?.[key];
    if (typeof flag === 'boolean') return flag;
    return summary.features?.some((feature) => feature.key === key && feature.enabled) ?? false;
}

export default function Orders() {
    const { t } = useI18n();
    const navigate = useNavigate();
    const { summary, loading: subscriptionLoading, error: subscriptionError, reload: reloadSubscription } = useRestaurantSubscriptionSummary();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const pageSize = 20;
    const canViewOrders = useMemo(() => hasFeature(summary, 'orders_basic'), [summary]);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.set('status', filter);
            params.set('page', String(page));
            params.set('page_size', String(pageSize));
            const res = await api.get(`/orders/my_restaurant/?${params.toString()}`);
            if (res.data.results) {
                setOrders(res.data.results);
                setTotalPages(Math.ceil((res.data.count || 0) / pageSize));
            } else {
                setOrders(Array.isArray(res.data) ? res.data : []);
                setTotalPages(1);
            }
            setError(null);
        } catch {
            const message = t('orders.failedToLoad');
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter, page, t]);

    useEffect(() => {
        if (subscriptionLoading || !summary) return;
        if (!canViewOrders) return;
        void load();
    }, [canViewOrders, filter, page, subscriptionLoading, summary, load]);

    if (subscriptionLoading && !summary) {
        return (
            <div className="space-y-6 pb-12">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="h-7 w-40 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-4 h-4 w-72 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="h-24 animate-pulse rounded-3xl bg-slate-50" />
                        <div className="h-24 animate-pulse rounded-3xl bg-slate-50" />
                        <div className="h-24 animate-pulse rounded-3xl bg-slate-50" />
                    </div>
                </div>
            </div>
        );
    }

    if (subscriptionError && !summary) {
        return (
            <div className="space-y-6 pb-12">
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>{subscriptionError}</div>
                        <button
                            type="button"
                            onClick={() => void reloadSubscription()}
                            className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
                        >
                            Повторить
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (summary && !canViewOrders) {
        return (
            <div className="space-y-6 pb-12">
                <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Orders</div>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Заказы недоступны на текущем тарифе</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                        Для работы с заказами нужен тариф Plus или ручное включение флага `orders_basic`.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate('/app/billing')}
                            className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-slate-700"
                        >
                            Открыть подписку
                        </Button>
                        {summary.upgrade_cta?.path ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => navigate(summary.upgrade_cta!.path)}
                                className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-slate-700"
                            >
                                {summary.upgrade_cta?.label ?? 'Открыть подписку'}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
            case 'DRAFT': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
            case 'CANCELLED': return 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400';
            default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const getPaymentStyles = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
            case 'UNPAID': return 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400';
            default: return 'bg-slate-50 text-slate-500';
        }
    };

    const totalRevenue = orders.filter(o => o.status === 'CONFIRMED').reduce((sum, o) => sum + (o.total || 0), 0);
    const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length;
    const draftCount = orders.filter(o => o.status === 'DRAFT').length;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{t('orders.title')}</h1>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">{t('orders.description')}</p>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={load}
                    className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-slate-700"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Обновить
                </Button>
            </div>

            {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100"
                        >
                            <RefreshCw size={14} />
                            Повторить
                        </button>
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-brand-dark/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500"><DollarSign size={20} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('orders.revenue')}</span>
                    </div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">₸{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="bg-white dark:bg-brand-dark/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500"><Receipt size={20} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('orders.confirmed')}</span>
                    </div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{confirmedCount}</span>
                </div>
                <div className="bg-white dark:bg-brand-dark/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500"><Clock size={20} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('orders.drafts')}</span>
                    </div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{draftCount}</span>
                </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-brand-dark/40 p-1.5 rounded-2xl w-fit border border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
                {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => { setFilter(s); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap ${filter === s ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                    >
                        {s || t('orders.all')}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <Skeleton className="h-20 w-full rounded-xl" count={5} />
                ) : orders.length === 0 ? (
                    <div className="bg-slate-50/50 dark:bg-brand-dark/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-24 text-center flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
                            <ShoppingBag size={32} className="text-slate-300 dark:text-slate-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">{t('orders.noOrders')}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-80">{t('orders.noOrdersDesc')}</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-brand-dark/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm">
                            <div
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex items-center justify-center text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-sm">
                                        #{order.id}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white text-base tracking-tight">{order.user_name || order.user_email || `${t('orders.order')} #${order.id}`}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5">
                                            {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} {t('orders.itemsCount')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0">
                                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${getStatusStyles(order.status)}`}>
                                        {order.status}
                                    </span>
                                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${getPaymentStyles(order.payment_status)}`}>
                                        {order.payment_status}
                                    </span>
                                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums ml-2">₸{(order.total || 0).toLocaleString()}</span>
                                    <ChevronRight size={20} className={`text-slate-300 dark:text-slate-600 transition-transform ${expandedId === order.id ? 'rotate-90' : ''}`} />
                                </div>
                            </div>

                            {expandedId === order.id && order.items && (
                                <div className="border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-brand-dark/20 p-6 md:p-8">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                                <th className="text-left pb-4"> {t('orders.item')}</th>
                                                <th className="text-center pb-4">{t('orders.qty')}</th>
                                                <th className="text-right pb-4">{t('orders.price')}</th>
                                                <th className="text-right pb-4">{t('orders.subtotal')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {order.items.map((item, idx) => {
                                                const name = item.menu_item_name || (typeof item.menu_item === 'object' ? item.menu_item.name : `${t('orders.item')} #${item.menu_item}`);
                                                return (
                                                    <tr key={idx}>
                                                        <td className="py-4 font-black text-slate-900 dark:text-white text-xs">{name}</td>
                                                        <td className="py-4 text-center text-slate-500 font-black text-[10px] tracking-widest">×{item.quantity}</td>
                                                        <td className="py-4 text-right text-slate-400 font-black text-[10px] tracking-widest tabular-nums">₸{Number(item.price_snapshot).toLocaleString()}</td>
                                                        <td className="py-4 text-right font-black text-slate-900 dark:text-white text-sm tabular-nums">₸{(item.quantity * Number(item.price_snapshot)).toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-slate-200 dark:border-slate-800">
                                                <td colSpan={3} className="pt-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('orders.total')}</td>
                                                <td className="pt-6 text-right text-2xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">₸{(order.total || 0).toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    {(order.reservation || order.reservation_id) && (
                                        <div className="mt-6 flex items-center gap-2">
                                            <span className="px-3 py-1.5 rounded-lg bg-primary/5 dark:bg-primary/5 text-primary dark:text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] border border-indigo-100 dark:border-primary/20">
                                                {t('orders.linkedToReservation')} #{order.reservation || order.reservation_id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/app/bookings?id=${order.reservation || order.reservation_id}`)}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-50"
                                            >
                                                Открыть бронь
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('orders.page')} {page} / {totalPages}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-10 w-10 p-0 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark/50">
                            <ChevronLeft size={18} />
                        </Button>
                        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-10 w-10 p-0 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark/50">
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
