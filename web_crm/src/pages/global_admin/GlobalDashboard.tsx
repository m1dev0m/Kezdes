import { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function GlobalDashboard() {
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
            toast.error('System synchronization failure.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="size-16 border-4 border-[#0047FF]/20 border-t-[#0047FF] rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic animate-pulse">Synchronizing Global Metrics...</p>
            </div>
        );
    }

    const cards = [
        { name: 'Active Nodes', value: stats?.total_restaurants || 0, icon: 'dns', color: 'text-[#0047FF]', bg: 'bg-[#0047FF]/10' },
        { name: 'Authorized Personnel', value: stats?.total_users || 0, icon: 'badge', color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
        { name: 'Committed Bookings', value: stats?.total_bookings || 0, icon: 'task_alt', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
        { name: 'Pending Handshakes', value: stats?.pending_requests || 0, icon: 'sync_problem', color: 'text-amber-600', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="space-y-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.4em] italic leading-none">System Architecture Overview</p>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-[0.9]">Global <span className="text-[#0047FF]">Command</span></h1>
                </div>
                <div className="flex gap-4">
                    <button className="h-14 px-8 bg-slate-950 dark:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 italic hover:bg-black transition-all">
                        <span className="material-symbols-outlined text-[20px]">download</span> Export Intelligence
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {cards.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={stat.name}
                        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10 shadow-2xl shadow-black/5 hover:shadow-[#0047FF]/10 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 size-32 bg-slate-50 dark:bg-slate-800/50 rounded-bl-[4rem] -mr-16 -mt-16 group-hover:bg-[#0047FF]/5 transition-colors" />

                        <div className="relative z-10 space-y-8">
                            <div className={`size-16 rounded-[1.5rem] ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <span className={`material-symbols-outlined text-[32px] ${stat.color}`}>{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 italic">{stat.name}</p>
                                <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums leading-none italic">{stat.value}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-[1.5fr,1fr] gap-10">
                <section className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl shadow-black/5">
                    <div className="px-12 py-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-[#0047FF] text-[24px]">analytics</span>
                            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic">Environmental Pulse</h3>
                        </div>
                        <button className="text-[9px] font-black text-[#0047FF] uppercase tracking-widest italic hover:underline">Full Audit</button>
                    </div>
                    <div className="p-12 space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black uppercase text-slate-500 italic">Network Throughput</span>
                                <span className="text-[10px] font-black uppercase text-[#0047FF] italic">94% Capacity</span>
                            </div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '94%' }}
                                    className="h-full bg-[#0047FF] rounded-full shadow-lg shadow-[#0047FF]/20"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest leading-none">Uptime Protocol</p>
                                <p className="text-2xl font-black italic uppercase tracking-tighter">99.98%</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest leading-none">Security Index</p>
                                <p className="text-2xl font-black italic uppercase tracking-tighter">ELITE</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-2xl shadow-black/20 relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 size-[400px] bg-[#0047FF]/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-[#0047FF]/15 transition-colors" />

                    <div className="relative z-10 space-y-4">
                        <span className="material-symbols-outlined text-[#0047FF] text-[40px] font-bold">dynamic_feed</span>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-tight">Operational <br />Status Link</h3>
                        <p className="text-white/40 text-sm font-medium italic leading-relaxed">System architecture stable. All nodes reporting positive synchronization. Handshake queue: LOW.</p>
                    </div>

                    <div className="relative z-10 pt-10">
                        <div className="flex items-center gap-3 animate-pulse">
                            <span className="size-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 italic">All Systems Operational</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
