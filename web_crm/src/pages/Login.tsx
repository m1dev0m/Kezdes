import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Eye, EyeOff, User, Lock, ArrowRight, Store, Table, Repeat, LineChart, Headphones } from 'lucide-react';
import { useI18n } from '@/i18n';
import { PublicHeader } from '@/components/public/PublicHeader';
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

    const inputCls = "w-full pl-10 pr-4 py-3 bg-white dark:bg-brand-green/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-slate-900 dark:focus:border-white transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium shadow-sm";
    const labelCls = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 block ml-0.5";

    return (
        <div className="min-h-screen bg-white font-sans overflow-x-hidden">
            <PublicHeader />
            <div className="flex min-h-screen w-full bg-white pt-24">
                {/* Left side: Content */}
                <div className="flex w-full flex-col lg:w-1/2 p-8 md:p-12 lg:p-20 xl:p-24 justify-center border-r border-slate-100 dark:border-brand-green bg-background-light">
                    <div className="max-w-sm w-full mx-auto">
                        <div className="mb-10">
                            <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">{t('auth.welcomeBack')}</h1>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed">
                                {t('auth.signIn')} — <span className="text-slate-300 font-medium lowercase">Платформа для вашего бизнеса</span>
                            </p>
                        </div>

                        <form className="space-y-6" onSubmit={handleLogin}>
                            <div>
                                <label className={labelCls}>{t('auth.username')}</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
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
                                    <button type="button" className="text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors mb-2">
                                        {t('auth.forgotPassword')}
                                    </button>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 px-6 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                        <span>{t('auth.signIn')}</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-6">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                {t('auth.noAccount')}{' '}
                                <Link to="/register" className="text-primary font-black hover:underline underline-offset-4 ml-1.5">{t('auth.createAccount')}</Link>
                            </p>

                            <div className="flex items-center gap-6">
                                <Link to="/register?mode=restaurant" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-primary transition-all">
                                    <Store className="group-hover:-translate-y-0.5 transition-transform" size={16} />
                                    {t('restaurant.registration')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Illustration/Branding */}
                <div className="hidden lg:flex w-1/2 bg-brand-green text-white relative overflow-hidden items-center justify-center p-24">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full -mr-96 -mt-96 blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-full -ml-72 -mb-72 blur-[100px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

                    <div className="relative z-10 max-w-lg w-full">
                        <div className="mb-12 inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">{t('auth.trustedBy') || 'Надежная платформа'}</span>
                        </div>

                        <h2 className="text-6xl font-black leading-[1.05] mb-8 tracking-tighter text-white italic">
                            {t('auth.manageTitle') || 'Умные инструменты для'} <br />
                            <span className="text-white/60 not-italic">современных заведений.</span>
                        </h2>

                        <p className="text-white/70 text-lg font-medium leading-relaxed mb-16">
                            {t('auth.manageSubtitle') || 'Всё необходимое для успешного управления заведением в одной удобной панели.'}
                        </p>

                        <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                            {[
                                { icon: 'table_restaurant', label: t('auth.feature_tables') || 'Управление залом', desc: 'Точное отображение посадки' },
                                { icon: 'event_repeat', label: t('auth.feature_auto') || 'Автоматизация', desc: 'Бронирование без участия' },
                                { icon: 'insights', label: 'Аналитика', desc: 'Инсайты на основе данных' },
                                { icon: 'support_agent', label: t('auth.feature_support') || 'Поддержка', desc: 'Консьерж-сервис 24/7' },
                            ].map(({ icon, label, desc }) => (
                                <div key={label} className="group cursor-default">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-sm transition-all group-hover:bg-primary group-hover:border-primary">
                                            {icon === 'table_restaurant' ? <Table size={18} /> : null}
                                            {icon === 'event_repeat' ? <Repeat size={18} /> : null}
                                            {icon === 'insights' ? <LineChart size={18} /> : null}
                                            {icon === 'support_agent' ? <Headphones size={18} /> : null}
                                        </div>
                                        <span className="font-black text-xs uppercase tracking-[0.2em] text-white">{label}</span>
                                    </div>
                                    <p className="text-[11px] font-medium text-white/50 uppercase tracking-widest ml-14 opacity-80 group-hover:opacity-100 transition-opacity">{desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Preview UI decoration */}
                        <div className="mt-24 relative">
                            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 to-transparent blur-3xl -z-10" />
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl overflow-hidden group">
                                <div className="bg-white/10 p-6 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="flex gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                        </div>
                                        <div className="w-32 h-2 bg-white/20 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-28 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-end gap-3 group-hover:translate-y-[-4px] transition-transform duration-500">
                                                <div className="w-10 h-1.5 bg-primary opacity-60 rounded-full" />
                                                <div className="w-16 h-1.5 bg-white/30 rounded-full" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
