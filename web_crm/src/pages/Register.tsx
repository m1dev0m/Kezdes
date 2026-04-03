import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Logo } from '@/components/ui/Logo';

const REGISTRATION_FLOW = [
  { step: '01', title: 'Данные', description: 'Имя, email и телефон.' },
  { step: '02', title: 'Код', description: 'Подтверждение email.' },
  { step: '03', title: 'Доступ', description: 'Выбор роли и вход.' },
] as const;

const REGISTRATION_HINTS = [
  'Выбор между личным и бизнес кабинетом',
  'Мгновенный доступ к бронированиям',
  'Персонализированный опыт управления',
];

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpEmail, setOtpEmail] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    phone: '',
    otp_code: '',
  });

  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const isOtpStep = step === 2;

  const setField = (key: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [key]: event.target.value }));
  };

  const normalizedEmail = formData.email.trim().toLowerCase();
  const isOtpCooldownActive = otpCooldown > 0 && otpEmail === normalizedEmail && normalizedEmail.length > 0;

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const id = window.setInterval(() => {
      setOtpCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpCooldown]);

  const canSendOtp = useMemo(() => {
    if (!normalizedEmail) return false;
    if (otpSending) return false;
    if (isOtpCooldownActive) return false;
    return true;
  }, [isOtpCooldownActive, normalizedEmail, otpSending]);

  const sendOtp = async () => {
    const email = normalizedEmail;
    if (!email) {
      toast.error('Введите email, чтобы получить код');
      return;
    }
    if (isOtpCooldownActive) {
      toast.error(`Подождите ${otpCooldown} сек, прежде чем запрашивать новый код`);
      return;
    }

    setOtpSending(true);
    try {
      const res = await api.post('/auth/send-otp/', { email });
      setDebugOtpCode(typeof res.data?.code === 'string' ? res.data.code : '');
      toast.success(res.data?.detail || 'Код отправлен на email');
      setOtpEmail(email);
      setOtpCooldown(60);
      setStep(2);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error?.response?.data, 'Не удалось отправить код'));
    } finally {
      setOtpSending(false);
    }
  };

  const handleInitialSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !formData.username.trim() ||
      !normalizedEmail ||
      !formData.phone.trim() ||
      !formData.password.trim() ||
      !formData.password2.trim()
    ) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    if (formData.password !== formData.password2) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (isOtpCooldownActive) {
      toast.error(`Подождите ${otpCooldown} сек, прежде чем запрашивать новый код`);
      return;
    }
    void sendOtp();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.otp_code.trim()) {
      toast.error('Введите код подтверждения');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register/', {
        username: formData.username.trim(),
        email: normalizedEmail,
        password: formData.password,
        password2: formData.password2,
        phone: formData.phone.trim(),
        otp_code: formData.otp_code.trim(),
      });

      const loginResponse = await api.post('/auth/login/', {
        username: formData.username.trim(),
        password: formData.password,
      });

      await login(loginResponse.data.access, loginResponse.data.refresh);
      toast.success('Добро пожаловать в Kezdes');
      navigate('/role-selection');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error?.response?.data, 'Ошибка регистрации'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] font-inter text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden border-r border-slate-200 bg-[linear-gradient(180deg,#f4f7ff_0%,#edf2fb_100%)] px-12 py-12 lg:flex lg:flex-col lg:justify-start">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <Logo className="h-9" />
            </Link>

            <div className="mt-14 max-w-xl">
              <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
                Начните работу
              </div>
              <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-tight text-slate-900">Создайте один аккаунт для всего</h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">Единая регистрация для гостей и владельцев ресторанов. Быстро, просто и безопасно.</p>
            </div>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {REGISTRATION_FLOW.map((item) => (
                <FlowCard key={item.step} step={item.step} title={item.title} description={item.description} />
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Что дальше?</div>
              <div className="mt-5 space-y-4">
                {REGISTRATION_HINTS.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 text-[#1d4ed8]">
                      <CheckCircle2 size={18} />
                    </div>
                    <p className="text-sm leading-7 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[580px]">
            <Link to="/" className="inline-flex items-center gap-3 lg:hidden">
              <Logo className="h-9" />
            </Link>

            <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] sm:p-10 lg:p-8 transition-all duration-500">
              <div className="max-w-md">
                <h2 className="text-4xl font-black tracking-tight text-slate-900">{isOtpStep ? 'Подтверждение' : 'Регистрация'}</h2>
                <p className="mt-4 text-sm font-medium leading-7 text-slate-500 uppercase tracking-wider">
                  {isOtpStep ? `Мы отправили код на ${formData.email}` : 'Заполните данные ниже, чтобы создать аккаунт.'}
                </p>
              </div>

              {!isOtpStep ? (
                <form className="mt-10 space-y-6" onSubmit={handleInitialSubmit}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <Field
                      label="Логин"
                      icon={<UserRound size={18} />}
                      placeholder="manager_admin"
                      value={formData.username}
                      onChange={setField('username')}
                    />
                    <Field
                      label="Электронная почта"
                      icon={<Mail size={18} />}
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={setField('email')}
                    />
                  </div>

                  <Field
                    label="Телефон"
                    icon={<Phone size={18} />}
                    type="tel"
                    placeholder="+7 700 000 00 00"
                    value={formData.phone}
                    onChange={setField('phone')}
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <Field
                      label="Пароль"
                      icon={<LockKeyhole size={18} />}
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={setField('password')}
                    />
                    <Field
                      label="Подтвердите пароль"
                      icon={<LockKeyhole size={18} />}
                      type="password"
                      placeholder="••••••••"
                      value={formData.password2}
                      onChange={setField('password2')}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      otpSending ||
                      !formData.username.trim() ||
                      !normalizedEmail ||
                      !formData.phone.trim() ||
                      !formData.password.trim() ||
                      !formData.password2.trim() ||
                      isOtpCooldownActive
                    }
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgba(29,78,216,0.65)] transition hover:bg-[#1e40af] disabled:opacity-50"
                  >
                    <span>{otpSending ? 'Отправка кода...' : 'Отправить код'}</span>
                    <ArrowRight size={18} className={otpSending ? 'animate-pulse' : ''} />
                  </button>
                </form>
              ) : (
                <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
                  {debugOtpCode ? (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      Dev OTP code: <span className="font-bold tracking-[0.2em]">{debugOtpCode}</span>
                    </div>
                  ) : null}

                  <Field
                    label="Код подтверждения"
                    icon={<KeyRound size={18} />}
                    placeholder="123456"
                    value={formData.otp_code}
                    onChange={setField('otp_code')}
                    action={
                      <button
                        type="button"
                        onClick={sendOtp}
                        disabled={!canSendOtp}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {otpCooldown > 0 ? `Повтор (${otpCooldown}s)` : otpSending ? '...' : 'Отправить снова'}
                      </button>
                    }
                  />

                  <div className="flex flex-col gap-4">
                    <button
                      type="submit"
                      disabled={loading || !formData.otp_code.trim()}
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgba(29,78,216,0.65)] transition hover:bg-[#1e40af] disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Проверяем код...</span>
                        </>
                      ) : (
                        <span>Подтвердить и войти</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors py-2"
                    >
                      Назад к данным
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-600 text-center">
                Уже есть аккаунт?
                <Link to="/login" className="ml-1 font-bold text-[#1d4ed8] hover:underline">
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  action,
}: {
  label: string;
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          className={`h-14 w-full rounded-2xl border border-slate-200 bg-[#f9fafc] pl-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white ${action ? 'pr-36' : 'pr-4'}`}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        {action ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{action}</div> : null}
      </div>
    </div>
  );
}

function FlowCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.25)] backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">{step}</div>
      <div className="mt-2 text-sm font-black tracking-tight text-slate-900">{title}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function getApiErrorMessage(responseData: unknown, fallback: string) {
  if (!responseData || typeof responseData !== 'object') return fallback;

  const data = responseData as Record<string, unknown>;
  const detail = data.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;

  const prioritizedKeys = ['otp_code', 'password2', 'password', 'username', 'email', 'phone', 'role'];
  for (const key of prioritizedKeys) {
    const value = data[key];
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return fallback;
}
