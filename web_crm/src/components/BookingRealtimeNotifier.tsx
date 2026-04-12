import { useCallback, useMemo, useRef, type ReactNode, type MutableRefObject } from 'react';
import hotToast, { type Toast } from 'react-hot-toast';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';

type BookingRealtimePayload = {
  id: number;
  status: string;
  date?: string;
  time?: string;
  guests?: number;
  user_name?: string | null;
  restaurant_name?: string | null;
  table_number?: string | null;
};

function getRestaurantId(user: ReturnType<typeof useAuth>['user']) {
  return user?.owned_restaurant?.id ?? user?.restaurant ?? user?.profile?.restaurant ?? null;
}

function normalizeBookingEvent(data: unknown): BookingRealtimePayload | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  const booking = (payload.booking && typeof payload.booking === 'object'
    ? payload.booking
    : payload) as Record<string, unknown>;

  const id = Number(booking.id);
  const status = typeof booking.status === 'string' ? booking.status : '';
  if (!Number.isFinite(id) || !status) return null;

  return {
    id,
    status,
    date: typeof booking.date === 'string' ? booking.date : undefined,
    time: typeof booking.time === 'string' ? booking.time : undefined,
    guests: typeof booking.guests === 'number' ? booking.guests : undefined,
    user_name: typeof booking.user_name === 'string' ? booking.user_name : null,
    restaurant_name: typeof booking.restaurant_name === 'string' ? booking.restaurant_name : null,
    table_number: typeof booking.table_number === 'string' ? booking.table_number : null,
  };
}

function getGuestStatusMessage(booking: BookingRealtimePayload) {
  const restaurantName = booking.restaurant_name || 'ресторане';
  const dateLabel = booking.date ? ` на ${booking.date}` : '';
  const timeLabel = booking.time ? ` в ${booking.time.slice(0, 5)}` : '';

  switch (booking.status) {
    case 'confirmed':
    case 'approved':
      return {
        title: 'Бронь подтверждена',
        description: `${restaurantName} подтвердил вашу бронь${dateLabel}${timeLabel}.`,
      };
    case 'rejected':
      return {
        title: 'Бронь отклонена',
        description: `${restaurantName} не смог подтвердить вашу бронь${dateLabel}${timeLabel}.`,
      };
    case 'cancelled_by_restaurant':
      return {
        title: 'Бронь отменена рестораном',
        description: `${restaurantName} отменил вашу бронь${dateLabel}${timeLabel}.`,
      };
    case 'seated':
      return {
        title: 'Вас посадили за стол',
        description: booking.table_number
          ? `Ваш стол: ${booking.table_number}.`
          : 'Ресторан отметил, что вы уже за столом.',
      };
    case 'completed':
      return {
        title: 'Визит завершён',
        description: `Спасибо за визит в ${restaurantName}.`,
      };
    case 'no_show':
      return {
        title: 'Бронь отмечена как неявка',
        description: `${restaurantName} отметил бронирование как неявку.`,
      };
    default:
      return null;
  }
}

function RealtimeToast({
  t,
  title,
  description,
  accentClass,
  progressClass,
  icon,
  actionLabel,
  onAction,
}: {
  t: Toast;
  title: string;
  description: string;
  accentClass: string;
  progressClass: string;
  icon: ReactNode;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}) {
  return (
    <div
      className="relative w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${accentClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">{description}</div>
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={() => {
                void onAction();
                hotToast.dismiss(t.id);
              }}
              className="mt-3 inline-flex items-center rounded-xl bg-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1e40af]"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100">
        <div
          className={`h-full origin-left realtime-toast-progress ${progressClass}`}
          style={{ animationDuration: '5000ms' }}
        />
      </div>
    </div>
  );
}

export function BookingRealtimeNotifier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const seenAdminEvents = useRef(new Set<string>());
  const seenGuestEvents = useRef(new Set<string>());

  const restaurantRoles = useMemo(
    () => new Set(['owner', 'manager', 'host', 'worker', 'restaurant_admin', 'restaurant_owner', 'restaurant_staff', 'hostess']),
    [],
  );
  const guestRoles = useMemo(() => new Set(['customer', 'organizer', 'guest']), []);

  const restaurantId = getRestaurantId(user);
  const isRestaurantUser = Boolean(user?.role && restaurantRoles.has(user.role) && restaurantId);
  const isGuestUser = Boolean(user?.role && guestRoles.has(user.role));

  const markSeen = (store: MutableRefObject<Set<string>>, key: string) => {
    store.current.add(key);
    window.setTimeout(() => store.current.delete(key), 60000);
  };

  const showAdminBookingToast = useCallback(
    (booking: BookingRealtimePayload) => {
      hotToast.custom(
        (t) => (
          <RealtimeToast
            t={t}
            title="Новая заявка на бронь"
            description={`${booking.user_name || 'Гость'} · ${booking.guests || 0} чел.${booking.time ? ` · ${booking.time.slice(0, 5)}` : ''}`}
            accentClass="bg-amber-50 text-amber-700"
            progressClass="bg-amber-500"
            icon={<BellRing size={18} />}
            actionLabel="Принять"
            onAction={async () => {
              try {
                await api.post(`/bookings/${booking.id}/confirm/`);
                hotToast.success('Бронь подтверждена.');
                navigate(`/app/bookings?id=${booking.id}`);
              } catch (error) {
                const detail =
                  (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                  'Не удалось подтвердить бронь.';
                hotToast.error(detail);
              }
            }}
          />
        ),
        { duration: 5000, position: 'top-right', id: `admin-booking-${booking.id}` },
      );
    },
    [navigate],
  );

  const showGuestBookingToast = useCallback(
    (booking: BookingRealtimePayload) => {
      const copy = getGuestStatusMessage(booking);
      if (!copy) return;
      hotToast.custom(
        (t) => (
          <RealtimeToast
            t={t}
            title={copy.title}
            description={copy.description}
            accentClass="bg-blue-50 text-blue-700"
            progressClass="bg-blue-500"
            icon={<CheckCircle2 size={18} />}
            actionLabel="Открыть"
            onAction={() => navigate(`/guest/bookings/${booking.id}`)}
          />
        ),
        { duration: 5000, position: 'top-right', id: `guest-booking-${booking.id}-${booking.status}` },
      );
    },
    [navigate],
  );

  const handleAdminRealtime = useCallback(
    (data: unknown) => {
      const booking = normalizeBookingEvent(data);
      if (!booking) return;
      if (!['pending', 'payment_pending'].includes(booking.status)) return;
      const key = `${booking.id}:${booking.status}:${booking.date || ''}:${booking.time || ''}`;
      if (seenAdminEvents.current.has(key)) return;
      markSeen(seenAdminEvents, key);
      showAdminBookingToast(booking);
    },
    [showAdminBookingToast],
  );

  const handleGuestRealtime = useCallback(
    (data: unknown) => {
      const booking = normalizeBookingEvent(data);
      if (!booking) return;
      const key = `${booking.id}:${booking.status}`;
      if (seenGuestEvents.current.has(key)) return;
      markSeen(seenGuestEvents, key);
      showGuestBookingToast(booking);
    },
    [showGuestBookingToast],
  );

  useWebSocket({
    url: restaurantId ? `ws/bookings/${restaurantId}/` : '',
    enabled: isRestaurantUser && Boolean(restaurantId),
    onMessage: handleAdminRealtime,
  });

  useWebSocket({
    url: user?.id ? `ws/bookings/${user.id}/` : '',
    enabled: isGuestUser && Boolean(user?.id),
    onMessage: handleGuestRealtime,
  });

  return null;
}
