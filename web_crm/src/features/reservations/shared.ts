export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'cancelled_by_restaurant'
  | 'cancelled_by_user'
  | 'rejected'
  | 'no_show'
  | 'expired'
  | string;

export interface ReservationRecord {
  id: number;
  restaurant: number;
  user_name: string | null;
  user_phone: string | null;
  date: string;
  time: string;
  guests: number;
  status: ReservationStatus;
  special_requests?: string | null;
  table_id?: number | null;
  table_number?: string | null;
  history?: Array<{
    id: number;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    changed_at: string;
    actor_username?: string | null;
  }>;
}

export interface TableRecord {
  id: number;
  name?: string;
  number?: string;
  capacity?: number;
  seats?: number;
  status?: 'free' | 'reserved' | 'occupied' | 'cleaning' | string;
  is_active?: boolean;
  current_booking?: {
    id: number;
    guest_name: string;
    guests: number;
    time: string;
    duration_minutes: number;
  };
}

export interface GuestRecord {
  id: number;
  name?: string;
  full_name?: string;
  phone: string;
  visits_count: number;
  last_visit: string | null;
  notes?: string;
  is_vip?: boolean;
}

export interface RestaurantRecord {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeLabel(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 5);
}

export function getDateLabel(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function getDateTimeLabel(date?: string | null, time?: string | null): string {
  if (!date) return getTimeLabel(time);
  return `${getDateLabel(date)} · ${getTimeLabel(time)}`;
}

export function getReservationName(reservation: ReservationRecord): string {
  return reservation.user_name?.trim() || 'Walk-in guest';
}

export function getReservationPhone(reservation: ReservationRecord): string {
  return reservation.user_phone?.trim() || '—';
}

export function getTableLabel(
  record: Pick<ReservationRecord, 'table_number'> | TableRecord | null | undefined,
): string {
  if (!record) return '—';
  const value =
    'table_number' in record
      ? record.table_number
      : (record as TableRecord).name || (record as TableRecord).number;
  return value?.toString().trim() || '—';
}

export function getTableCapacity(table: TableRecord): number {
  return Number(table.capacity ?? table.seats ?? 0);
}

export function getReservationStatusMeta(status: ReservationStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'approved':
    case 'confirmed':
      return { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'seated':
      return { label: 'Seated', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'completed':
      return { label: 'Completed', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'cancelled':
    case 'cancelled_by_restaurant':
    case 'cancelled_by_user':
      return { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'no_show':
      return { label: 'No Show', className: 'bg-orange-50 text-orange-700 border-orange-200' };
    default:
      return { label: status.replaceAll('_', ' '), className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export function getTableStatusMeta(status?: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'free':
      return { label: 'Free', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'reserved':
      return { label: 'Reserved', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'occupied':
      return { label: 'Occupied', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'cleaning':
      return { label: 'Cleaning', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    default:
      return { label: 'Unknown', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export function isActiveReservation(status: ReservationStatus): boolean {
  return ![
    'completed',
    'cancelled',
    'cancelled_by_restaurant',
    'cancelled_by_user',
    'rejected',
    'no_show',
    'expired',
  ].includes(status);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const maybeError = error as {
    response?: {
      data?: Record<string, unknown>;
    };
    message?: string;
  };

  const data = maybeError?.response?.data;
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail;
    if (
      typeof data.error === 'object' &&
      data.error &&
      'message' in data.error &&
      typeof data.error.message === 'string'
    ) {
      return data.error.message;
    }

    const messages: string[] = [];
    Object.values(data).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (typeof entry === 'string') messages.push(entry);
        });
      } else if (typeof value === 'string') {
        messages.push(value);
      }
    });

    if (messages.length > 0) {
      return messages.join(', ');
    }
  }

  if (maybeError?.message) return maybeError.message;
  return fallback;
}

export function extractResults<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === 'object' &&
    'results' in payload &&
    Array.isArray((payload as { results: unknown[] }).results)
  ) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export function getReservationDateTime(date: string, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const target = new Date(`${date}T00:00:00`);
  target.setHours(hours, minutes, 0, 0);
  return target;
}
