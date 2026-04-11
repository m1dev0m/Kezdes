import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { getApiErrorMessage, getTableCapacity, getTableLabel, type TableRecord } from '@/features/reservations/shared';

interface ManualBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ManualBookingFormState = {
  user_name: string;
  user_phone: string;
  date: string;
  time: string;
  guests: number;
  table_id: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed';
  special_requests: string;
};

const initialState = (): ManualBookingFormState => ({
  user_name: '',
  user_phone: '',
  date: new Date().toISOString().split('T')[0],
  time: '19:00',
  guests: 2,
  table_id: '',
  duration_minutes: 90,
  status: 'confirmed',
  special_requests: '',
});

export function ManualBookingForm({ isOpen, onClose, onSuccess }: ManualBookingFormProps) {
  const { user } = useAuth();
  const restaurantId = user?.restaurant;

  const [formData, setFormData] = useState<ManualBookingFormState>(initialState);
  const [allTables, setAllTables] = useState<TableRecord[]>([]);
  const [availableIds, setAvailableIds] = useState<number[] | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setSubmitError(null);
    setAvailableIds(null);
    setFormData(initialState());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingTables(true);
    api
      .get('/tables/')
      .then((response) => {
        const tables = Array.isArray(response.data) ? response.data : response.data.results || [];
        setAllTables(tables as TableRecord[]);
      })
      .catch(() => setAllTables([]))
      .finally(() => setLoadingTables(false));
  }, [isOpen]);

  const loadAvailability = useCallback(async () => {
    if (!isOpen || !formData.date || !formData.time || !restaurantId) return;

    setLoadingAvailability(true);
    try {
      const response = await api.get('/bookings/available_tables/', {
        params: {
          restaurant_id: restaurantId,
          date: formData.date,
          time: formData.time,
        },
      });

      setAvailableIds(response.data.available_table_ids ?? []);
    } catch {
      setAvailableIds(null);
    } finally {
      setLoadingAvailability(false);
    }
  }, [formData.date, formData.time, isOpen, restaurantId]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const filteredTables = useMemo(
    () =>
      allTables.filter((table) => {
        const capacity = getTableCapacity(table);
        const isAvailable = availableIds === null || availableIds.includes(table.id);
        return table.is_active !== false && isAvailable && capacity >= formData.guests;
      }),
    [allTables, availableIds, formData.guests],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurantId) {
      toast.error('Restaurant is not connected to this account.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: Record<string, unknown> = {
        user_name: formData.user_name.trim(),
        user_phone: formData.user_phone.trim(),
        date: formData.date,
        time: formData.time,
        guests: Math.max(1, Number(formData.guests) || 1),
        duration_minutes: Math.max(15, Number(formData.duration_minutes) || 90),
        status: formData.status,
        special_requests: formData.special_requests.trim(),
      };

      if (formData.table_id) {
        payload.table_id = Number(formData.table_id);
      }

      await api.post('/bookings/create_manual/', payload);
      toast.success('Reservation created');
      onSuccess();
      onClose();
      setFormData(initialState());
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to create reservation');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 bg-[#FDFBF7] px-6 py-5">
              <div>
                <h2 className="text-lg font-black italic text-[#1A3C34]">Новая бронь</h2>
                <p className="mt-1 text-sm text-slate-500">Быстрое создание брони для walk-in гостей и звонков.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-white hover:text-[#1A3C34]"
                aria-label="manual-booking-close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {!restaurantId ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Аккаунт не привязан к ресторану. Проверьте настройки доступа и ресторанный профиль.
                </div>
              ) : null}

              {submitError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Имя гостя</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      required
                      value={formData.user_name}
                      onChange={(event) => setFormData((current) => ({ ...current, user_name: event.target.value }))}
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Телефон</label>
                  <input
                    required
                    value={formData.user_phone}
                    onChange={(event) => setFormData((current) => ({ ...current, user_phone: event.target.value }))}
                    type="tel"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Гости</label>
                  <input
                    required
                    min={1}
                    value={formData.guests}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        guests: Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                      }))
                    }
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Дата</label>
                  <input
                    required
                    value={formData.date}
                    onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Время</label>
                  <input
                    required
                    value={formData.time}
                    onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Длительность</label>
                  <select
                    value={formData.duration_minutes}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        duration_minutes: Number.parseInt(event.target.value, 10) || 90,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    {[60, 90, 120, 150, 180].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} мин
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Статус</label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        status: event.target.value === 'pending' ? 'pending' : 'confirmed',
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="confirmed">Подтверждена</option>
                    <option value="pending">Ожидает подтверждения</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="block text-xs font-semibold uppercase text-slate-500">Стол</label>
                  <select
                    value={formData.table_id}
                    onChange={(event) => setFormData((current) => ({ ...current, table_id: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">Подобрать автоматически</option>
                    {filteredTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {getTableLabel(table)} ({getTableCapacity(table)} мест)
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {loadingTables || loadingAvailability
                        ? 'Проверяем доступные столы...'
                        : filteredTables.length > 0
                          ? `${filteredTables.length} столов подходят по размеру`
                          : 'Нет подходящих столов для такого количества гостей'}
                    </span>
                    {restaurantId ? <span>Restaurant #{restaurantId}</span> : null}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Комментарий</label>
                  <textarea
                    value={formData.special_requests}
                    onChange={(event) => setFormData((current) => ({ ...current, special_requests: event.target.value }))}
                    rows={3}
                    placeholder="Например: день рождения, тихий стол, детский стул"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <button
                disabled={submitting}
                className="w-full rounded-xl bg-[#1A3C34] py-4 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-[#1A3C34]/10 transition hover:bg-[#234e44] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Создаём бронь...' : 'Создать бронь'}
              </button>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
