import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import {
  extractResults,
  getApiErrorMessage,
  getDateTimeLabel,
  getLocalDateString,
  getReservationDateTime,
  getReservationName,
  getReservationPhone,
  getReservationStatusMeta,
  getTableCapacity,
  getTableLabel,
  getTimeLabel,
  isActiveReservation,
  type ReservationRecord,
  type TableRecord,
} from '@/features/reservations/shared';

type FilterMode = 'today' | 'now' | 'upcoming';

export default function Bookings() {
  const [searchParams] = useSearchParams();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('today');
  const [tablePickerReservation, setTablePickerReservation] = useState<ReservationRecord | null>(null);
  const [availableTables, setAvailableTables] = useState<TableRecord[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [inFlightId, setInFlightId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadReservations = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/bookings/my_restaurant/?ordering=date,time');
      const nextReservations = extractResults<ReservationRecord>(response.data);
      setReservations(nextReservations);
      setPageError(null);

      const paramId = searchParams.get('id');
      if (paramId) {
        setSelectedReservationId(Number(paramId));
      } else {
        setSelectedReservationId((current) => {
          if (current && nextReservations.some((reservation) => reservation.id === current)) return current;
          return nextReservations[0]?.id ?? null;
        });
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить бронирования.');
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadReservations();
    const intervalId = window.setInterval(() => {
      void loadReservations();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [loadReservations]);

  const selectedReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [reservations, selectedReservationId],
  );

  const filteredReservations = useMemo(() => {
    const today = getLocalDateString();
    const now = new Date();
    const searchValue = search.trim().toLowerCase();

    return reservations
      .filter((reservation) => isActiveReservation(reservation.status))
      .filter((reservation) => {
        if (filter === 'today') return reservation.date === today;
        if (filter === 'upcoming') return getReservationDateTime(reservation.date, reservation.time) >= now;

        const slot = getReservationDateTime(reservation.date, reservation.time);
        const diffMinutes = (slot.getTime() - now.getTime()) / 60000;
        return reservation.date === today && diffMinutes >= -60 && diffMinutes <= 60;
      })
      .filter((reservation) => {
        if (!searchValue) return true;
        return (
          getReservationName(reservation).toLowerCase().includes(searchValue) ||
          getReservationPhone(reservation).toLowerCase().includes(searchValue)
        );
      });
  }, [filter, reservations, search]);

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
      void loadTableOptions(reservation);
    },
    [loadTableOptions, mutateReservation],
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

  if (loading && reservations.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">
        Загрузка бронирований...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Reservations</h1>
          <p className="mt-2 text-sm text-slate-600">Подтверждение, посадка и завершение брони без перезагрузки страницы.</p>
        </div>
        <Link
          to="/app/bookings/new"
          aria-label="reservation-new"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New booking
        </Link>
      </div>

      {pageError ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>
      ) : null}

      <div className="grid flex-1 grid-cols-12 gap-6 min-h-0">
        <div className="col-span-12 flex min-h-0 flex-col xl:col-span-8">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="reservations-search"
                    className="h-11 w-64 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
                    placeholder="Поиск по имени или телефону"
                    type="text"
                  />
                </div>

                <div className="flex rounded-xl bg-slate-200 p-1 gap-1">
                  {(['today', 'now', 'upcoming'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      aria-label={`reservations-filter-${item}`}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                        filter === item ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void loadReservations()}
                aria-label="reservations-refresh"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
              </button>
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
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-sm text-slate-500">
                        Подходящих бронирований не найдено.
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
                          className={`cursor-pointer transition hover:bg-slate-50 ${
                            selectedReservationId === reservation.id ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <td className="p-4">
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
                            <StatusBadge status={reservation.status} />
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                              {reservation.status === 'pending' ? (
                                <ActionIcon
                                  label={`reservation-confirm-${reservation.id}`}
                                  title="Confirm"
                                  tone="emerald"
                                  disabled={isBusy}
                                  onClick={() => void handleConfirm(reservation)}
                                  icon="check"
                                />
                              ) : null}
                              {['approved', 'confirmed'].includes(reservation.status) ? (
                                <ActionIcon
                                  label={`reservation-seat-${reservation.id}`}
                                  title="Seat guest"
                                  tone="blue"
                                  disabled={isBusy}
                                  onClick={() => void handleSeat(reservation)}
                                  icon="chair"
                                />
                              ) : null}
                              {['pending', 'approved', 'confirmed'].includes(reservation.status) ? (
                                <ActionIcon
                                  label={`reservation-cancel-${reservation.id}`}
                                  title="Cancel"
                                  tone="rose"
                                  disabled={isBusy}
                                  onClick={() => void handleCancel(reservation)}
                                  icon="close"
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
                  <div className="mt-4">
                    <StatusBadge status={selectedReservation.status} />
                  </div>
                </div>

                <div className="space-y-8">
                  <section>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reservation info</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <DetailItem label="Date & time" value={getDateTimeLabel(selectedReservation.date, selectedReservation.time)} />
                      <DetailItem label="Guests" value={`${selectedReservation.guests}`} />
                      <DetailItem label="Table" value={getTableLabel(selectedReservation)} />
                      <DetailItem label="Channel" value="Online booking" />
                    </div>
                  </section>

                  {selectedReservation.special_requests ? (
                    <section>
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</p>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                        {selectedReservation.special_requests}
                      </div>
                    </section>
                  ) : null}

                  {selectedReservation.history && selectedReservation.history.length > 0 ? (
                    <section>
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Timeline</p>
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
                {['approved', 'confirmed'].includes(selectedReservation.status) ? (
                  <button
                    type="button"
                    onClick={() => void handleNoShow(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-no-show-${selectedReservation.id}`}
                    className="rounded-xl border border-amber-200 bg-white py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                  >
                    No show
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
                    Cancel
                  </button>
                ) : null}

                {selectedReservation.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => void handleConfirm(selectedReservation)}
                    disabled={inFlightId === selectedReservation.id}
                    aria-label={`reservation-confirm-selected-${selectedReservation.id}`}
                    className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Confirm
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
                    Seat guest
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
                    Complete service
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
              <span className="material-symbols-outlined mb-4 text-5xl">touch_app</span>
              <p className="text-sm">Выберите бронь, чтобы увидеть детали и быстрые действия.</p>
            </div>
          )}
        </div>
      </div>

      {tablePickerReservation ? (
        <TablePicker
          reservation={tablePickerReservation}
          tables={availableTables}
          loading={tablesLoading}
          onClose={() => setTablePickerReservation(null)}
          onConfirm={(tableId) => void handleSeatWithTable(tableId)}
        />
      ) : null}
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
}: {
  label: string;
  title: string;
  tone: 'emerald' | 'blue' | 'rose';
  disabled: boolean;
  onClick: () => void;
  icon: string;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      : tone === 'blue'
        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        : 'bg-rose-100 text-rose-700 hover:bg-rose-200';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-lg p-2 transition ${toneClass} disabled:opacity-50`}
      title={title}
      disabled={disabled}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
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
  tables,
  loading,
  onClose,
  onConfirm,
}: {
  reservation: ReservationRecord;
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
            <h2 className="text-lg font-semibold text-slate-900">Choose a table</h2>
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
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedTableId === table.id
                      ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-lg font-semibold ${selectedTableId === table.id ? 'text-blue-700' : 'text-slate-900'}`}>
                    {getTableLabel(table)}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {getTableCapacity(table)} seats
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
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTableId}
            onClick={() => selectedTableId && onConfirm(selectedTableId)}
            aria-label="table-picker-confirm"
            className="rounded-xl bg-[#1d4ed8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
          >
            Seat guest
          </button>
        </div>
      </div>
    </div>
  );
}
