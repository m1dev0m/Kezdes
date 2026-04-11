import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { extractResults, getApiErrorMessage, getLocalDateString } from '@/features/reservations/shared';

type WaitlistRecord = {
  id: number;
  public_token: string;
  restaurant: number;
  restaurant_name: string;
  user_name?: string | null;
  contact_name?: string | null;
  date: string;
  time: string;
  guests: number;
  status: string;
  slot_available?: boolean;
  turnover_minutes?: number;
  suggested_tables?: Array<{
    id: number;
    name: string;
    capacity: number;
  }>;
  created_at: string;
  notified_at?: string | null;
};

type WaitlistCreateForm = {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  date: string;
  time: string;
  guests: number;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  }).format(date);
}

function getWaitlistStatusLabel(status: string) {
  switch (status) {
    case 'waiting':
      return 'Ожидает слот';
    case 'notified':
      return 'Уведомлён';
    case 'promoted':
      return 'Переведён в бронь';
    case 'expired':
      return 'Истёк';
    case 'cancelled':
      return 'Отменён';
    default:
      return status.replaceAll('_', ' ');
  }
}

export default function Waitlist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<WaitlistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<WaitlistCreateForm>({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    date: getLocalDateString(),
    time: '19:00',
    guests: 2,
  });

  const restaurantId = user?.owned_restaurant?.id ?? user?.restaurant ?? null;

  const loadEntries = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/bookings/waitlist/');
      setEntries(extractResults<WaitlistRecord>(response.data));
      setPageError(null);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить лист ожидания.');
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const stats = useMemo(
    () => ({
      active: entries.filter((entry) => ['waiting', 'notified'].includes(entry.status)).length,
      openSlots: entries.filter((entry) => entry.slot_available && ['waiting', 'notified'].includes(entry.status)).length,
      notified: entries.filter((entry) => entry.status === 'notified').length,
    }),
    [entries],
  );

  const handleConvert = async (entry: WaitlistRecord) => {
    setBusyId(entry.id);
    try {
      const response = await api.post(`/bookings/waitlist/${entry.id}/convert-to-reservation/`);
      toast.success('Запись из листа ожидания переведена в бронь.');
      await loadEntries();
      const bookingId = response.data?.booking_id ?? response.data?.id;
      const redirectTo = response.data?.redirect_to;
      if (redirectTo) {
        navigate(redirectTo);
      } else if (bookingId) {
        navigate(`/app/bookings?id=${bookingId}`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось перевести запись в бронь.'));
    } finally {
      setBusyId(null);
    }
  };

  const copyPublicLink = async (entry: WaitlistRecord) => {
    try {
      const url = `${window.location.origin}/waitlist/${entry.public_token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Публичная ссылка скопирована.');
    } catch {
      toast.error('Не удалось скопировать ссылку.');
    }
  };

  const handleCreateWaitlist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!restaurantId) {
      toast.error('Не удалось определить ресторан для этой учётной записи.');
      return;
    }
    if (!createForm.guest_name.trim() || !createForm.guest_phone.trim()) {
      toast.error('Укажите имя и телефон гостя.');
      return;
    }

    setCreateLoading(true);
    try {
      await api.post('/bookings/waitlist/', {
        restaurant: restaurantId,
        guest_name: createForm.guest_name.trim(),
        guest_phone: createForm.guest_phone.trim(),
        guest_email: createForm.guest_email.trim() || undefined,
        date: createForm.date,
        time: createForm.time,
        guests: Math.max(1, createForm.guests),
      });
      toast.success('Гость добавлен в лист ожидания.');
      setCreateOpen(false);
      setCreateForm({
        guest_name: '',
        guest_phone: '',
        guest_email: '',
        date: getLocalDateString(),
        time: '19:00',
        guests: 2,
      });
      await loadEntries();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось добавить гостя в лист ожидания.'));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Живая очередь и резерв</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Лист ожидания</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">Очередь гостей и резерв на полностью занятые слоты.</p>
            <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 space-y-2">
              <p>
                Используйте очередь для гостей, которые пришли без предупреждения (walk-in) и ждут столик прямо сейчас, 
                либо для гостей, которые хотят попасть к вам в уже полностью занятое время.
              </p>
              <p>
                Как только подходящий стол освободится, система подскажет вам об этом. Вы сможете перевести запись из очереди в полноценную бронь в один клик.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1e40af]"
            >
              <Plus size={16} />
              Добавить в очередь
            </button>
            <button
              type="button"
              onClick={() => void loadEntries()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Активные заявки" value={stats.active} />
        <SummaryCard label="Можно предложить слот" value={stats.openSlots} accent="text-emerald-700 bg-emerald-50" />
        <SummaryCard label="Уже уведомлены" value={stats.notified} accent="text-amber-700 bg-amber-50" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {pageError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">{pageError}</div>
        ) : null}

        <div className="border-b border-slate-200 px-6 py-5">
          <div className="text-lg font-semibold tracking-tight text-slate-900">Операционный лист ожидания</div>
          <div className="mt-1 text-sm text-slate-500">Здесь видно, кому уже можно предложить слот и какие столы подходят лучше всего.</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Гость</th>
                <th className="px-6 py-4">Слот</th>
                <th className="px-6 py-4">Столы</th>
                <th className="px-6 py-4">Статус</th>
                <th className="px-6 py-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                    Загрузка листа ожидания...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                    Активных записей пока нет.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const canConvert = Boolean(entry.slot_available) && ['waiting', 'notified'].includes(entry.status);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-semibold text-slate-900">{entry.contact_name || entry.user_name || 'Гость'}</div>
                        <div className="mt-1 text-xs text-slate-500">{entry.guests} гостей</div>
                        {entry.notified_at ? <div className="mt-2 text-xs text-amber-600">Уведомление отправлено</div> : null}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-medium text-slate-700">{formatDate(entry.date)}</div>
                        <div className="mt-1 text-sm text-slate-500">{entry.time.slice(0, 5)}</div>
                        <div className="mt-2 text-xs text-slate-400">Оборот стола: {entry.turnover_minutes || 85} мин</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {entry.suggested_tables && entry.suggested_tables.length > 0 ? (
                          <div className="space-y-2">
                            {entry.suggested_tables.map((table, index) => (
                              <div key={table.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                                {index === 0 ? <Sparkles size={12} className="text-[#1d4ed8]" /> : null}
                                <span className="font-semibold">{table.name}</span>
                                <span className="text-slate-400">до {table.capacity}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Подходящих столов сейчас нет</span>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            entry.slot_available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {entry.slot_available ? 'Слот открыт' : 'Слот ещё занят'}
                          </span>
                          <div className="text-xs text-slate-500">{getWaitlistStatusLabel(entry.status)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-top">
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => void copyPublicLink(entry)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Copy size={14} />
                            Ссылка
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConvert(entry)}
                            disabled={!canConvert || busyId === entry.id}
                            className="inline-flex items-center justify-center rounded-xl bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === entry.id ? 'Создаём бронь...' : canConvert ? 'Перевести в бронь' : 'Ждём слот'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Добавить гостя в лист ожидания</h2>
                <p className="mt-1 text-sm text-slate-500">Для walk-in гостя или звонка, когда слота на нужное время пока нет.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                aria-label="waitlist-create-close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWaitlist} className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Имя гостя</span>
                  <input
                    value={createForm.guest_name}
                    onChange={(event) => setCreateForm((current) => ({ ...current, guest_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#1d4ed8] focus:bg-white"
                    placeholder="Например, Алия"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Телефон</span>
                  <input
                    value={createForm.guest_phone}
                    onChange={(event) => setCreateForm((current) => ({ ...current, guest_phone: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#1d4ed8] focus:bg-white"
                    placeholder="+7 700 000 00 00"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Гости</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={createForm.guests}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, guests: Math.min(20, Math.max(1, Number(event.target.value) || 1)) }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#1d4ed8] focus:bg-white"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Дата</span>
                  <input
                    type="date"
                    min={getLocalDateString()}
                    value={createForm.date}
                    onChange={(event) => setCreateForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#1d4ed8] focus:bg-white"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Время</span>
                  <input
                    type="time"
                    value={createForm.time}
                    onChange={(event) => setCreateForm((current) => ({ ...current, time: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#1d4ed8] focus:bg-white"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={createForm.guest_email}
                    onChange={(event) => setCreateForm((current) => ({ ...current, guest_email: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#1d4ed8] focus:bg-white"
                    placeholder="Необязательно"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {createLoading ? 'Добавляем...' : 'Добавить в лист ожидания'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent = 'text-blue-700 bg-blue-50',
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-2xl p-3 ${accent}`}>
        <Sparkles size={18} />
      </div>
      <div className="mt-4 text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
