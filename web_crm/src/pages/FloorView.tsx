import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Move, Pencil, Plus, RefreshCw, RotateCw, Save, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import {
  extractResults,
  getApiErrorMessage,
  getLocalDateString,
  getReservationName,
  getReservationPhone,
  getTableCapacity,
  getTableLabel,
  getTableStatusMeta,
  type ReservationRecord,
  type TableRecord,
} from '@/features/reservations/shared';

interface Shift {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  days_of_week: number[];
}

type ManagedTable = TableRecord & {
  table_type?: 'rectangle' | 'square' | 'circle' | string;
};

type FloorShapeType = 'rectangle' | 'circle' | 'label' | 'line';

type FloorShape = {
  id: number;
  zone?: number | null;
  name: string;
  shape_type: FloorShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill_color: string;
  stroke_color: string;
  text_color: string;
  z_index: number;
  is_visible: boolean;
};

type TableFormState = {
  name: string;
  capacity: number;
  table_type: 'rectangle' | 'square' | 'circle';
  is_active: boolean;
};

type ShapeFormState = {
  name: string;
  shape_type: FloorShapeType;
  fill_color: string;
  stroke_color: string;
  text_color: string;
  is_visible: boolean;
};

type FormErrors = {
  name?: string;
  capacity?: string;
};

const INITIAL_FORM: TableFormState = {
  name: '',
  capacity: 4,
  table_type: 'square',
  is_active: true,
};

const INITIAL_SHAPE_FORM: ShapeFormState = {
  name: '',
  shape_type: 'rectangle',
  fill_color: '#ffffff',
  stroke_color: '#cbd5e1',
  text_color: '#0f172a',
  is_visible: true,
};

const FLOOR_CANVAS_WIDTH = 960;
const FLOOR_CANVAS_HEIGHT = 560;
const FLOOR_GRID = 24;
const FLOOR_PADDING = 16;
const TABLE_PRESETS = {
  rectangle: { width: 136, height: 78 },
  square: { width: 92, height: 92 },
  circle: { width: 96, height: 96 },
} as const;

const SHAPE_PRESETS: Record<FloorShapeType, { width: number; height: number; fill: string; stroke: string }> = {
  rectangle: { width: 180, height: 110, fill: '#ffffff', stroke: '#cbd5e1' },
  circle: { width: 120, height: 120, fill: '#f8fafc', stroke: '#cbd5e1' },
  label: { width: 140, height: 44, fill: '#ffffff', stroke: '#ffffff' },
  line: { width: 180, height: 6, fill: '#94a3b8', stroke: '#94a3b8' },
};

const FLOOR_TONE_MAP: Record<string, { border: string; bg: string; text: string; shadow: string; accent: string }> = {
  free: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/95',
    text: 'text-emerald-950',
    shadow: 'shadow-[0_18px_38px_-28px_rgba(16,185,129,0.42)]',
    accent: 'bg-emerald-500',
  },
  reserved: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/95',
    text: 'text-amber-950',
    shadow: 'shadow-[0_18px_38px_-28px_rgba(245,158,11,0.36)]',
    accent: 'bg-amber-500',
  },
  occupied: {
    border: 'border-blue-300',
    bg: 'bg-blue-50/95',
    text: 'text-blue-950',
    shadow: 'shadow-[0_18px_38px_-28px_rgba(59,130,246,0.38)]',
    accent: 'bg-blue-500',
  },
  inactive: {
    border: 'border-slate-200',
    bg: 'bg-slate-100/95',
    text: 'text-slate-500',
    shadow: 'shadow-none',
    accent: 'bg-slate-400',
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function snapToGrid(value: number): number {
  return Math.round(value / FLOOR_GRID) * FLOOR_GRID;
}

function normalizeColorInput(value: string | null | undefined, fallback = '#ffffff') {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }
  return fallback;
}

function getTablePreset(tableType?: string) {
  if (tableType === 'circle') return TABLE_PRESETS.circle;
  if (tableType === 'square') return TABLE_PRESETS.square;
  return TABLE_PRESETS.rectangle;
}

function getTableTypeLabel(tableType?: string) {
  if (tableType === 'circle') return 'Круглый';
  if (tableType === 'square') return 'Квадратный';
  return 'Прямоугольный';
}

function getDefaultTableLayout(tableType: string | undefined, index: number) {
  const preset = getTablePreset(tableType);
  const columns = 5;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: FLOOR_PADDING + column * 176,
    y: FLOOR_PADDING + row * 112,
    width: preset.width,
    height: preset.height,
    rotation: 0,
  };
}

function getDefaultShapeLayout(shapeType: FloorShapeType, index: number) {
  const preset = SHAPE_PRESETS[shapeType];
  const columns = 4;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: FLOOR_PADDING + column * 196,
    y: FLOOR_PADDING + row * 86,
    width: preset.width,
    height: preset.height,
    rotation: 0,
    fill_color: preset.fill,
    stroke_color: preset.stroke,
  };
}

function fmt(time: string): string {
  return time.slice(0, 5);
}

function minutesSinceMidnight(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

function elapsedLabel(seatedTime: string | null | undefined): string {
  if (!seatedTime) return '';
  const diff = Math.floor((Date.now() - new Date(seatedTime).getTime()) / 60000);
  if (diff < 60) return `${diff}m`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function getPreviousWeekdayIndex(weekday: number): number {
  return weekday === 0 ? 6 : weekday - 1;
}

function shiftIncludesWeekday(shift: Shift, weekday: number): boolean {
  return shift.days_of_week.length === 0 || shift.days_of_week.includes(weekday);
}

function isTimeWithinShift(shift: Shift, weekday: number, minutes: number): boolean {
  const starts = minutesSinceMidnight(shift.starts_at);
  const ends = minutesSinceMidnight(shift.ends_at);

  if (ends >= starts) {
    return shiftIncludesWeekday(shift, weekday) && minutes >= starts && minutes < ends;
  }

  return (
    (shiftIncludesWeekday(shift, weekday) && minutes >= starts) ||
    (shiftIncludesWeekday(shift, getPreviousWeekdayIndex(weekday)) && minutes < ends)
  );
}

function getDateWeekday(value: string): number {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return getWeekdayIndex(new Date());
  }
  return getWeekdayIndex(date);
}

function validateTableForm(form: TableFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Укажите название стола.';
  if (!Number.isFinite(form.capacity) || form.capacity < 1) errors.capacity = 'Вместимость должна быть не меньше 1.';
  return errors;
}

function validateShapeForm(form: ShapeFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Укажите название элемента.';
  return errors;
}

function getFloorTone(status: string | undefined, active: boolean) {
  if (!active) return FLOOR_TONE_MAP.inactive;
  if (status === 'occupied') return FLOOR_TONE_MAP.occupied;
  if (status === 'reserved') return FLOOR_TONE_MAP.reserved;
  return FLOOR_TONE_MAP.free;
}

function getSeatDotStyles(shape: string, capacity: number) {
  const slots = Math.max(2, Math.min(8, Math.round(capacity || 2)));
  const two = [
    { left: '50%', top: '-6px', transform: 'translateX(-50%)' },
    { left: '50%', bottom: '-6px', transform: 'translateX(-50%)' },
  ];
  const four = [
    { left: '50%', top: '-6px', transform: 'translateX(-50%)' },
    { right: '-6px', top: '50%', transform: 'translateY(-50%)' },
    { left: '50%', bottom: '-6px', transform: 'translateX(-50%)' },
    { left: '-6px', top: '50%', transform: 'translateY(-50%)' },
  ];
  const six = [
    { left: '50%', top: '-6px', transform: 'translateX(-50%)' },
    { right: '-6px', top: '28%' },
    { right: '-6px', bottom: '28%' },
    { left: '50%', bottom: '-6px', transform: 'translateX(-50%)' },
    { left: '-6px', bottom: '28%' },
    { left: '-6px', top: '28%' },
  ];
  const eight = [
    { left: '50%', top: '-6px', transform: 'translateX(-50%)' },
    { right: '22%', top: '-6px' },
    { right: '-6px', top: '50%', transform: 'translateY(-50%)' },
    { right: '22%', bottom: '-6px' },
    { left: '50%', bottom: '-6px', transform: 'translateX(-50%)' },
    { left: '22%', bottom: '-6px' },
    { left: '-6px', top: '50%', transform: 'translateY(-50%)' },
    { left: '22%', top: '-6px' },
  ];

  const pool = slots <= 2 ? two : slots <= 4 ? four : slots <= 6 ? six : eight;

  if (shape === 'circle') {
    return pool.map((style) => ({
      ...style,
      boxShadow: '0 0 0 1px rgba(15,23,42,0.08)',
    }));
  }

  return pool.map((style) => ({
    ...style,
    boxShadow: '0 0 0 1px rgba(15,23,42,0.08)',
  }));
}

function SeatDots({ shape, capacity }: { shape: string; capacity: number }) {
  const dots = getSeatDotStyles(shape, capacity);
  return (
    <div className="pointer-events-none absolute inset-0">
      {dots.map((style, index) => (
        <span
          key={`${shape}-${capacity}-${index}`}
          className="absolute size-2 rounded-full bg-white/95 shadow-sm ring-1 ring-slate-900/10"
          style={style}
        />
      ))}
    </div>
  );
}

function TableBadge({
  tableNumber,
  status,
}: {
  tableNumber: string | null | undefined;
  status: string;
}) {
  if (!tableNumber) return <span className="text-xs text-slate-400">—</span>;

  const colorMap: Record<string, string> = {
    seated: 'bg-[#1A3C34] text-white',
    confirmed: 'bg-emerald-600 text-white',
    approved: 'bg-emerald-600 text-white',
    pending: 'bg-amber-500 text-white',
  };

  return (
    <span className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5 text-xs font-bold ${colorMap[status] ?? 'bg-slate-200 text-slate-700'}`}>
      {tableNumber}
    </span>
  );
}

function ReservationRow({
  reservation,
  onAction,
  inFlight,
  showElapsed,
}: {
  reservation: ReservationRecord;
  onAction: (id: number, action: string) => void;
  inFlight: boolean;
  showElapsed?: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        inFlight ? 'opacity-60' : 'hover:bg-slate-50'
      } ${reservation.status === 'seated' ? 'border-[#1A3C34]/20 bg-[#1A3C34]/5' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
        {reservation.guests}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{getReservationName(reservation)}</span>
          {showElapsed && reservation.check_in_time ? (
            <span className="shrink-0 text-[11px] font-medium text-[#1A3C34]">· {elapsedLabel(reservation.check_in_time)}</span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-slate-500">{fmt(reservation.time)}</span>
          {reservation.user_phone ? <span className="truncate text-xs text-slate-400">{getReservationPhone(reservation)}</span> : null}
        </div>
      </div>

      <TableBadge tableNumber={reservation.table_number} status={reservation.status} />

      <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        {reservation.status === 'pending' ? (
          <button
            onClick={() => onAction(reservation.id, 'confirm')}
            disabled={inFlight}
            className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
          >
            Принять
          </button>
        ) : null}
        {(reservation.status === 'confirmed' || reservation.status === 'approved') ? (
          <button
            onClick={() => onAction(reservation.id, 'seat')}
            disabled={inFlight}
            className="rounded-lg bg-[#1A3C34] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#1A3C34]/90 disabled:opacity-50"
          >
            Посадить
          </button>
        ) : null}
        {reservation.status === 'seated' ? (
          <button
            onClick={() => onAction(reservation.id, 'complete')}
            disabled={inFlight}
            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            Завершить
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Column({
  title,
  subtitle,
  coversCount,
  guestsCount,
  reservations,
  onAction,
  inFlightId,
  showElapsed,
  emptyText,
}: {
  title: string;
  subtitle: string;
  coversCount: number;
  guestsCount: number;
  reservations: ReservationRecord[];
  onAction: (id: number, action: string) => void;
  inFlightId: number | null;
  showElapsed?: boolean;
  emptyText: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users size={12} /> {coversCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[10px]">👤</span> {guestsCount}
            </span>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        {reservations.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-400">{emptyText}</div>
        ) : (
          reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              onAction={onAction}
              inFlight={inFlightId === reservation.id}
              showElapsed={showElapsed}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function FloorView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? '';
  const canManageTables = role === 'owner' || role === 'manager' || role === 'global_admin';
  const canDeleteTables = role === 'owner' || role === 'global_admin';

  const [date, setDate] = useState(getLocalDateString());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [tables, setTables] = useState<ManagedTable[]>([]);
  const [shapes, setShapes] = useState<FloorShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inFlightId, setInFlightId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState<TableFormState>(INITIAL_FORM);
  const [editForm, setEditForm] = useState<TableFormState>(INITIAL_FORM);
  const [createShapeForm, setCreateShapeForm] = useState<ShapeFormState>(INITIAL_SHAPE_FORM);
  const [editShapeForm, setEditShapeForm] = useState<ShapeFormState>(INITIAL_SHAPE_FORM);
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [createShapeErrors, setCreateShapeErrors] = useState<FormErrors>({});
  const [editShapeErrors, setEditShapeErrors] = useState<FormErrors>({});
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingShapeCreate, setSavingShapeCreate] = useState(false);
  const [savingShapeEdit, setSavingShapeEdit] = useState(false);
  const [layoutMode, setLayoutMode] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [dirtyLayoutIds, setDirtyLayoutIds] = useState<number[]>([]);
  const [dirtyShapeIds, setDirtyShapeIds] = useState<number[]>([]);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteShapeArmed, setDeleteShapeArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    entityType: 'table' | 'shape';
    entityId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);

  const markLayoutDirty = useCallback((tableId: number) => {
    setDirtyLayoutIds((current) => (current.includes(tableId) ? current : [...current, tableId]));
  }, []);

  const markShapeDirty = useCallback((shapeId: number) => {
    setDirtyShapeIds((current) => (current.includes(shapeId) ? current : [...current, shapeId]));
  }, []);

  const updateTableDraft = useCallback(
    (
      tableId: number,
      updates:
        | Partial<ManagedTable>
        | ((table: ManagedTable) => Partial<ManagedTable>),
      markDirty = true,
    ) => {
      setTables((current) =>
        current.map((table) => {
          if (table.id !== tableId) return table;
          const nextUpdates = typeof updates === 'function' ? updates(table) : updates;
          return { ...table, ...nextUpdates };
        }),
      );
      if (markDirty) markLayoutDirty(tableId);
    },
    [markLayoutDirty],
  );

  const updateShapeDraft = useCallback(
    (
      shapeId: number,
      updates:
        | Partial<FloorShape>
        | ((shape: FloorShape) => Partial<FloorShape>),
      markDirty = true,
    ) => {
      setShapes((current) =>
        current.map((shape) => {
          if (shape.id !== shapeId) return shape;
          const nextUpdates = typeof updates === 'function' ? updates(shape) : updates;
          return { ...shape, ...nextUpdates };
        }),
      );
      if (markDirty) markShapeDirty(shapeId);
    },
    [markShapeDirty],
  );

  useEffect(() => {
    api
      .get('/restaurants/shifts/')
      .then((res) => {
        const data: Shift[] = extractResults(res.data);
        setShifts(data);
        const nowDate = new Date();
        const now = minutesSinceMidnight(nowDate.toTimeString());
        const weekday = getWeekdayIndex(nowDate);
        const active = data.find(
          (shift) => isTimeWithinShift(shift, weekday, now),
        );
        setActiveShiftId(active?.id ?? data[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      setError(null);
      const [bookingsResponse, tablesResponse, shapesResponse] = await Promise.all([
        api.get(`/bookings/my_restaurant/?date=${date}&ordering=time`),
        api.get('/tables/status/', { params: { date } }),
        api.get('/restaurants/floor-shapes/'),
      ]);

      setReservations(extractResults<ReservationRecord>(bookingsResponse.data));
      setTables(extractResults<ManagedTable>(tablesResponse.data));
      setShapes(extractResults<FloorShape>(shapesResponse.data));
    } catch (error) {
      setError(getApiErrorMessage(error, 'Не удалось загрузить данные floor view.'));
      if (!silent) {
        toast.error(getApiErrorMessage(error, 'Не удалось загрузить данные floor view.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    void load();
    intervalRef.current = setInterval(() => void load(true), 20000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (!layoutMode) {
      dragRef.current = null;
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragRef.current;
      const canvas = canvasRef.current;
      if (!dragState || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const nextX = snapToGrid(
        clamp(
          event.clientX - rect.left - dragState.offsetX,
          FLOOR_PADDING,
          FLOOR_CANVAS_WIDTH - dragState.width - FLOOR_PADDING,
        ),
      );
      const nextY = snapToGrid(
        clamp(
          event.clientY - rect.top - dragState.offsetY,
          FLOOR_PADDING,
          FLOOR_CANVAS_HEIGHT - dragState.height - FLOOR_PADDING,
        ),
      );

      if (dragState.entityType === 'table') {
        updateTableDraft(
          dragState.entityId,
          (table) => {
            if (table.x === nextX && table.y === nextY) return {};
            return { x: nextX, y: nextY };
          },
        );
        return;
      }

      updateShapeDraft(
        dragState.entityId,
        (shape) => {
          if (shape.x === nextX && shape.y === nextY) return {};
          return { x: nextX, y: nextY };
        },
      );
    };

    const handlePointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [layoutMode, updateShapeDraft, updateTableDraft]);

  useEffect(() => {
    if (!canManageTables && layoutMode) setLayoutMode(false);
  }, [canManageTables, layoutMode]);

  const activeShift = shifts.find((shift) => shift.id === activeShiftId);

  const inShift = useCallback(
    (reservation: ReservationRecord) => {
      if (!activeShift) return true;
      if (!activeShift.starts_at || !activeShift.ends_at) return true;
      const target = minutesSinceMidnight(reservation.time);
      return isTimeWithinShift(activeShift, getDateWeekday(date), target);
    },
    [activeShift, date],
  );

  const waitlist = useMemo(
    () => reservations.filter((reservation) => reservation.status === 'pending' && inShift(reservation)),
    [inShift, reservations],
  );

  const upcoming = useMemo(
    () => reservations.filter((reservation) => ['confirmed', 'approved'].includes(reservation.status) && inShift(reservation)),
    [inShift, reservations],
  );

  const seated = useMemo(
    () => reservations.filter((reservation) => reservation.status === 'seated' && inShift(reservation)),
    [inShift, reservations],
  );

  useEffect(() => {
    setSelectedTableId((current) => {
      if (selectedShapeId) return current;
      if (tables.length === 0) return null;
      if (current && tables.some((table) => table.id === current)) return current;
      return tables[0].id;
    });
  }, [selectedShapeId, tables]);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables],
  );

  useEffect(() => {
    setSelectedShapeId((current) => {
      if (shapes.length === 0) return null;
      if (current && shapes.some((shape) => shape.id === current)) return current;
      return null;
    });
  }, [shapes]);

  const selectedShape = useMemo(
    () => shapes.find((shape) => shape.id === selectedShapeId) ?? null,
    [selectedShapeId, shapes],
  );

  useEffect(() => {
    if (!selectedTable) {
      setEditForm(INITIAL_FORM);
      setDeleteArmed(false);
      return;
    }

    setEditForm({
      name: getTableLabel(selectedTable) === '—' ? '' : getTableLabel(selectedTable),
      capacity: Math.max(1, getTableCapacity(selectedTable) || 4),
      table_type:
        selectedTable.table_type === 'circle'
          ? 'circle'
          : selectedTable.table_type === 'rectangle'
            ? 'rectangle'
            : 'square',
      is_active: selectedTable.is_active !== false,
    });
    setEditErrors({});
    setDeleteArmed(false);
  }, [selectedTable]);

  useEffect(() => {
    if (!selectedShape) {
      setEditShapeForm(INITIAL_SHAPE_FORM);
      setDeleteShapeArmed(false);
      return;
    }

    setEditShapeForm({
      name: selectedShape.name,
      shape_type: selectedShape.shape_type,
      fill_color: selectedShape.fill_color,
      stroke_color: selectedShape.stroke_color,
      text_color: selectedShape.text_color,
      is_visible: selectedShape.is_visible,
    });
    setEditShapeErrors({});
    setDeleteShapeArmed(false);
  }, [selectedShape]);

  const totalCovers = useMemo(
    () => [...waitlist, ...upcoming, ...seated].reduce((sum, reservation) => sum + reservation.guests, 0),
    [seated, upcoming, waitlist],
  );

  const freeTablesCount = tables.filter((table) => table.status === 'free' && table.is_active !== false).length;
  const activeTablesCount = tables.filter((table) => table.is_active !== false).length;
  const reservedTablesCount = tables.filter((table) => table.status === 'reserved' && table.is_active !== false).length;
  const occupiedTablesCount = tables.filter((table) => table.status === 'occupied' && table.is_active !== false).length;

  const tableCanvas = useMemo(() => {
    const activeTables = tables.filter((table) => table.is_active !== false);
    return (activeTables.length > 0 ? activeTables : tables).map((table, index) => {
      const fallbackLayout = getDefaultTableLayout(table.table_type, index);
      return {
        ...table,
        shape: table.table_type === 'circle' ? 'circle' : table.table_type === 'rectangle' ? 'rectangle' : 'square',
        x: typeof table.x === 'number' ? table.x : fallbackLayout.x,
        y: typeof table.y === 'number' ? table.y : fallbackLayout.y,
        width: table.width ?? fallbackLayout.width,
        height: table.height ?? fallbackLayout.height,
        rotation: table.rotation ?? fallbackLayout.rotation,
      };
    });
  }, [tables]);

  const shapeCanvas = useMemo(
    () =>
      shapes
        .filter((shape) => shape.is_visible !== false)
        .map((shape, index) => {
          const fallbackLayout = getDefaultShapeLayout(shape.shape_type, index);
          return {
            ...shape,
            x: typeof shape.x === 'number' ? shape.x : fallbackLayout.x,
            y: typeof shape.y === 'number' ? shape.y : fallbackLayout.y,
            width: typeof shape.width === 'number' ? shape.width : fallbackLayout.width,
            height: typeof shape.height === 'number' ? shape.height : fallbackLayout.height,
            rotation: typeof shape.rotation === 'number' ? shape.rotation : 0,
          };
        })
        .sort((left, right) => (left.z_index ?? 1) - (right.z_index ?? 1)),
    [shapes],
  );

  const handleAction = useCallback(
    async (id: number, action: string) => {
      setInFlightId(id);
      try {
        await api.post(`/bookings/${id}/${action}/`);
        const labels: Record<string, string> = {
          confirm: 'Бронь подтверждена',
          seat: 'Гость посажен',
          complete: 'Визит завершён',
        };
        toast.success(labels[action] ?? 'Готово');
        void load(true);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Ошибка действия'));
      } finally {
        setInFlightId(null);
      }
    },
    [load],
  );

  const handleCreateTable = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageTables) return;
      const errors = validateTableForm(createForm);
      setCreateErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setSavingCreate(true);
      try {
        const layout = getDefaultTableLayout(createForm.table_type, tables.length);
        const response = await api.post('/tables/', {
          ...createForm,
          name: createForm.name.trim(),
          ...layout,
        });
        const createdTable = response.data as ManagedTable;
        setTables((current) => [createdTable, ...current]);
        setSelectedTableId(createdTable.id);
        setCreateForm(INITIAL_FORM);
        setCreateErrors({});
        toast.success('Стол создан.');
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не удалось создать стол.'));
      } finally {
        setSavingCreate(false);
      }
    },
    [canManageTables, createForm, tables.length],
  );

  const handleUpdateTable = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedTableId) return;
      if (!canManageTables) return;

      const errors = validateTableForm(editForm);
      setEditErrors(errors);
      if (Object.keys(errors).length > 0) return;

      const previousTable = tables.find((table) => table.id === selectedTableId);
      const optimisticTable = previousTable
        ? {
            ...previousTable,
            name: editForm.name.trim(),
            capacity: editForm.capacity,
            table_type: editForm.table_type,
            is_active: editForm.is_active,
          }
        : null;

      if (optimisticTable) {
        setTables((current) => current.map((table) => (table.id === selectedTableId ? optimisticTable : table)));
      }

      setSavingEdit(true);
      try {
        const response = await api.patch(`/tables/${selectedTableId}/`, {
          ...editForm,
          name: editForm.name.trim(),
        });
        const updatedTable = response.data as ManagedTable;
        setTables((current) => current.map((table) => (table.id === selectedTableId ? updatedTable : table)));
        toast.success('Изменения по столу сохранены.');
      } catch (error) {
        if (previousTable) {
          setTables((current) => current.map((table) => (table.id === selectedTableId ? previousTable : table)));
        }
        toast.error(getApiErrorMessage(error, 'Не удалось обновить стол.'));
      } finally {
        setSavingEdit(false);
      }
    },
    [canManageTables, editForm, selectedTableId, tables],
  );

  const handleDeleteTable = useCallback(async () => {
    if (!selectedTableId || !selectedTable) return;
    if (!canDeleteTables) return;

    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }

    const previousTables = tables;
    setSavingEdit(true);
    setTables((current) => current.filter((table) => table.id !== selectedTableId));
    setSelectedTableId(null);

    try {
      await api.delete(`/tables/${selectedTableId}/`);
      toast.success('Стол удалён.');
    } catch (error) {
      setTables(previousTables);
      setSelectedTableId(selectedTableId);
      toast.error(getApiErrorMessage(error, 'Не удалось удалить стол.'));
    } finally {
      setSavingEdit(false);
      setDeleteArmed(false);
    }
  }, [canDeleteTables, deleteArmed, selectedTable, selectedTableId, tables]);

  const handleCreateShape = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageTables) return;
      const errors = validateShapeForm(createShapeForm);
      setCreateShapeErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setSavingShapeCreate(true);
      try {
        const layout = getDefaultShapeLayout(createShapeForm.shape_type, shapes.length);
        const response = await api.post('/restaurants/floor-shapes/', {
          ...createShapeForm,
          name: createShapeForm.name.trim(),
          ...layout,
          text_color: createShapeForm.text_color,
          z_index: 1,
        });
        const createdShape = response.data as FloorShape;
        setShapes((current) => [...current, createdShape]);
        setSelectedShapeId(createdShape.id);
        setSelectedTableId(null);
        setCreateShapeForm(INITIAL_SHAPE_FORM);
        setCreateShapeErrors({});
        toast.success('Элемент схемы добавлен.');
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не удалось создать элемент схемы.'));
      } finally {
        setSavingShapeCreate(false);
      }
    },
    [canManageTables, createShapeForm, shapes.length],
  );

  const handleUpdateShape = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedShapeId || !canManageTables) return;
      const errors = validateShapeForm(editShapeForm);
      setEditShapeErrors(errors);
      if (Object.keys(errors).length > 0) return;

      const previousShape = shapes.find((shape) => shape.id === selectedShapeId);
      if (!previousShape) return;

      const optimisticShape: FloorShape = {
        ...previousShape,
        ...editShapeForm,
        name: editShapeForm.name.trim(),
      };
      setShapes((current) => current.map((shape) => (shape.id === selectedShapeId ? optimisticShape : shape)));

      setSavingShapeEdit(true);
      try {
        const response = await api.patch(`/restaurants/floor-shapes/${selectedShapeId}/`, {
          ...editShapeForm,
          name: editShapeForm.name.trim(),
        });
        const updatedShape = response.data as FloorShape;
        setShapes((current) => current.map((shape) => (shape.id === selectedShapeId ? updatedShape : shape)));
        setDirtyShapeIds((current) => current.filter((id) => id !== selectedShapeId));
        toast.success('Элемент схемы обновлён.');
      } catch (error) {
        setShapes((current) => current.map((shape) => (shape.id === selectedShapeId ? previousShape : shape)));
        toast.error(getApiErrorMessage(error, 'Не удалось обновить элемент схемы.'));
      } finally {
        setSavingShapeEdit(false);
      }
    },
    [canManageTables, editShapeForm, selectedShapeId, shapes],
  );

  const handleDeleteShape = useCallback(async () => {
    if (!selectedShapeId || !selectedShape) return;
    if (!canManageTables) return;

    if (!deleteShapeArmed) {
      setDeleteShapeArmed(true);
      return;
    }

    const previousShapes = shapes;
    setSavingShapeEdit(true);
    setShapes((current) => current.filter((shape) => shape.id !== selectedShapeId));
    setSelectedShapeId(null);

    try {
      await api.delete(`/restaurants/floor-shapes/${selectedShapeId}/`);
      setDirtyShapeIds((current) => current.filter((id) => id !== selectedShapeId));
      toast.success('Элемент схемы удалён.');
    } catch (error) {
      setShapes(previousShapes);
      setSelectedShapeId(selectedShapeId);
      toast.error(getApiErrorMessage(error, 'Не удалось удалить элемент схемы.'));
    } finally {
      setSavingShapeEdit(false);
      setDeleteShapeArmed(false);
    }
  }, [canManageTables, deleteShapeArmed, selectedShape, selectedShapeId, shapes]);

  const handleTablePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, table: ManagedTable) => {
      if (!canManageTables || !layoutMode || !canvasRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedTableId(table.id);
      setSelectedShapeId(null);

      const rect = canvasRef.current.getBoundingClientRect();
      dragRef.current = {
        entityType: 'table',
        entityId: table.id,
        offsetX: event.clientX - rect.left - (table.x ?? FLOOR_PADDING),
        offsetY: event.clientY - rect.top - (table.y ?? FLOOR_PADDING),
        width: table.width ?? getTablePreset(table.table_type).width,
        height: table.height ?? getTablePreset(table.table_type).height,
      };
    },
    [canManageTables, layoutMode],
  );

  const handleShapePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, shape: FloorShape) => {
      if (!canManageTables || !layoutMode || !canvasRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedShapeId(shape.id);
      setSelectedTableId(null);

      const rect = canvasRef.current.getBoundingClientRect();
      dragRef.current = {
        entityType: 'shape',
        entityId: shape.id,
        offsetX: event.clientX - rect.left - shape.x,
        offsetY: event.clientY - rect.top - shape.y,
        width: shape.width,
        height: shape.height,
      };
    },
    [canManageTables, layoutMode],
  );

  const saveLayout = useCallback(async () => {
    if (!canManageTables || (dirtyLayoutIds.length === 0 && dirtyShapeIds.length === 0)) return;

    setLayoutSaving(true);
    try {
      const tableResponses = await Promise.all(
        dirtyLayoutIds.map(async (tableId) => {
          const table = tables.find((entry) => entry.id === tableId);
          if (!table) return null;
          const response = await api.patch(`/tables/${tableId}/`, {
            x: table.x ?? FLOOR_PADDING,
            y: table.y ?? FLOOR_PADDING,
            width: table.width ?? getTablePreset(table.table_type).width,
            height: table.height ?? getTablePreset(table.table_type).height,
            rotation: table.rotation ?? 0,
          });
          return response.data as ManagedTable;
        }),
      );

      const shapeResponses = await Promise.all(
        dirtyShapeIds.map(async (shapeId) => {
          const shape = shapes.find((entry) => entry.id === shapeId);
          if (!shape) return null;
          const response = await api.patch(`/restaurants/floor-shapes/${shapeId}/`, {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation,
            z_index: shape.z_index,
            is_visible: shape.is_visible,
            name: shape.name,
            shape_type: shape.shape_type,
            fill_color: shape.fill_color,
            stroke_color: shape.stroke_color,
            text_color: shape.text_color,
          });
          return response.data as FloorShape;
        }),
      );

      const persistedTables = new Map(
        tableResponses.filter((entry): entry is ManagedTable => entry !== null).map((entry) => [entry.id, entry]),
      );
      const persistedShapes = new Map(
        shapeResponses.filter((entry): entry is FloorShape => entry !== null).map((entry) => [entry.id, entry]),
      );
      setTables((current) => current.map((table) => persistedTables.get(table.id) ?? table));
      setShapes((current) => current.map((shape) => persistedShapes.get(shape.id) ?? shape));
      setDirtyLayoutIds([]);
      setDirtyShapeIds([]);
      toast.success('Схема зала сохранена.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить схему зала.'));
    } finally {
      setLayoutSaving(false);
    }
  }, [canManageTables, dirtyLayoutIds, dirtyShapeIds, shapes, tables]);

  const resetLayoutDrafts = useCallback(() => {
    setDirtyLayoutIds([]);
    setDirtyShapeIds([]);
    void load(true);
  }, [load]);

  const updateSelectedLayout = useCallback(
    (field: 'x' | 'y' | 'width' | 'height' | 'rotation', value: number) => {
      if (!selectedTableId || !canManageTables) return;

      updateTableDraft(selectedTableId, (table) => {
        if (field === 'x') {
          return {
            x: snapToGrid(clamp(value, FLOOR_PADDING, FLOOR_CANVAS_WIDTH - (table.width ?? 80) - FLOOR_PADDING)),
          };
        }
        if (field === 'y') {
          return {
            y: snapToGrid(clamp(value, FLOOR_PADDING, FLOOR_CANVAS_HEIGHT - (table.height ?? 80) - FLOOR_PADDING)),
          };
        }
        if (field === 'width') {
          const width = clamp(value, 64, 220);
          return {
            width,
            x: clamp(
              table.x ?? FLOOR_PADDING,
              FLOOR_PADDING,
              FLOOR_CANVAS_WIDTH - width - FLOOR_PADDING,
            ),
          };
        }
        if (field === 'height') {
          const height = clamp(value, 64, 220);
          return {
            height,
            y: clamp(
              table.y ?? FLOOR_PADDING,
              FLOOR_PADDING,
              FLOOR_CANVAS_HEIGHT - height - FLOOR_PADDING,
            ),
          };
        }
        return {
          rotation: clamp(value, -180, 180),
        };
      });
    },
    [canManageTables, selectedTableId, updateTableDraft],
  );

  const updateSelectedShapeLayout = useCallback(
    (field: 'x' | 'y' | 'width' | 'height' | 'rotation' | 'z_index', value: number) => {
      if (!selectedShapeId || !canManageTables) return;

      updateShapeDraft(selectedShapeId, (shape) => {
        if (field === 'x') {
          return {
            x: snapToGrid(clamp(value, FLOOR_PADDING, FLOOR_CANVAS_WIDTH - shape.width - FLOOR_PADDING)),
          };
        }
        if (field === 'y') {
          return {
            y: snapToGrid(clamp(value, FLOOR_PADDING, FLOOR_CANVAS_HEIGHT - shape.height - FLOOR_PADDING)),
          };
        }
        if (field === 'width') {
          const width = clamp(value, shape.shape_type === 'label' ? 90 : 32, 320);
          return {
            width,
            x: clamp(shape.x, FLOOR_PADDING, FLOOR_CANVAS_WIDTH - width - FLOOR_PADDING),
          };
        }
        if (field === 'height') {
          const height = clamp(value, shape.shape_type === 'line' ? 2 : 24, 240);
          return {
            height,
            y: clamp(shape.y, FLOOR_PADDING, FLOOR_CANVAS_HEIGHT - height - FLOOR_PADDING),
          };
        }
        if (field === 'z_index') {
          return { z_index: clamp(Math.round(value), 1, 30) };
        }
        return {
          rotation: clamp(value, -180, 180),
        };
      });
    },
    [canManageTables, selectedShapeId, updateShapeDraft],
  );

  const shiftDate = (delta: number) => {
    const target = new Date(`${date}T00:00:00`);
    target.setDate(target.getDate() + delta);
    setDate(getLocalDateString(target));
  };

  const dateLabel = useMemo(() => {
    const target = new Date(`${date}T00:00:00`);
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(target);
  }, [date]);

  const isToday = date === getLocalDateString();

  if (loading && reservations.length === 0 && tables.length === 0) {
    return <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">Загрузка схемы зала...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Схема зала</h1>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
              Операции
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Посадка гостей, назначение столов и контроль сервиса в одном экране.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{isToday ? `Сегодня · ${dateLabel}` : `Выбран день · ${dateLabel}`}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{totalCovers} гостей в работе</span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{waitlist.length} ожидают</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{upcoming.length} брони</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{seated.length} за столом</span>
            {activeShift ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                Смена · {activeShift.name} {fmt(activeShift.starts_at)}–{fmt(activeShift.ends_at)}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Нет активной смены</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/bookings')}
            className="hidden sm:inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            Брони
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/bookings/new')}
            className="hidden sm:inline-flex h-9 items-center gap-2 rounded-xl bg-[#1d4ed8] px-4 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#1e40af]"
          >
            <Plus size={14} />
            Новая бронь
          </button>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-sm">
            <button
              onClick={() => shiftDate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[110px] text-center text-sm font-semibold capitalize text-slate-900">{dateLabel}</span>
            <button
              onClick={() => shiftDate(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <input
            type="date"
            value={date}
            aria-label="floor-date-input"
            onChange={(event) => setDate(event.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
          />
          <button
            type="button"
            onClick={() => setDate(getLocalDateString())}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-widest text-slate-600 transition hover:bg-slate-50"
          >
            Сегодня
          </button>

          {shifts.length > 0 ? (
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {shifts.map((shift) => (
                <button
                  key={shift.id}
                  onClick={() => setActiveShiftId(shift.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeShiftId === shift.id ? 'bg-[#1A3C34] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {shift.name}
                  <span className="ml-1.5 font-normal opacity-60">
                    {fmt(shift.starts_at)}–{fmt(shift.ends_at)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <button
            onClick={() => void load()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Ожидание" value={waitlist.length} tone="amber" />
        <SummaryCard label="Бронирование" value={upcoming.length} tone="emerald" />
        <SummaryCard label="За столом" value={seated.length} tone="blue" />
        <SummaryCard label="Столы в работе" value={activeTablesCount} tone="slate" />
      </section>

      {error ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-100"
            >
              <RefreshCw size={14} />
              Повторить
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Схема столов</h2>
              <p className="mt-1 text-sm text-slate-500">Перетаскивайте столы, меняйте размер и сохраняйте рабочую схему смены.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Свободно {freeTablesCount}</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Бронь {reservedTablesCount}</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Занято {occupiedTablesCount}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Посадочная схема</span>
              <button
                type="button"
                onClick={() => navigate('/app/tables')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Pencil size={14} />
                Столы
              </button>
              <button
                type="button"
                aria-label="floor-layout-mode"
                onClick={() => setLayoutMode((current) => !current)}
                disabled={!canManageTables}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  !canManageTables
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : layoutMode
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Move size={14} />
                {layoutMode ? 'Режим расстановки' : 'Редактировать схему'}
              </button>
              <button
                type="button"
                aria-label="floor-layout-save"
                onClick={() => void saveLayout()}
                disabled={layoutSaving || (dirtyLayoutIds.length === 0 && dirtyShapeIds.length === 0) || !canManageTables}
                className="inline-flex items-center gap-2 rounded-full bg-[#1d4ed8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
              >
                <Save size={14} />
                {layoutSaving ? 'Сохраняем...' : `Сохранить${dirtyLayoutIds.length + dirtyShapeIds.length > 0 ? ` (${dirtyLayoutIds.length + dirtyShapeIds.length})` : ''}`}
              </button>
              <button
                type="button"
                onClick={resetLayoutDrafts}
                disabled={layoutSaving || (dirtyLayoutIds.length === 0 && dirtyShapeIds.length === 0) || !canManageTables}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={14} />
                Сбросить черновик
              </button>
            </div>
          </div>

          {tableCanvas.length === 0 && shapeCanvas.length === 0 ? (
            <div className="flex h-[340px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              Добавьте столы и элементы справа, чтобы собрать свою схему зала.
            </div>
          ) : (
            <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(248,250,252,0.94)_45%,_rgba(241,245,249,0.9)_100%)] p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {layoutMode
                    ? 'Режим планировки включён. Перетаскивайте столы, меняйте размер и поворот, затем сохраните схему.'
                    : 'Это рабочая посадочная схема: свободные, зарезервированные и занятые столы видны сразу.'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                    Поле {FLOOR_CANVAS_WIDTH}×{FLOOR_CANVAS_HEIGHT}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                    столы и элементы
                  </span>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Свободен
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Забронирован
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <span className="size-2 rounded-full bg-blue-500" />
                  За столом
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                  <span className="size-2 rounded-full bg-slate-400" />
                  Неактивен
                </span>
                {canManageTables ? (
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                      <span className="inline-flex h-3 w-3 rounded-sm border border-slate-400 bg-slate-100" />
                      Квадратный
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                      <span className="inline-flex h-2.5 w-4 rounded-sm border border-slate-400 bg-slate-100" />
                      Прямоугольный
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                      <span className="inline-flex h-3 w-3 rounded-full border border-slate-400 bg-slate-100" />
                      Круглый
                    </span>
                  </>
                ) : null}
              </div>
              <div className="overflow-x-auto">
                <div
                  ref={canvasRef}
                  className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[#fbfbf8]"
                  style={{
                    width: FLOOR_CANVAS_WIDTH,
                    height: FLOOR_CANVAS_HEIGHT,
                    backgroundImage:
                      'linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px), radial-gradient(circle at top left, rgba(219,234,254,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(254,249,195,0.22), transparent 34%)',
                    backgroundSize: `${FLOOR_GRID}px ${FLOOR_GRID}px`,
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-dashed border-slate-200/80" />
                  {shapeCanvas.map((shape) => {
                    const selected = shape.id === selectedShapeId;
                    const isLabel = shape.shape_type === 'label';
                    const isLine = shape.shape_type === 'line';
                    return (
                      <button
                        key={`shape-${shape.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedShapeId(shape.id);
                          setSelectedTableId(null);
                        }}
                        onPointerDown={(event) => handleShapePointerDown(event, shape)}
                        className={`absolute overflow-hidden text-left transition ${
                          layoutMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                        } ${
                          selected ? 'ring-2 ring-blue-300 shadow-[0_16px_36px_-24px_rgba(29,78,216,0.45)]' : ''
                        } ${shape.shape_type === 'circle' ? 'rounded-full' : isLine ? 'rounded-full' : 'rounded-[26px]'}`}
                        style={{
                          left: shape.x,
                          top: shape.y,
                          width: shape.width,
                          height: shape.height,
                          transform: `rotate(${shape.rotation ?? 0}deg)`,
                          transformOrigin: 'center',
                          background: isLabel ? 'transparent' : shape.fill_color,
                          border: isLabel ? 'none' : `2px solid ${shape.stroke_color}`,
                          color: shape.text_color,
                          zIndex: Math.max(1, shape.z_index ?? 1),
                          touchAction: 'none',
                        }}
                      >
                        {isLine ? (
                          <span className="block h-full w-full rounded-full" style={{ backgroundColor: shape.fill_color }} />
                        ) : (
                          <div className={`flex h-full w-full items-center justify-center px-3 text-center ${isLabel ? 'text-sm font-semibold uppercase tracking-[0.16em]' : 'text-sm font-semibold'}`}>
                            {shape.name}
                          </div>
                        )}
                        {layoutMode && selected ? (
                          <div className="absolute bottom-1 right-1 rounded-full bg-slate-950/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Элемент
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                  {tableCanvas.map((table) => {
                    const selected = table.id === selectedTableId;
                    const statusMeta = getTableStatusMeta(table.status);
                    const tone = getFloorTone(table.status, table.is_active !== false);
                    const seats = Math.max(2, Math.round(getTableCapacity(table) || 2));
                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => {
                          setSelectedTableId(table.id);
                          setSelectedShapeId(null);
                        }}
                        onPointerDown={(event) => handleTablePointerDown(event, table)}
                        className={`group absolute flex flex-col justify-between overflow-hidden border p-3 text-left transition ${
                          selected
                            ? 'z-20 border-blue-300 bg-blue-50 text-slate-900 ring-2 ring-blue-200 shadow-[0_22px_42px_-30px_rgba(29,78,216,0.45)]'
                            : `${tone.border} ${tone.bg} ${tone.text} ${tone.shadow} hover:brightness-[0.99]`
                        } ${table.shape === 'circle' ? 'rounded-full' : 'rounded-[28px]'} ${
                          layoutMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                        }`}
                        title={`${getTableLabel(table)} · ${getTableCapacity(table)} мест · ${getTableTypeLabel(table.table_type)}${table.current_booking ? ` · ${table.current_booking.guest_name}` : ''}`}
                        style={{
                          left: table.x,
                          top: table.y,
                          width: table.width,
                          height: table.height,
                          transform: `rotate(${table.rotation ?? 0}deg)`,
                          transformOrigin: 'center',
                          touchAction: 'none',
                        }}
                      >
                        <div className={`absolute inset-x-0 top-0 h-1 ${selected ? 'bg-blue-500' : tone.accent}`} />
                        <SeatDots shape={table.shape} capacity={seats} />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{getTableLabel(table)}</div>
                            <div className="mt-0.5 text-[11px] opacity-70">{getTableCapacity(table)} мест</div>
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              table.is_active === false
                                ? 'border-slate-200 bg-white/70 text-slate-500'
                                : statusMeta.className
                            }`}
                          >
                            {table.is_active === false ? 'Не активен' : statusMeta.label}
                          </span>
                        </div>

                        <div className="space-y-1 rounded-2xl bg-white/65 px-2.5 py-2 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] backdrop-blur-[2px]">
                          {table.current_booking ? (
                            <>
                              <div className="truncate text-sm font-semibold text-slate-900">{table.current_booking.guest_name}</div>
                              <div className="text-[11px] text-slate-500">
                                {table.current_booking.guests} гостей · {fmt(table.current_booking.time)}
                              </div>
                            </>
                          ) : (
                            <div className="text-[11px] text-slate-500">Свободен для посадки</div>
                          )}
                        </div>

                        {layoutMode ? (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-950/90 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
                            <Move size={12} />
                            Переместить
                          </div>
                        ) : null}

                        {!layoutMode ? (
                          <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-44 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                            <div className="font-semibold text-slate-900">{getTableLabel(table)}</div>
                            <div className="mt-1">{getTableTypeLabel(table.table_type)} · {getTableCapacity(table)} мест</div>
                            <div className="mt-1 text-slate-500">
                              {table.current_booking ? `${table.current_booking.guest_name} · ${fmt(table.current_booking.time)}` : 'Свободен для новой посадки'}
                            </div>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Выбранный стол</h2>
                <p className="mt-1 text-sm text-slate-500">Выбор, статус и текущая посадка в одном блоке.</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-500">
                <Pencil size={16} />
              </div>
            </div>

            {selectedTable ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Стол</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{getTableLabel(selectedTable)}</div>
                  <div className="mt-1 text-sm text-slate-500">{getTableCapacity(selectedTable)} мест · {getTableTypeLabel(selectedTable.table_type)}</div>
                  </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Статус</div>
                    <div className="mt-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getTableStatusMeta(selectedTable.status).className}`}>
                        {selectedTable.is_active === false ? 'Не активен' : getTableStatusMeta(selectedTable.status).label}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Текущий гость</div>
                    <div className="mt-2 text-sm font-medium text-slate-700">{selectedTable.current_booking?.guest_name || 'Нет активной посадки'}</div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard label="X" value={Math.round(selectedTable.x ?? 0)} />
                  <MetricCard label="Y" value={Math.round(selectedTable.y ?? 0)} />
                  <MetricCard label="Поворот" value={`${Math.round(selectedTable.rotation ?? 0)}°`} />
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Выберите стол на схеме, чтобы редактировать его здесь.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Выбранный элемент</h2>
                <p className="mt-1 text-sm text-slate-500">Вход, бар, кухня, перегородки и подписи для своего ресторана.</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-500">
                <Pencil size={16} />
              </div>
            </div>

            {selectedShape ? (
              <form onSubmit={handleUpdateShape} className="mt-5 space-y-4" noValidate>
                <Field
                  label="Название"
                  value={editShapeForm.name}
                  onChange={(value) => {
                    setEditShapeForm((current) => ({ ...current, name: value }));
                    if (editShapeErrors.name) setEditShapeErrors((current) => ({ ...current, name: undefined }));
                    updateShapeDraft(selectedShape.id, { name: value }, false);
                  }}
                  error={editShapeErrors.name}
                  disabled={!canManageTables}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Тип"
                    value={editShapeForm.shape_type}
                    onChange={(value) => {
                      setEditShapeForm((current) => ({ ...current, shape_type: value as FloorShapeType }));
                      updateShapeDraft(selectedShape.id, { shape_type: value as FloorShapeType });
                    }}
                    options={[
                      { value: 'rectangle', label: 'Rectangle' },
                      { value: 'circle', label: 'Circle' },
                      { value: 'label', label: 'Label' },
                      { value: 'line', label: 'Line' },
                    ]}
                    disabled={!canManageTables}
                  />
                  <ToggleField
                    label="Виден на схеме"
                    description="Элемент остаётся в базе, но его можно временно скрыть."
                    checked={editShapeForm.is_visible}
                    onChange={() => {
                      setEditShapeForm((current) => ({ ...current, is_visible: !current.is_visible }));
                      updateShapeDraft(selectedShape.id, { is_visible: !editShapeForm.is_visible });
                    }}
                    disabled={!canManageTables}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard label="X" value={Math.round(selectedShape.x ?? 0)} />
                  <MetricCard label="Y" value={Math.round(selectedShape.y ?? 0)} />
                  <MetricCard label="Поворот" value={`${Math.round(selectedShape.rotation ?? 0)}°`} />
                  <MetricCard label="Слой" value={selectedShape.z_index ?? 1} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Ширина"
                    type="number"
                    value={String(Math.round(selectedShape.width))}
                    onChange={(value) => updateSelectedShapeLayout('width', Number(value) || selectedShape.width)}
                    disabled={!canManageTables}
                  />
                  <Field
                    label="Высота"
                    type="number"
                    value={String(Math.round(selectedShape.height))}
                    onChange={(value) => updateSelectedShapeLayout('height', Number(value) || selectedShape.height)}
                    disabled={!canManageTables}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <ColorField
                    label="Fill"
                    value={editShapeForm.fill_color}
                    onChange={(value) => {
                      setEditShapeForm((current) => ({ ...current, fill_color: value }));
                      updateShapeDraft(selectedShape.id, { fill_color: value });
                    }}
                    disabled={!canManageTables}
                  />
                  <ColorField
                    label="Stroke"
                    value={editShapeForm.stroke_color}
                    onChange={(value) => {
                      setEditShapeForm((current) => ({ ...current, stroke_color: value }));
                      updateShapeDraft(selectedShape.id, { stroke_color: value });
                    }}
                    disabled={!canManageTables}
                  />
                  <ColorField
                    label="Text"
                    value={editShapeForm.text_color}
                    onChange={(value) => {
                      setEditShapeForm((current) => ({ ...current, text_color: value }));
                      updateShapeDraft(selectedShape.id, { text_color: value });
                    }}
                    disabled={!canManageTables}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="X"
                    type="number"
                    value={String(Math.round(selectedShape.x))}
                    onChange={(value) => updateSelectedShapeLayout('x', Number(value) || selectedShape.x)}
                    disabled={!canManageTables}
                  />
                  <Field
                    label="Y"
                    type="number"
                    value={String(Math.round(selectedShape.y))}
                    onChange={(value) => updateSelectedShapeLayout('y', Number(value) || selectedShape.y)}
                    disabled={!canManageTables}
                  />
                  <Field
                    label="Поворот"
                    type="number"
                    value={String(Math.round(selectedShape.rotation))}
                    onChange={(value) => updateSelectedShapeLayout('rotation', Number(value) || 0)}
                    disabled={!canManageTables}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Layer"
                    type="number"
                    value={String(selectedShape.z_index ?? 1)}
                    onChange={(value) => updateSelectedShapeLayout('z_index', Number(value) || 1)}
                    disabled={!canManageTables}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={savingShapeEdit || !canManageTables}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                  >
                    <Save size={16} />
                    {savingShapeEdit ? 'Сохраняем...' : 'Сохранить элемент'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteShape()}
                    disabled={savingShapeEdit || !canManageTables}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                      deleteShapeArmed ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Trash2 size={16} />
                    {deleteShapeArmed ? 'Подтвердить удаление' : 'Удалить'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Выберите элемент на схеме, чтобы менять подписи, цвета и позицию.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Новый стол</h2>
            <p className="mt-1 text-sm text-slate-500">Быстро добавьте стол на схему. Полный список и управление — в разделе «Столы».</p>

            <form onSubmit={handleCreateTable} className="mt-5 space-y-4" noValidate>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { value: 'square', label: 'Квадрат', description: 'Для компактных столов на 2-4 гостя.' },
                  { value: 'rectangle', label: 'Прямоугольный', description: 'Удобно для основной посадки и сдвига столов.' },
                  { value: 'circle', label: 'Круглый', description: 'Подходит для мягкой посадки и VIP-зон.' },
                ].map((preset) => {
                  const active = createForm.table_type === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setCreateForm((current) => ({ ...current, table_type: preset.value as TableFormState['table_type'] }))}
                      title={preset.description}
                      disabled={!canManageTables}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-blue-200 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      } disabled:opacity-50`}
                    >
                      <div className="text-sm font-semibold">{preset.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{preset.description}</div>
                    </button>
                  );
                })}
              </div>

              <Field
                label="Название"
                value={createForm.name}
                onChange={(value) => {
                  setCreateForm((current) => ({ ...current, name: value }));
                  if (createErrors.name) setCreateErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="Table 1"
                error={createErrors.name}
                disabled={!canManageTables}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Вместимость"
                  type="number"
                  value={String(createForm.capacity)}
                  onChange={(value) => {
                    setCreateForm((current) => ({ ...current, capacity: Math.max(1, Number(value) || 1) }));
                    if (createErrors.capacity) setCreateErrors((current) => ({ ...current, capacity: undefined }));
                  }}
                  error={createErrors.capacity}
                  disabled={!canManageTables}
                />
                <SelectField
                  label="Форма"
                  value={createForm.table_type}
                  onChange={(value) => setCreateForm((current) => ({ ...current, table_type: value as TableFormState['table_type'] }))}
                  options={[
                    { value: 'square', label: 'Квадрат' },
                    { value: 'rectangle', label: 'Прямоугольный' },
                    { value: 'circle', label: 'Круглый' },
                  ]}
                  disabled={!canManageTables}
                />
              </div>

              <ToggleField
                label="Активен для смены"
                description="Если выключить, стол останется в системе, но исчезнет из рабочей схемы."
                checked={createForm.is_active}
                onChange={() => setCreateForm((current) => ({ ...current, is_active: !current.is_active }))}
                disabled={!canManageTables}
              />

              <button
                type="submit"
                disabled={savingCreate || !canManageTables}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
              >
                <Plus size={16} />
                {savingCreate ? 'Создание...' : 'Добавить стол'}
              </button>

              {!canManageTables ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Доступ только для просмотра. Для изменений нужна роль manager или owner.
                </div>
              ) : null}
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Новый элемент</h2>
            <p className="mt-1 text-sm text-slate-500">Соберите свою карту зала: вход, кухня, бар, зоны и подписи ресторана.</p>

            <form onSubmit={handleCreateShape} className="mt-5 space-y-4" noValidate>
              <Field
                label="Название"
                value={createShapeForm.name}
                onChange={(value) => {
                  setCreateShapeForm((current) => ({ ...current, name: value }));
                  if (createShapeErrors.name) setCreateShapeErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="Вход"
                error={createShapeErrors.name}
                disabled={!canManageTables}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Тип"
                  value={createShapeForm.shape_type}
                  onChange={(value) => setCreateShapeForm((current) => ({ ...current, shape_type: value as FloorShapeType }))}
                  options={[
                    { value: 'rectangle', label: 'Rectangle' },
                    { value: 'circle', label: 'Circle' },
                    { value: 'label', label: 'Label' },
                    { value: 'line', label: 'Line' },
                  ]}
                  disabled={!canManageTables}
                />
                <ToggleField
                  label="Показать сразу"
                  description="Элемент появится на схеме, и его можно будет перетянуть."
                  checked={createShapeForm.is_visible}
                  onChange={() => setCreateShapeForm((current) => ({ ...current, is_visible: !current.is_visible }))}
                  disabled={!canManageTables}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <ColorField
                  label="Fill"
                  value={createShapeForm.fill_color}
                  onChange={(value) => setCreateShapeForm((current) => ({ ...current, fill_color: value }))}
                  disabled={!canManageTables}
                />
                <ColorField
                  label="Stroke"
                  value={createShapeForm.stroke_color}
                  onChange={(value) => setCreateShapeForm((current) => ({ ...current, stroke_color: value }))}
                  disabled={!canManageTables}
                />
                <ColorField
                  label="Text"
                  value={createShapeForm.text_color}
                  onChange={(value) => setCreateShapeForm((current) => ({ ...current, text_color: value }))}
                  disabled={!canManageTables}
                />
              </div>

              <button
                type="submit"
                disabled={savingShapeCreate || !canManageTables}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Plus size={16} />
                {savingShapeCreate ? 'Создание...' : 'Добавить элемент'}
              </button>
            </form>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-3">
          <Column
            title="Ожидание"
            subtitle="по времени ожидания"
            coversCount={waitlist.length}
            guestsCount={waitlist.reduce((sum, reservation) => sum + reservation.guests, 0)}
            reservations={waitlist}
            onAction={handleAction}
            inFlightId={inFlightId}
            emptyText="Нет ожидающих"
          />
          <Column
            title="Бронирования"
            subtitle="по времени брони"
            coversCount={upcoming.length}
            guestsCount={upcoming.reduce((sum, reservation) => sum + reservation.guests, 0)}
            reservations={upcoming}
            onAction={handleAction}
            inFlightId={inFlightId}
            emptyText="Нет подтверждённых броней"
          />
          <Column
            title="За столом"
            subtitle="по времени посадки"
            coversCount={seated.length}
            guestsCount={seated.reduce((sum, reservation) => sum + reservation.guests, 0)}
            reservations={seated}
            onAction={handleAction}
            inFlightId={inFlightId}
            showElapsed
            emptyText="Никто не сидит"
          />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Настройка стола</h2>
          <p className="mt-1 text-sm text-slate-500">Быстро меняйте параметры выбранного стола. Для массовой настройки откройте «Столы».</p>

          {selectedTable ? (
            <form onSubmit={handleUpdateTable} className="mt-5 space-y-4" noValidate>
              <Field
                label="Название"
                value={editForm.name}
                onChange={(value) => {
                  setEditForm((current) => ({ ...current, name: value }));
                  if (editErrors.name) setEditErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="Table 1"
                error={editErrors.name}
                disabled={!canManageTables}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Вместимость"
                  type="number"
                  value={String(editForm.capacity)}
                  onChange={(value) => {
                    setEditForm((current) => ({ ...current, capacity: Math.max(1, Number(value) || 1) }));
                    if (editErrors.capacity) setEditErrors((current) => ({ ...current, capacity: undefined }));
                  }}
                  error={editErrors.capacity}
                  disabled={!canManageTables}
                />
                <SelectField
                  label="Форма"
                  value={editForm.table_type}
                  onChange={(value) => setEditForm((current) => ({ ...current, table_type: value as TableFormState['table_type'] }))}
                  options={[
                    { value: 'square', label: 'Квадрат' },
                    { value: 'rectangle', label: 'Прямоугольный' },
                    { value: 'circle', label: 'Круглый' },
                  ]}
                  disabled={!canManageTables}
                />
              </div>

              <ToggleField
                label="Активен для смены"
                description="Отключите стол, если он не должен участвовать в посадке сейчас."
                checked={editForm.is_active}
                onChange={() => setEditForm((current) => ({ ...current, is_active: !current.is_active }))}
                disabled={!canManageTables}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Позиция на схеме</div>
                    <div className="mt-1 text-sm text-slate-500">Точная позиция, размер и поворот стола на схеме.</div>
                  </div>
                  {dirtyLayoutIds.includes(selectedTable.id) ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Не сохранено
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Сохранено
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Позиция X"
                    type="number"
                    value={String(Math.round(selectedTable.x ?? 0))}
                    onChange={(value) => updateSelectedLayout('x', Number(value) || 0)}
                    disabled={!canManageTables}
                  />
                  <Field
                    label="Позиция Y"
                    type="number"
                    value={String(Math.round(selectedTable.y ?? 0))}
                    onChange={(value) => updateSelectedLayout('y', Number(value) || 0)}
                    disabled={!canManageTables}
                  />
                  <Field
                    label="Ширина"
                    type="number"
                    value={String(Math.round(selectedTable.width ?? getTablePreset(selectedTable.table_type).width))}
                    onChange={(value) => updateSelectedLayout('width', Number(value) || 0)}
                    disabled={!canManageTables}
                  />
                  <Field
                    label="Высота"
                    type="number"
                    value={String(Math.round(selectedTable.height ?? getTablePreset(selectedTable.table_type).height))}
                    onChange={(value) => updateSelectedLayout('height', Number(value) || 0)}
                    disabled={!canManageTables}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSelectedLayout('rotation', (selectedTable.rotation ?? 0) - 15)}
                    disabled={!canManageTables}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <RotateCw size={14} className="rotate-180" />
                    -15°
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedLayout('rotation', (selectedTable.rotation ?? 0) + 15)}
                    disabled={!canManageTables}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <RotateCw size={14} />
                    +15°
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateTableDraft(selectedTable.id, {
                        ...getDefaultTableLayout(selectedTable.table_type, selectedTable.id % 5),
                      })
                    }
                    disabled={!canManageTables}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <Move size={14} />
                    Сбросить позицию
                  </button>
                </div>
              </div>

              {deleteArmed ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Нажмите удалить ещё раз, чтобы подтвердить удаление стола.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit || !canManageTables}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                >
                  <Pencil size={16} />
                  {savingEdit ? 'Сохранение...' : 'Сохранить'}
                </button>
                {canDeleteTables ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteTable()}
                    disabled={savingEdit}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
                      deleteArmed
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Trash2 size={16} />
                    Удалить
                  </button>
                ) : null}
              </div>

              {!canManageTables ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Доступ только для просмотра. Для изменений нужна роль manager или owner.
                </div>
              ) : null}
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Выберите стол на схеме, чтобы редактировать его здесь.
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'emerald' | 'blue' | 'slate';
}) {
  const className =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : tone === 'blue'
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-700';

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  error,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition ${
          error
            ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-50'
            : 'border-slate-200 focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50'
        }`}
      />
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputValue = normalizeColorInput(value);
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <input
          type="color"
          value={inputValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none disabled:cursor-not-allowed"
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="mt-1 text-sm text-slate-500">{description}</div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        aria-label={`table-active-${checked ? 'on' : 'off'}`}
        className={`relative mt-1 h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? 'bg-[#1d4ed8]' : 'bg-slate-300'
        }`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
