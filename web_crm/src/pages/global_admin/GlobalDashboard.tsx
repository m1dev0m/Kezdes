import { useEffect, useState } from 'react';
import { Users, Store, FileText, CalendarDays } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';

export default function GlobalDashboard() {
    const { t } = useI18n();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await api.get('/analytics/system/');
            setStats(res.data);
        } catch (error) {
            toast.error(t('globalAdmin.failedToLoadStats'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">{t('globalAdmin.loadingStats')}</div>;

    const cards = [
        { name: t('globalAdmin.totalRestaurants'), value: stats?.total_restaurants || 0, icon: Store, color: 'text-blue-600', bg: 'bg-blue-100' },
        { name: t('globalAdmin.activeUsers'), value: stats?.total_users || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { name: t('globalAdmin.totalBookings'), value: stats?.total_bookings || 0, icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { name: t('globalAdmin.pendingRequests'), value: stats?.pending_requests || 0, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('globalAdmin.systemOverview')}</h1>
                <p className="text-sm font-medium text-slate-500">{t('globalAdmin.globalMetrics')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((stat) => (
                    <div key={stat.name} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.name}</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">{t('globalAdmin.recentActivity')}</h3>
                </div>
                <div className="p-10 text-sm font-medium text-slate-500 leading-relaxed">
                    {t('globalAdmin.operationalStatus')}
                </div>
            </div>
        </div>
    );
}
