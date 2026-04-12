import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, Search, Star, Users, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { extractResults, getApiErrorMessage, type GuestRecord } from '@/features/reservations/shared';

function formatLastVisit(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

type FilterMode = 'all' | 'vip' | 'new' | 'risk';

export default function Customers() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [pageError, setPageError] = useState<string | null>(null);
  const hasSearch = Boolean(search.trim());

  const loadGuests = useCallback(async () => {
    setRefreshing(true);
    setPageError(null);
    try {
      const params = new URLSearchParams({ ordering: '-last_visit' });
      if (search.trim()) params.set('search', search.trim());

      const response = await api.get(`/crm/customers/?${params.toString()}`);
      setGuests(extractResults<GuestRecord>(response.data));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить список гостей.');
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGuests();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadGuests]);

  const filteredGuests = useMemo(() => {
    if (activeFilter === 'vip') return guests.filter((guest) => guest.is_vip);
    if (activeFilter === 'new') return guests.filter((guest) => (guest.visits_count || 0) <= 1);
    if (activeFilter === 'risk') return guests.filter((guest) => guest.is_blacklisted || (guest.no_show_count || 0) >= 2);
    return guests;
  }, [guests, activeFilter]);

  const stats = useMemo(
    () => ({
      total: guests.length,
      vip: guests.filter((guest) => guest.is_vip).length,
      newGuests: guests.filter((guest) => (guest.visits_count || 0) <= 1).length,
      risk: guests.filter((guest) => guest.is_blacklisted || (guest.no_show_count || 0) >= 2).length,
    }),
    [guests],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/crm/customers/export/', { responseType: 'blob' });
      const fileUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `kezdes_guests_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(fileUrl);
      toast.success('Экспорт гостей готов.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось выгрузить базу гостей.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">CRM</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Guests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Список гостей с визитами, последним посещением и быстрым переходом в карточку клиента.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? 'Экспорт...' : 'Экспорт CSV'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/bookings/new')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
          >
            <UserPlus size={16} />
            New booking
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={<Users size={18} />} label="Всего гостей" value={stats.total} />
        <SummaryCard icon={<Star size={18} />} label="VIP" value={stats.vip} accent="text-amber-600 bg-amber-50" />
        <SummaryCard icon={<UserPlus size={18} />} label="Риск no-show" value={stats.risk} accent="text-rose-600 bg-rose-50" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {pageError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 flex items-center justify-between gap-4">
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => void loadGuests()}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
            >
              Повторить
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Все' },
              { key: 'vip', label: 'VIP' },
              { key: 'new', label: 'Новые' },
              { key: 'risk', label: 'Риск' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key as FilterMode)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeFilter === item.key ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative min-w-[280px]">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="customers-search"
                placeholder="Поиск по имени или телефону"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
              />
            </div>
            <button
              type="button"
              onClick={() => void loadGuests()}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {refreshing ? 'Обновление...' : 'Обновить'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Visits</th>
                <th className="px-6 py-4">Last visit</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                    Загрузка гостей...
                  </td>
                </tr>
              ) : pageError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                    Ошибка загрузки списка гостей.
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-500">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">По текущим фильтрам гостей нет.</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {hasSearch || activeFilter !== 'all'
                            ? 'Сбросьте фильтр или попробуйте другой поиск.'
                            : 'Гости появятся здесь после первых визитов и бронирований.'}
                        </p>
                      </div>
                      {hasSearch || activeFilter !== 'all' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setActiveFilter('all');
                          }}
                          className="inline-flex items-center rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => {
                  const name = guest.full_name || guest.name || 'Guest';
                  const initial = name.charAt(0).toUpperCase();

                  return (
                    <tr key={guest.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{name}</span>
                              {guest.is_vip ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                  VIP
                                </span>
                              ) : null}
                              {guest.is_blacklisted ? (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                  Blacklist
                                </span>
                              ) : null}
                            </div>
                            {(guest.no_show_count || 0) > 0 ? (
                              <div className="mt-1 text-xs text-rose-600">No-show: {guest.no_show_count}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{guest.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{guest.visits_count || 0}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatLastVisit(guest.last_visit)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/app/customers/${guest.id}`)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Open profile
                        </button>
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
  icon,
  label,
  value,
  accent = 'text-blue-700 bg-blue-50',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-2xl p-3 ${accent}`}>{icon}</div>
      <div className="mt-4 text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
