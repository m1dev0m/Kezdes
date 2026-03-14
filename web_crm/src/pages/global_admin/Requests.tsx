import { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

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
            toast.error('Failed to load requests');
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
                toast.success(`Restaurant approved!${c.password !== 'Existing user' ? ` Credentials: ${c.username} / ${c.password}` : ''}`);
            } else if (action === 'approve') {
                toast.success('Restaurant approved!');
            }
            loadRequests();
        } catch (error) {
            toast.error('Action failed. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const diffInMs = new Date().getTime() - new Date(dateStr).getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
    };

    const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

    return (
        <div className="flex-1 w-full max-w-[1400px] mx-auto text-slate-900 dark:text-slate-100 font-sans">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Application Review</h1>
                <p className="text-slate-500 dark:text-slate-400">Onboard and manage new restaurant partners entering the global platform.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {['all', 'pending', 'approved', 'rejected'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${filter === f ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto @container">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">Restaurant Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">Location</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">Links</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No applications found.</td></tr>
                            ) : filteredRequests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                <span className="material-symbols-outlined">restaurant</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{req.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Applied {getTimeAgo(req.created_at)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">{req.city}</td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm">
                                            <p className="text-slate-900 dark:text-slate-200">{req.phone}</p>
                                            <p className="text-slate-500 dark:text-slate-400">{req.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex gap-2 text-primary">
                                            {req.instagram && <a href={req.instagram} target="_blank" rel="noreferrer" className="material-symbols-outlined text-xl hover:scale-110 transition-transform cursor-pointer" title="Instagram">photo_camera</a>}
                                            {!req.instagram && <span className="text-slate-400 text-xs">None</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {req.status === 'pending' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                Pending Review
                                            </span>
                                        )}
                                        {req.status === 'approved' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                Verified
                                            </span>
                                        )}
                                        {req.status === 'rejected' && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                Rejected
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex justify-end gap-2">
                                            {req.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'approve')}
                                                        disabled={actionLoading === `${req.id}-approve`}
                                                        className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {actionLoading === `${req.id}-approve` ? 'Verifying...' : 'Verify & Send Invite'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'reject')}
                                                        disabled={actionLoading === `${req.id}-reject`}
                                                        className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {actionLoading === `${req.id}-reject` ? 'Rejecting...' : 'Reject'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
