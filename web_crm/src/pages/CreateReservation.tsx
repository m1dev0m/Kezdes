import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import {
  extractResults,
  getApiErrorMessage,
  getLocalDateString,
  getTableCapacity,
  getTableLabel,
  type RestaurantRecord,
  type TableRecord,
} from '@/features/reservations/shared';

type ReservationFormState = {
  user_name: string;
  user_phone: string;
  date: string;
  time: string;
  guests: number;
  table_id: string;
};

const INITIAL_FORM: ReservationFormState = {
  user_name: '',
  user_phone: '',
  date: getLocalDateString(),
  time: '19:00',
  guests: 2,
  table_id: '',
};

export default function CreateReservation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [availableTables, setAvailableTables] = useState<TableRecord[]>([]);
  const [form, setForm] = useState<ReservationFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const fallbackRestaurantId = user?.owned_restaurant?.id ?? user?.restaurant ?? user?.profile?.restaurant ?? null;
        const [restaurantResponse, tablesResponse] = await Promise.all([
          api.get<RestaurantRecord>('/restaurants/me/').catch(() => ({ data: { id: fallbackRestaurantId } as RestaurantRecord })),
          api.get('/tables/'),
        ]);

        setRestaurantId(restaurantResponse.data.id ?? fallbackRestaurantId ?? null);
        setTables(extractResults<TableRecord>(tablesResponse.data));
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load reservation form'));
      } finally {
        setTablesLoading(false);
      }
    };

    void loadContext();
  }, [user]);

  useEffect(() => {
    if (!restaurantId || !form.date || !form.time) {
      setAvailableTables([]);
      return;
    }

    const loadAvailableTables = async () => {
      setAvailabilityLoading(true);
      try {
        const response = await api.get<{ available_tables: TableRecord[] }>('/bookings/available_tables/', {
          params: {
            restaurant_id: restaurantId,
            date: form.date,
            time: form.time,
          },
        });
        setAvailableTables(response.data.available_tables ?? []);
      } catch {
        setAvailableTables([]);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    void loadAvailableTables();
  }, [restaurantId, form.date, form.time]);

  const selectableTables = useMemo(() => {
    const source = availableTables.length > 0 ? availableTables : tables;
    return source
      .filter((table) => table.is_active !== false)
      .sort((a, b) => getTableCapacity(a) - getTableCapacity(b));
  }, [availableTables, tables]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.user_name.trim() || !form.user_phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings/create_manual/', {
        user_name: form.user_name.trim(),
        user_phone: form.user_phone.trim(),
        date: form.date,
        time: form.time,
        guests: form.guests,
        ...(form.table_id ? { table_id: Number(form.table_id) } : {}),
      });

      toast.success('Reservation created');
      navigate('/app/bookings');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create reservation'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/app/bookings" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#42556b]">
            <ArrowLeft size={16} />
            Back to reservations
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[#42556b]">New reservation</h1>
          <p className="mt-1 text-sm text-slate-500">Walk-in or phone booking.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-[#ddd7cf] bg-[#fbfaf8] p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Name</span>
            <input
              value={form.user_name}
              onChange={(event) => setForm((current) => ({ ...current, user_name: event.target.value }))}
              className="w-full rounded-xl border border-[#d7d1c8] bg-white px-4 py-3 outline-none transition focus:border-[#7a8ea3]"
              placeholder="Guest name"
              required
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Phone</span>
            <input
              value={form.user_phone}
              onChange={(event) => setForm((current) => ({ ...current, user_phone: event.target.value }))}
              className="w-full rounded-xl border border-[#d7d1c8] bg-white px-4 py-3 outline-none transition focus:border-[#7a8ea3]"
              placeholder="+7 700 000 00 00"
              required
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Date</span>
            <input
              type="date"
              value={form.date}
              min={getLocalDateString()}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className="w-full rounded-xl border border-[#d7d1c8] bg-white px-4 py-3 outline-none transition focus:border-[#7a8ea3]"
              required
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Time</span>
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              className="w-full rounded-xl border border-[#d7d1c8] bg-white px-4 py-3 outline-none transition focus:border-[#7a8ea3]"
              required
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Guests</span>
            <input
              type="number"
              min={1}
              max={20}
              value={form.guests}
              onChange={(event) =>
                setForm((current) => ({ ...current, guests: Math.min(20, Math.max(1, Number(event.target.value) || 1)) }))
              }
              className="w-full rounded-xl border border-[#d7d1c8] bg-white px-4 py-3 outline-none transition focus:border-[#7a8ea3]"
              required
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Table</span>
            <select
              value={form.table_id}
              onChange={(event) => setForm((current) => ({ ...current, table_id: event.target.value }))}
              className="w-full rounded-xl border border-[#d7d1c8] bg-white px-4 py-3 outline-none transition focus:border-[#7a8ea3]"
            >
              <option value="">Auto assign</option>
              {selectableTables.map((table) => {
                const seats = getTableCapacity(table);
                const fits = seats >= form.guests;
                return (
                  <option key={table.id} value={table.id} disabled={!fits}>
                    {getTableLabel(table)} · {seats} seats{!fits ? ' (too small)' : ''}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-[#ddd7cf] bg-white px-4 py-3 text-sm">
          <span className="text-slate-600">
            {tablesLoading
              ? 'Loading tables…'
              : availabilityLoading
                ? 'Checking availability…'
                : selectableTables.filter((t) => getTableCapacity(t) >= form.guests).length > 0
                  ? `${selectableTables.filter((t) => getTableCapacity(t) >= form.guests).length} tables fit ${form.guests} guests`
                  : tables.length > 0
                    ? `No tables fit ${form.guests} guests (largest: ${Math.max(...tables.map(getTableCapacity))} seats)`
                    : 'No tables configured'}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            to="/app/bookings"
            className="rounded-xl border border-[#d7d1c8] px-4 py-2.5 text-sm font-medium text-[#54687c] transition hover:bg-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#60758a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#566a7f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Create reservation
          </button>
        </div>
      </form>
    </div>
  );
}
