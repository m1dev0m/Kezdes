import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const REVIEW_STEPS = [
  {
    title: 'Проверка заявки',
    description: 'Сверяем название, город и адрес ресторана.',
  },
  {
    title: 'Подтверждение аккаунта',
    description: 'Проверяем, что заявка привязана к владельцу или администратору ресторана.',
  },
  {
    title: 'Активация доступа',
    description: 'После одобрения открываем рабочую CRM-панель.',
  },
];

export default function RestaurantPendingApproval() {
  const { logout, login } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

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

      setStatusError(null);
      setLastCheck(new Date());
    } catch (err: any) {
      if (err?.response?.status === 404) {
        navigate('/setup-restaurant');
        return;
      }
      setStatusError(err?.response?.data?.detail || 'Не удалось проверить статус заявки. Попробуйте ещё раз.');
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
    void checkRequestStatus();
    const interval = window.setInterval(() => {
      void checkRequestStatus();
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-10 font-inter text-slate-900 sm:px-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex items-center justify-center lg:justify-start">
          <Logo className="h-9" />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.28)] sm:p-10"
          >
            <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">
              Заявка отправлена
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Ресторан на проверке
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Мы проверяем данные заведения и связываем заявку с вашим аккаунтом. После одобрения доступ к CRM откроется автоматически.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <StatusTile icon={<Clock3 size={18} />} label="Статус" value="Ожидает одобрения" />
              <StatusTile icon={<ShieldCheck size={18} />} label="Проверка" value="Бизнес-данные" />
              <StatusTile
                icon={<CheckCircle2 size={18} />}
                label="Следующий шаг"
                value="Переход в CRM"
              />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { void checkRequestStatus(); }}
                disabled={checking}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-[12px] font-black uppercase tracking-widest text-white transition hover:bg-[#1e40af] disabled:opacity-50"
              >
                <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Проверяем...' : 'Проверить статус'}
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-[12px] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
              >
                <LogOut size={18} />
                Выйти
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {statusError ? (
                <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                  {statusError}
                </div>
              ) : null}
              {lastCheck
                ? `Последняя проверка: ${lastCheck.toLocaleTimeString()}`
                : 'Статус обновляется автоматически каждые 15 секунд.'}
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="space-y-4"
          >
            {REVIEW_STEPS.map((step, index) => (
              <div key={step.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1d4ed8]">
                    <span className="text-sm font-black">{`0${index + 1}`}</span>
                  </div>
                  <div>
                    <div className="text-lg font-semibold tracking-tight text-slate-900">{step.title}</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.aside>
        </div>
      </div>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="inline-flex rounded-2xl bg-white p-3 text-[#1d4ed8] shadow-sm">{icon}</div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
