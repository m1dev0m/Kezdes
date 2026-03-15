import { useState, useEffect } from 'react';
import {
    ShoppingBag, Clock, ChevronRight, ChevronLeft,
    Receipt, DollarSign
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
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

export default function Orders() {
    const { t } = useI18n();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const pageSize = 20;

    useEffect(() => {
        load();
    }, [filter, page]);

    const load = async () => {
        setLoading(true);
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
        } catch {
            toast.error(t('orders.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('orders.title')}</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">{t('orders.description')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500"><DollarSign size={18} /></div>
                        <span className="text-xs font-medium text-slate-500">{t('orders.revenue')}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">₸{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500"><Receipt size={18} /></div>
                        <span className="text-xs font-medium text-slate-500">{t('orders.confirmed')}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{confirmedCount}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500"><Clock size={18} /></div>
                        <span className="text-xs font-medium text-slate-500">{t('orders.drafts')}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{draftCount}</span>
                </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-800">
                {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => { setFilter(s); setPage(1); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${filter === s ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        {s || t('orders.all')}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <Skeleton className="h-20 w-full rounded-xl" count={5} />
                ) : orders.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center">
                        <ShoppingBag size={48} className="mx-auto mb-4 text-slate-200" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t('orders.noOrders')}</h3>
                        <p className="text-sm text-slate-400 mt-1">{t('orders.noOrdersDesc')}</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                            <div
                                className="p-5 flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold text-xs">
                                        #{order.id}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{order.user_name || order.user_email || `${t('orders.order')} #${order.id}`}</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                            {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} {t('orders.itemsCount')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusStyles(order.status)}`}>
                                        {order.status}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getPaymentStyles(order.payment_status)}`}>
                                        {order.payment_status}
                                    </span>
                                    <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">₸{(order.total || 0).toLocaleString()}</span>
                                    <ChevronRight size={18} className={`text-slate-300 transition-transform ${expandedId === order.id ? 'rotate-90' : ''}`} />
                                </div>
                            </div>

                            {expandedId === order.id && order.items && (
                                <div className="border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs font-medium text-slate-500">
                                                <th className="text-left pb-3">{t('orders.item')}</th>
                                                <th className="text-center pb-3">{t('orders.qty')}</th>
                                                <th className="text-right pb-3">{t('orders.price')}</th>
                                                <th className="text-right pb-3">{t('orders.subtotal')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {order.items.map((item, idx) => {
                                                const name = item.menu_item_name || (typeof item.menu_item === 'object' ? item.menu_item.name : `${t('orders.item')} #${item.menu_item}`);
                                                return (
                                                    <tr key={idx}>
                                                        <td className="py-3 font-bold text-slate-900 dark:text-white">{name}</td>
                                                        <td className="py-3 text-center text-slate-500 font-bold">×{item.quantity}</td>
                                                        <td className="py-3 text-right text-slate-500 font-medium">₸{Number(item.price_snapshot).toLocaleString()}</td>
                                                        <td className="py-3 text-right font-black text-slate-900 dark:text-white">₸{(item.quantity * Number(item.price_snapshot)).toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                                <td colSpan={3} className="pt-3 text-right text-xs font-medium text-slate-500">{t('orders.total')}</td>
                                                <td className="pt-3 text-right text-lg font-bold text-slate-900 dark:text-white tabular-nums">₸{(order.total || 0).toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    {(order.reservation || order.reservation_id) && (
                                        <p className="mt-4 text-xs font-medium text-slate-500">
                                            {t('orders.linkedToReservation')} #{order.reservation || order.reservation_id}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-medium text-slate-500">{t('orders.page')} {page} {t('orders.of')} {totalPages}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                            <ChevronLeft size={16} />
                        </Button>
                        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
