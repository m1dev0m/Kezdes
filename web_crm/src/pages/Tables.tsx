import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, RefreshCw, AlertCircle, Users, CheckCircle } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

/** Extract first human-readable error from Django REST response */
function extractApiError(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.detail === 'string') return data.detail;
  for (const val of Object.values(data)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') return val[0];
    if (typeof val === 'string') return val;
  }
  return null;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Table {
  id: number;
  name: string;
  capacity: number;
  status: 'free' | 'reserved' | 'occupied' | 'cleaning';
  is_active: boolean;
  table_type: 'rectangle' | 'circle' | 'square';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface TableForm {
  name: string;
  capacity: number;
  table_type: 'rectangle' | 'circle' | 'square';
  is_active: boolean;
}

const EMPTY_FORM: TableForm = {
  name: '',
  capacity: 2,
  table_type: 'rectangle',
  is_active: true,
};

const STATUS_LABELS: Record<Table['status'], string> = {
  free: 'Свободен',
  reserved: 'Забронирован',
  occupied: 'Занят',
  cleaning: 'Уборка',
};

const STATUS_COLORS: Record<Table['status'], string> = {
  free: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-amber-100 text-amber-700',
  occupied: 'bg-red-100 text-red-700',
  cleaning: 'bg-slate-100 text-slate-600',
};

// ── Modal ──────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (form: TableForm) => Promise<void>;
  initial?: TableForm;
  loading: boolean;
}

function TableModal({ title, onClose, onSubmit, initial = EMPTY_FORM, loading }: ModalProps) {
  const [form, setForm] = useState<TableForm>(initial);

  const set = (k: keyof TableForm, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Введите название стола');
    if (form.capacity < 1 || form.capacity > 20) return toast.error('Вместимость: 1–20');
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Название стола *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Например: 1, A1, VIP-1"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Вместимость (мест) *</label>
            <input
              type="number"
              min={1}
              max={20}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.capacity}
              onChange={e => set('capacity', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Форма стола</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.table_type}
              onChange={e => set('table_type', e.target.value as TableForm['table_type'])}
            >
              <option value="rectangle">Прямоугольный</option>
              <option value="circle">Круглый</option>
              <option value="square">Квадратный</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">Активен (принимает бронирования)</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Tables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Table | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Table | null>(null);

  const load = useCallback(async () => {
    try {
      // Use /tables/status/ for real-time occupied/reserved counts
      const res = await api.get('/tables/status/');
      setTables(res.data);
      setError(null);
    } catch {
      // Fallback to plain list if status endpoint fails (e.g. no date/time context)
      try {
        const res = await api.get('/tables/');
        setTables(res.data);
        setError(null);
      } catch {
        setError('Не удалось загрузить столы');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // CREATE
  const handleCreate = async (form: TableForm) => {
    setSaving(true);
    try {
      await api.post('/tables/', form);
      toast.success('Стол добавлен');
      setShowCreate(false);
      load();
    } catch (e: unknown) {
      const data = (e as any)?.response?.data;
      const msg = extractApiError(data) || 'Ошибка при создании';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // UPDATE
  const handleUpdate = async (form: TableForm) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.patch(`/tables/${editTarget.id}/`, form);
      toast.success('Стол обновлён');
      setEditTarget(null);
      load();
    } catch (e: unknown) {
      const data = (e as any)?.response?.data;
      const msg = extractApiError(data) || 'Ошибка при обновлении';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // DELETE
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/tables/${deleteTarget.id}/`);
      toast.success('Стол удалён');
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      const data = (e as any)?.response?.data;
      const msg = extractApiError(data) || 'Ошибка при удалении';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const active = tables.filter(t => t.is_active).length;
  const occupied = tables.filter(t => t.status === 'occupied').length;
  const reserved = tables.filter(t => t.status === 'reserved').length;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Столы</h1>
          <p className="text-sm text-slate-500 mt-0.5">Управление столами ресторана</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Добавить стол
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Всего столов', value: tables.length, icon: <Users size={18} /> },
          { label: 'Активных', value: active, icon: <CheckCircle size={18} className="text-emerald-500" /> },
          { label: 'Занято', value: occupied, icon: <Users size={18} className="text-red-500" /> },
          { label: 'Забронировано', value: reserved, icon: <RefreshCw size={18} className="text-amber-500" /> },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
            <div className="text-slate-400">{s.icon}</div>
            <div>
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Table list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={32} className="animate-spin text-primary opacity-30" />
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-xl">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Столов пока нет</p>
          <p className="text-slate-400 text-sm mt-1">Нажмите «Добавить стол» чтобы начать</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Номер</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Вместимость</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Форма</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Активен</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tables.map((table, i) => (
                <motion.tr
                  key={table.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">{table.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      {table.capacity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{table.table_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[table.status]}`}>
                      {STATUS_LABELS[table.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${table.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {table.is_active ? 'Да' : 'Нет'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-30 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditTarget(table)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(table)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <TableModal
          title="Добавить стол"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={saving}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <TableModal
          title={`Редактировать стол ${editTarget.name}`}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          initial={{
            name: editTarget.name,
            capacity: editTarget.capacity,
            table_type: editTarget.table_type,
            is_active: editTarget.is_active,
          }}
          loading={saving}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 animate-in zoom-in-95 duration-200">
            <h2 className="font-semibold text-slate-900 mb-2">Удалить стол {deleteTarget.name}?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Стол будет удалён. Существующие бронирования не затронуты.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
