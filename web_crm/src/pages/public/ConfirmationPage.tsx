import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import api from '@/services/api';
import { buildRestaurantBookHref, getApiErrorMessage } from '@/features/reservations/shared';

type ConfirmationState = {
  reservationId?: number;
  restaurantId?: number;
  restaurantName?: string;
  date?: string;
  time?: string;
  guests?: number;
  guestName?: string;
  phone?: string;
  status?: string;
  reservationKind?: 'booking' | 'waitlist';
  referenceCode?: string;
  publicToken?: string;
  canBeCancelled?: boolean;
};

export default function ConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const initialState = (location.state as ConfirmationState | null) ?? loadStoredConfirmation(id);
  const [state, setState] = useState<ConfirmationState>(initialState);
  const [publicLookupLoading, setPublicLookupLoading] = useState(false);
  const [publicLookupError, setPublicLookupError] = useState<string | null>(null);
  const [cancellingPublicBooking, setCancellingPublicBooking] = useState(false);
  const hasReservation = Boolean(state.reservationId || state.restaurantName || state.date || state.time);
  const routeRestaurantId = state.restaurantId ? String(state.restaurantId) : id;
  const effectiveRestaurantId = routeRestaurantId || id || '';
  const bookingKind = state.reservationKind === 'waitlist' || state.status === 'waitlist' ? 'waitlist' : 'booking';
  const canUsePublicManagement = Boolean(!user && state.publicToken && bookingKind === 'booking');
  const restaurantParams = new URLSearchParams();
  if (state.date) restaurantParams.set('date', state.date);
  if (state.time) restaurantParams.set('time', state.time);
  if (state.guests) restaurantParams.set('guests', String(state.guests));
  const bookAgainHref = buildRestaurantBookHref(effectiveRestaurantId, {
    date: state.date,
    time: state.time,
    guests: state.guests,
  });
  const restaurantHref = `/restaurant/${effectiveRestaurantId}${restaurantParams.toString() ? `?${restaurantParams.toString()}` : ''}`;
  const statusLabel = hasReservation ? getStatusLabel(state.status, bookingKind) : 'Нужно новое бронирование';
  const isCompletedVisit = state.status === 'completed';
  const reviewHref = isCompletedVisit && user && state.reservationId ? `/guest/bookings/${state.reservationId}` : null;
  const title = !hasReservation
    ? 'Детали бронирования не найдены'
    : bookingKind === 'waitlist'
      ? 'Запрос в лист ожидания отправлен'
      : state.status === 'cancelled_by_user' || state.status === 'cancelled_by_restaurant'
        ? 'Бронирование отменено'
      : state.status === 'confirmed' || state.status === 'approved'
        ? 'Бронирование подтверждено'
        : 'Бронирование принято';
  const description = !hasReservation
    ? 'Страница открыта без данных о бронировании. Вы можете вернуться к ресторану и создать новую заявку.'
    : bookingKind === 'waitlist'
      ? 'Запрос на лист ожидания принят. Ниже указаны сохранённые параметры визита.'
      : state.status === 'cancelled_by_user' || state.status === 'cancelled_by_restaurant'
        ? 'Бронь уже отменена. При желании вы можете сразу отправить новую заявку на удобное время.'
      : state.status === 'confirmed' || state.status === 'approved'
        ? 'Заявка успешно отправлена в заведение. Ниже указаны основные детали визита.'
        : 'Заявка создана и ожидает подтверждения от ресторана.';
  const showPublicCancel = Boolean(canUsePublicManagement && state.canBeCancelled);

  useEffect(() => {
    if (!canUsePublicManagement || !state.publicToken) return;

    const syncPublicBooking = async () => {
      setPublicLookupLoading(true);
      setPublicLookupError(null);
      try {
        const response = await api.get(`/bookings/public/${state.publicToken}/`);
        const nextState: ConfirmationState = {
          ...state,
          reservationId: response.data.id ?? state.reservationId,
          restaurantId: response.data.restaurant ?? state.restaurantId,
          restaurantName: response.data.restaurant_name ?? state.restaurantName,
          date: response.data.date ?? state.date,
          time: response.data.time ?? state.time,
          guests: response.data.guests ?? state.guests,
          status: response.data.status ?? state.status,
          publicToken: response.data.public_token ?? state.publicToken,
          canBeCancelled: Boolean(response.data.can_be_cancelled),
        };
        setState(nextState);
        persistConfirmationState(nextState);
      } catch (error) {
        setPublicLookupError(getApiErrorMessage(error, 'Не удалось проверить статус бронирования.'));
      } finally {
        setPublicLookupLoading(false);
      }
    };

    void syncPublicBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUsePublicManagement, state.publicToken]);

  const publicHelpText = useMemo(() => {
    if (publicLookupLoading) return 'Проверяем актуальный статус бронирования по коду подтверждения.';
    if (publicLookupError) return publicLookupError;
    if (!canUsePublicManagement) return null;
    if (showPublicCancel) return 'Без аккаунта вы всё равно можете отменить эту бронь по ссылке из подтверждения.';
    return 'По этой ссылке можно только просмотреть статус: бронь уже подтверждена или больше не может быть отменена.';
  }, [canUsePublicManagement, publicLookupError, publicLookupLoading, showPublicCancel]);

  const handlePublicCancel = async () => {
    if (!state.publicToken || cancellingPublicBooking) return;

    setCancellingPublicBooking(true);
    setPublicLookupError(null);
    try {
      const response = await api.delete(`/bookings/public/${state.publicToken}/`);
      const nextState: ConfirmationState = {
        ...state,
        status: response.data.status ?? 'cancelled_by_user',
        canBeCancelled: Boolean(response.data.can_be_cancelled),
      };
      setState(nextState);
      persistConfirmationState(nextState);
    } catch (error) {
      setPublicLookupError(getApiErrorMessage(error, 'Не удалось отменить бронь по ссылке подтверждения.'));
    } finally {
      setCancellingPublicBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-16 font-inter text-slate-900">
      <div className="mx-auto max-w-[760px] rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-[24px] border shadow-sm ${
              hasReservation ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {hasReservation ? <CheckCircle2 size={36} /> : <CircleAlert size={36} />}
          </div>

          <h1 aria-label="booking-confirmation-title" className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            {description}
          </p>
        </div>

        <div className="mt-10 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">ID бронирования</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {hasReservation ? `#${state.reservationId}` : '—'}
              </div>
            </div>
            <div
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest ${
                hasReservation ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {statusLabel}
            </div>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <Detail label="Ресторан" value={state.restaurantName || '—'} />
            <Detail label="Дата" value={state.date || '—'} />
            <Detail label="Время" value={state.time || '—'} />
            <Detail label="Гостей" value={state.guests ? String(state.guests) : '—'} />
            <Detail label="Имя гостя" value={state.guestName || '—'} />
            <Detail label="Телефон" value={state.phone || '—'} valueAriaLabel="booking-confirmation-phone" />
            <Detail label="Код заявки" value={state.referenceCode || '—'} />
          </dl>
        </div>

        {hasReservation ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Что дальше</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>Заявка уже появилась у ресторана. Команда сможет подтвердить, перенести или отменить бронь со своей стороны.</p>
              <p>
                {user
                  ? 'Если нужно изменить детали сейчас, откройте раздел с моими бронями или отправьте новую заявку на удобное время.'
                  : 'Если нужно изменить детали сейчас, откройте ресторан заново и отправьте новую заявку на удобное время. Код заявки сохраните — он поможет найти бронь в поддержке.'}
              </p>
            </div>
          </div>
        ) : null}

        {isCompletedVisit ? (
          <div className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Завершённый визит</div>
            <p className="mt-2 text-sm leading-7 text-emerald-900">
              Спасибо за визит. Самое практичное дальше — оставить отзыв и, если нужно, повторить бронь с теми же параметрами.
            </p>
            {reviewHref ? (
              <Link
                to={reviewHref}
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
              >
                Оставить отзыв
              </Link>
            ) : null}
          </div>
        ) : null}

        {hasReservation && canUsePublicManagement ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Управление без аккаунта</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{publicHelpText}</p>
              </div>
              {showPublicCancel ? (
                <button
                  type="button"
                  onClick={() => void handlePublicCancel()}
                  disabled={cancellingPublicBooking}
                  className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancellingPublicBooking ? 'Отменяем бронь...' : 'Отменить по ссылке'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to={restaurantHref}
            aria-label="booking-confirmation-back-restaurant"
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
          >
            Вернуться в профиль заведения
          </Link>
          <Link
            to={bookAgainHref}
            aria-label="booking-confirmation-book-again"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
          >
            Повторить бронь
          </Link>
        </div>

        {state.publicToken ? (
          <Link
            to={bookingKind === 'waitlist' ? `/waitlist/${state.publicToken}` : `/reservation/${state.publicToken}`}
            aria-label="booking-confirmation-public-manage"
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
          >
            {bookingKind === 'waitlist' ? 'Открыть ссылку управления заявкой' : 'Открыть ссылку управления бронью'}
          </Link>
        ) : null}

        {hasReservation && user ? (
          <Link
            to="/guest/dashboard"
            aria-label="booking-confirmation-manage"
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-100"
          >
            Открыть мои брони
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Detail({ label, value, valueAriaLabel }: { label: string; value: string; valueAriaLabel?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd aria-label={valueAriaLabel} className="mt-2 text-sm font-medium text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function getStatusLabel(status?: string, bookingKind?: 'booking' | 'waitlist') {
  if (bookingKind === 'waitlist' || status === 'waitlist') return 'В листе ожидания';
  switch (status) {
    case 'confirmed':
    case 'approved':
      return 'Подтверждено';
    case 'cancelled':
    case 'cancelled_by_user':
    case 'cancelled_by_restaurant':
      return 'Отменено';
    case 'pending':
    default:
      return 'Ожидает подтверждения';
  }
}

function loadStoredConfirmation(id?: string) {
  if (typeof window === 'undefined' || !id) return {};

  try {
    const rawKeys = [
      `kezdes:reservation-success:${id}`,
      `kezdes:booking-success:${id}`,
      `kezdes:waitlist-success:${id}`,
    ];

    for (const key of rawKeys) {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as ConfirmationState;
      if (parsed && typeof parsed === 'object') return parsed;
    }

    return {};
  } catch {
    return {};
  }
}

function persistConfirmationState(state: ConfirmationState) {
  if (typeof window === 'undefined' || !state.restaurantId) return;

  const payload = JSON.stringify(state);
  const restaurantId = String(state.restaurantId);
  window.sessionStorage.setItem(`kezdes:reservation-success:${restaurantId}`, payload);
  if (state.reservationKind === 'waitlist' || state.status === 'waitlist') {
    window.sessionStorage.setItem(`kezdes:waitlist-success:${restaurantId}`, payload);
    return;
  }
  window.sessionStorage.setItem(`kezdes:booking-success:${restaurantId}`, payload);
}
