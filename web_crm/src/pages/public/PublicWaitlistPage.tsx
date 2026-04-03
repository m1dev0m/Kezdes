import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { getApiErrorMessage } from '@/features/reservations/shared';

type PublicWaitlistRecord = {
  id: number;
  public_token: string;
  restaurant: number;
  restaurant_name: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  date: string;
  time: string;
  guests: number;
  status: string;
  can_be_cancelled?: boolean;
  promoted_booking?: number | null;
  promoted_booking_public_token?: string | null;
};

export default function PublicWaitlistPage() {
  const { token } = useParams();
  const [entry, setEntry] = useState<PublicWaitlistRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Ссылка на лист ожидания повреждена.');
      return;
    }

    const loadEntry = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<PublicWaitlistRecord>(`/bookings/waitlist/public/${token}/`);
        setEntry(response.data);
      } catch (loadError) {
        setEntry(null);
        setError(getApiErrorMessage(loadError, 'Не удалось найти заявку в листе ожидания.'));
      } finally {
        setLoading(false);
      }
    };

    void loadEntry();
  }, [token]);

  const statusLabel = useMemo(() => {
    switch (entry?.status) {
      case 'waiting':
        return 'Ожидает слот';
      case 'notified':
        return 'Можно подтвердить';
      case 'promoted':
        return 'Бронь создана';
      case 'cancelled':
        return 'Отменено';
      case 'expired':
        return 'Истекло';
      default:
        return 'Лист ожидания';
    }
  }, [entry?.status]);

  const handleCancel = async () => {
    if (!token || !entry?.can_be_cancelled || cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      const response = await api.delete<PublicWaitlistRecord>(`/bookings/waitlist/public/${token}/`);
      setEntry(response.data);
    } catch (cancelError) {
      setError(getApiErrorMessage(cancelError, 'Не удалось отменить заявку в листе ожидания.'));
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirm = async () => {
    if (!token || entry?.status !== 'notified' || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const response = await api.post(`/bookings/confirm_waitlist/`, { public_token: token });
      const publicToken = response.data?.public_token;
      if (publicToken) {
        window.location.href = `/reservation/${publicToken}`;
        return;
      }
      setError('Бронь создана, но не удалось открыть публичную ссылку.');
    } catch (confirmError) {
      setError(getApiErrorMessage(confirmError, 'Не удалось подтвердить слот из листа ожидания.'));
    } finally {
      setConfirming(false);
    }
  };

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
              entry ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {entry ? <CheckCircle2 size={36} /> : <CircleAlert size={36} />}
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
            {entry ? 'Лист ожидания ресторана' : 'Заявка не найдена'}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            {entry
              ? 'По этой ссылке можно проверить статус листа ожидания, отменить заявку или подтвердить освободившийся слот.'
              : error || 'Ссылка недействительна или срок действия заявки истёк.'}
          </p>
        </div>

        {entry ? (
          <>
            <div className="mt-10 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">ID заявки</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">#{entry.id}</div>
                </div>
                <div className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
                  {statusLabel}
                </div>
              </div>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <Detail label="Ресторан" value={entry.restaurant_name} />
                <Detail label="Дата" value={entry.date} />
                <Detail label="Время" value={entry.time} />
                <Detail label="Гостей" value={String(entry.guests)} />
                <Detail label="Имя" value={entry.guest_name || 'Гость'} />
                <Detail label="Телефон" value={entry.guest_phone || 'Не указан'} />
              </dl>
            </div>

            {error ? (
              <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={`/restaurant/${entry.restaurant}`}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#1d4ed8] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
              >
                Вернуться к ресторану
              </Link>
              {entry.status === 'notified' ? (
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={confirming}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-6 py-4 text-xs font-semibold uppercase tracking-widest text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {confirming ? 'Подтверждаем...' : 'Подтвердить слот'}
                </button>
              ) : null}
              {entry.can_be_cancelled ? (
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-rose-200 bg-white px-6 py-4 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelling ? 'Отменяем...' : 'Отменить заявку'}
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
