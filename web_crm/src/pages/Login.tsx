import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Logo } from '@/components/ui/Logo';
export default function Login() {
    const { t } = useI18n();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) {
            toast.error('Введите имя пользователя или email');
            return;
        }

        if (!password) {
            toast.error('Введите пароль');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/login/', { username, password });
            await login(res.data.access, res.data.refresh);
            toast.success(t('auth.welcomeBack'));

            navigate('/');
        } catch {
            toast.error(t('auth.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg focus:border-slate-900 dark:focus:border-white transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium";
    const labelCls = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-0.5";

    return (
        <div className="flex min-h-screen w-full bg-white">
            {/* Left side: Content */}
            <div className="flex w-full flex-col lg:w-1/2 p-8 md:p-12 lg:p-20 xl:p-24 justify-center border-r border-slate-100 dark:border-slate-900">
                <div className="max-w-sm w-full mx-auto">
                    <Link to="/" className="mb-16 flex items-center gap-2 group w-fit">
                        <div className="bg-indigo-600 p-2 rounded-lg transition-transform group-hover:scale-105 group-hover:rotate-3 shadow-md">
                            <Logo className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase px-1 text-indigo-600">KEZDES</span>
                    </Link>

                    <div className="mb-10">
                        <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase tracking-widest">{t('auth.welcomeBack')}</h1>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            {t('auth.signIn')} — <span className="text-slate-300 font-medium lowercase">platform for modern venues</span>
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label className={labelCls}>{t('auth.username')}</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">person</span>
                                <input
                                    className={inputCls}
                                    placeholder="your@email.com"
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-0.5">
                                <label className={labelCls}>{t('auth.password')}</label>
                                <button type="button" className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors mb-2">
                                    {t('auth.forgotPassword')}
                                </button>
                            </div>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">lock</span>
                                <input
                                    className={`${inputCls} pr-12`}
                                    placeholder="••••••••"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    <span>{t('auth.signIn')}</span>
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-6">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            {t('auth.noAccount')}{' '}
                            <Link to="/register" className="text-indigo-600 font-black hover:underline underline-offset-4 ml-1.5">{t('auth.createAccount')}</Link>
                        </p>

                        <div className="flex items-center gap-6">
                            <Link to="/register?mode=restaurant" className="group flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-all">
                                <span className="material-symbols-outlined text-base group-hover:-translate-y-0.5 transition-transform">storefront</span>
                                {t('restaurant.registration')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: Illustration/Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden items-center justify-center p-24">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-200/50 rounded-full -mr-96 -mt-96 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-slate-200/50 rounded-full -ml-72 -mb-72 blur-3xl opacity-50" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 max-w-lg w-full">
                    <div className="mb-12 inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Enterprise Ready Platform</span>
                    </div>

                    <h2 className="text-5xl font-black leading-[1.05] mb-8 tracking-tighter text-slate-900 uppercase italic">
                        Precision tools for <br />
                        <span className="text-slate-400 not-italic">elite hospitality.</span>
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed mb-12 uppercase tracking-wide opacity-80">
                        Everything you need to run a successful restaurant in one sophisticated dashboard. Join the leaders.
                    </p>

                    <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                        {[
                            { icon: 'table_restaurant', label: 'Dynamic Layouts', desc: 'Real-time floor management' },
                            { icon: 'event_repeat', label: 'Autonomous Booking', desc: 'Zero-touch reservation flow' },
                            { icon: 'insights', label: 'Predictive Analytics', desc: 'AI-driven growth insights' },
                            { icon: 'support_agent', label: 'White Glove Support', desc: 'Dedicated 24/7 assistance' },
                        ].map(({ icon, label, desc }) => (
                            <div key={label} className="group cursor-default">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm transition-all group-hover:bg-indigo-600 group-hover:text-white">
                                        <span className="material-symbols-outlined text-xl">{icon}</span>
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-900">{label}</span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight ml-11 opacity-60 group-hover:opacity-100 transition-opacity">{desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Preview UI decoration */}
                    <div className="mt-20 relative">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-slate-200/50 to-transparent blur-2xl -z-10" />
                        <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-2xl overflow-hidden group">
                            <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                                    </div>
                                    <div className="w-24 h-1.5 bg-slate-200 rounded-full" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 bg-white border border-slate-100 rounded-lg p-3 flex flex-col justify-end gap-2 group-hover:translate-y-[-2px] transition-transform">
                                            <div className="w-8 h-1 bg-indigo-600 opacity-20 rounded" />
                                            <div className="w-12 h-1 bg-slate-400 opacity-20 rounded" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
