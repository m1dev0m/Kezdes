import { Link, useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    Clock,
    ListTodo,
    LogIn,
    MapPin,
    Search,
    User,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useI18n } from '@/i18n';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Logo } from '@/components/ui/Logo';

export default function RestaurantPendingApproval() {
    const { t } = useI18n();
    const { logout, login } = useAuth();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        setError(null);
        try {
            const res = await api.get('/restaurants/requests/mine/');
            const request = res.data;

            if (request.status === 'approved') {
                // Request approved - refresh user data and redirect
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
            if (status === 401) {
                setError(t('pendingApproval.authRequired'));
                return;
            }
            if (status === 404) {
                navigate('/register?mode=restaurant');
                return;
            }
            setError(t('pendingApproval.checkFailed'));
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

        // Initial check
        checkRequestStatus();

        // Poll every 10 seconds
        const interval = setInterval(checkRequestStatus, 10000);

        return () => clearInterval(interval);
    }, []);

    const steps = [
        {
            step: 1,
            active: true,
            title: t('pendingApproval.steps.dataValidation.title'),
            desc: t('pendingApproval.steps.dataValidation.desc')
        },
        {
            step: 2,
            title: t('pendingApproval.steps.globalApproval.title'),
            desc: t('pendingApproval.steps.globalApproval.desc')
        },
        {
            step: 3,
            title: t('pendingApproval.steps.fullAccess.title'),
            desc: t('pendingApproval.steps.fullAccess.desc')
        },
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
            <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 lg:px-20">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <CheckCircle2 size={24} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight"><Logo /></h2>
                </Link>
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <User size={20} />
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
                <div className="max-w-[640px] w-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8 lg:p-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                    <div className="flex flex-col items-center text-center mb-12 relative z-10">
                        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-10 shadow-inner">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                        </div>

                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest mb-6 border border-amber-100 dark:border-amber-800">
                            <Clock size={12} className="mr-2" />
                            {t('pendingApproval.status')}
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6 text-slate-900 dark:text-white">{t('pendingApproval.title')}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
                            {t('pendingApproval.subtitle')}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-300 relative z-10">
                            <p className="text-sm font-bold">{error}</p>
                            <div className="mt-3 flex flex-wrap gap-3">
                                <Button
                                    onClick={checkRequestStatus}
                                    disabled={checking}
                                    className="rounded-2xl px-5 h-10"
                                >
                                    {checking ? t('pendingApproval.checking') : t('pendingApproval.checkNow')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate('/login')}
                                    className="rounded-2xl px-5 h-10"
                                >
                                    {t('pendingApproval.goToLogin')}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] p-8 lg:p-10 mb-12 border border-slate-100 dark:border-slate-800 relative z-10">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                            <ListTodo size={14} className="text-primary" />
                            {t('pendingApproval.process')}
                        </h3>

                        <div className="space-y-10">
                            {steps.map(({ step, active, title, desc }) => (
                                <div key={step} className="flex gap-6">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${active ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600'}`}>
                                        {step}
                                    </div>
                                    <div>
                                        <p className={`font-black tracking-tight ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{title}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-500 font-medium mt-1">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-slate-50 dark:border-slate-800 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('pendingApproval.approximateTime')}</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{t('pendingApproval.workingHours')}</span>
                            {lastCheck && (
                                <span className="text-xs text-slate-400 mt-1">
                                    {t('pendingApproval.lastCheck')}: {lastCheck.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={checkRequestStatus}
                                disabled={checking}
                                className="rounded-2xl px-6 h-12 flex items-center gap-2"
                            >
                                <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
                                {checking ? t('pendingApproval.checking') : t('pendingApproval.checkNow')}
                            </Button>
                            <Button onClick={logout} className="rounded-2xl px-8 h-12 flex items-center gap-2 shadow-xl shadow-primary/20">
                                <LogIn size={18} className="rotate-180" />
                                {t('pendingApproval.logoutAndCheckLater')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-16 flex flex-wrap justify-center gap-12 opacity-50">
                    <div className="flex flex-col items-center gap-2">
                        <MapPin className="text-slate-300 dark:text-slate-700" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t('pendingApproval.gpsVerified')}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <Search className="text-slate-300 dark:text-slate-700" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t('pendingApproval.profileFound')}</span>
                    </div>
                </div>
            </main>

            <footer className="py-10 text-center text-slate-400 dark:text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                {t('pendingApproval.footer')}
            </footer>
        </div>
    );
}
