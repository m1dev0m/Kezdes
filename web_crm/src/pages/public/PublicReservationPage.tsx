import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { getApiErrorMessage } from '@/features/reservations/shared';

type PublicReservationRecord = {
  id: number;
  public_token: string;
  restaurant: number;
  restaurant_name: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  status_display?: string;
  table_number?: string | null;
  can_be_cancelled?: boolean;
  created_at?: string;
};

export default function PublicReservationPage() {
  const { token } = useParams();
  const [reservation, setReservation] = useState<PublicReservationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Ссылка на бронирование повреждена.');
      return;
    }

    const loadReservation = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<PublicReservationRecord>(`/bookings/public/${token}/`);
        setReservation(response.data);
      } catch (loadError) {
        setReservation(null);
        setError(getApiErrorMessage(loadError, 'Не удалось найти бронирование по этой ссылке.'));
      } finally {
        setLoading(false);
      }
    };

    void loadReservation();
  }, [token]);

  const handleCancel = async () => {
    if (!token || !reservation?.can_be_cancelled || cancelling) return;

    setCancelling(true);
    setError(null);
    try {
      const response = await api.delete<PublicReservationRecord>(`/bookings/public/${token}/`);
      setReservation(response.data);
    } catch (cancelError) {
      setError(getApiErrorMessage(cancelError, 'Не удалось отменить бронирование по этой ссылке.'));
    } finally {
      setCancelling(false);
    }
  };

  const statusLabel = useMemo(() => {
    switch (reservation?.status) {
      case 'confirmed':
      case 'approved':
        return 'Подтверждено';
      case 'cancelled_by_user':
      case 'cancelled_by_restaurant':
        return 'Отменено';
      case 'payment_pending':
        return 'Ожидает оплаты';
      case 'pending':
      default:
        return reservation?.status_display || 'Ожидает подтверждения';
    }
  }, [reservation?.status, reservation?.status_display]);

  const pageTitle = useMemo(() => {
    if (!reservation) return 'Бронирование не найдено';
    if (reservation.status === 'cancelled_by_user' || reservation.status === 'cancelled_by_restaurant') {
      return 'Бронирование отменено';
    }
    if (reservation.status === 'confirmed' || reservation.status === 'approved') {
      return 'Бронирование подтверждено';
    }
    return 'Управление бронированием';
  }, [reservation]);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-16 font-inter text-slate-900">
      <div className="mx-auto max-w-[760px] rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-[24px] border shadow-sm ${
              reservation ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {reservation ? <CheckCircle2 size={36} /> : <CircleAlert size={36} />}
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            {reservation
              ? 'По этой ссылке можно проверить статус бронирования и, если это ещё разрешено, отменить заявку без входа в аккаунт.'
              : error || 'Ссылка недействительна или срок действия бронирования уже истёк.'}
          </p>
        </div>

        {reservation ? (
          <>
            <div className="mt-10 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">ID бронирования</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">#{reservation.id}</div>
                </div>
                <div className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
                  {statusLabel}
                </div>
              </div>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <Detail label="Ресторан" value={reservation.restaurant_name} />
                <Detail label="Дата" value={reservation.date} />
                <Detail label="Время" value={reservation.time} />
                <Detail label="Гостей" value={String(reservation.guests)} />
                <Detail label="Стол" value={reservation.table_number || 'Назначается рестораном'} />
                <Detail label="Ссылка" value="Активна для просмотра статуса" />
              </dl>
            </div>

            {error ? (
              <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={`/restaurant/${reservation.restaurant}`}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
              >
                Вернуться к ресторану
              </Link>
              {reservation.can_be_cancelled ? (
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-rose-200 bg-white px-6 py-4 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelling ? 'Отменяем...' : 'Отменить бронь'}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="mt-8 flex justify-center">
            <Link
              to="/restaurants"
              className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
            >
              Перейти к поиску ресторанов
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
