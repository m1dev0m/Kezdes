import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { Logo } from '@/components/ui/Logo';

const LOGIN_METRICS = [
  { label: 'Сегодня', value: '24' },
  { label: 'Подтверждено', value: '12' },
  { label: 'Свободно', value: '9' },
];

const LOGIN_HIGHLIGHTS = [
  {
    title: 'Единая смена',
    description: 'Брони, столы и гостевые статусы без переключений между системами.',
  },
  {
    title: 'Оперативная сводка',
    description: 'Все ключевые числа собраны в одном контуре без лишнего шума.',
  },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login/', { username, password });
      await login(response.data.access, response.data.refresh);
      toast.success('Добро пожаловать');
      navigate('/');
    } catch {
      toast.error('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] font-inter text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden border-r border-slate-200 bg-[linear-gradient(180deg,#f4f7ff_0%,#edf2fb_100%)] px-12 py-12 lg:flex lg:flex-col lg:justify-start">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <Logo variant="admin" className="h-9" />
            </Link>

            <div className="mt-14 max-w-xl">
              <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
                Доступ администратора
              </div>
              <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-tight text-slate-900">
                Операционная панель ресторана без лишнего шума
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
                Вход для команды ресторана: бронирования, посадка гостей, столы, статусы и CRM в одном рабочем контуре.
              </p>
            </div>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {LOGIN_METRICS.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {LOGIN_HIGHLIGHTS.map((item) => (
              <div key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-[#1d4ed8] border border-blue-100">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="text-sm text-slate-500">{item.description}</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-500">Сегодня</div>
                  <div className="mt-1 text-3xl font-black tracking-tight text-slate-900">24 брони</div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">Live</div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard label="Подтверждено" value="12" />
                <StatCard label="Посажено" value="7" />
                <StatCard label="Свободно" value="9" />
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 bg-[#f7f7f5]">
          <div className="w-full max-w-[480px]">
            <Link to="/" className="inline-flex items-center gap-3 lg:hidden">
              <Logo variant="admin" className="h-9" />
            </Link>

            <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] sm:p-10 lg:p-8">
              <div className="max-w-xs">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Вход</div>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Вход в рабочее пространство</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Используйте данные вашей команды, чтобы открыть административную панель ресторана.
                </p>
              </div>

              <form className="mt-10 space-y-6" onSubmit={handleLogin}>
                <Field
                  label="Логин"
                  name="username"
                  icon={<UserRound size={18} />}
                  type="text"
                  placeholder="manager_alma"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Пароль</label>
                    <span className="text-xs font-bold text-[#1d4ed8] uppercase tracking-widest">Забыли пароль?</span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <LockKeyhole size={18} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      aria-label="Пароль"
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafaf9] pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-sm font-semibold text-white shadow-[0_14px_30px_-16px_rgba(29,78,216,0.65)] transition hover:bg-[#1e40af] disabled:opacity-50"
                  type="submit"
                  disabled={loading || !username.trim() || !password.trim()}
                >
                  <span>{loading ? 'Входим...' : 'Войти'}</span>
                  <ArrowRight size={18} className={loading ? 'animate-pulse' : ''} />
                </button>
              </form>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm text-slate-600">
                Вход для владельцев, администраторов, менеджеров зала и хостов.
              </div>

              <div className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-600">
                Нет аккаунта?
                <Link to="/register" className="ml-1 font-bold text-[#1d4ed8] hover:underline">
                  Зарегистрировать ресторан
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
  name,
  icon,
  type,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  name: string;
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          id={name}
          name={name}
          aria-label={label}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-[#f9fafc] pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fafaf9] px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.25)] backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
