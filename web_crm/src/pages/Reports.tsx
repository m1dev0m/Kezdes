import { useState } from 'react';
import {
    Download,
    Calendar,
    Users,
    Table as TableIcon,
    ChefHat,
    TrendingUp,
    CreditCard,
    BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n';

export default function Reports() {
    const { t } = useI18n();

    const reportTypes = [
        { id: 'bookings', name: t('reports.bookingHistory'), icon: Calendar, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10', desc: t('reports.bookingHistoryDesc') },
        { id: 'revenue', name: t('reports.revenueReport'), icon: CreditCard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', desc: t('reports.revenueReportDesc') },
        { id: 'customers', name: t('reports.guestDatabase'), icon: Users, color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10', desc: t('reports.guestDatabaseDesc') },
        { id: 'occupancy', name: t('reports.tableOccupancy'), icon: TableIcon, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', desc: t('reports.tableOccupancyDesc') },
        { id: 'performance', name: t('reports.staffPerformance'), icon: ChefHat, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10', desc: t('reports.staffPerformanceDesc') },
        { id: 'growth', name: t('reports.growthAnalytics'), icon: TrendingUp, color: 'text-primary bg-primary/5 dark:bg-primary/5', desc: t('reports.growthAnalyticsDesc') }
    ];

    const [generating, setGenerating] = useState<string | null>(null);

    const handleDownload = (id: string, name: string) => {
        setGenerating(id);
        setTimeout(() => {
            setGenerating(null);
            toast.success(`${name} ${t('reports.reportGenerated')}`);
        }, 1200);
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('reports.title')}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('reports.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="md">
                        <BarChart3 className="w-4 h-4 mr-2" /> {t('reports.recentStats')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportTypes.map((report) => (
                    <motion.div
                        key={report.id}
                        whileHover={{ y: -4 }}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${report.color}`}>
                            <report.icon size={28} />
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight mb-2">{report.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-xs leading-relaxed mb-8">
                            {report.desc}
                        </p>

                        <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('reports.csv')}</span>
                                <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('reports.pdf')}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(report.id, report.name)}
                                isLoading={generating === report.id}
                                className="text-[10px] uppercase font-black tracking-widest"
                            >
                                {!generating && <Download size={14} className="mr-2" />}
                                {t('reports.download')}
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-slate-900 dark:bg-slate-800 rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-700/20 blur-[100px] rounded-full"></div>
                <div className="relative z-10 space-y-4 text-center md:text-left">
                    <h3 className="text-2xl font-black tracking-tight">{t('reports.enterpriseReports')}</h3>
                    <p className="text-slate-400 font-medium max-w-md">{t('reports.enterpriseReportsDesc')}</p>
                </div>
                <Button variant="secondary" size="lg" className="relative z-10 bg-white text-slate-900 border-none hover:bg-slate-100 uppercase text-[10px] tracking-widest font-black">
                    {t('reports.contactSupport')}
                </Button>
            </div>
        </div>
    );
}
