import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Gift, MapPin, Plus, Star, Users } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';

interface Booking {
  id: number;
  restaurant?: number;
  restaurant_name: string;
  restaurant_photo_url?: string;
  restaurant_city?: string;
  date: string;
  time: string;
  guests: number;
  status: string;
}

const ACTIVE_STATUSES = ['pending', 'approved', 'confirmed', 'payment_pending', 'arrived', 'seated'];
const PAST_STATUSES = ['completed', 'no_show', 'cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'rejected'];

function formatBookingDate(value: string) {
  const parsed = parseISO(`${value}T00:00:00`);
  return isValid(parsed) ? format(parsed, 'EEEE, MMM d') : value;
}

export default function GuestDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await api.get('/bookings/');
        setBookings(Array.isArray(response.data) ? response.data : response.data.results || []);
      } catch {
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    void loadBookings();
  }, []);

  const activeBookings = bookings.filter((booking) => ACTIVE_STATUSES.includes(booking.status));
  const pastBookings = bookings.filter((booking) => PAST_STATUSES.includes(booking.status));
  const loyaltyPoints = bookings.length * 150;

  const favoriteRestaurants = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings.forEach((booking) => {
      if (booking.restaurant_name && !map.has(booking.restaurant_name)) {
        map.set(booking.restaurant_name, booking);
      }
    });
    return Array.from(map.values()).slice(0, 3);
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-50 border-t-[#1d4ed8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">Личный кабинет</div>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Добро пожаловать, {user?.username || 'Гость'}</h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            Здесь собраны ваши активные бронирования, история посещений и быстрый доступ к следующему резерву.
          </p>
        </div>
        <button
          onClick={() => navigate('/restaurants')}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] shadow-lg shadow-[#1d4ed8]/15"
        >
          <Plus size={16} />
          Новое бронирование
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard icon={<CalendarClock size={18} />} label="Активные брони" value={String(activeBookings.length)} description="Предстоящие визиты и текущие статусы" />
        <StatCard icon={<Users size={18} />} label="Всего визитов" value={String(bookings.length)} description="Общая история взаимодействия с ресторанами" />
        <StatCard icon={<Gift size={18} />} label="Баллы" value={String(loyaltyPoints)} description="Условный баланс для гостевого кабинета" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">Активные бронирования</div>
              <div className="mt-1 text-sm text-slate-500">Ближайшие визиты и текущие статусы</div>
            </div>
          </div>

          {activeBookings.length === 0 ? (
            <div className="mt-6 rounded-[24px] bg-[#fafaf9] px-6 py-12 text-center">
              <div className="text-xl font-bold tracking-tight text-slate-900">У вас пока нет активных бронирований</div>
              <div className="mt-3 text-sm leading-7 text-slate-600">Откройте список ресторанов и создайте первую бронь за пару минут.</div>
              <button
                onClick={() => navigate('/restaurants')}
                className="mt-6 rounded-2xl bg-[#1d4ed8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] shadow-lg shadow-[#1d4ed8]/15"
              >
                Найти ресторан
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {activeBookings.map((booking) => (
                <div key={booking.id} className="rounded-[24px] border border-slate-200 bg-[#fafaf9] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-200">
                        {booking.restaurant_photo_url ? (
                          <img src={booking.restaurant_photo_url} alt={booking.restaurant_name} className="h-full w-full object-cover" />
                        ) : (
                          <MapPin size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-base font-bold tracking-tight text-slate-900">{booking.restaurant_name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatBookingDate(booking.date)} · {booking.time.slice(0, 5)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="mt-5 text-xs font-black uppercase tracking-widest text-slate-400 italic">{booking.guests} Гостей</div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => navigate(`/guest/bookings/${booking.id}`)}
                      className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 border border-slate-200 transition hover:bg-slate-50"
                    >
                      Детали
                    </button>
                    <button
                      onClick={() => navigate('/restaurants')}
                      className="flex-1 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
                    >
                      Повторить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="text-lg font-bold tracking-tight text-slate-900">Любимые места</div>
            <div className="mt-1 text-xs font-semibold text-slate-400 uppercase tracking-widest">Недавние рестораны, в которые вы уже ходили</div>
            <div className="mt-5 space-y-3">
              {favoriteRestaurants.length === 0 ? (
                <div className="rounded-2xl bg-[#fafaf9] px-4 py-5 text-sm text-slate-500">После первых визитов здесь появятся избранные места.</div>
              ) : (
                favoriteRestaurants.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    type="button"
                    onClick={() => navigate(`/restaurant/${restaurant.restaurant}`)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-[#fafaf9] px-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-200">
                      {restaurant.restaurant_photo_url ? (
                        <img src={restaurant.restaurant_photo_url} alt={restaurant.restaurant_name} className="h-full w-full object-cover" />
                      ) : (
                        <Star size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{restaurant.restaurant_name}</div>
                      <div className="mt-1 text-xs text-slate-500">{restaurant.restaurant_city || 'Restaurant visited before'}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
            <div className="text-lg font-bold tracking-tight text-slate-900">История посещений</div>
            <div className="mt-1 text-xs font-semibold text-slate-400 uppercase tracking-widest">Последние завершённые или закрытые бронирования</div>
            <div className="mt-5 space-y-3">
              {pastBookings.length === 0 ? (
                <div className="rounded-2xl bg-[#fafaf9] px-4 py-5 text-sm text-slate-500">История появится после первых посещений.</div>
              ) : (
                pastBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="rounded-2xl bg-[#fafaf9] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900">{booking.restaurant_name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatBookingDate(booking.date)} · {booking.status.replace('_', ' ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.22)]">
      <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-[#1d4ed8] border border-blue-100">{icon}</div>
      <div className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-2 text-xs font-medium text-slate-500">{description}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'pending'
      ? 'bg-amber-50 text-amber-700 border border-amber-100'
      : status === 'confirmed' || status === 'approved'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
        : status === 'seated'
          ? 'bg-blue-50 text-[#1d4ed8] border border-blue-100'
          : 'bg-slate-50 text-slate-400 border border-slate-100';

  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest leading-none ${style}`}>{status.replace('_', ' ')}</span>;
}
