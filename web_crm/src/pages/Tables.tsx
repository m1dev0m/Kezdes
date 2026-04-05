import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import {
  extractResults,
  getApiErrorMessage,
  getTableCapacity,
  getTableLabel,
  getTableStatusMeta,
  type TableRecord,
} from '@/features/reservations/shared';

type ViewMode = 'list' | 'floorplan';

type ManagedTable = TableRecord & {
  table_type?: 'rectangle' | 'square' | 'circle' | string;
};

// ── Floor plan constants ──────────────────────────────────────────────────────
const FP_WIDTH = 800;
const FP_HEIGHT = 600;
const FP_GRID = 20;
const FP_PAD = 12;

const TABLE_PRESETS: Record<string, { width: number; height: number }> = {
  rectangle: { width: 120, height: 70 },
  square: { width: 80, height: 80 },
  circle: { width: 80, height: 80 },
};

function fpPreset(tableType?: string) {
  return TABLE_PRESETS[tableType ?? 'square'] ?? TABLE_PRESETS.square;
}

function fpSnap(value: number) {
  return Math.round(value / FP_GRID) * FP_GRID;
}

function fpClamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fpDefaultPos(index: number, tableType?: string) {
  const preset = fpPreset(tableType);
  const cols = 5;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: FP_PAD + col * 152,
    y: FP_PAD + row * 108,
    width: preset.width,
    height: preset.height,
  };
}

function fpBorderClass(status?: string, isActive?: boolean) {
  if (isActive === false) return 'border-slate-300 bg-slate-100';
  if (status === 'reserved') return 'border-amber-400 bg-amber-50';
  if (status === 'occupied') return 'border-blue-400 bg-blue-50';
  return 'border-emerald-400 bg-emerald-50';
}

function fpShapeClass(tableType?: string) {
  if (tableType === 'circle') return 'rounded-full';
  if (tableType === 'rectangle') return 'rounded-lg';
  return 'rounded-md';
}

type TableFormState = {
  name: string;
  capacity: number;
  table_type: 'rectangle' | 'square' | 'circle';
  is_active: boolean;
};

type FormErrors = {
  name?: string;
  capacity?: string;
};

type BulkDeleteBlockedTable = {
  id: number;
  name: string;
  reason: string;
};

type BulkDeleteReport = {
  deletedCount: number;
  blockedTables: BulkDeleteBlockedTable[];
  usedClearEndpoint: boolean;
};

const INITIAL_FORM: TableFormState = {
  name: '',
  capacity: 4,
  table_type: 'square',
  is_active: true,
};

function validateForm(form: TableFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Укажите название стола.';
  if (!Number.isFinite(form.capacity) || form.capacity < 1) errors.capacity = 'Вместимость должна быть не меньше 1.';
  return errors;
}

export default function Tables() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const canManage = role === 'owner' || role === 'manager' || role === 'global_admin';
  const canDelete = role === 'owner' || role === 'global_admin';

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tables, setTables] = useState<ManagedTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [bulkDeleteArmed, setBulkDeleteArmed] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteReport, setBulkDeleteReport] = useState<BulkDeleteReport | null>(null);
  const [createForm, setCreateForm] = useState<TableFormState>(INITIAL_FORM);
  const [editForm, setEditForm] = useState<TableFormState>(INITIAL_FORM);
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  // Floor plan drag state
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ tableId: number; offsetX: number; offsetY: number; width: number; height: number } | null>(null);

  const loadTables = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/tables/status/').catch(() => api.get('/tables/'));
      const nextTables = extractResults<ManagedTable>(response.data);
      setTables(nextTables);
      return nextTables;
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить столы.'));
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  // Floor plan pointer events
  useEffect(() => {
    if (viewMode !== 'floorplan') {
      dragRef.current = null;
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nextX = fpSnap(fpClamp(event.clientX - rect.left - drag.offsetX, FP_PAD, FP_WIDTH - drag.width - FP_PAD));
      const nextY = fpSnap(fpClamp(event.clientY - rect.top - drag.offsetY, FP_PAD, FP_HEIGHT - drag.height - FP_PAD));
      setTables((current) =>
        current.map((t) => {
          if (t.id !== drag.tableId) return t;
          if (t.x === nextX && t.y === nextY) return t;
          return { ...t, x: nextX, y: nextY };
        }),
      );
    };

    const handlePointerUp = async () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      const table = tables.find((t) => t.id === drag.tableId);
      if (!table) return;
      try {
        await api.patch(`/tables/${drag.tableId}/`, { x: table.x ?? FP_PAD, y: table.y ?? FP_PAD });
      } catch {
        // silently ignore position save errors
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [viewMode, tables]);

  useEffect(() => {
    setSelectedTableId((current) => {
      if (tables.length === 0) return null;
      if (current && tables.some((table) => table.id === current)) return current;
      return tables[0].id;
    });
  }, [tables]);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? null,
    [selectedTableId, tables],
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

  const counts = useMemo(() => {
    const activeTables = tables.filter((table) => table.is_active !== false);
    return {
      active: activeTables.length,
      available: activeTables.filter((table) => table.status === 'free').length,
      reserved: activeTables.filter((table) => table.status === 'reserved').length,
      occupied: activeTables.filter((table) => table.status === 'occupied').length,
      inactive: tables.filter((table) => table.is_active === false).length,
    };
  }, [tables]);

  const floorPlanTables = useMemo(
    () =>
      tables.map((table, index) => {
        const fallback = fpDefaultPos(index, table.table_type);
        return {
          ...table,
          x: typeof table.x === 'number' ? table.x : fallback.x,
          y: typeof table.y === 'number' ? table.y : fallback.y,
          width: table.width ?? fallback.width,
          height: table.height ?? fallback.height,
        };
      }),
    [tables],
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;

    const errors = validateForm(createForm);
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingCreate(true);
    try {
      const payload = {
        ...createForm,
        name: createForm.name.trim(),
      };
      const response = await api.post('/tables/', payload);
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
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTableId) return;
    if (!canManage) return;

    const errors = validateForm(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const previousTable = tables.find((table) => table.id === selectedTableId);
    const optimisticTable: ManagedTable | null = previousTable
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
  };

  const handleDelete = async () => {
    if (!selectedTableId || !selectedTable) return;
    if (!canDelete) return;

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
  };

  const handleDeleteAll = async () => {
    if (!canDelete) return;
    if (tables.length === 0) return;

    if (!bulkDeleteArmed) {
      setBulkDeleteArmed(true);
      toast('Нажмите ещё раз, чтобы удалить все столы.', {
        icon: '⚠️',
      });
      return;
    }

    const snapshot = [...tables];
    setBulkDeleting(true);
    setBulkDeleteReport(null);

    try {
      try {
        const response = await api.post('/tables/clear-all/');
        const payload = (response.data ?? {}) as {
          blocked_tables?: Array<{ id?: number; name?: string; reason?: string }>;
          blocked_count?: number;
          deleted_count?: number;
          deleted_ids?: number[];
        };

        const refreshedTables = await loadTables();
        const deletedCount =
          typeof payload.deleted_count === 'number'
            ? payload.deleted_count
            : Math.max(0, snapshot.length - refreshedTables.length);
        const blockedTables = Array.isArray(payload.blocked_tables)
          ? payload.blocked_tables.map((table, index) => ({
              id: typeof table.id === 'number' ? table.id : -index - 1,
              name: table.name?.trim() || 'Стол',
              reason: table.reason?.trim() || 'Есть активные бронирования.',
            }))
          : [];

        setBulkDeleteReport({
          deletedCount,
          blockedTables,
          usedClearEndpoint: true,
        });

        if (blockedTables.length > 0) {
          toast.error(`Удалено ${deletedCount} столов, ${blockedTables.length} заблокированы активными бронями.`);
        } else {
          toast.success(`Удалено ${deletedCount} столов.`);
        }
        return;
      } catch {
        // Fallback to per-table deletion if the clear endpoint is not available yet.
      }

      const deletedIds = new Set<number>();
      const blockedTables: BulkDeleteBlockedTable[] = [];

      for (const table of snapshot) {
        try {
          await api.delete(`/tables/${table.id}/`);
          deletedIds.add(table.id);
        } catch (error) {
          blockedTables.push({
            id: table.id,
            name: getTableLabel(table),
            reason: getApiErrorMessage(error, 'Есть активные бронирования, удаление недоступно.'),
          });
        }
      }

      if (deletedIds.size > 0) {
        setTables((current) => current.filter((table) => !deletedIds.has(table.id)));
      }
      if (selectedTableId && deletedIds.has(selectedTableId)) {
        setSelectedTableId(null);
      }

      setBulkDeleteReport({
        deletedCount: deletedIds.size,
        blockedTables,
        usedClearEndpoint: false,
      });

      if (blockedTables.length > 0) {
        toast.error(`Удалено ${deletedIds.size} столов, ${blockedTables.length} заблокированы активными бронями.`);
      } else {
        toast.success(`Удалено ${deletedIds.size} столов.`);
      }
    } finally {
      setBulkDeleting(false);
      setBulkDeleteArmed(false);
    }
  };

  if (loading && tables.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">
        Загрузка столов...
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Схема зала</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Tables</h1>
              <p className="text-sm text-slate-600">Столы, вместимость и текущая доступность для бронирований.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="material-symbols-outlined text-[16px] align-middle mr-1">list</span>
                  Список
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('floorplan')}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${viewMode === 'floorplan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="material-symbols-outlined text-[16px] align-middle mr-1">grid_view</span>
                  Floor Plan
                </button>
              </div>
              <button
                type="button"
                onClick={() => void loadTables()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                Обновить
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteAll()}
                  disabled={bulkDeleting || tables.length === 0}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    bulkDeleteArmed
                      ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${bulkDeleting ? 'animate-spin' : ''}`}>delete_forever</span>
                  {bulkDeleting ? 'Удаляем...' : bulkDeleteArmed ? 'Подтвердить удаление всех' : 'Удалить все столы'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Активные" value={counts.active} />
        <SummaryCard label="Свободные" value={counts.available} />
        <SummaryCard label="Бронь" value={counts.reserved} />
        <SummaryCard label="Занятые" value={counts.occupied} />
        <SummaryCard label="Неактивные" value={counts.inactive} />
      </section>

      {bulkDeleteReport ? (
        <section
          className={`rounded-3xl border px-5 py-4 shadow-sm ${
            bulkDeleteReport.blockedTables.length > 0
              ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {bulkDeleteReport.usedClearEndpoint ? 'Очистка столов выполнена через серверный clear endpoint.' : 'Удаление столов выполнено поштучно.'}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Удалено {bulkDeleteReport.deletedCount} столов.
                {bulkDeleteReport.blockedTables.length > 0 ? ` ${bulkDeleteReport.blockedTables.length} столов оставлены из-за активных броней.` : ' Все доступные столы удалены.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBulkDeleteReport(null)}
              className="rounded-xl border border-white/70 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Скрыть
            </button>
          </div>

          {bulkDeleteReport.blockedTables.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {bulkDeleteReport.blockedTables.map((table) => (
                <div key={table.id} className="rounded-2xl border border-amber-200 bg-white px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{table.name}</div>
                  <div className="mt-1 text-sm text-slate-600">{table.reason}</div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {viewMode === 'floorplan' ? (
          <section className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Floor Plan</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {canManage ? 'Перетащите столы, чтобы изменить их расположение.' : 'Схема расположения столов.'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border-2 border-emerald-400 bg-emerald-50" />Свободен</span>
                <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border-2 border-amber-400 bg-amber-50" />Бронь</span>
                <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border-2 border-blue-400 bg-blue-50" />Занят</span>
              </div>
            </div>
            <div
              ref={canvasRef}
              className="relative overflow-hidden rounded-2xl border border-slate-200"
              style={{
                width: FP_WIDTH,
                maxWidth: '100%',
                height: FP_HEIGHT,
                backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                backgroundSize: `${FP_GRID}px ${FP_GRID}px`,
                backgroundColor: '#f8fafc',
              }}
            >
              {floorPlanTables.map((table) => {
                const borderBg = fpBorderClass(table.status, table.is_active);
                const shape = fpShapeClass(table.table_type);
                const label = getTableLabel(table);
                const capacity = getTableCapacity(table);
                return (
                  <button
                    key={table.id}
                    type="button"
                    onPointerDown={(event) => {
                      if (!canManage) return;
                      event.preventDefault();
                      event.stopPropagation();
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      dragRef.current = {
                        tableId: table.id,
                        offsetX: event.clientX - rect.left - (table.x ?? FP_PAD),
                        offsetY: event.clientY - rect.top - (table.y ?? FP_PAD),
                        width: table.width ?? fpPreset(table.table_type).width,
                        height: table.height ?? fpPreset(table.table_type).height,
                      };
                    }}
                    style={{
                      position: 'absolute',
                      left: table.x,
                      top: table.y,
                      width: table.width,
                      height: table.height,
                      transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined,
                      cursor: canManage ? 'grab' : 'default',
                      touchAction: 'none',
                    }}
                    className={`flex flex-col items-center justify-center border-2 select-none transition-shadow hover:shadow-md ${borderBg} ${shape}`}
                  >
                    <span className="text-xs font-semibold text-slate-800 leading-tight truncate px-1 max-w-full">{label === '—' ? `#${table.id}` : label}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{capacity} мест</span>
                  </button>
                );
              })}
              {tables.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                  Столы ещё не добавлены
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {tables.length === 0 ? 'Создайте первый стол' : 'Новый стол'}
            </h2>            <p className="mt-1 text-sm text-slate-500">Минимальная настройка для посадки гостей и управления залом.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4" noValidate>
            <Field
              label="Название"
              value={createForm.name}
              onChange={(value) => {
                setCreateForm((current) => ({ ...current, name: value }));
                if (createErrors.name) setCreateErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="Table 1"
              error={createErrors.name}
              disabled={!canManage}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Вместимость"
                type="number"
                value={String(createForm.capacity)}
                onChange={(value) => {
                  setCreateForm((current) => ({
                    ...current,
                    capacity: Math.max(1, Number(value) || 1),
                  }));
                  if (createErrors.capacity) setCreateErrors((current) => ({ ...current, capacity: undefined }));
                }}
                error={createErrors.capacity}
                disabled={!canManage}
              />
              <SelectField
                label="Форма"
                value={createForm.table_type}
                onChange={(value) =>
                  setCreateForm((current) => ({
                    ...current,
                    table_type: value as TableFormState['table_type'],
                  }))
                }
                options={[
                  { value: 'square', label: 'Square' },
                  { value: 'rectangle', label: 'Rectangle' },
                  { value: 'circle', label: 'Round' },
                ]}
                disabled={!canManage}
              />
            </div>

            <ToggleField
              label="Активен для смены"
              description="Если выключить, стол останется в системе, но не будет доступен для текущей работы."
              checked={createForm.is_active}
              onChange={() => setCreateForm((current) => ({ ...current, is_active: !current.is_active }))}
              disabled={!canManage}
            />

            <button
              type="submit"
              disabled={savingCreate || !canManage}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {savingCreate ? 'Создание...' : tables.length === 0 ? 'Создать первый стол' : 'Добавить стол'}
            </button>

            {!canManage ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Доступ только для просмотра. Для изменений нужна роль manager или owner.
              </div>
            ) : null}
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Текущий зал</h2>
            <p className="mt-1 text-sm text-slate-500">Выберите стол, чтобы изменить вместимость или доступность.</p>
          </div>

          {tables.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined text-[28px]">table_restaurant</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Столы ещё не настроены</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Добавьте первый стол слева, чтобы бронирования можно было быстро посадить.
              </p>
            </div>
          ) : (
            <div className="grid xl:grid-cols-[0.78fr_1.22fr]">
              <div className="border-b border-slate-200 xl:border-b-0 xl:border-r">
                <div className="max-h-[680px] overflow-y-auto">
                  {tables.map((table) => {
                    const statusMeta = getTableStatusMeta(table.status);
                    const selected = table.id === selectedTableId;
                    return (
                      <button
                        type="button"
                        key={table.id}
                        onClick={() => setSelectedTableId(table.id)}
                        className={`flex w-full items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 text-left transition last:border-b-0 ${
                          selected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{getTableLabel(table)}</div>
                          <div className="mt-1 text-sm text-slate-500">
                            {getTableCapacity(table)} мест
                            {table.is_active === false ? ' · неактивен' : ''}
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
                          {table.is_active === false ? 'Неактивен' : statusMeta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6">
                {selectedTable ? (
                  <form onSubmit={handleUpdate} className="space-y-4" noValidate>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900">Изменить стол</h3>
                      <p className="mt-1 text-sm text-slate-500">Параметры применяются сразу после сохранения.</p>
                    </div>

                      <Field
                        label="Название"
                        value={editForm.name}
                        onChange={(value) => {
                          setEditForm((current) => ({ ...current, name: value }));
                          if (editErrors.name) setEditErrors((current) => ({ ...current, name: undefined }));
                        }}
                        placeholder="Table 1"
                        error={editErrors.name}
                        disabled={!canManage}
                      />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Вместимость"
                        type="number"
                        value={String(editForm.capacity)}
                        onChange={(value) => {
                          setEditForm((current) => ({
                            ...current,
                            capacity: Math.max(1, Number(value) || 1),
                          }));
                          if (editErrors.capacity) setEditErrors((current) => ({ ...current, capacity: undefined }));
                        }}
                        error={editErrors.capacity}
                        disabled={!canManage}
                      />
                      <SelectField
                        label="Форма"
                        value={editForm.table_type}
                        onChange={(value) =>
                          setEditForm((current) => ({
                            ...current,
                            table_type: value as TableFormState['table_type'],
                          }))
                        }
                        options={[
                          { value: 'square', label: 'Square' },
                          { value: 'rectangle', label: 'Rectangle' },
                          { value: 'circle', label: 'Round' },
                        ]}
                        disabled={!canManage}
                      />
                    </div>

                    <ToggleField
                      label="Активен для смены"
                      description="Отключите стол, если его нельзя использовать прямо сейчас."
                      checked={editForm.is_active}
                      onChange={() => setEditForm((current) => ({ ...current, is_active: !current.is_active }))}
                      disabled={!canManage}
                    />

                    {deleteArmed ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Нажмите ещё раз, чтобы подтвердить удаление стола.
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={savingEdit || !canManage}
                        className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                      >
                      {savingEdit ? 'Сохранение...' : 'Сохранить изменения'}
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete()}
                          disabled={savingEdit}
                          className={`inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
                            deleteArmed
                              ? 'border-rose-300 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Удалить стол
                        </button>
                      ) : null}
                    </div>
                  </form>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Выберите стол, чтобы изменить его настройки.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
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
          error ? 'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-50' : 'border-slate-200 focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50'
        }`}
      />
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
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
        className={`relative mt-1 h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-[#1d4ed8]' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}
