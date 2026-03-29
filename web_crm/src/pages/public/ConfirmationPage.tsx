import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, CircleAlert } from 'lucide-react';

type ConfirmationState = {
  reservationId?: number;
  restaurantName?: string;
  date?: string;
  time?: string;
  guests?: number;
  guestName?: string;
  phone?: string;
};

export default function ConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const state = (location.state as ConfirmationState | null) ?? {};
  const hasReservation = Boolean(state.reservationId);

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
            {hasReservation ? 'Бронирование подтверждено' : 'Детали бронирования не найдены'}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            {hasReservation
              ? 'Заявка успешно отправлена в заведение. Ниже указаны основные детали визита.'
              : 'Страница открыта без данных о бронировании. Вы можете вернуться к ресторану и создать новую заявку.'}
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
              {hasReservation ? 'Создано' : 'Нужно новое бронирование'}
            </div>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <Detail label="Ресторан" value={state.restaurantName || '—'} />
            <Detail label="Дата" value={state.date || '—'} />
            <Detail label="Время" value={state.time || '—'} />
            <Detail label="Гостей" value={state.guests ? String(state.guests) : '—'} />
            <Detail label="Имя гостя" value={state.guestName || '—'} />
            <Detail label="Телефон" value={state.phone || '—'} valueAriaLabel="booking-confirmation-phone" />
          </dl>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/restaurant/${id}`}
            aria-label="booking-confirmation-back-restaurant"
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
          >
            Вернуться в профиль заведения
          </Link>
          <Link
            to={`/restaurant/${id}/book`}
            aria-label="booking-confirmation-book-again"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
          >
            Забронировать ещё раз
          </Link>
        </div>
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
