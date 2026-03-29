import { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function Restaurants() {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadRestaurants();
    }, []);

    const loadRestaurants = async () => {
        try {
            const res = await api.get('/restaurants/');
            setRestaurants(res.data);
        } catch (error) {
            toast.error('Tactical map synchronization failed.');
        } finally {
            setLoading(false);
        }
    };

    const filtered = restaurants.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.address?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-12 italic">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.4em] italic leading-none">Global Architecture Hub</p>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-[0.9]">Node <span className="text-[#0047FF]">Inventory</span>.</h1>
                </div>

                <div className="relative group w-full md:w-96">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0047FF] transition-colors text-[24px]">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Scan for Nodes..."
                        className="w-full h-16 pl-16 pr-6 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-[#0047FF] rounded-[1.5rem] outline-none transition-all text-[11px] font-black uppercase tracking-widest italic shadow-xl shadow-black/5 placeholder:text-slate-200 dark:placeholder:text-slate-800"
                    />
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Node Presence</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Integrity Status</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Coordinates</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800">Supervisor ID</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-50 dark:border-slate-800 text-right">Access</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-10 py-10 bg-slate-50/50 dark:bg-slate-800/30" />
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-32 text-center opacity-30">
                                        <div className="flex flex-col items-center gap-4">
                                            <span className="material-symbols-outlined text-[64px]">dns</span>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Active Nodes Located</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map((restaurant) => (
                                <tr key={restaurant.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-6">
                                            <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                                                {restaurant.image ? (
                                                    <img src={restaurant.image} alt="" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[#0047FF] text-[28px]">token</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none mb-1">{restaurant.name}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{restaurant.phone || 'COMMS LINK INACTIVE'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center">
                                            {restaurant.is_verified ? (
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">
                                                    <span className="material-symbols-outlined text-[14px] font-bold">verified</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest italic leading-none">ELITE NODE</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-[14px] font-bold">report</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest italic leading-none">PENDING VERIF</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-3 max-w-[280px]">
                                            <span className="material-symbols-outlined text-slate-200 text-[20px]">location_on</span>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed italic truncate" title={restaurant.address}>
                                                {restaurant.address}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums tracking-widest uppercase italic">{restaurant.owner || '- UNIT-ID UNKNOWN -'}</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Core Supervisor</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <button className="size-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 hover:text-[#0047FF] hover:border-[#0047FF]/20 transition-all active:scale-95 shadow-sm">
                                            <span className="material-symbols-outlined text-[20px]">settings_accessibility</span>
                                        </button>
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
