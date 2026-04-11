import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';

import api from '@/services/api';

export default function Reports() {
    const { t } = useI18n();

    const reportTypes = [
        { id: 'bookings', name: t('reports.bookingHistory'), icon: 'calendar_month', color: 'text-blue-500 bg-blue-50/50', desc: t('reports.bookingHistoryDesc') },
        { id: 'revenue', name: t('reports.revenueReport'), icon: 'payments', color: 'text-emerald-500 bg-emerald-50/50', desc: t('reports.revenueReportDesc') },
        { id: 'customers', name: t('reports.guestDatabase'), icon: 'group', color: 'text-[#0047FF] bg-[#0047FF]/5', desc: t('reports.guestDatabaseDesc') },
        { id: 'occupancy', name: t('reports.tableOccupancy'), icon: 'table_restaurant', color: 'text-amber-500 bg-amber-50/50', desc: t('reports.tableOccupancyDesc') },
        { id: 'performance', name: t('reports.staffPerformance'), icon: 'query_stats', color: 'text-rose-500 bg-rose-50/50', desc: t('reports.staffPerformanceDesc') },
        { id: 'growth', name: t('reports.growthAnalytics'), icon: 'trending_up', color: 'text-indigo-500 bg-indigo-50/50', desc: t('reports.growthAnalyticsDesc') }
    ];

    const [generating, setGenerating] = useState<string | null>(null);

    const handleDownload = async (id: string, name: string) => {
        setGenerating(id);
        try {
            let endpoint = '';
            let filename = '';
            if (id === 'bookings') { endpoint = '/reports/bookings/excel/'; filename = 'bookings_report.xlsx'; }
            else if (id === 'customers') { endpoint = '/reports/customers/excel/'; filename = 'customers_report.xlsx'; }
            else if (id === 'revenue' || id === 'performance' || id === 'growth' || id === 'occupancy') { endpoint = '/reports/analytics/excel/'; filename = 'analytics_report.xlsx'; }
            else return;

            const response = await api.get(endpoint, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            
            toast.success(`${name} ${t('reports.reportGenerated')}`, {
                icon: '📊',
                style: { backgroundColor: '#0047FF', color: '#fff', fontWeight: 900, borderRadius: '20px' }
            });
        } catch (error) {
            console.error("Download failed", error);
            toast.error(t('reports.errorGenerating') || 'Failed to download report');
        } finally {
            setGenerating(null);
        }
    };

    return (
        <div className="max-w-[1440px] mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">{t('reports.title')}</h1>
                    <p className="text-lg text-slate-500 font-medium">{t('reports.subtitle')}</p>
                </div>
                <button className="h-14 px-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:border-[#0047FF] hover:text-[#0047FF] transition-all flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    {t('reports.recentStats')}
                </button>
            </header>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reportTypes.map((report) => (
                    <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 hover:shadow-2xl hover:shadow-[#0047FF]/10 transition-all group flex flex-col justify-between"
                    >
                        <div>
                            <div className={`size-16 rounded-3xl flex items-center justify-center mb-8 ${report.color} transition-all group-hover:bg-[#0047FF] group-hover:text-white`}>
                                <span className="material-symbols-outlined text-[32px]">{report.icon}</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3 italic">{report.name}</h3>
                            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-10">
                                {report.desc}
                            </p>
                        </div>

                        <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('reports.csv')}</span>
                                <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('reports.pdf')}</span>
                            </div>
                            <button
                                onClick={() => handleDownload(report.id, report.name)}
                                disabled={generating === report.id}
                                className="h-11 px-6 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0047FF] hover:text-white transition-all flex items-center gap-2 group/btn"
                            >
                                {generating === report.id ? (
                                    <div className="size-4 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                                ) : (
                                    <span className="material-symbols-outlined text-[18px] group-hover/btn:translate-y-0.5 transition-transform">download_for_offline</span>
                                )}
                                {generating === report.id ? 'Generating...' : t('reports.download')}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Premium CTA Section */}
            <div className="bg-[#0047FF] rounded-[3rem] p-16 text-white flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-2xl shadow-[#0047FF]/30">
                <div className="absolute top-0 right-0 size-[500px] bg-white/10 rounded-full blur-[100px] -mr-64 -mt-64" />
                <div className="relative z-10 space-y-4 text-center lg:text-left">
                    <div className="inline-block px-4 py-1.5 bg-black/20 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2 tracking-widest">Enterprise Access</div>
                    <h3 className="text-3xl md:text-5xl font-black tracking-tighter leading-none italic">{t('reports.enterpriseReports')}</h3>
                    <p className="text-white/70 font-medium text-lg max-w-xl">{t('reports.enterpriseReportsDesc')}</p>
                </div>
                <button className="relative z-10 h-16 px-12 bg-white text-[#0047FF] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:-translate-y-1 transition-all shadow-2xl shadow-black/20">
                    {t('reports.contactSupport')}
                </button>
            </div>
        </div>
    );
}
