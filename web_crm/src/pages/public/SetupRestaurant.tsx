import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, MapPinned, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { normalizeUserRole } from '@/modules/auth/logic/roles';

const CITY_OPTIONS = [
  { value: 'Алматы', label: 'Алматы', lat: 43.2389, lng: 76.8897 },
  { value: 'Астана', label: 'Астана', lat: 51.1694, lng: 71.4491 },
  { value: 'Шымкент', label: 'Шымкент', lat: 42.3417, lng: 69.5901 },
  { value: 'Караганда', label: 'Караганда', lat: 49.8067, lng: 73.085 },
  { value: 'Актобе', label: 'Актобе', lat: 50.2839, lng: 57.1669 },
  { value: 'Атырау', label: 'Атырау', lat: 47.0945, lng: 51.9238 },
  { value: 'Актау', label: 'Актау', lat: 43.6532, lng: 51.1975 },
  { value: 'Павлодар', label: 'Павлодар', lat: 52.2873, lng: 76.9674 },
  { value: 'Костанай', label: 'Костанай', lat: 53.2144, lng: 63.6246 },
  { value: 'Усть-Каменогорск', label: 'Усть-Каменогорск', lat: 49.9483, lng: 82.6275 },
] as const;

type FlowStep = 'intro' | 'name' | 'name-confirm' | 'city' | 'address' | 'address-confirm' | 'submit';

const STEP_META: Record<Exclude<FlowStep, 'intro'>, { index: number; total: number; label: string }> = {
  name: { index: 1, total: 3, label: 'Название' },
  'name-confirm': { index: 1, total: 3, label: 'Название' },
  city: { index: 2, total: 3, label: 'Город' },
  address: { index: 3, total: 3, label: 'Адрес' },
  'address-confirm': { index: 3, total: 3, label: 'Адрес' },
  submit: { index: 3, total: 3, label: 'Подтверждение' },
};

export default function SetupRestaurant() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<FlowStep>('intro');
  const [formData, setFormData] = useState({
    name: '',
    city: 'Алматы',
    address: '',
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeUserRole(user.role);

  // Prevent "fatal" navigation loops / blank pages when this route is reached by mistake.
  // Setup is only valid for owners who still need to submit the restaurant application.
  if (user.restaurant_verified) {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (role !== 'owner' && role !== 'pending') {
    return <Navigate to="/register-restaurant/pending" replace />;
  }
  if (user.restaurant_setup_required !== true) {
    return <Navigate to="/register-restaurant/pending" replace />;
  }

  const selectedCity = useMemo(
    () => CITY_OPTIONS.find((city) => city.value === formData.city) ?? CITY_OPTIONS[0],
    [formData.city],
  );

  const goToNameConfirm = () => {
    if (!formData.name.trim()) {
      toast.error('Введите название ресторана');
      return;
    }
    setStep('name-confirm');
  };

  const goToAddressConfirm = () => {
    if (!formData.address.trim()) {
      toast.error('Введите адрес ресторана');
      return;
    }
    setStep('address-confirm');
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/auth/setup-restaurant/', {
        restaurant_name: formData.name.trim(),
        city: selectedCity.value,
        address: formData.address.trim(),
        phone: '',
        lat: selectedCity.lat,
        lng: selectedCity.lng,
      });
      toast.success('Заявка на ресторан отправлена');
      navigate('/register-restaurant/pending');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при отправке заявки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] font-inter text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="hidden border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] px-10 py-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <Logo className="h-9" />
            </Link>

            <div className="mt-20 max-w-xl">
              <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">
                Onboarding ресторана
              </div>
              <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-tight text-slate-900">
                Сначала подтверждаем базовые данные, потом отправляем заявку
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
                Название, город и адрес проходят через отдельные шаги подтверждения. Это снижает ошибки ещё до модерации.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <AsideCard
              icon={<Store size={20} />}
              title="Проверка названия"
              description="Система отдельно просит подтвердить название, чтобы оно попало в каталог без опечаток."
            />
            <AsideCard
              icon={<MapPinned size={20} />}
              title="Город и адрес"
              description="Сначала выбирается город Казахстана, затем отдельно подтверждается адрес ресторана."
            />
            <AsideCard
              icon={<Building2 size={20} />}
              title="Чистый onboarding"
              description="Без перегруженных форм. Только последовательные шаги и ясные решения для администратора."
            />
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[720px]">
            <Link to="/" className="inline-flex items-center gap-3 lg:hidden">
              <Logo className="h-9" />
            </Link>

            <motion.div
              key={step}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mt-8 rounded-[34px] border border-slate-200 bg-white p-8 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] sm:p-10"
            >
              {step !== 'intro' ? <ProgressHeader step={step} /> : null}

              {step === 'intro' ? (
                <IntroStep onContinue={() => setStep('name')} />
              ) : null}

              {step === 'name' ? (
                <StepShell
                  stepLabel="Шаг 1"
                  title="Введите название ресторана"
                  description="Укажите то название, под которым заведение должно отображаться в системе и в каталоге."
                  onBack={() => setStep('intro')}
                >
                  <Field
                    label="Название ресторана"
                    placeholder="Например, Kezdes Grill"
                    value={formData.name}
                    onChange={(value) => setFormData((current) => ({ ...current, name: value }))}
                    icon={<Store size={18} />}
                  />
                  <PrimaryButton onClick={goToNameConfirm}>Продолжить</PrimaryButton>
                </StepShell>
              ) : null}

              {step === 'name-confirm' ? (
                <ConfirmationStep
                  stepLabel="Проверка названия"
                  title="Вы уверены, что название указано правильно?"
                  value={formData.name.trim()}
                  hint="Название будет использоваться в заявке, каталоге и дальнейшей настройке ресторана."
                  onEdit={() => setStep('name')}
                  onConfirm={() => setStep('city')}
                />
              ) : null}

              {step === 'city' ? (
                <StepShell
                  stepLabel="Шаг 2"
                  title="Выберите город"
                  description="Укажите город Казахстана, где находится ресторан. Это поможет правильно привязать заявку."
                  onBack={() => setStep('name-confirm')}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CITY_OPTIONS.map((city) => {
                      const active = city.value === formData.city;
                      return (
                        <button
                          key={city.value}
                          type="button"
                          onClick={() => setFormData((current) => ({ ...current, city: city.value }))}
                          className={`rounded-2xl border px-5 py-4 text-left transition ${
                            active
                              ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="text-sm font-semibold">{city.label}</div>
                        </button>
                      );
                    })}
                  </div>
                  <PrimaryButton onClick={() => setStep('address')}>Продолжить</PrimaryButton>
                </StepShell>
              ) : null}

              {step === 'address' ? (
                <StepShell
                  stepLabel="Шаг 3"
                  title="Введите адрес"
                  description={`Укажите полный адрес ресторана в городе ${selectedCity.value}.`}
                  onBack={() => setStep('city')}
                >
                  <Field
                    label="Адрес ресторана"
                    placeholder="Улица, дом, этаж или ориентир"
                    value={formData.address}
                    onChange={(value) => setFormData((current) => ({ ...current, address: value }))}
                    icon={<MapPinned size={18} />}
                  />
                  <PrimaryButton onClick={goToAddressConfirm}>Продолжить</PrimaryButton>
                </StepShell>
              ) : null}

              {step === 'address-confirm' ? (
                <ConfirmationStep
                  stepLabel="Проверка адреса"
                  title="Адрес указан правильно?"
                  value={`${selectedCity.value}, ${formData.address.trim()}`}
                  hint="Если адрес неточный, заявку придётся исправлять вручную. Лучше подтвердить его сейчас."
                  onEdit={() => setStep('address')}
                  onConfirm={() => setStep('submit')}
                />
              ) : null}

              {step === 'submit' ? (
                <StepShell
                  stepLabel="Финал"
                  title="Проверьте заявку перед отправкой"
                  description="После отправки заявка попадёт на проверку. Как только ресторан одобрят, вы сможете продолжить работу в системе."
                  onBack={() => setStep('address-confirm')}
                >
                  <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <SummaryRow label="Название" value={formData.name.trim()} />
                    <SummaryRow label="Город" value={selectedCity.value} />
                    <SummaryRow label="Адрес" value={formData.address.trim()} />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-[13px] font-black uppercase tracking-widest text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                  >
                    <span>{loading ? 'Отправка заявки...' : 'Отправить заявку'}</span>
                    <ArrowRight size={18} />
                  </button>
                </StepShell>
              ) : null}
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}

function IntroStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]"
        >
          Старт настройки
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="max-w-2xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl"
        >
          Настройте ресторан перед первым рабочим днём
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="max-w-2xl text-base leading-8 text-slate-600"
        >
          Мы последовательно проверим название, город и адрес. Так ресторан попадёт в систему без лишних исправлений и ручных уточнений.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="max-w-2xl rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-4"
        >
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Что займёт меньше минуты</div>
          <div className="mt-2 text-sm leading-7 text-slate-700">
            Сначала система уточнит базовые данные, а затем отправит заявку на проверку. Без длинной формы и без лишних полей.
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <MiniStep number="01" title="Название" text="Проверяем, как ресторан будет называться в системе." />
        <MiniStep number="02" title="Город" text="Привязываем заявку к правильному городу Казахстана." />
        <MiniStep number="03" title="Адрес" text="Уточняем полный адрес до отправки заявки." />
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3 }}
        type="button"
        onClick={onContinue}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-[13px] font-black uppercase tracking-widest text-white transition hover:bg-[#1e40af] sm:w-auto sm:px-10"
      >
        Продолжить
        <ArrowRight size={18} />
      </motion.button>
    </div>
  );
}

function StepShell({
  stepLabel,
  title,
  description,
  onBack,
  children,
}: {
  stepLabel: string;
  title: string;
  description: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Назад
      </button>

      <div className="max-w-xl">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stepLabel}</div>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 leading-none">{title}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600 font-medium">{description}</p>
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}

function ConfirmationStep({
  stepLabel,
  title,
  value,
  hint,
  onEdit,
  onConfirm,
}: {
  stepLabel: string;
  title: string;
  value: string;
  hint: string;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="max-w-xl">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stepLabel}</div>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 leading-none">{title}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600 font-medium">{hint}</p>
      </div>

      <div className="rounded-[30px] border border-blue-100 bg-blue-50 p-6">
        <div className="inline-flex rounded-2xl bg-white p-3 text-[#1d4ed8] shadow-sm">
          <CheckCircle2 size={20} />
        </div>
        <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Подтверждаем значение</div>
        <div className="mt-3 rounded-[22px] border border-white/70 bg-white/70 px-4 py-4 text-3xl font-black tracking-tight text-slate-900">
          {value}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[12px] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
        >
          Изменить
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-14 items-center justify-center rounded-2xl bg-[#1d4ed8] text-[12px] font-black uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
        >
          Да, я уверен
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafaf9] pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
        />
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-[13px] font-black uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
    >
      {children}
      <ArrowRight size={18} />
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="max-w-[70%] text-right text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ProgressHeader({ step }: { step: Exclude<FlowStep, 'intro'> }) {
  const meta = STEP_META[step];
  const progress = (meta.index / meta.total) * 100;

  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Шаг {meta.index} из {meta.total}
        </div>
        <div className="text-xs font-semibold text-slate-500">{meta.label}</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#1d4ed8] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function MiniStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">{number}</div>
      <div className="mt-2 text-lg font-bold tracking-tight text-slate-900">{title}</div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function AsideCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
      <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-[#1d4ed8]">{icon}</div>
      <div className="mt-4 text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{description}</div>
    </div>
  );
}
