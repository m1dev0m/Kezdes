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

    const inputCls = "w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm";
    const labelCls = "text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 ml-1";

    return (
        <div className="flex min-h-screen w-full flex-col lg:flex-row font-display bg-background-light dark:bg-background-dark">

            <div className="flex w-full flex-col bg-white dark:bg-slate-900 lg:w-1/2 p-8 md:p-12 lg:p-20 xl:p-24 justify-center">
                <div className="max-w-md w-full mx-auto">
                    <Link to="/" className="mb-12 flex items-center gap-2 w-fit">
                        <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-white text-2xl">restaurant_menu</span>
                        </div>
                        <span className="text-2xl font-black tracking-tighter uppercase px-1"><Logo /></span>
                    </Link>

                    <div className="mb-8 text-left">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('auth.welcomeBack')}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('auth.signIn')}</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label className={labelCls}>{t('auth.username')}</label>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">person</span>
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
                            <div className="flex justify-between items-center mb-1.5 px-1">
                                <label className={labelCls}>{t('auth.password')}</label>
                                <button type="button" className="text-primary text-xs font-bold hover:text-blue-700 transition-colors">
                                    {t('auth.forgotPassword')}
                                </button>
                            </div>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">lock</span>
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-black py-4 px-6 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base uppercase tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                <>
                                    <span>{t('auth.signIn')}</span>
                                    <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center space-y-4">
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                            {t('auth.noAccount')}{' '}
                            <Link to="/register" className="text-primary font-black hover:underline uppercase tracking-widest text-xs ml-1">{t('auth.createAccount')}</Link>
                        </p>

                        <div className="flex items-center gap-3 justify-center pt-2">
                            <Link to="/register?mode=restaurant" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">storefront</span>
                                {t('restaurant.registration')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-24">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full -mr-72 -mt-72 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/10 rounded-full -ml-64 -mb-64 blur-3xl" />
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                <div className="relative z-10 text-white max-w-lg">
                    <div className="mb-10 inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20">
                        <span className="material-symbols-outlined text-blue-200">security</span>
                        <span className="text-xs font-black uppercase tracking-widest">Enterprise Grade Security</span>
                    </div>

                    <h2 className="text-6xl font-black leading-[1.1] mb-8 tracking-tighter">
                        Manage your venue with <span className="text-blue-200 italic">precision.</span>
                    </h2>

                    <p className="text-blue-100/80 text-xl font-medium leading-relaxed mb-12">
                        Everything you need to run a successful restaurant in one powerful dashboard. Join the future of dining.
                    </p>

                    <div className="grid grid-cols-2 gap-8">
                        {[
                            { icon: 'table_restaurant', label: 'Table Layouts' },
                            { icon: 'event_repeat', label: 'Auto-Booking' },
                            { icon: 'insights', label: 'AI Analytics' },
                            { icon: 'support_agent', label: '24/7 Support' },
                        ].map(({ icon, label }) => (
                            <div key={label} className="flex items-center gap-4 group">
                                <div className="bg-white/15 p-3 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:bg-white/25">
                                    <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
                                </div>
                                <span className="font-bold text-sm uppercase tracking-widest">{label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-1 shadow-2xl overflow-hidden group">
                        <div className="bg-[#0f172a]/40 p-6 rounded-[1.4rem]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="h-2 w-24 bg-white/20 rounded" />
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-20 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2">
                                    <div className="h-1.5 w-8 bg-blue-400/40 rounded" />
                                    <div className="h-1.5 w-12 bg-white/10 rounded" />
                                </div>
                                <div className="h-20 bg-primary/20 rounded-xl border border-blue-400/20 flex flex-col items-center justify-center gap-2">
                                    <div className="h-1.5 w-8 bg-blue-400 rounded" />
                                    <div className="h-1.5 w-12 bg-white/20 rounded" />
                                </div>
                                <div className="h-20 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2">
                                    <div className="h-1.5 w-8 bg-blue-400/40 rounded" />
                                    <div className="h-1.5 w-12 bg-white/10 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
