import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { motion } from 'framer-motion';

export default function RestaurantPendingApproval() {
    const { logout, login } = useAuth();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    const safeGetToken = (key: string) => {
        try {
            return localStorage.getItem(key);
        } catch {
            try {
                return sessionStorage.getItem(key);
            } catch {
                return null;
            }
        }
    };

    const checkRequestStatus = async () => {
        if (checking) return;
        setChecking(true);
        try {
            const res = await api.get('/restaurants/requests/mine/');
            const request = res.data;

            if (request.status === 'approved') {
                const token = safeGetToken('accessToken');
                const refreshToken = safeGetToken('refreshToken');
                if (token && refreshToken) {
                    await login(token, refreshToken);
                }
                navigate('/app/dashboard');
                return;
            }
            setLastCheck(new Date());
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 404) {
                navigate('/register?mode=restaurant');
            }
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        const token = safeGetToken('accessToken');
        const refreshToken = safeGetToken('refreshToken');
        if (!token || !refreshToken) {
            navigate('/register?mode=restaurant');
            return;
        }
        checkRequestStatus();
        const interval = setInterval(checkRequestStatus, 15000);
        return () => clearInterval(interval);
    }, []);

    const steps = [
        { id: 1, title: 'Data Validation', desc: 'Verifying business credentials', active: true, icon: 'verified_user' },
        { id: 2, title: 'Compliance Check', desc: 'Ensuring policy alignment', active: false, icon: 'gavel' },
        { id: 3, title: 'Final Activation', desc: 'Unlocking CRM dashboard', active: false, icon: 'rocket_launch' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8 font-display italic selection:bg-[#0047FF]/20">
            {/* Background Architecture */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px] opacity-10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-[#0047FF]/5 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 rounded-[3rem] p-12 md:p-20 shadow-2xl relative overflow-hidden text-center z-10"
            >
                <div className="absolute top-0 left-0 right-0 h-2 bg-slate-50 dark:bg-slate-800">
                    <motion.div
                        initial={{ width: '10%' }}
                        animate={{ width: '45%' }}
                        transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
                        className="h-full bg-[#0047FF] shadow-lg shadow-[#0047FF]/50"
                    />
                </div>

                <div className="mb-12 space-y-8">
                    <div className="size-24 bg-[#0047FF]/10 text-[#0047FF] rounded-[2rem] flex items-center justify-center mx-auto shadow-inner relative group">
                        <span className="material-symbols-outlined text-[48px] font-black animate-pulse">hourglass_top</span>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.4em] leading-none">Security Clearance Pending</p>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-[0.9]">Identity <span className="text-[#0047FF]">Under Review</span>.</h1>
                        <p className="text-slate-400 text-sm font-medium italic leading-relaxed max-w-sm mx-auto">
                            Our architecture team is currently validating your node integration. Expect synchronization within 2-4 hours.
                        </p>
                    </div>
                </div>

                <div className="space-y-6 py-10 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-px flex-1 bg-slate-50 dark:bg-slate-800" />
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Validation Pipeline</h3>
                        <div className="h-px flex-1 bg-slate-50 dark:bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {steps.map(step => (
                            <div key={step.id} className={`p-6 rounded-[1.5rem] border transition-all ${step.active
                                ? 'bg-white dark:bg-slate-800 border-[#0047FF] shadow-2xl shadow-[#0047FF]/10 ring-2 ring-[#0047FF]/5'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-40'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${step.active ? 'text-[#0047FF]' : 'text-slate-300'}`}>0{step.id}</span>
                                    {step.active && <span className="material-symbols-outlined text-[16px] text-[#0047FF] animate-spin">sync</span>}
                                </div>
                                <span className={`material-symbols-outlined text-[24px] mb-3 block ${step.active ? 'text-[#0047FF]' : 'text-slate-300'}`}>{step.icon}</span>
                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-1 leading-none">{step.title}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-normal mb-0">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-50 dark:border-slate-800">
                    <button
                        onClick={checkRequestStatus}
                        disabled={checking}
                        className="flex-1 h-16 bg-slate-950 dark:bg-slate-800 text-white px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl shadow-black/20 transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50 italic"
                    >
                        {checking ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : <span className="material-symbols-outlined text-[18px]">refresh</span>}
                        {checking ? 'Syncing...' : 'Handshake Now'}
                    </button>
                    <button
                        onClick={logout}
                        className="flex-1 h-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all italic"
                    >
                        <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                        Terminate
                    </button>
                </div>

                {lastCheck && (
                    <p className="mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic">
                        Last system handshake: {lastCheck.toLocaleTimeString()}
                    </p>
                )}
            </motion.div>

            <div className="mt-16 flex items-center gap-12 opacity-30">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[16px] font-black">lock</span>
                    <span className="text-[9px] font-black uppercase tracking-widest italic">Encrypted Stream</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[16px] font-black">verified</span>
                    <span className="text-[9px] font-black uppercase tracking-widest italic">Identity Linked</span>
                </div>
            </div>
        </div>
    );
}
