import { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Requests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/restaurants/requests/');
            const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
            setRequests(list);
        } catch (error) {
            toast.error('Application data synchronization failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        setActionLoading(`${id}-${action}`);
        try {
            const res = await api.post(`/restaurants/requests/${id}/${action}/`);
            if (action === 'approve' && res.data?.credentials) {
                const c = res.data.credentials;
                toast.success(`Protocol initialized!${c.password !== 'Existing user' ? ` Access: ${c.username} / ${c.password}` : ''}`);
            } else if (action === 'approve') {
                toast.success('Node authorized.');
            }
            loadRequests();
        } catch (error) {
            toast.error('Handshake failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const diffInMs = new Date().getTime() - new Date(dateStr).getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInHours < 24) return `${diffInHours}H`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}D`;
    };

    const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

    return (
        <div className="space-y-12 italic">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.4em] italic leading-none">Partner Integration Terminal</p>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-[0.9]">Application <span className="text-[#0047FF]">Review</span>.</h1>
                </div>

                <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-black/5">
                    {['all', 'pending', 'approved', 'rejected'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-6 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === f
                                ? 'bg-[#0047FF] text-white shadow-lg shadow-[#0047FF]/20'
                                : 'text-slate-400 hover:text-[#0047FF]'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-black/5 border border-slate-50 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Node Identity</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Geographic Data</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Comms Link</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Visual Archives</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Status</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">Sequence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-10 py-8 h-20 bg-slate-50/50 dark:bg-slate-800/20" />
                                    </tr>
                                ))
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-32 text-center">
                                        <div className="space-y-4 opacity-30">
                                            <span className="material-symbols-outlined text-[64px]">inbox</span>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Handshake Queue Empty</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {filteredRequests.map((req, i) => (
                                        <motion.tr
                                            key={req.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[#0047FF] border border-slate-100 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-110">
                                                        <span className="material-symbols-outlined text-[24px]">restaurant</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none mb-1 text-lg">{req.name}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Transmitted: {getTimeAgo(req.created_at)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest italic">{req.city}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Node Cluster</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-900 dark:text-white italic tabular-nums leading-none tracking-widest uppercase">{req.phone}</p>
                                                    <p className="text-[9px] font-black text-[#0047FF] uppercase tracking-widest italic leading-none">{req.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex gap-4">
                                                    {req.instagram && (
                                                        <a href={req.instagram} target="_blank" rel="noreferrer" className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-[#0047FF] transition-all border border-slate-100 dark:border-slate-700 hover:scale-110" title="Instagram Intelligence">
                                                            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                                                        </a>
                                                    )}
                                                    {!req.instagram && <span className="text-slate-300 text-[9px] font-black italic uppercase tracking-widest">No Record</span>}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex justify-end gap-3">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAction(req.id, 'approve')}
                                                                disabled={actionLoading === `${req.id}-approve`}
                                                                className="h-12 px-6 bg-[#0047FF] text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-[#0047FF]/20 hover:bg-[#0039cc] transition-all disabled:opacity-50 italic flex items-center gap-2"
                                                            >
                                                                {actionLoading === `${req.id}-approve` ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">task_alt</span>}
                                                                Authorize
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(req.id, 'reject')}
                                                                disabled={actionLoading === `${req.id}-reject`}
                                                                className="h-12 px-6 bg-rose-500/10 text-rose-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-rose-500/20 transition-all disabled:opacity-50 italic flex items-center gap-2"
                                                            >
                                                                {actionLoading === `${req.id}-reject` ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">block</span>}
                                                                Deny
                                                            </button>
                                                        </>
                                                    )}
                                                    {req.status !== 'pending' && (
                                                        <button className="h-12 w-12 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 hover:text-[#0047FF] transition-all">
                                                            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const configs: any = {
        pending: { color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Evaluation Required', icon: 'pending' },
        approved: { color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Identity Verified', icon: 'verified' },
        rejected: { color: 'text-rose-600', bg: 'bg-rose-500/10', label: 'Access Denied', icon: 'gpp_bad' },
    };

    const cfg = configs[status] || configs.pending;

    return (
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${cfg.bg} ${cfg.color} border border-current/10`}>
            <span className="material-symbols-outlined text-[14px] font-bold">{cfg.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest italic">{cfg.label}</span>
        </div>
    );
}
