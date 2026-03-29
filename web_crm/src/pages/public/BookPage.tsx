import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock3, Phone, UserRound, Users } from 'lucide-react';
import api from '@/services/api';
import { getApiErrorMessage, getLocalDateString, type RestaurantRecord } from '@/features/reservations/shared';

type BookingFormState = {
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
};

type FieldErrors = Partial<Record<keyof BookingFormState, string>>;

const INITIAL_STATE: BookingFormState = {
  date: getLocalDateString(),
  time: '19:00',
  guests: 2,
  name: '',
  phone: '',
};

function validateForm(form: BookingFormState): FieldErrors {
  const errors: FieldErrors = {};
  const digits = form.phone.replace(/\D/g, '');

  if (!form.date) errors.date = 'Выберите дату бронирования.';
  if (!form.time) errors.time = 'Выберите время.';
  if (!form.name.trim()) errors.name = 'Введите ваше имя.';
  if (form.guests < 1) errors.guests = 'Минимум 1 гость.';
  if (form.guests > 20) errors.guests = 'Для групп больше 20 гостей свяжитесь с рестораном.';
  if (digits.length < 10 || digits.length > 12) errors.phone = 'Введите корректный номер телефона.';

  return errors;
}

export default function BookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<RestaurantRecord | null>(null);
  const [form, setForm] = useState<BookingFormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const response = await api.get<RestaurantRecord>(`/restaurants/${id}/`);
        setRestaurant(response.data);
      } catch (loadError) {
        setScreenError(getApiErrorMessage(loadError, 'Ресторан временно недоступен.'));
      } finally {
        setScreenLoading(false);
      }
    };

    void loadRestaurant();
  }, [id]);

  const isValid = useMemo(() => Object.keys(validateForm(form)).length === 0, [form]);

  const updateField = <K extends keyof BookingFormState>(key: K, value: BookingFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    if (screenError) setScreenError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !id || !restaurant) {
      setScreenError('Проверьте форму и исправьте отмеченные поля.');
      return;
    }

    setLoading(true);
    setScreenError(null);
    try {
      const response = await api.post('/bookings/', {
        restaurant: Number(id),
        date: form.date,
        time: form.time,
        guests: form.guests,
        user_name: form.name.trim(),
        user_phone: form.phone.trim(),
        event_type: 'other',
      });

      navigate(`/restaurant/${id}/success`, {
        state: {
          reservationId: response.data.id,
          restaurantName: restaurant.name,
          date: form.date,
          time: form.time,
          guests: form.guests,
          guestName: form.name.trim(),
          phone: form.phone.trim(),
        },
      });
    } catch (submitError) {
      setScreenError(getApiErrorMessage(submitError, 'Не удалось создать бронирование.'));
    } finally {
      setLoading(false);
    }
  };

  if (screenLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        Загрузка ресторана...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-10 font-inter text-slate-900">
      <div className="mx-auto max-w-[1160px]">
        <Link
          to={`/restaurant/${id}`}
          aria-label="booking-back"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Назад к ресторану
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="max-w-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Бронирование</div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Забронируйте столик</h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Дата, время, количество гостей и контактные данные. Без регистрации и без лишних шагов.
              </p>
            </div>

            {screenError ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{screenError}</div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label="Дата"
                  name="date"
                  icon={<CalendarDays size={18} />}
                  type="date"
                  min={getLocalDateString()}
                  value={form.date}
                  onChange={(event) => updateField('date', event.target.value)}
                  error={fieldErrors.date}
                />
                <Field
                  label="Время"
                  name="time"
                  icon={<Clock3 size={18} />}
                  type="time"
                  value={form.time}
                  onChange={(event) => updateField('time', event.target.value)}
                  error={fieldErrors.time}
                />
              </div>

              <Field
                label="Количество гостей"
                name="guests"
                icon={<Users size={18} />}
                type="number"
                min={1}
                max={20}
                value={String(form.guests)}
                onChange={(event) => updateField('guests', Math.min(20, Math.max(1, Number(event.target.value) || 1)))}
                error={fieldErrors.guests}
              />

              <Field
                label="Ваше имя"
                name="name"
                icon={<UserRound size={18} />}
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Как к вам обращаться"
                error={fieldErrors.name}
              />

              <Field
                label="Телефон"
                name="phone"
                icon={<Phone size={18} />}
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+7 (___) ___ __ __"
                error={fieldErrors.phone}
              />

              <button
                type="submit"
                disabled={loading || !isValid}
                aria-label="booking-submit"
                className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#1d4ed8] text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af] disabled:opacity-50"
              >
                {loading ? 'Создание брони...' : 'Забронировать'}
              </button>
            </form>
          </div>

          <div className="space-y-5">
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ресторан</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{restaurant?.name || 'Ресторан'}</div>
              <div className="mt-4 space-y-4">
                <SummaryRow label="Адрес" value={restaurant?.address || 'Адрес не указан'} />
                <SummaryRow
                  label="Часы работы"
                  value={`${restaurant?.opening_time?.slice(0, 5) || '10:00'} - ${restaurant?.closing_time?.slice(0, 5) || '23:00'}`}
                />
                <SummaryRow label="Формат" value="Онлайн-бронирование без авторизации" />
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="text-xl font-semibold tracking-tight text-slate-900">Что произойдёт дальше</div>
              <div className="mt-5 space-y-4">
                {[
                  'После отправки форма сразу создаст бронь в системе ресторана.',
                  'Команда увидит заявку в CRM и сможет быстро подтвердить, посадить или завершить визит.',
                  'Вы получите экран успеха с основными деталями бронирования.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-2 h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
                    <p className="text-sm leading-7 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
  max,
  error,
}: {
  label: string;
  name: string;
  icon: ReactNode;
  type?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          id={name}
          name={name}
          aria-label={`booking-${name}`}
          type={type}
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className={`h-14 w-full rounded-2xl border bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition ${
            error ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50'
          }`}
        />
      </div>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
