import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useI18n } from '@/i18n/index.tsx';
import { AxiosError } from 'axios';
import { Logo } from '@/components/ui/Logo';
export default function Register() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'restaurant' ? 'restaurant' : 'customer';
  const [mode, setMode] = useState<'customer' | 'restaurant'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const switchMode = (m: 'customer' | 'restaurant') => {
    setMode(m);
    setSearchParams(m === 'restaurant' ? { mode: 'restaurant' } : {});
  };

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    email: '',
    password: '',
    password2: '',
    phone: '',
    restaurant_name: '',
  });

  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(p => ({ ...p, [k]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'customer') {
        await api.post('/auth/register/', {
          username: formData.username,
          first_name: formData.first_name,
          email: formData.email,
          password: formData.password,
          password2: formData.password2,
          phone: formData.phone,
          role: 'customer',
        });
        const loginRes = await api.post('/auth/login/', {
          username: formData.username,
          password: formData.password,
        });
        await login(loginRes.data.access, loginRes.data.refresh);
        toast.success(t('auth.welcomeBack'));
        navigate('/guest/dashboard');
      } else {
        await api.post('/auth/register/', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          password2: formData.password2,
          role: 'owner',
          restaurant_name: formData.restaurant_name,
          phone: formData.phone,
        });

        const loginRes = await api.post('/auth/login/', {
          username: formData.username,
          password: formData.password,
        });
        await login(loginRes.data.access, loginRes.data.refresh);
        toast.success('Заявка отправлена! Мы свяжемся с вами после проверки.');
        navigate('/register-restaurant/pending');
      }
    } catch (err: unknown) {
      const data = (err as AxiosError<Record<string, string[] | string> & { error?: { message?: string } }>).response?.data;
      const msg =
        (typeof data?.error?.message === 'string' ? data.error.message : '') ||
        (typeof data?.detail === 'string' ? data.detail : '') ||
        (Array.isArray(data?.username) ? data.username[0] : '') ||
        (Array.isArray(data?.email) ? data.email[0] : '') ||
        (Array.isArray(data?.phone) ? data.phone[0] : '') ||
        (Array.isArray((data as Record<string, string[] | string>)?.password2) ? (data as Record<string, string[] | string>).password2[0] as string : '') ||
        (Array.isArray(data?.name) ? data.name[0] : '') ||
        t('errors.serverError');
      toast.error(msg);
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
          <Link to="/" className="mb-10 flex items-center gap-2 w-fit">
            <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-2xl">restaurant_menu</span>
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase px-1"><Logo /></span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('auth.register')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {mode === 'customer'
                ? t('auth.registerSubtitleGuest')
                : t('auth.registerSubtitleVenue')}
            </p>
          </div>

          <div className="flex p-1 gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => switchMode('customer')}
              className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${mode === 'customer' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined text-base align-middle mr-2">person</span>
              {t('auth.guest')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('restaurant')}
              className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${mode === 'restaurant' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <span className="material-symbols-outlined text-base align-middle mr-2">storefront</span>
              {t('auth.venue')}
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'customer' && (
              <div>
                <label className={labelCls}>{t('customers.name')}</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">badge</span>
                  <input className={inputCls} placeholder={t('auth.guestNamePlaceholder')} type="text" value={formData.first_name} onChange={set('first_name')} />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>{t('auth.username')}</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">alternate_email</span>
                <input className={inputCls} placeholder="username" type="text" value={formData.username} onChange={set('username')} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>{t('auth.email')}</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">mail</span>
                <input className={inputCls} placeholder="you@example.com" type="email" value={formData.email} onChange={set('email')} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>{mode === 'customer' ? t('customers.phone') : 'Телефон ресторана'}</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">call</span>
                <input className={inputCls} placeholder="+7 (777) 000-0000" type="tel" value={formData.phone} onChange={set('phone')} required />
              </div>
            </div>

            {mode === 'restaurant' && (
              <div>
                <label className={labelCls}>Название заведения</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">storefront</span>
                  <input className={inputCls} placeholder="Gastro Bar" type="text" value={formData.restaurant_name} onChange={set('restaurant_name')} required />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>{t('auth.password')}</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">lock</span>
                <input
                  className={`${inputCls} pr-12`}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1 font-medium">{t('validation.minLength', { min: '8' })}</p>
            </div>

            <div>
              <label className={labelCls}>Повторите пароль</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl transition-colors group-focus-within:text-primary">lock_reset</span>
                <input
                  className={inputCls}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password2}
                  onChange={set('password2')}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-blue-700 disabled:opacity-60 text-white font-black py-4 px-6 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <span>{mode === 'customer' ? t('auth.signUp') : t('restaurant.submitApplication')}</span>
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-primary font-black hover:underline uppercase tracking-widest text-xs ml-1">{t('auth.signIn')}</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-24">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full -mr-72 -mt-72 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/10 rounded-full -ml-64 -mb-64 blur-3xl" />
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 text-white max-w-lg">
          <div className="mb-10 inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20">
            <span className="material-symbols-outlined text-blue-200">verified</span>
            <span className="text-[10px] font-black uppercase tracking-widest">{t('auth.trustedBy')}</span>
          </div>

          <h2 className="text-6xl font-black leading-[1.1] mb-8 tracking-tighter">
            {mode === 'customer' ? (
              <>{t('auth.discoverTitle')}</>
            ) : (
              <>{t('auth.manageTitle')}</>
            )}
          </h2>

          <p className="text-blue-100/80 text-xl font-medium leading-relaxed mb-12">
            {mode === 'customer'
              ? t('auth.discoverSubtitle')
              : t('auth.manageSubtitle')}
          </p>

          <div className="grid grid-cols-2 gap-8">
            {(mode === 'restaurant' ? [
              { icon: 'table_restaurant', label: t('auth.feature_tables') },
              { icon: 'event_repeat', label: t('auth.feature_auto') },
              { icon: 'support_agent', label: t('auth.feature_support') },
            ] : [
              { icon: 'search', label: t('auth.feature_find') },
              { icon: 'bookmark_added', label: t('auth.feature_booking') },
              { icon: 'loyalty', label: t('auth.feature_loyalty') },
              { icon: 'star', label: t('auth.feature_curated') },
            ]).map(({ icon, label }) => (
              <div key={icon} className="flex items-center gap-4 group">
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
                <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                <div className="h-20 bg-primary/20 rounded-xl border border-blue-400/20" />
                <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
