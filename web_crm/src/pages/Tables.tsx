import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import {
  extractResults,
  getApiErrorMessage,
  getTableCapacity,
  getTableLabel,
  getTableStatusMeta,
  type TableRecord,
} from '@/features/reservations/shared';

type ManagedTable = TableRecord & {
  table_type?: 'rectangle' | 'square' | 'circle' | string;
};

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
  const [tables, setTables] = useState<ManagedTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [createForm, setCreateForm] = useState<TableFormState>(INITIAL_FORM);
  const [editForm, setEditForm] = useState<TableFormState>(INITIAL_FORM);
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  const loadTables = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/tables/status/').catch(() => api.get('/tables/'));
      const nextTables = extractResults<ManagedTable>(response.data);
      setTables(nextTables);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить столы.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

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

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Floor setup</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Tables</h1>
            <p className="text-sm text-slate-600">Столы, вместимость и текущая доступность для бронирований.</p>
          </div>

          <button
            type="button"
            onClick={() => void loadTables()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Активные" value={counts.active} />
        <SummaryCard label="Свободные" value={counts.available} />
        <SummaryCard label="Reserved" value={counts.reserved} />
        <SummaryCard label="Occupied" value={counts.occupied} />
        <SummaryCard label="Inactive" value={counts.inactive} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {tables.length === 0 ? 'Создайте первый стол' : 'Новый стол'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Минимальная настройка для посадки гостей и управления залом.</p>
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
              />
            </div>

            <ToggleField
              label="Активен для смены"
              description="Если выключить, стол останется в системе, но не будет доступен для текущей работы."
              checked={createForm.is_active}
              onChange={() => setCreateForm((current) => ({ ...current, is_active: !current.is_active }))}
            />

            <button
              type="submit"
              disabled={savingCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {savingCreate ? 'Создание...' : tables.length === 0 ? 'Create first table' : 'Add table'}
            </button>
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
                            {getTableCapacity(table)} seats
                            {table.is_active === false ? ' · inactive' : ''}
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
                          {table.is_active === false ? 'Inactive' : statusMeta.label}
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
                      />
                    </div>

                    <ToggleField
                      label="Активен для смены"
                      description="Отключите стол, если его нельзя использовать прямо сейчас."
                      checked={editForm.is_active}
                      onChange={() => setEditForm((current) => ({ ...current, is_active: !current.is_active }))}
                    />

                    {deleteArmed ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Нажмите "Delete table" ещё раз, чтобы подтвердить удаление.
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                      >
                        {savingEdit ? 'Сохранение...' : 'Save changes'}
                      </button>
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
                        Delete table
                      </button>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
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
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
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
        aria-label={`table-active-${checked ? 'on' : 'off'}`}
        className={`relative mt-1 h-6 w-11 rounded-full transition ${checked ? 'bg-[#1d4ed8]' : 'bg-slate-300'}`}
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
