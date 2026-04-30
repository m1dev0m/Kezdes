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
  user: number | null;
  user_name: string | null;
  user_phone: string | null;
  guest_email?: string | null;
  date: string;
  time: string;
  guests: number;
  status: ReservationStatus;
  source?: string | null;
  event_type?: string | null;
  special_requests?: string | null;
  table_id?: number | null;
  table_number?: string | null;
  table?: string | number | null;
  customer_summary?: {
    id: number;
    visits_count: number;
    no_show_count: number;
    flag: string;
    is_vip: boolean;
    risk_label: string;
    notes: string;
    note_preview: string;
  } | null;
  has_preorder?: boolean;
  orders_count?: number;
  check_in_time?: string | null;
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
  name?: string | null;
  number?: string | null;
  table_number?: string | null;
  capacity?: number | null;
  seats?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  table_type?: 'rectangle' | 'square' | 'circle' | string | null;
  zone?: number | null;
  grid_x?: number | null;
  grid_y?: number | null;
  grid_w?: number | null;
  grid_h?: number | null;
  status?: 'free' | 'reserved' | 'occupied' | 'cleaning' | string | null;
  is_active?: boolean | null;
  current_booking?: {
    id: number;
    guest_name: string;
    guests: number;
    time: string;
    duration_minutes: number;
  };
}

export interface FloorShapeRecord {
  id: number;
  zone?: number | null;
  name?: string;
  shape_type: 'rectangle' | 'circle' | 'label' | 'line' | string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fill_color?: string;
  stroke_color?: string;
  text_color?: string;
  z_index?: number;
  is_visible?: boolean;
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
  flag?: string;
  no_show_count?: number;
  risk_label?: string;
  is_blacklisted?: boolean;
}

export interface RestaurantRecord {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  image_url?: string | null;
  photo_url?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  rating?: number | null;
  max_party_size?: number | null;
  tables?: TableRecord[];
  floor_shapes?: FloorShapeRecord[];
  reviews?: ReviewRecord[];
}

export interface ReviewRecord {
  id: number;
  user_name?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
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

export function buildRestaurantBookHref(
  restaurantId: number | string,
  context?: {
    date?: string | null;
    time?: string | null;
    guests?: number | null;
  },
): string {
  const params = new URLSearchParams();
  if (context?.date) params.set('date', context.date);
  if (context?.time) params.set('time', context.time);
  if (context?.guests) params.set('guests', String(context.guests));
  const query = params.toString();
  return `/restaurant/${restaurantId}/book${query ? `?${query}` : ''}`;
}

export function getReservationName(reservation: ReservationRecord): string {
  return reservation.user_name?.trim() || 'Walk-in guest';
}

export function getReservationPhone(reservation: ReservationRecord): string {
  return reservation.user_phone?.trim() || '—';
}

export function getTableLabel(
  record: (Pick<ReservationRecord, 'table_number' | 'table' | 'table_id'> | TableRecord) | null | undefined,
): string {
  if (!record) return '—';
  const isReservationShape = 'table' in record || 'table_id' in record || 'table_number' in record;
  const value = isReservationShape
    ? (record as Pick<ReservationRecord, 'table_number' | 'table' | 'table_id'>).table_number ??
      (record as Pick<ReservationRecord, 'table_number' | 'table' | 'table_id'>).table ??
      (record as Pick<ReservationRecord, 'table_number' | 'table' | 'table_id'>).table_id?.toString()
    : (record as TableRecord).name || (record as TableRecord).number;
  return value?.toString().trim() || '—';
}

export function getTableCapacity(table: TableRecord): number {
  return Number(table.capacity ?? table.seats ?? 0);
}

export function getReservationSourceLabel(source?: string | null): string {
  switch (source) {
    case 'admin':
      return 'Admin';
    case 'phone':
      return 'Phone';
    case 'walk_in':
      return 'Walk-in';
    case 'telegram':
      return 'Telegram';
    case 'web':
      return 'Web';
    default:
      return 'Web';
  }
}

export function getReservationStatusMeta(status: ReservationStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Ожидание', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'approved':
    case 'confirmed':
      return { label: 'Подтверждено', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'seated':
      return { label: 'За столом', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'completed':
      return { label: 'Завершено', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'rejected':
      return { label: 'Отклонено', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'cancelled':
    case 'cancelled_by_restaurant':
    case 'cancelled_by_user':
      return { label: 'Отменено', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'no_show':
      return { label: 'Не пришёл', className: 'bg-orange-50 text-orange-700 border-orange-200' };
    default:
      return { label: status.replaceAll('_', ' '), className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export function getReservationCustomerSignals(reservation: ReservationRecord): Array<{
  key: string;
  label: string;
  className: string;
}> {
  const summary = reservation.customer_summary;
  if (!summary) return [];

  const signals: Array<{ key: string; label: string; className: string }> = [];

  if (summary.is_vip) {
    signals.push({
      key: 'vip',
      label: 'VIP',
      className: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    });
  }

  if (summary.risk_label === 'blacklist') {
    signals.push({
      key: 'blacklist',
      label: 'Problem guest',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    });
  } else if (summary.risk_label === 'no_show_risk') {
    signals.push({
      key: 'no_show_risk',
      label: 'No-show risk',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    });
  }

  return signals;
}

export function getTableStatusMeta(status?: string | null): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'free':
      return { label: 'Свободен', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'reserved':
      return { label: 'Забронирован', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'occupied':
      return { label: 'Занят', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'cleaning':
      return { label: 'Уборка', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    default:
      return { label: 'Неизвестно', className: 'bg-slate-100 text-slate-700 border-slate-200' };
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
