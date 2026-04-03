import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/services/api';
import { extractResults, getApiErrorMessage } from '@/features/reservations/shared';

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
    case 'converted':
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
  const [entries, setEntries] = useState<WaitlistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

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
      await api.post(`/bookings/waitlist/${entry.id}/convert-to-reservation/`);
      toast.success('Запись из листа ожидания переведена в бронь.');
      await loadEntries();
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Лист ожидания</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Лист ожидания</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Здесь видно, кому уже можно предложить слот, какие столы подходят лучше всего и кого можно быстро перевести в бронь.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadEntries()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Обновить
          </button>
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
          <div className="text-lg font-semibold tracking-tight text-slate-900">Операционный waitlist</div>
          <div className="mt-1 text-sm text-slate-500">Автопредложение слотов уже работает на backend; здесь видны реальные кандидаты и столы для посадки.</div>
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
                    Загрузка waitlist...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                    Активных записей в листе ожидания пока нет.
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
                        {entry.notified_at ? (
                          <div className="mt-2 text-xs text-amber-600">Уведомление отправлено</div>
                        ) : null}
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
