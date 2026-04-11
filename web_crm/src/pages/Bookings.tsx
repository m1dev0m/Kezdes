import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Filter, Plus, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { ManualBookingForm } from '@/components/ManualBookingForm';
import {
  getApiErrorMessage,
  getDateTimeLabel,
  getLocalDateString,
  getReservationDateTime,
  getReservationName,
  getReservationPhone,
  getReservationSourceLabel,
  getReservationStatusMeta,
  getTableCapacity,
  getTableLabel,
  getTimeLabel,
  type ReservationRecord,
  type TableRecord,
} from '@/features/reservations/shared';

type TimeFilterMode = 'all' | 'today' | 'now' | 'upcoming';
type StatusFilterMode = 'all' | 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

type PagedApiResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

type SmartTablesResponse = {
  turnover_minutes: number;
  duration_minutes: number;
  warning?: string | null;
  suggested_tables: TableRecord[];
};

const PAGE_SIZE = 25;
const SEARCH_PAGE_SIZE = 100;
const MAX_SEARCH_PAGES = 10;

function normalizeStatus(status: string): string {
  if (status === 'approved') return 'confirmed';
  if (status === 'cancelled') return 'cancelled';
  return status;
}

function getStatusFilterQuery(status: StatusFilterMode) {
  if (status === 'all') return null;
  if (status === 'cancelled') return 'cancelled';
  return status;
}

function buildTimeFilterParams(timeFilter: TimeFilterMode) {
  const params: Record<string, string> = {};
  const today = getLocalDateString();
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(rounded.getMinutes() - 60, 0, 0);
  const forward = new Date(now);
  forward.setMinutes(forward.getMinutes() + 60, 0, 0);

  if (timeFilter === 'today') {
    params.date = today;
  } else if (timeFilter === 'upcoming') {
    params.date_from = today;
  } else if (timeFilter === 'now') {
    params.date = today;
    params.time_from = rounded.toTimeString().slice(0, 5);
    params.time_to = forward.toTimeString().slice(0, 5);
  }

  return params;
}

function getStatusSummary(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending') return 'Ожидает подтверждения';
  if (normalized === 'confirmed') return 'Подтверждена';
  if (normalized === 'seated') return 'Гость уже за столом';
  if (normalized === 'completed') return 'Визит завершён';
  if (normalized === 'no_show') return 'Неявка';
  if (normalized === 'cancelled_by_user') return 'Отменена гостем';
  if (normalized === 'cancelled_by_restaurant') return 'Отменена рестораном';
  return getReservationStatusMeta(status).label;
}

function getStatusTypeMeta(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending') {
    return {
      label: 'Ожидание',
      caption: 'Гость ждёт подтверждения',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (normalized === 'confirmed') {
    return {
      label: 'Бронирование',
      caption: 'Подтверждённая бронь до посадки',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (normalized === 'seated') {
    return {
      label: 'За столом',
      caption: 'Гость уже сидит в зале',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    };
  }

  return {
    label: 'Архив',
    caption: 'Завершённые и отменённые визиты',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  };
}

function getReservationAccentClass(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending') return 'border-l-amber-400';
  if (normalized === 'confirmed') return 'border-l-emerald-400';
  if (normalized === 'seated') return 'border-l-blue-400';
  return 'border-l-slate-300';
}

export default function Bookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilterMode>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilterMode>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tablePickerReservation, setTablePickerReservation] = useState<ReservationRecord | null>(null);
  const [tablePickerMode, setTablePickerMode] = useState<'seat' | 'assign'>('seat');
  const [availableTables, setAvailableTables] = useState<TableRecord[]>([]);
  const [smartTables, setSmartTables] = useState<SmartTablesResponse | null>(null);
  const [smartTablesLoading, setSmartTablesLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [inFlightId, setInFlightId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const requestSeq = useRef(0);

  const hasSearch = Boolean(search.trim());
  const hasDeepLink = Boolean(searchParams.get('id'));
  const useFullDataset = hasSearch || hasDeepLink;
  const hasActiveFilters = hasSearch || timeFilter !== 'today' || statusFilter !== 'all';
  const effectiveTimeFilter = statusFilter === 'pending' ? 'all' : timeFilter;

  const syncSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const openManualBooking = useCallback(() => {
    setManualBookingOpen(true);
    syncSearchParams({ new: '1' });
  }, [syncSearchParams]);

  const closeManualBooking = useCallback(() => {
    setManualBookingOpen(false);
    syncSearchParams({ new: null });
  }, [syncSearchParams]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setManualBookingOpen(true);
    }
  }, [searchParams]);

  const parseReservationsResponse = useCallback((payload: unknown) => {
    if (Array.isArray(payload)) {
      return {
        items: payload as ReservationRecord[],
        count: payload.length,
      };
    }

    if (payload && typeof payload === 'object') {
      const data = payload as PagedApiResponse<ReservationRecord>;
      if (Array.isArray(data.results)) {
        return {
          items: data.results,
          count: typeof data.count === 'number' ? data.count : data.results.length,
        };
      }
    }

    return {
      items: [],
      count: 0,
    };
  }, []);

  const loadReservations = useCallback(async (page: number) => {
    const currentRequestId = ++requestSeq.current;
    setRefreshing(true);

    try {
      const serverFilters = buildTimeFilterParams(effectiveTimeFilter);
      const statusQuery = getStatusFilterQuery(statusFilter);
      const pageSize = useFullDataset ? SEARCH_PAGE_SIZE : PAGE_SIZE;
      const fetchPage = async (pageNumber: number) => {
        const params = new URLSearchParams({ ordering: 'date,time', page: String(pageNumber), page_size: String(pageSize) });
        Object.entries(serverFilters).forEach(([key, value]) => params.set(key, value));
        if (statusQuery) params.set('status', statusQuery);

        const response = await api.get(`/bookings/my_restaurant/?${params.toString()}`);
        return parseReservationsResponse(response.data);
      };

      let items: ReservationRecord[] = [];
      let total = 0;

      if (useFullDataset) {
        for (let pageNumber = 1; pageNumber <= MAX_SEARCH_PAGES; pageNumber += 1) {
          const parsed = await fetchPage(pageNumber);
          if (currentRequestId !== requestSeq.current) return;

          if (pageNumber === 1) {
            total = parsed.count;
          }

          items = items.concat(parsed.items);
          if (parsed.items.length < pageSize || (total && items.length >= total)) {
            break;
          }
        }
      } else {
        const parsed = await fetchPage(page);
        if (currentRequestId !== requestSeq.current) return;
        items = parsed.items;
        total = parsed.count;
      }

      const paramId = searchParams.get('id');
      if (paramId) {
        const reservationId = Number(paramId);
        if (!Number.isNaN(reservationId) && !items.some((reservation) => reservation.id === reservationId)) {
          const detailResponse = await api.get(`/bookings/${reservationId}/`);
          if (currentRequestId !== requestSeq.current) return;

          const detailReservation = detailResponse.data as ReservationRecord;
          if (detailReservation?.id === reservationId) {
            items = [detailReservation, ...items.filter((reservation) => reservation.id !== reservationId)];
          }
        }
      }

      setReservations(items);
      setTotalCount(total || items.length);
      setPageError(null);

      if (paramId) {
        const id = Number(paramId);
        setSelectedReservationId(Number.isNaN(id) ? null : id);
      } else {
        setSelectedReservationId((current) => {
          if (current && items.some((reservation) => reservation.id === current)) return current;
          return items[0]?.id ?? null;
        });
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить бронирования.');
      setPageError(message);
      toast.error(message);
    } finally {
      if (currentRequestId === requestSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [effectiveTimeFilter, parseReservationsResponse, searchParams, statusFilter, useFullDataset]);
  useEffect(() => {
    void loadReservations(currentPage);
    const intervalId = window.setInterval(() => {
      void loadReservations(currentPage);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [currentPage, loadReservations]);

  const selectedReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [reservations, selectedReservationId],
  );

  const filteredReservations = useMemo(() => {
    const today = getLocalDateString();
    const now = new Date();
    const searchValue = search.trim().toLowerCase();
    const deepLinkedReservationId = (() => {
      const raw = searchParams.get('id');
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? null : parsed;
    })();

    return reservations
      .filter((reservation) => {
        if (reservation.id === deepLinkedReservationId) return true;
        const normalized = normalizeStatus(reservation.status);
        if (statusFilter === 'all') return true;
        if (statusFilter === 'cancelled') {
          return ['cancelled', 'cancelled_by_restaurant', 'cancelled_by_user'].includes(normalized);
        }
        return normalized === statusFilter;
      })
      .filter((reservation) => {
        if (reservation.id === deepLinkedReservationId) return true;
        if (effectiveTimeFilter === 'all') return true;
        if (effectiveTimeFilter === 'today') return reservation.date === today;
        if (effectiveTimeFilter === 'upcoming') return getReservationDateTime(reservation.date, reservation.time) >= now;

        const slot = getReservationDateTime(reservation.date, reservation.time);
        const diffMinutes = (slot.getTime() - now.getTime()) / 60000;
        return reservation.date === today && diffMinutes >= -60 && diffMinutes <= 60;
      })
      .filter((reservation) => {
        if (reservation.id === deepLinkedReservationId) return true;
        if (!searchValue) return true;
        const tableText = getTableLabel(reservation).toLowerCase();
        return (
          getReservationName(reservation).toLowerCase().includes(searchValue) ||
          getReservationPhone(reservation).toLowerCase().includes(searchValue) ||
          tableText.includes(searchValue) ||
          String(reservation.id).includes(searchValue)
        );
      });
  }, [effectiveTimeFilter, reservations, search, statusFilter]);

  const statusCards = useMemo(
    () => [
      {
        key: 'pending' as const,
        label: 'Ожидание',
        description: 'Новые заявки на подтверждение',
        count: reservations.filter((reservation) => normalizeStatus(reservation.status) === 'pending').length,
      },
      {
        key: 'confirmed' as const,
        label: 'Бронирование',
        description: 'Подтверждённые брони до посадки',
        count: reservations.filter((reservation) => normalizeStatus(reservation.status) === 'confirmed').length,
      },
      {
        key: 'seated' as const,
        label: 'За столом',
        description: 'Гости, уже сидящие в зале',
        count: reservations.filter((reservation) => normalizeStatus(reservation.status) === 'seated').length,
      },
    ],
    [reservations],
  );

  const updateReservationLocally = useCallback(
    (reservationId: number, updater: (reservation: ReservationRecord) => ReservationRecord) => {
      setReservations((current) =>
        current.map((reservation) => (reservation.id === reservationId ? updater(reservation) : reservation)),
      );
    },
    [],
  );

  const mutateReservation = useCallback(
    async ({
      reservation,
      action,
      optimisticStatus,
      payload,
      successMessage,
    }: {
      reservation: ReservationRecord;
      action: 'confirm' | 'cancel_by_restaurant' | 'complete' | 'seat' | 'no_show';
      optimisticStatus: string;
      payload?: Record<string, unknown>;
      successMessage: string;
    }) => {
      if (inFlightId === reservation.id) return;

      const previousReservation = { ...reservation };
      setInFlightId(reservation.id);
      updateReservationLocally(reservation.id, (current) => ({
        ...current,
        status: optimisticStatus,
        ...payload,
      }));

      try {
        const response = await api.post(`/bookings/${reservation.id}/${action}/`, payload ?? {});
        const nextReservation = response.data as ReservationRecord;
        updateReservationLocally(reservation.id, () => nextReservation);
        toast.success(successMessage);
      } catch (error) {
        updateReservationLocally(reservation.id, () => previousReservation);
        toast.error(getApiErrorMessage(error, 'Действие не выполнено.'));
      } finally {
        setInFlightId(null);
      }
    },
    [inFlightId, updateReservationLocally],
  );

  const handleConfirm = useCallback(
    async (reservation: ReservationRecord) => {
      await mutateReservation({
        reservation,
        action: 'confirm',
        optimisticStatus: 'confirmed',
        successMessage: 'Бронь подтверждена.',
      });
    },
    [mutateReservation],
  );

  const handleCancel = useCallback(
    async (reservation: ReservationRecord) => {
      await mutateReservation({
        reservation,
        action: 'cancel_by_restaurant',
        optimisticStatus: 'cancelled_by_restaurant',
        successMessage: 'Бронь отменена.',
      });
    },
    [mutateReservation],
  );

  const handleComplete = useCallback(
    async (reservation: ReservationRecord) => {
      await mutateReservation({
        reservation,
        action: 'complete',
        optimisticStatus: 'completed',
        successMessage: 'Визит завершён.',
      });
    },
    [mutateReservation],
  );

  const handleNoShow = useCallback(
    async (reservation: ReservationRecord) => {
      await mutateReservation({
        reservation,
        action: 'no_show',
        optimisticStatus: 'no_show',
        successMessage: 'Гость отмечен как no-show.',
      });
    },
    [mutateReservation],
  );

  const loadTableOptions = useCallback(async (reservation: ReservationRecord) => {
    setTablesLoading(true);
    try {
      const response = await api.get<{ available_tables: TableRecord[] }>('/bookings/available_tables/', {
        params: {
          restaurant_id: reservation.restaurant,
          date: reservation.date,
          time: getTimeLabel(reservation.time),
        },
      });

      setAvailableTables(
        (response.data.available_tables ?? []).filter((table) => getTableCapacity(table) >= reservation.guests),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить доступные столы.'));
      setAvailableTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const handleSeat = useCallback(
    async (reservation: ReservationRecord) => {
      if (reservation.table_id) {
        await mutateReservation({
          reservation,
          action: 'seat',
          optimisticStatus: 'seated',
          successMessage: 'Гость посажен.',
        });
        return;
      }

      setTablePickerReservation(reservation);
      setTablePickerMode('seat');
      void loadTableOptions(reservation);
    },
    [loadTableOptions, mutateReservation],
  );

  const handleAssignTable = useCallback(
    async (reservation: ReservationRecord) => {
      setTablePickerReservation(reservation);
      setTablePickerMode('assign');
      await loadTableOptions(reservation);
    },
    [loadTableOptions],
  );

  const handleSeatWithTable = useCallback(
    async (tableId: number) => {
      if (!tablePickerReservation) return;

      const reservation = tablePickerReservation;
      const previousReservation = { ...reservation };
      setInFlightId(reservation.id);
      updateReservationLocally(reservation.id, (current) => ({
        ...current,
        status: 'seated',
        table_id: tableId,
      }));

      try {
        const response = await api.post(`/bookings/${reservation.id}/seat/`, { table_id: tableId });
        const nextReservation = response.data as ReservationRecord;
        updateReservationLocally(reservation.id, () => nextReservation);
        setTablePickerReservation(null);
        toast.success('Гость посажен.');
      } catch (error) {
        updateReservationLocally(reservation.id, () => previousReservation);
        toast.error(getApiErrorMessage(error, 'Не удалось посадить гостя.'));
      } finally {
        setInFlightId(null);
      }
    },
    [tablePickerReservation, updateReservationLocally],
  );

  const handleMessageGuest = useCallback((reservation: ReservationRecord) => {
    if (!reservation.user) {
      toast.error('Этот гость не зарегистрирован в системе.');
      return;
    }
    navigate('/app/messages', { state: { bookingId: reservation.id } });
  }, [navigate]);

  const handleAssignTableWithTable = useCallback(
    async (tableId: number) => {
      if (!tablePickerReservation) return;

      const reservation = tablePickerReservation;
      const previousReservation = { ...reservation };
      setInFlightId(reservation.id);
      updateReservationLocally(reservation.id, (current) => ({
        ...current,
        table_id: tableId,
      }));

      try {
        const response = await api.post(`/bookings/${reservation.id}/reassign_table/`, { table_id: tableId });
        const nextReservation = response.data as ReservationRecord;
        updateReservationLocally(reservation.id, () => nextReservation);
        setTablePickerReservation(null);
        toast.success(previousReservation.table_id ? 'Стол обновлён.' : 'Стол назначен.');
      } catch (error) {
        updateReservationLocally(reservation.id, () => previousReservation);
        toast.error(getApiErrorMessage(error, 'Не удалось назначить стол.'));
      } finally {
        setInFlightId(null);
      }
    },
    [tablePickerReservation, updateReservationLocally],
  );

  const loadSmartTables = useCallback(async (reservation: ReservationRecord) => {
    if (!['pending', 'approved', 'confirmed'].includes(reservation.status)) {
      setSmartTables(null);
      return;
    }

    setSmartTablesLoading(true);
    try {
      const response = await api.get<SmartTablesResponse>(`/bookings/${reservation.id}/smart_tables/`);
      setSmartTables(response.data);
    } catch {
      setSmartTables(null);
    } finally {
      setSmartTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedReservation) {
      setSmartTables(null);
      return;
    }
    void loadSmartTables(selectedReservation);
  }, [loadSmartTables, selectedReservation]);

  if (loading && reservations.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="material-symbols-outlined animate-spin text-[20px] text-[#1d4ed8]">refresh</span>
            Загрузка бронирований...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Бронирования</h1>
          <p className="mt-2 text-sm text-slate-600">Подтверждение, посадка и завершение брони без перезагрузки страницы.</p>
        </div>
        <button
          type="button"
          onClick={openManualBooking}
          aria-label="reservations-manual-create"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
        >
          <Plus size={16} />
          Новая бронь
        </button>
      </div>

      {pageError ? (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:flex-row md:items-center md:justify-between">
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => void loadReservations(currentPage)}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : null}

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="reservations-search"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50 lg:w-80"
                placeholder="Поиск по гостю, телефону, столу или ID"
                type="text"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All'],
                  ['today', 'Today'],
                  ['now', 'Now'],
                  ['upcoming', 'Upcoming'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTimeFilter(value);
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    timeFilter === value ? 'bg-[#1d4ed8] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All statuses'],
                  ['pending', 'Pending'],
                  ['confirmed', 'Confirmed'],
                  ['seated', 'Seated'],
                  ['completed', 'Completed'],
                  ['cancelled', 'Cancelled'],
                  ['no_show', 'No show'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition ${
                    statusFilter === value ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Filter size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTimeFilter('today');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-50"
              >
                <X size={14} />
                Clear filters
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadReservations(currentPage)}
              aria-label="reservations-refresh"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            >
              <span className={`material-symbols-outlined text-[20px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {statusCards.map((card) => {
          const active = statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setStatusFilter(card.key);
                setCurrentPage(1);
              }}
              className={`rounded-3xl border px-5 py-4 text-left shadow-sm transition ${
                active
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{card.count}</div>
              <div className="mt-2 text-sm text-slate-500">{card.description}</div>
            </button>
          );
        })}
      </section>

      <div className="grid flex-1 grid-cols-12 gap-6 min-h-0">
        <div className="col-span-12 flex min-h-0 flex-col xl:col-span-8">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm font-medium text-slate-600">
                {useFullDataset
                  ? `Показано ${filteredReservations.length} из ${reservations.length}`
                  : `Страница ${currentPage} из ${Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}`}
              </div>
              <div className="flex items-center gap-3">
                {refreshing ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                    <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                    Updating
                  </span>
                ) : null}
                {!useFullDataset && totalCount > PAGE_SIZE ? (
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Server pagination enabled
                  </span>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="p-4">Guest</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Guests</th>
                    <th className="p-4">Table</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pageError ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-sm text-slate-500">
                        Не удалось показать бронирования. Попробуйте обновить страницу или повторить запрос.
                      </td>
                    </tr>
                  ) : filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="mx-auto max-w-sm">
                          <p className="text-sm font-medium text-slate-900">Подходящих бронирований не найдено.</p>
                          <p className="mt-2 text-sm text-slate-500">
                            {hasActiveFilters
                              ? 'Сбросьте фильтры или попробуйте другой диапазон поиска.'
                              : 'Новые брони появятся здесь автоматически.'}
                          </p>
                          {hasActiveFilters ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSearch('');
                                setTimeFilter('today');
                                setStatusFilter('all');
                                setCurrentPage(1);
                              }}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                            >
                              <X size={14} />
                              Clear filters
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((reservation) => {
                      const isBusy = inFlightId === reservation.id;

                      return (
                    <tr
                      key={reservation.id}
                      onClick={() => setSelectedReservationId(reservation.id)}
                      aria-label={`reservation-row-${reservation.id}`}
                      className={`cursor-pointer transition hover:bg-slate-50 ${selectedReservationId === reservation.id ? 'bg-blue-50/60' : ''}`}
                    >
                          <td className={`border-l-4 p-4 ${getReservationAccentClass(reservation.status)}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                                {getReservationName(reservation).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{getReservationName(reservation)}</p>
                                <p className="text-xs text-slate-500">{getReservationPhone(reservation)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-700">{getTimeLabel(reservation.time)}</td>
                          <td className="p-4 text-sm text-slate-600">{reservation.guests}</td>
                          <td className="p-4 text-sm text-slate-600">{getTableLabel(reservation)}</td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <StatusBadge status={reservation.status} />
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusTypeMeta(reservation.status).className}`}>
                                {getStatusTypeMeta(reservation.status).label}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div
                              className="flex items-center justify-end gap-1.5 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <ReservationActions
                                reservation={reservation}
                                busy={isBusy}
                                onConfirm={() => void handleConfirm(reservation)}
                                onSeat={() => void handleSeat(reservation)}
                                onCancel={() => void handleCancel(reservation)}
                                onComplete={() => void handleComplete(reservation)}
                                onNoShow={() => void handleNoShow(reservation)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!useFullDataset && totalCount > PAGE_SIZE ? (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-4">
                <div className="text-sm text-slate-500">
                  {`${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, totalCount)} из ${totalCount}`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => value + 1)}
                    disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="col-span-12 min-h-0 xl:col-span-4">
          {selectedReservation ? (
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
                <h3 className="text-xl font-semibold text-slate-900">Booking details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedReservationId(null)}
                  aria-label="reservation-close-details"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="mb-8 border-b border-slate-200 pb-8 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <span className="material-symbols-outlined text-4xl">person</span>
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900">{getReservationName(selectedReservation)}</h4>
                  <p className="mt-1 text-sm text-slate-500">{getReservationPhone(selectedReservation)}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <StatusBadge status={selectedReservation.status} />
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${getStatusTypeMeta(selectedReservation.status).className}`}>
                      {getStatusTypeMeta(selectedReservation.status).label}
                    </span>
                    {selectedReservation.user && (
                      <button
                        onClick={() => handleMessageGuest(selectedReservation)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">forum</span>
                        Message
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <section>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Информация о брони</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <DetailItem label="Дата и время" value={getDateTimeLabel(selectedReservation.date, selectedReservation.time)} />
                      <DetailItem label="Гости" value={`${selectedReservation.guests}`} />
                      <DetailItem label="Стол" value={getTableLabel(selectedReservation)} />
                      <DetailItem label="Статус" value={getStatusSummary(selectedReservation.status)} />
                      <DetailItem label="Тип" value={getStatusTypeMeta(selectedReservation.status).label} />
                      <DetailItem label="Канал" value={getReservationSourceLabel(selectedReservation.source)} />
                    </div>
                  </section>

                  {selectedReservation.has_preorder ? (
                    <section>
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Предзаказ</p>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                        <div className="text-sm font-semibold text-emerald-900">
                          К брони уже привязан предзаказ ({selectedReservation.orders_count || 1}).
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/app/orders')}
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"
                        >
                          Открыть заказы
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {['pending', 'approved', 'confirmed'].includes(selectedReservation.status) ? (
                    <section>
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Подбор стола</p>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        {smartTablesLoading ? (
                          <div className="text-sm text-slate-500">Подбираем лучший стол...</div>
                        ) : smartTables?.suggested_tables?.length ? (
                          <div className="space-y-3">
                            <div className="text-sm text-slate-600">
                              Система предлагает посадку с учётом доступности и turnover {smartTables.turnover_minutes} мин.
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {smartTables.suggested_tables.map((table, index) => (
                                <span key={table.id} className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                  index === 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'
                                }`}>
                                  {getTableLabel(table)} · {getTableCapacity(table)} мест
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">
                            {smartTables?.warning || 'Сейчас нет подходящих столов под этот слот.'}
                          </div>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {selectedReservation.special_requests ? (
                    <section>
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Комментарий</p>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                        {selectedReservation.special_requests}
                      </div>
                    </section>
                  ) : null}

                  {['approved', 'confirmed'].includes(selectedReservation.status) ? (
                    <section>
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Следующий шаг</p>
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                        {selectedReservation.table_id
                          ? 'Стол уже назначен. Теперь можно быстро посадить гостя.'
                          : 'Сначала назначьте стол, если хотите контролировать посадку по схеме зала.'}
                      </div>
                    </section>
                  ) : null}

                  {selectedReservation.history && selectedReservation.history.length > 0 ? (
                    <section>
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">История</p>
                      <div className="space-y-4">
                        {selectedReservation.history.slice(0, 4).map((entry) => (
                          <div key={entry.id} className="flex gap-3">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                              <span className="material-symbols-outlined text-[12px] text-slate-500">event_note</span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-700">
                                <span className="font-medium">{entry.event_type.replaceAll('_', ' ')}</span>
                                {' · '}
                                {entry.actor_username || 'System'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(entry.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-slate-50 p-6">
                {selectedReservation.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => void handleConfirm(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-confirm-selected-${selectedReservation.id}`}
                    className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Подтвердить
                  </button>
                ) : null}

                {['approved', 'confirmed'].includes(selectedReservation.status) ? (
                  <button
                    type="button"
                    onClick={() => void handleAssignTable(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-assign-table-${selectedReservation.id}`}
                    className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {selectedReservation.table_id ? 'Пересадить' : 'Назначить стол'}
                  </button>
                ) : null}

                {['approved', 'confirmed'].includes(selectedReservation.status) ? (
                  <button
                    type="button"
                    onClick={() => void handleSeat(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-seat-selected-${selectedReservation.id}`}
                    className="rounded-xl bg-[#1d4ed8] py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                  >
                    Посадить гостя
                  </button>
                ) : null}

                {['approved', 'confirmed'].includes(selectedReservation.status) ? (
                  <button
                    type="button"
                    onClick={() => void handleNoShow(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-no-show-${selectedReservation.id}`}
                    className="rounded-xl border border-amber-200 bg-white py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                  >
                    Неявка
                  </button>
                ) : null}

                {['pending', 'approved', 'confirmed'].includes(selectedReservation.status) ? (
                  <button
                    type="button"
                    onClick={() => void handleCancel(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-cancel-selected-${selectedReservation.id}`}
                    className="rounded-xl border border-rose-200 bg-white py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    Отменить
                  </button>
                ) : null}

                {selectedReservation.status === 'seated' ? (
                  <button
                    type="button"
                    onClick={() => void handleComplete(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-complete-selected-${selectedReservation.id}`}
                    className="col-span-2 rounded-xl bg-[#1d4ed8] py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                  >
                    Завершить визит
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
              <span className="material-symbols-outlined mb-4 text-5xl">touch_app</span>
              <p className="text-sm">Выберите бронь, чтобы увидеть детали и быстрые действия.</p>
              <button
                type="button"
                onClick={openManualBooking}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
              >
                <Plus size={14} />
                Создать бронь
              </button>
            </div>
          )}
        </div>
      </div>

      {tablePickerReservation ? (
        <TablePicker
          reservation={tablePickerReservation}
          mode={tablePickerMode}
          tables={availableTables}
          loading={tablesLoading}
          onClose={() => setTablePickerReservation(null)}
          onConfirm={(tableId) =>
            void (tablePickerMode === 'seat' ? handleSeatWithTable(tableId) : handleAssignTableWithTable(tableId))
          }
        />
      ) : null}

      <ManualBookingForm
        isOpen={manualBookingOpen}
        onClose={closeManualBooking}
        onSuccess={() => {
          closeManualBooking();
          void loadReservations(currentPage);
        }}
      />
    </div>
  );
}

function ActionIcon({
  label,
  title,
  tone,
  disabled,
  onClick,
  icon,
  withText = false,
}: {
  label: string;
  title: string;
  tone: 'emerald' | 'blue' | 'rose' | 'slate';
  disabled: boolean;
  onClick: () => void;
  icon: string;
  withText?: boolean;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      : tone === 'blue'
        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        : tone === 'slate'
          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          : 'bg-rose-100 text-rose-700 hover:bg-rose-200';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-lg transition disabled:opacity-50 ${
        withText ? `px-3 py-2 text-xs font-semibold uppercase tracking-wide ${toneClass}` : `p-2 ${toneClass}`
      }`}
      title={title}
      disabled={disabled}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {withText ? <span>{title}</span> : null}
    </button>
  );
}

function ReservationActions({
  reservation,
  busy,
  onConfirm,
  onSeat,
  onCancel,
  onComplete,
  onNoShow,
}: {
  reservation: ReservationRecord;
  busy: boolean;
  onConfirm: () => void;
  onSeat: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onNoShow: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {reservation.status === 'pending' ? (
        <>
          <ActionIcon label={`reservation-confirm-${reservation.id}`} title="Подтвердить" tone="emerald" disabled={busy} onClick={onConfirm} icon="check" withText />
          <ActionIcon label={`reservation-cancel-${reservation.id}`} title="Отменить" tone="rose" disabled={busy} onClick={onCancel} icon="close" />
        </>
      ) : null}
      {['approved', 'confirmed'].includes(reservation.status) ? (
        <>
          <ActionIcon label={`reservation-seat-${reservation.id}`} title="Посадить" tone="blue" disabled={busy} onClick={onSeat} icon="chair" withText />
          <ActionIcon label={`reservation-no-show-${reservation.id}`} title="Неявка" tone="slate" disabled={busy} onClick={onNoShow} icon="person_off" />
        </>
      ) : null}
      {reservation.status === 'seated' ? (
        <ActionIcon label={`reservation-complete-${reservation.id}`} title="Завершить" tone="blue" disabled={busy} onClick={onComplete} icon="flag" withText />
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = getReservationStatusMeta(status);
  return (
    <span
      aria-label={`reservation-status-${status}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function TablePicker({
  reservation,
  mode,
  tables,
  loading,
  onClose,
  onConfirm,
}: {
  reservation: ReservationRecord;
  mode: 'seat' | 'assign';
  tables: TableRecord[];
  loading: boolean;
  onClose: () => void;
  onConfirm: (tableId: number) => void;
}) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  return (
    <div aria-label="table-picker" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-500/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{mode === 'seat' ? 'Выберите стол' : 'Назначьте стол'}</h2>
            <p className="text-sm text-slate-500">
              {getReservationName(reservation)} · {reservation.guests} guests
            </p>
          </div>
          <button
            type="button"
            aria-label="table-picker-close"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-slate-500">
              <span className="material-symbols-outlined animate-spin text-4xl text-blue-700">refresh</span>
              Проверяем доступные столы...
            </div>
          ) : tables.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
              Нет доступных столов для {reservation.guests} гостей на это время.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  aria-label={`table-choice-${table.id}`}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`rounded-2xl border p-4 text-left transition ${selectedTableId === table.id
                      ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                >
                  <div className={`text-lg font-semibold ${selectedTableId === table.id ? 'text-blue-700' : 'text-slate-900'}`}>
                    {getTableLabel(table)}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {getTableCapacity(table)} мест
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="table-picker-cancel"
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!selectedTableId}
            onClick={() => selectedTableId && onConfirm(selectedTableId)}
            aria-label="table-picker-confirm"
            className="rounded-xl bg-[#1d4ed8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
          >
            {mode === 'seat' ? 'Посадить гостя' : 'Сохранить стол'}
          </button>
        </div>
      </div>
    </div>
  );
}
