import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2,
  Eye,
  EyeOff,
  User,
  Store,
  IdCard,
  AtSign,
  Mail,
  Phone,
  Lock,
  KeyRound,
  ArrowRight,
  BadgeCheck,
  Table,
  Repeat,
  LineChart,
  Headphones,
  Search,
  BookmarkCheck,
  Heart,
  Star,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useI18n } from '@/i18n/index.tsx';
import { AxiosError } from 'axios';
import { PublicHeader } from '@/components/public/PublicHeader';

export default function Register() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'restaurant' ? 'restaurant' : 'customer';
  const [mode, setMode] = useState<'customer' | 'restaurant'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<
    'username' | 'first_name' | 'email' | 'password' | 'password2' | 'phone' | 'restaurant_name' | 'detail' | 'otp_code',
    string
  >>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const navigate = useNavigate();
  const { login } = useAuth();

  // --- 2-Step OTP State ---
  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const switchMode = (m: 'customer' | 'restaurant') => {
    setMode(m);
    setSearchParams(m === 'restaurant' ? { mode: 'restaurant' } : {});
    setStep(1);
    setOtpCode(['', '', '', '', '', '']);
    setFieldErrors({});
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

  // --- OTP Input Handlers ---
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpCode];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtpCode(newOtp);
    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  // --- Step 1: Validate fields & Send OTP ---
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccessMessage('');

    const nextErrors: typeof fieldErrors = {};
    const email = (formData.email || '').trim();
    const username = (formData.username || '').trim();
    const phone = (formData.phone || '').trim();

    if (!username) nextErrors.username = t('errors.required');
    if (!email) nextErrors.email = t('errors.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = t('errors.invalidEmail');
    if (!phone) nextErrors.phone = t('errors.required');
    if (mode === 'restaurant' && !(formData.restaurant_name || '').trim()) nextErrors.restaurant_name = t('errors.required');
    if (!formData.password) nextErrors.password = t('errors.required');
    if (!formData.password2) nextErrors.password2 = t('errors.required');

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    if (formData.password !== formData.password2) {
      setFieldErrors(p => ({ ...p, password2: 'Пароли не совпадают' }));
      toast.error('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 8) {
      setFieldErrors(p => ({ ...p, password: 'Пароль должен содержать минимум 8 символов' }));
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }

    // Send OTP to email
    setOtpSending(true);
    try {
      await api.post('/auth/send-otp/', { email });
      toast.success('Код подтверждения отправлен на ваш email');
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const data = (err as AxiosError<Record<string, string[] | string>>).response?.data;
      if (data) {
        const emailErr = Array.isArray(data.email) ? data.email[0] : typeof data.email === 'string' ? data.email : '';
        const detailErr = typeof data.detail === 'string' ? data.detail : '';
        if (emailErr) {
          setFieldErrors({ email: emailErr });
          toast.error(emailErr);
        } else if (detailErr) {
          toast.error(detailErr);
        } else {
          toast.error('Не удалось отправить код');
        }
      } else {
        toast.error('Ошибка сервера. Попробуйте позже.');
      }
    } finally {
      setOtpSending(false);
    }
  };

  // --- Step 2: Submit Registration with OTP ---
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const code = otpCode.join('');
    if (code.length < 6) {
      setFieldErrors({ otp_code: 'Введите 6-значный код' });
      return;
    }

    const email = (formData.email || '').trim();
    const username = (formData.username || '').trim();
    const phone = (formData.phone || '').trim();

    setLoading(true);
    try {
      if (mode === 'customer') {
        await api.post('/auth/register/', {
          username,
          first_name: formData.first_name,
          email,
          password: formData.password,
          password2: formData.password2,
          phone,
          role: 'customer',
          otp_code: code,
        });
        setSuccessMessage(t('auth.registerSuccess') || 'Registration successful');
        const loginRes = await api.post('/auth/login/', {
          username,
          password: formData.password,
        });
        await login(loginRes.data.access, loginRes.data.refresh);
        toast.success(t('auth.welcomeBack'));
        setTimeout(() => navigate('/guest/dashboard'), 350);
      } else {
        await api.post('/auth/register/', {
          username,
          email,
          password: formData.password,
          password2: formData.password2,
          role: 'owner',
          restaurant_name: formData.restaurant_name,
          phone,
          otp_code: code,
        });

        const loginRes = await api.post('/auth/login/', {
          username,
          password: formData.password,
        });
        await login(loginRes.data.access, loginRes.data.refresh);
        setSuccessMessage('Заявка отправлена! Мы свяжемся с вами после проверки.');
        toast.success('Заявка отправлена! Мы свяжемся с вами после проверки.');
        setTimeout(() => navigate('/register-restaurant/pending'), 350);
      }
    } catch (err: unknown) {
      const data = (err as AxiosError<Record<string, string[] | string> & { error?: { message?: string } }>).response?.data;
      const msg =
        (typeof data?.error?.message === 'string' ? data.error.message : '') ||
        (typeof data?.detail === 'string' ? data.detail : '') ||
        (Array.isArray(data?.otp_code) ? data.otp_code[0] : '') ||
        (Array.isArray(data?.username) ? data.username[0] : '') ||
        (Array.isArray(data?.email) ? data.email[0] : '') ||
        t('errors.serverError');

      const next: typeof fieldErrors = {};
      if (data && typeof data === 'object') {
        const getFirst = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? '') : typeof v === 'string' ? v : '');
        const d = data as Record<string, unknown>;
        if (getFirst(d.otp_code)) next.otp_code = getFirst(d.otp_code);
        if (getFirst(d.username)) next.username = getFirst(d.username);
        if (getFirst(d.email)) next.email = getFirst(d.email);
        if (getFirst(d.password)) next.password = getFirst(d.password);
        if (!Object.keys(next).length && typeof d.detail === 'string') next.detail = d.detail;
      }
      if (Object.keys(next).length) setFieldErrors(next);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full pl-10 pr-4 py-3 bg-white dark:bg-brand-green/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-slate-900 dark:focus:border-white transition-all outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium shadow-sm";
  const labelCls = "text-xs font-semibold text-slate-500 mb-2 block ml-0.5";

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      <PublicHeader />
      <div className="flex min-h-screen w-full bg-white pt-24">

        <div className="flex w-full flex-col lg:w-1/2 p-8 md:p-12 lg:p-20 xl:p-24 justify-center border-r border-slate-100 dark:border-brand-green bg-background-light">
          <div className="max-w-sm w-full mx-auto">

            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">{t('auth.register')}</h1>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                {mode === 'customer'
                  ? t('auth.registerSubtitleGuest')
                  : t('auth.registerSubtitleVenue')}
              </p>
            </div>

            {successMessage && (
              <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm font-semibold">
                {successMessage}
              </div>
            )}

            {fieldErrors.detail && (
              <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 text-sm font-semibold">
                {fieldErrors.detail}
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex p-1 bg-white border border-slate-200 rounded-xl mb-10 shadow-sm">
              <button
                type="button"
                onClick={() => switchMode('customer')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'customer' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <User size={16} />
                {t('auth.guest')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('restaurant')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${mode === 'restaurant' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <Store size={16} />
                {t('auth.venue')}
              </button>
            </div>

            {/* ======= STEP 1: Form Fields ======= */}
            {step === 1 && (
              <form className="space-y-5" onSubmit={handleStep1Submit}>
                {mode === 'customer' && (
                  <div>
                    <label className={labelCls}>{t('customers.name')}</label>
                    <div className="relative group">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
                      <input className={inputCls} placeholder={t('auth.guestNamePlaceholder')} type="text" value={formData.first_name} onChange={set('first_name')} />
                    </div>
                    {fieldErrors.first_name && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.first_name}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t('auth.username')}</label>
                    <div className="relative group">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
                      <input className={inputCls} placeholder="username" type="text" value={formData.username} onChange={set('username')} required />
                    </div>
                    {fieldErrors.username && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.username}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>{t('auth.email')}</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
                      <input className={inputCls} placeholder="you@email.com" type="email" value={formData.email} onChange={set('email')} required />
                    </div>
                    {fieldErrors.email && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>{mode === 'customer' ? t('customers.phone') : 'Venue Phone'}</label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
                    <input className={inputCls} placeholder="+7 (777) 000-0000" type="tel" value={formData.phone} onChange={set('phone')} required />
                  </div>
                  {fieldErrors.phone && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.phone}</p>}
                </div>

                {mode === 'restaurant' && (
                  <div>
                    <label className={labelCls}>Venue Name</label>
                    <div className="relative group">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
                      <input className={inputCls} placeholder="Venue/Restaurant Name" type="text" value={formData.restaurant_name} onChange={set('restaurant_name')} required />
                    </div>
                    {fieldErrors.restaurant_name && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.restaurant_name}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t('auth.password')}</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Confirm</label>
                    <div className="relative group">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-primary" size={18} />
                      <input
                        className={inputCls}
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password2}
                        onChange={set('password2')}
                        required
                      />
                    </div>
                    {fieldErrors.password2 && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.password2}</p>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpSending}
                  className="w-full bg-primary hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm shadow-lg shadow-primary/20"
                >
                  {otpSending ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>Получить код подтверждения</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ======= STEP 2: OTP Verification ======= */}
            {step === 2 && (
              <form className="space-y-6" onSubmit={handleStep2Submit}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} className="text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Введите код подтверждения</h2>
                  <p className="text-sm text-slate-500">
                    Мы отправили 6-значный код на <span className="font-semibold text-slate-900">{formData.email}</span>
                  </p>
                </div>

                {/* OTP Inputs */}
                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(index, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(index, e)}
                      className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all shadow-sm
                        ${fieldErrors.otp_code
                          ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-500'
                          : 'border-slate-200 bg-white text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20'
                        }`}
                    />
                  ))}
                </div>
                {fieldErrors.otp_code && (
                  <p className="text-center text-sm font-semibold text-rose-600">{fieldErrors.otp_code}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>{mode === 'customer' ? t('auth.signUp') : t('restaurant.submitApplication')}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtpCode(['', '', '', '', '', '']); setFieldErrors({}); }}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft size={16} />
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={otpSending}
                    onClick={async () => {
                      setOtpSending(true);
                      try {
                        await api.post('/auth/send-otp/', { email: formData.email.trim() });
                        toast.success('Код отправлен повторно');
                        setOtpCode(['', '', '', '', '', '']);
                        otpRefs.current[0]?.focus();
                      } catch {
                        toast.error('Не удалось отправить код');
                      } finally {
                        setOtpSending(false);
                      }
                    }}
                    className="text-sm font-semibold text-primary hover:text-blue-700 transition-colors disabled:opacity-50"
                  >
                    Отправить повторно
                  </button>
                </div>
              </form>
            )}

            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col items-center gap-6">
              <p className="text-slate-500 text-sm font-medium text-center">
                {t('auth.hasAccount')}{' '}
                <Link to="/login" className="text-primary font-bold hover:underline underline-offset-4 ml-1.5">{t('auth.signIn')}</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-1/2 bg-brand-green text-white relative overflow-hidden items-center justify-center p-24">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full -mr-96 -mt-96 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-full -ml-72 -mb-72 blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

          <div className="relative z-10 text-white max-w-lg w-full">
            <div className="mb-12 inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-sm">
              <BadgeCheck className="text-emerald-500" size={16} />
              <span className="text-sm font-semibold text-white/80">{t('auth.trustedBy')}</span>
            </div>

            <h2 className="text-6xl font-black leading-[1.05] mb-8 tracking-tighter italic">
              {mode === 'customer' ? (
                <>{t('auth.discoverTitle')}</>
              ) : (
                <>{t('auth.manageTitle')}</>
              )}
            </h2>

            <p className="text-white/70 text-lg font-medium leading-relaxed mb-16">
              {mode === 'customer'
                ? t('auth.discoverSubtitle')
                : t('auth.manageSubtitle')}
            </p>

            <div className="grid grid-cols-2 gap-y-10 gap-x-12">
              {(mode === 'restaurant' ? [
                { icon: 'table_restaurant', label: t('auth.feature_tables') || 'Управление залом', desc: 'Точное отображение посадки' },
                { icon: 'event_repeat', label: t('auth.feature_auto') || 'Автоматизация', desc: 'Бронирование без участия' },
                { icon: 'insights', label: 'Аналитика', desc: 'Инсайты на основе данных' },
                { icon: 'support_agent', label: t('auth.feature_support') || 'Поддержка', desc: 'Консьерж-сервис 24/7' },
              ] : [
                { icon: 'search', label: t('auth.feature_find') || 'Поиск заведений', desc: 'Открывайте лучшие места' },
                { icon: 'bookmark_added', label: t('auth.feature_booking') || 'Бронирование', desc: 'Быстро и удобно' },
                { icon: 'loyalty', label: t('auth.feature_loyalty') || 'Лояльность', desc: 'Эксклюзивные бонусы' },
                { icon: 'star', label: t('auth.feature_curated') || 'Рекомендации', desc: 'Только для вас' },
              ]).map(({ icon, label, desc }) => (
                <div key={label} className="group cursor-default">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shadow-sm transition-all group-hover:bg-primary group-hover:border-primary">
                      {icon === 'table_restaurant' ? <Table size={18} /> : null}
                      {icon === 'event_repeat' ? <Repeat size={18} /> : null}
                      {icon === 'insights' ? <LineChart size={18} /> : null}
                      {icon === 'support_agent' ? <Headphones size={18} /> : null}
                      {icon === 'search' ? <Search size={18} /> : null}
                      {icon === 'bookmark_added' ? <BookmarkCheck size={18} /> : null}
                      {icon === 'loyalty' ? <Heart size={18} /> : null}
                      {icon === 'star' ? <Star size={18} /> : null}
                    </div>
                    <span className="font-bold text-sm text-white">{label}</span>
                  </div>
                  {desc && <p className="text-sm font-medium text-white/50 ml-14 opacity-80 group-hover:opacity-100 transition-opacity">{desc}</p>}
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
      </div >
    </div >
  );
}
