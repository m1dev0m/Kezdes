import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Download, FileText, Save, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { getApiErrorMessage } from '@/features/reservations/shared';

interface CustomerDetail {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  total_bookings: number;
  last_visit: string;
  notes: string;
  is_vip: boolean;
  is_blacklisted?: boolean;
  risk_label?: string;
  flag?: string;
  no_show_count?: number;
  created_at: string;
  tags?: string;
  date_of_birth?: string | null;
  visit_history?: Array<{
    id: number;
    date: string;
    spent_amount: number;
    created_at: string;
    feedback?: string | null;
    staff_notes?: string | null;
  }>;
  internal_notes?: Array<{
    id: number;
    content: string;
    is_important: boolean;
    created_at: string;
    author_name?: string;
  }>;
}

interface BookingRecord {
  id: number;
  date: string;
  time: string;
  guests: number;
  status: string;
  status_display: string;
  table_numbers?: string[];
}

function formatDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'approved':
    case 'confirmed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'seated':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'completed':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [flag, setFlag] = useState('new');
  const [savingNotes, setSavingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteImportant, setNewNoteImportant] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setPageError(null);
    try {
      const [customerResponse, bookingsResponse] = await Promise.all([
        api.get(`/crm/customers/${id}/`),
        api.get(`/crm/customers/${id}/bookings/`).catch(() => ({ data: [] })),
      ]);

      setCustomer(customerResponse.data);
      setNotes(customerResponse.data.notes || '');
      setTags(customerResponse.data.tags || '');
      setFlag(customerResponse.data.flag || 'new');
      setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : bookingsResponse.data.results || []);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не удалось загрузить карточку гостя.');
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const isVip = useMemo(
    () => Boolean(customer && ((customer.total_bookings || 0) >= 5 || customer.is_vip)),
    [customer],
  );

  const addNote = async () => {
    if (!id) return;
    if (!newNote.trim()) {
      setNoteError('Введите заметку для команды.');
      return;
    }

    setAddingNote(true);
    setNoteError(null);
    try {
      const response = await api.post(`/crm/customers/${id}/add_note/`, {
        content: newNote.trim(),
        is_important: newNoteImportant,
      });

      setCustomer((current) => {
        if (!current) return current;
        return {
          ...current,
          internal_notes: [response.data, ...(current.internal_notes || [])],
        };
      });

      setNewNote('');
      setNewNoteImportant(false);
      toast.success('Заметка добавлена.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось добавить заметку.'));
    } finally {
      setAddingNote(false);
    }
  };

  const saveNotes = async () => {
    if (!id) return;

    setSavingNotes(true);
    try {
      const response = await api.patch(`/crm/customers/${id}/`, {
        notes: notes.trim(),
        tags: tags.trim(),
        flag,
      });
      setCustomer(response.data);
      setNotes(response.data.notes || '');
      setTags(response.data.tags || '');
      setFlag(response.data.flag || 'new');
      toast.success('Профиль гостя обновлён.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить изменения.'));
    } finally {
      setSavingNotes(false);
    }
  };

  const handleExport = () => {
    if (!customer) return;

    const file = new Blob([JSON.stringify(customer, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guest_${customer.id}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Карточка гостя экспортирована.');
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">
        Загрузка карточки гостя...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <div className="text-lg font-semibold">Карточка гостя недоступна</div>
        <div className="text-sm">{pageError || 'Запись не найдена.'}</div>
        <button
          type="button"
          onClick={() => navigate('/app/customers')}
          className="inline-flex items-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"
        >
          Вернуться к списку гостей
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/customers')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{customer.full_name || 'Guest'}</h1>
              {isVip ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <Star size={12} />
                  VIP
                </span>
              ) : null}
              {customer.is_blacklisted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Blacklist
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Визитов: {customer.total_bookings || 0} · Последний визит: {formatDate(customer.last_visit)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              No-show: {customer.no_show_count || 0} · Риск: {customer.risk_label || 'regular'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Export
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/bookings/new')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
          >
            <CalendarClock size={16} />
            New booking
          </button>
        </div>
      </header>

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xl font-semibold text-blue-700">
                {(customer.full_name || 'G').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{customer.full_name || 'Guest'}</div>
                <div className="mt-1 text-sm text-slate-500">Гость с {formatDate(customer.created_at, '—')}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoTile label="Телефон" value={customer.phone || '—'} />
              <InfoTile label="Email" value={customer.email || '—'} />
              <InfoTile label="Всего визитов" value={String(customer.total_bookings || 0)} />
              <InfoTile label="Последний визит" value={formatDate(customer.last_visit)} />
              <InfoTile label="No-show" value={String(customer.no_show_count || 0)} />
              <InfoTile label="Риск" value={customer.risk_label || 'regular'} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Профиль гостя</div>
            <p className="mt-1 text-sm text-slate-500">Теги и заметки команды доступны в CRM без дополнительных экранов.</p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Статус гостя</span>
                <select
                  value={flag}
                  onChange={(event) => setFlag(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
                >
                  <option value="new">Новый</option>
                  <option value="regular">Постоянный</option>
                  <option value="vip">VIP</option>
                  <option value="problem">Blacklist / problem</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Теги</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  aria-label="customer-tags"
                  placeholder="VIP, allergy, birthday"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Заметки</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  aria-label="customer-notes"
                  rows={5}
                  placeholder="Предпочтения, ограничения, важные детали обслуживания"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50 resize-none"
                />
              </label>

              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
              >
                <Save size={16} />
                {savingNotes ? 'Сохранение...' : 'Save changes'}
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">История визитов</div>
                <p className="mt-1 text-sm text-slate-500">Бронирования и статусы по этому гостю.</p>
              </div>
              <div className="text-sm font-medium text-slate-500">{bookings.length} записей</div>
            </div>

            <div className="mt-5 space-y-3">
              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  История визитов пока пуста.
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatDate(booking.date)} · {booking.time?.slice(0, 5) || '—'}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {booking.guests} гостей
                          {booking.table_numbers?.length ? ` · Столы: ${booking.table_numbers.join(', ')}` : ' · Без стола'}
                        </div>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyles(booking.status)}`}>
                        {booking.status_display || booking.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Внутренние заметки</div>
            <p className="mt-1 text-sm text-slate-500">Короткие события и наблюдения для команды.</p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Новая заметка</span>
                <textarea
                  value={newNote}
                  onChange={(event) => {
                    setNewNote(event.target.value);
                    if (noteError) setNoteError(null);
                  }}
                  aria-label="customer-new-note"
                  rows={4}
                  placeholder="Например: предпочитает тихий стол у окна"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-blue-50 resize-none"
                />
              </label>

              <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={newNoteImportant}
                  onChange={(event) => setNewNoteImportant(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
                Важная заметка
              </label>

              {noteError ? <div className="text-sm text-rose-600">{noteError}</div> : null}

              <button
                type="button"
                onClick={addNote}
                disabled={addingNote}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <FileText size={16} />
                {addingNote ? 'Сохранение...' : 'Add note'}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {(customer.internal_notes || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Внутренних заметок пока нет.
                </div>
              ) : (
                customer.internal_notes?.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      note.is_important ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">{note.author_name || 'Команда'}</div>
                      <div className="text-xs text-slate-500">{formatDate(note.created_at, '—')}</div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">{note.content}</div>
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
