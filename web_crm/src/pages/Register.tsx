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

  const inputCls = "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg focus:border-slate-900 dark:focus:border-white transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium";
  const labelCls = "text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-0.5";

  return (
    <div className="flex min-h-screen w-full bg-white">

      <div className="flex w-full flex-col lg:w-1/2 p-8 md:p-12 lg:p-20 xl:p-24 justify-center border-r border-slate-100 dark:border-slate-900">
        <div className="max-w-sm w-full mx-auto">
          <Link to="/" className="mb-12 flex items-center gap-2 group w-fit">
            <div className="bg-indigo-600 p-2 rounded-lg transition-transform group-hover:scale-105 group-hover:rotate-3 shadow-md">
              <Logo className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase px-1 text-indigo-600">KEZDES</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase tracking-widest">{t('auth.register')}</h1>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
              {mode === 'customer'
                ? t('auth.registerSubtitleGuest')
                : t('auth.registerSubtitleVenue')}
            </p>
          </div>

          <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-xl mb-10">
            <button
              type="button"
              onClick={() => switchMode('customer')}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${mode === 'customer' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <span className="material-symbols-outlined text-base">person</span>
              {t('auth.guest')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('restaurant')}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${mode === 'restaurant' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <span className="material-symbols-outlined text-base">storefront</span>
              {t('auth.venue')}
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'customer' && (
              <div>
                <label className={labelCls}>{t('customers.name')}</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">badge</span>
                  <input className={inputCls} placeholder={t('auth.guestNamePlaceholder')} type="text" value={formData.first_name} onChange={set('first_name')} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t('auth.username')}</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">alternate_email</span>
                  <input className={inputCls} placeholder="username" type="text" value={formData.username} onChange={set('username')} required />
                </div>
              </div>

              <div>
                <label className={labelCls}>{t('auth.email')}</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">mail</span>
                  <input className={inputCls} placeholder="you@email.com" type="email" value={formData.email} onChange={set('email')} required />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>{mode === 'customer' ? t('customers.phone') : 'VENUE PHONE'}</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">call</span>
                <input className={inputCls} placeholder="+7 (777) 000-0000" type="tel" value={formData.phone} onChange={set('phone')} required />
              </div>
            </div>

            {mode === 'restaurant' && (
              <div>
                <label className={labelCls}>VENUE NAME</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">storefront</span>
                  <input className={inputCls} placeholder="Venue/Restaurant Name" type="text" value={formData.restaurant_name} onChange={set('restaurant_name')} required />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t('auth.password')}</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">lock</span>
                  <input
                    className={inputCls}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>CONFIRM</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg transition-colors group-focus-within:text-indigo-600">lock_reset</span>
                  <input
                    className={inputCls}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password2}
                    onChange={set('password2')}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3.5 px-6 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <span>{mode === 'customer' ? t('auth.signUp') : t('restaurant.submitApplication')}</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-6">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="text-indigo-600 font-black hover:underline underline-offset-4 ml-1.5">{t('auth.signIn')}</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden items-center justify-center p-24">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-200/50 rounded-full -mr-96 -mt-96 blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-slate-200/50 rounded-full -ml-72 -mb-72 blur-3xl opacity-50" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 text-slate-900 dark:text-white max-w-lg w-full">
          <div className="mb-12 inline-flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-base text-emerald-500">verified</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('auth.trustedBy')}</span>
          </div>

          <h2 className="text-5xl font-black leading-[1.05] mb-8 tracking-tighter uppercase italic">
            {mode === 'customer' ? (
              <>{t('auth.discoverTitle')}</>
            ) : (
              <>{t('auth.manageTitle')}</>
            )}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed mb-12 uppercase tracking-wide opacity-80">
            {mode === 'customer'
              ? t('auth.discoverSubtitle')
              : t('auth.manageSubtitle')}
          </p>

          <div className="grid grid-cols-2 gap-y-10 gap-x-12">
            {(mode === 'restaurant' ? [
              { icon: 'table_restaurant', label: t('auth.feature_tables'), desc: 'Precision floor mapping' },
              { icon: 'event_repeat', label: t('auth.feature_auto'), desc: 'Automated workflow engine' },
              { icon: 'insights', label: 'Advanced Insights', desc: 'Data-driven decision making' },
              { icon: 'support_agent', label: t('auth.feature_support'), desc: 'Concierge level assistance' },
            ] : [
              { icon: 'search', label: t('auth.feature_find'), desc: 'Discover elite local spots' },
              { icon: 'bookmark_added', label: t('auth.feature_booking'), desc: 'Seamless reservation flow' },
              { icon: 'loyalty', label: t('auth.feature_loyalty'), desc: 'Exclusive member rewards' },
              { icon: 'star', label: t('auth.feature_curated'), desc: 'Personalized recommendations' },
            ]).map(({ icon, label, desc }) => (
              <div key={label} className="group cursor-default">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm transition-all group-hover:bg-indigo-600 group-hover:text-white">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest text-slate-900">{label}</span>
                </div>
                {desc && <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight ml-11 opacity-60 group-hover:opacity-100 transition-opacity">{desc}</p>}
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
