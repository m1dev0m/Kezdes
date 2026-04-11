import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock3, Phone, TimerReset, UserRound, Users } from 'lucide-react';
import api from '@/services/api';
import { getApiErrorMessage, getLocalDateString, type RestaurantRecord } from '@/features/reservations/shared';
import { useAuth } from '@/modules/auth/logic/AuthContext';

type BookingFormState = {
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
};

type FieldErrors = Partial<Record<keyof BookingFormState, string>>;
type StoredGuestContact = {
  name?: string;
  phone?: string;
};

const INITIAL_STATE: BookingFormState = {
  date: getLocalDateString(),
  time: '19:00',
  guests: 2,
  name: '',
  phone: '',
};

const QUICK_GUEST_OPTIONS = [2, 4, 6];
const GUEST_CONTACT_STORAGE_KEY = 'kezdes:guest-contact';

function getDateOffsetLabel(offset: number) {
  const next = new Date();
  next.setDate(next.getDate() + offset);
  const timezoneOffsetMs = next.getTimezoneOffset() * 60_000;
  return new Date(next.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function getPreferredGuestName(user: ReturnType<typeof useAuth>['user']) {
  if (!user) return '';
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.username || '';
}

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [restaurant, setRestaurant] = useState<RestaurantRecord | null>(null);
  const [form, setForm] = useState<BookingFormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const wantsWaitlist =
    new URLSearchParams(location.search).get('waitlist') === '1' ||
    Boolean((location.state as { openWaitlist?: boolean } | null)?.openWaitlist);
  const profilePhone = user?.phone || user?.profile?.phone || '';
  const usesProfilePhone = Boolean(user && profilePhone);

  useEffect(() => {
    if (!id) {
      setScreenLoading(false);
      return;
    }

    const loadRestaurant = async () => {
      try {
        const isNumericId = /^\d+$/.test(id);
        const response = await api.get<RestaurantRecord>(isNumericId ? `/restaurants/${id}/` : `/restaurants/by-slug/${id}/`);
        setRestaurant(response.data);
      } catch (loadError) {
        setScreenError(getApiErrorMessage(loadError, 'Ресторан временно недоступен.'));
      } finally {
        setScreenLoading(false);
      }
    };

    void loadRestaurant();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextDate = params.get('date');
    const nextTime = params.get('time');
    const rawGuests = params.get('guests');
    const parsedGuests = rawGuests ? Number(rawGuests) : NaN;

    setForm((current) => {
      const nextGuests = Number.isFinite(parsedGuests) ? parsedGuests : current.guests;
      const safeGuests = Math.min(20, Math.max(1, nextGuests || current.guests));
      const nextState = {
        ...current,
        date: nextDate || current.date,
        time: nextTime || current.time,
        guests: safeGuests,
      };

      if (
        nextState.date === current.date &&
        nextState.time === current.time &&
        nextState.guests === current.guests
      ) {
        return current;
      }
      return nextState;
    });
  }, [location.search]);

  useEffect(() => {
    if (!user) return;

    const preferredName = getPreferredGuestName(user);
    const preferredPhone = profilePhone;

    setForm((current) => ({
      ...current,
      name: current.name || preferredName,
      phone: current.phone || preferredPhone,
    }));
  }, [profilePhone, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(GUEST_CONTACT_STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredGuestContact;
      setForm((current) => ({
        ...current,
        name: current.name || stored.name || '',
        phone: current.phone || stored.phone || '',
      }));
    } catch {
      // Ignore invalid storage payloads.
    }
  }, []);

  useEffect(() => {
    if (!id || !form.date) return;
    const current = new URLSearchParams(location.search);
    const next = new URLSearchParams(current);
    next.set('date', form.date);
    next.set('time', form.time);
    next.set('guests', String(form.guests));
    if (current.toString() !== next.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [form.date, form.guests, form.time, id, location.search, setSearchParams]);

  useEffect(() => {
    if (!restaurant?.id || !form.date) return;

    const loadSlots = async () => {
      setLoadingSlots(true);
      setAvailabilityError(null);
      setAvailableSlots([]);
      try {
        const response = await api.get<{ slots: string[] }>('/bookings/available_slots/', {
          params: {
            restaurant_id: restaurant.id,
            date: form.date,
            guests: form.guests,
          },
        });
        const slots = Array.isArray(response.data?.slots) ? response.data.slots : [];
        setAvailableSlots(slots);
      } catch (error) {
        setAvailableSlots([]);
        setAvailabilityError(getApiErrorMessage(error, 'Не удалось загрузить доступные слоты.'));
      } finally {
        setLoadingSlots(false);
      }
    };

    void loadSlots();
  }, [availabilityRetry, form.date, form.guests, restaurant?.id, wantsWaitlist]);

  const isValid = useMemo(() => Object.keys(validateForm(form)).length === 0, [form]);
  const hasExactAvailability = availableSlots.includes(form.time);
  const showWaitlistAction = wantsWaitlist || (!loadingSlots && (!hasExactAvailability || Boolean(availabilityError)));
  const canSubmitBooking = Boolean(
    isValid &&
      !loading &&
      restaurant &&
      !screenError &&
      (!loadingSlots || Boolean(availabilityError)) &&
      (availabilityError || hasExactAvailability),
  );
  const resolvedRestaurantId = restaurant?.id ?? (id && /^\d+$/.test(id) ? Number(id) : null);
  const restaurantLinkId = restaurant?.id ?? id ?? '';
  const resolvedPhone = (usesProfilePhone ? profilePhone : form.phone).trim();

  const updateField = <K extends keyof BookingFormState>(key: K, value: BookingFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    if (screenError) setScreenError(null);
  };

  const persistGuestContact = (name: string, phone: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        GUEST_CONTACT_STORAGE_KEY,
        JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        } satisfies StoredGuestContact),
      );
    } catch {
      // Best effort only.
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextForm = usesProfilePhone ? { ...form, phone: resolvedPhone } : form;
    const errors = validateForm(nextForm);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !resolvedRestaurantId || !restaurant) {
      setScreenError('Проверьте форму и исправьте отмеченные поля.');
      return;
    }

    if (!availabilityError && !hasExactAvailability) {
      setScreenError('Выберите доступное время или попробуйте лист ожидания.');
      return;
    }

    setLoading(true);
    setScreenError(null);
    try {
      const response = await api.post('/bookings/', {
        restaurant: restaurant.id,
        date: form.date,
        time: form.time,
        guests: form.guests,
        user_name: form.name.trim(),
        user_phone: resolvedPhone,
        event_type: 'other',
      });

      const confirmationRestaurantId = restaurant.id;
      const successState = {
        reservationId: response.data.id,
        restaurantId: confirmationRestaurantId,
        restaurantName: restaurant.name,
        date: form.date,
        time: form.time,
        guests: form.guests,
        guestName: form.name.trim(),
        phone: resolvedPhone,
        status: response.data.status || 'pending',
        publicToken: response.data.public_token,
        referenceCode: buildReservationReference('BK', response.data.id, form.date, form.time, confirmationRestaurantId),
      };

      if (typeof window !== 'undefined') {
        const payload = JSON.stringify(successState);
        window.sessionStorage.setItem(`kezdes:reservation-success:${confirmationRestaurantId}`, payload);
        window.sessionStorage.setItem(`kezdes:booking-success:${confirmationRestaurantId}`, payload);
      }
      persistGuestContact(form.name, resolvedPhone);

      navigate(`/restaurant/${confirmationRestaurantId}/success`, {
        state: successState,
      });
    } catch (submitError) {
      const message = getApiErrorMessage(submitError, 'Не удалось создать бронирование.');
      setScreenError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!resolvedRestaurantId || !restaurant) return;
    const nextForm = usesProfilePhone ? { ...form, phone: resolvedPhone } : form;
    const errors = validateForm(nextForm);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setScreenError('Проверьте форму перед добавлением в лист ожидания.');
      return;
    }

    const waitlistRedirectState = {
      date: form.date,
        time: form.time,
        guests: form.guests,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        reservationKind: 'waitlist' as const,
        phone: resolvedPhone,
      };

    setJoiningWaitlist(true);
    try {
      const response = await api.post('/bookings/join_waitlist/', {
        restaurant: restaurant.id,
        date: form.date,
        time: form.time,
        guests: form.guests,
        guest_name: form.name.trim(),
        guest_phone: resolvedPhone,
        guest_email: user?.email || undefined,
      });
      const waitlistId = response.data?.id;
      const referenceCode = buildReservationReference('WL', waitlistId, form.date, form.time, restaurant.id);
      const successState = {
        ...waitlistRedirectState,
        reservationId: waitlistId,
        referenceCode,
        publicToken: response.data?.public_token,
        status: response.data?.status || 'waitlist',
        guestName: response.data?.contact_name || response.data?.guest_name || response.data?.user_name || form.name.trim() || user?.username,
      };

      if (typeof window !== 'undefined') {
        const payload = JSON.stringify(successState);
        window.sessionStorage.setItem(`kezdes:reservation-success:${restaurant.id}`, payload);
        window.sessionStorage.setItem(`kezdes:waitlist-success:${restaurant.id}`, payload);
      }
      persistGuestContact(form.name, resolvedPhone);

      navigate(`/restaurant/${restaurant.id}/success`, {
        state: successState,
      });
    } catch (error) {
      setScreenError(getApiErrorMessage(error, 'Не удалось встать в лист ожидания.'));
    } finally {
      setJoiningWaitlist(false);
    }
  };

  if (screenLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        Загрузка ресторана...
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-4 py-6 font-inter text-slate-900 sm:px-6 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-sm sm:rounded-[32px] sm:p-8 sm:text-left sm:shadow-sm md:text-center lg:text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Бронирование</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Выберите ресторан для брони</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Укажите конкретное заведение на странице каталога. После этого откроется форма бронирования с датой, временем и контактами.
            </p>
            <Link
              to="/restaurants"
              className="mt-8 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
            >
              Открыть каталог ресторанов
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-4 py-6 font-inter text-slate-900 sm:px-6 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-rose-200 bg-white p-5 text-center shadow-sm sm:rounded-[32px] sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Бронирование недоступно</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Этот ресторан сейчас недоступен</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {screenError || 'Не удалось открыть страницу бронирования. Вернитесь в каталог и выберите другое заведение.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/restaurants"
                className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
              >
                Открыть каталог
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 font-inter text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1160px]">
        <Link
          to={`/restaurant/${restaurantLinkId}`}
          aria-label="booking-back"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Назад к ресторану
        </Link>

        <div className="mt-6 grid gap-5 lg:mt-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8 lg:order-1">
            <div className="max-w-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Бронирование</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Забронируйте столик</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:mt-4 sm:leading-7">
                Дата, время, количество гостей и контактные данные. Без регистрации и без лишних шагов.
              </p>
            </div>

            {screenError ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{screenError}</div>
            ) : null}

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:mt-6 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <TimerReset size={14} className="text-slate-400" />
                Доступность на выбранную дату
              </div>
              {wantsWaitlist ? (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-blue-700">
                  Форма открыта из «листа ожидания». Можно сразу отправить запрос, даже если есть свободные слоты.
                </div>
              ) : null}
              {loadingSlots ? (
                <div className="mt-4 text-sm text-slate-500">Проверяем доступные слоты...</div>
              ) : availabilityError ? (
                <div className="mt-4 space-y-3">
                  <div className="text-sm leading-7 text-slate-600">{availabilityError}</div>
                  <button
                    type="button"
                    onClick={() => setAvailabilityRetry((current) => current + 1)}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
                  >
                    Повторить проверку
                  </button>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {!availableSlots.includes(form.time) && !wantsWaitlist ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      На выбранное время сейчас нет слота. Выберите одно из доступных времен ниже.
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => updateField('time', slot)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        form.time === slot ? 'bg-[#1d4ed8] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="text-sm leading-7 text-slate-600">
                    На выбранную дату свободных слотов нет. Можно перейти в лист ожидания, и ресторан увидит ваш запрос.
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5 sm:mt-8 sm:space-y-6" noValidate>
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Быстрый выбор</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Сегодня', value: getDateOffsetLabel(0) },
                    { label: 'Завтра', value: getDateOffsetLabel(1) },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => updateField('date', option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        form.date === option.value ? 'bg-[#1d4ed8] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  {QUICK_GUEST_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => updateField('guests', count)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        form.guests === count ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {count} гостя
                    </button>
                  ))}
                </div>
              </div>

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

              {usesProfilePhone ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Телефон</label>
                  <div className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900">
                    <Phone size={18} className="text-slate-400" />
                    <span>{resolvedPhone}</span>
                  </div>
                  <div className="text-sm text-slate-500">Номер берём из вашего профиля.</div>
                </div>
              ) : (
                <Field
                  label="Телефон"
                  name="phone"
                  icon={<Phone size={18} />}
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="+7 (___) ___ __ __"
                  error={fieldErrors.phone}
                />
              )}

              <button
                type="submit"
                disabled={!canSubmitBooking}
                aria-label="booking-submit"
                className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#1d4ed8] text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af] disabled:opacity-50"
              >
              {loading
                ? 'Создание брони...'
                : !hasExactAvailability && !availabilityError
                  ? 'Выберите доступное время'
                  : 'Забронировать'}
              </button>

              {showWaitlistAction ? (
                <button
                  type="button"
                  onClick={handleJoinWaitlist}
                  disabled={joiningWaitlist}
                  aria-label="booking-waitlist"
                  className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {joiningWaitlist ? 'Добавляем в лист ожидания...' : 'Встать в лист ожидания'}
                </button>
              ) : null}

              {!user && showWaitlistAction ? (
                <p className="text-sm leading-7 text-slate-500">
                  Заявка в лист ожидания сохранится по вашему имени и телефону. Отдельный логин для этого сценария не нужен.
                </p>
              ) : null}
            </form>
          </div>

          <div className="space-y-4 lg:order-2 lg:space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ресторан</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{restaurant?.name || 'Ресторан'}</div>
              <div className="mt-4 space-y-4">
                <SummaryRow label="Адрес" value={restaurant?.address || 'Адрес не указан'} />
                <SummaryRow
                  label="Часы работы"
                  value={`${restaurant?.opening_time?.slice(0, 5) || '10:00'} - ${restaurant?.closing_time?.slice(0, 5) || '23:00'}`}
                />
                <SummaryRow label="Формат" value="Онлайн-бронирование без авторизации" />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[32px] sm:p-8">
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

function buildReservationReference(prefix: 'BK' | 'WL', id: number | undefined, date: string, time: string, restaurantId: number) {
  const safeId = typeof id === 'number' ? String(id) : 'draft';
  const stamp = `${date.replaceAll('-', '')}${time.replace(':', '')}`;
  return `${prefix}-${restaurantId}-${safeId}-${stamp}`;
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
