import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, Phone, Calendar, Star, Clock,
    Users, StickyNote, Save
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n';

interface CustomerDetail {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    total_bookings: number;
    last_visit: string;
    notes: string;
    is_vip: boolean;
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
        booking?: number | null;
    }>;
    internal_notes?: Array<{
        id: number;
        content: string;
        is_important: boolean;
        created_at: string;
        updated_at: string;
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
    restaurant_name: string;
    duration_minutes?: number | null;
    budget?: number | null;
    is_checked_in?: boolean;
    check_in_time?: string | null;
    table_numbers?: string[];
    guest_name?: string | null;
    guest_phone?: string | null;
}

export default function CustomerDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [newNoteImportant, setNewNoteImportant] = useState(false);
    const [addingNote, setAddingNote] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cRes, bRes] = await Promise.all([
                api.get(`/crm/customers/${id}/`),
                api.get(`/crm/customers/${id}/bookings/`).catch(() => ({ data: [] }))
            ]);
            setCustomer(cRes.data);
            setNotes(cRes.data.notes || '');
            setTags(cRes.data.tags || '');
            setBookings(Array.isArray(bRes.data) ? bRes.data : bRes.data.results || []);
        } catch {
            toast.error(t('customerDetail.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const addNote = async () => {
        if (!id) return;
        if (!newNote.trim()) return;
        setAddingNote(true);
        try {
            const res = await api.post(`/crm/customers/${id}/add_note/`, {
                content: newNote.trim(),
                is_important: newNoteImportant,
            });

            const created = res.data;
            setCustomer((prev) => {
                if (!prev) return prev;
                const prevNotes = Array.isArray(prev.internal_notes) ? prev.internal_notes : [];
                return {
                    ...prev,
                    internal_notes: [created, ...prevNotes],
                    notes: created?.content ? String(created.content) : prev.notes,
                };
            });

            setNewNote('');
            setNewNoteImportant(false);
            toast.success(t('customerDetail.noteAdded'));
        } catch {
            toast.error(t('customerDetail.failedToAddNote'));
        } finally {
            setAddingNote(false);
        }
    };

    const saveNotes = async () => {
        setSavingNotes(true);
        try {
            const normalizedTags = tags
                .split(',')
                .map(t => t.trim())
                .filter(Boolean)
                .join(', ');

            const res = await api.patch(`/crm/customers/${id}/`, { notes, tags: normalizedTags });
            setCustomer(res.data);
            setNotes(res.data.notes || '');
            setTags(res.data.tags || '');
            toast.success(t('customerDetail.notesSaved'));
        } catch {
            toast.error(t('customerDetail.failedToSaveNotes'));
        } finally {
            setSavingNotes(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
            case 'pending': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
            case 'completed': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            default: return 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400';
        }
    };

    if (loading) {
        return (
            <div className="space-y-8 pb-12">
                <Skeleton className="h-8 w-32" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-96 rounded-[2rem]" />
                    <Skeleton className="lg:col-span-2 h-96 rounded-[2rem]" />
                </div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="py-20 text-center">
                <p className="text-slate-500 font-bold">{t('customerDetail.notFound')}</p>
                <Button variant="secondary" className="mt-4" onClick={() => navigate('/app/customers')}>{t('customerDetail.backToCustomers')}</Button>
            </div>
        );
    }

    const isVip = (customer.total_bookings || 0) >= 5 || customer.is_vip;
    const formatDisplayMonth = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('ru-RU', { month: 'short' });
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/app/customers')}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{customer.full_name}</h1>
                        {isVip && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-100 dark:border-amber-500/20">
                                <Star size={12} /> {t('customerDetail.vip')}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">{t('customerDetail.customerPrefix')}{customer.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 space-y-8">
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black mb-4 ${isVip ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                            {customer.full_name?.charAt(0)?.toUpperCase() || 'G'}
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{customer.full_name}</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {isVip ? t('customerDetail.vipGuest') : t('customerDetail.regularGuest')}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Mail size={14} /></div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">{customer.email || '—'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Phone size={14} /></div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">{customer.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Calendar size={14} /></div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">
                                {t('customerDetail.joined')} {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '—'}
                            </span>
                        </div>
                        {customer.date_of_birth && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Calendar size={14} /></div>
                                <span className="font-medium text-slate-600 dark:text-slate-400">
                                    {t('customerDetail.birthday')}{' '}
                                    {new Date(customer.date_of_birth + 'T00:00:00').toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {(customer.tags || tags) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {(customer.tags || tags).split(',').map(tag => (
                                    <span
                                        key={tag}
                                        className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
                                    >
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{customer.total_bookings || 0}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('customerDetail.totalVisits')}</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                                {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : '—'}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('customerDetail.lastVisit')}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <StickyNote size={12} /> {t('customerDetail.managerNotes')}
                            </label>
                        </div>
                        <input
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            placeholder={t('customerDetail.tagsPlaceholder')}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-slate-200 dark:focus:border-slate-700 rounded-xl text-sm font-medium outline-none transition-all"
                        />
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={4}
                            placeholder={t('customerDetail.addNotesPlaceholder')}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-slate-200 dark:focus:border-slate-700 rounded-xl text-sm font-medium outline-none resize-none transition-all"
                        />
                        <Button variant="secondary" size="sm" onClick={saveNotes} isLoading={savingNotes} className="w-full flex items-center justify-center gap-2">
                            <Save size={14} /> {t('customerDetail.saveNotes')}
                        </Button>
                    </div>

                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <StickyNote size={12} /> {t('customerDetail.addNote')}
                        </label>
                        <textarea
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            rows={3}
                            placeholder={t('customerDetail.newNotePlaceholder')}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-slate-200 dark:focus:border-slate-700 rounded-xl text-sm font-medium outline-none resize-none transition-all"
                        />
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <input
                                type="checkbox"
                                checked={newNoteImportant}
                                onChange={(e) => setNewNoteImportant(e.target.checked)}
                                className="rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            {t('customerDetail.markImportant')}
                        </label>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={addNote}
                            isLoading={addingNote}
                            disabled={!newNote.trim()}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <Save size={14} /> {t('customerDetail.addNoteCta')}
                        </Button>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('customerDetail.bookingHistory')}</h2>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bookings.length} {t('customerDetail.records')}</span>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] p-16 text-center">
                            <Calendar size={32} className="mx-auto mb-4 text-slate-200" />
                            <p className="font-black text-slate-900 dark:text-white">{t('customerDetail.noBookingHistory')}</p>
                            <p className="text-sm text-slate-400 mt-1">{t('customerDetail.noBookingHistoryDesc')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map((b) => (
                                <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center min-w-[3rem]">
                                            <p className="text-lg font-black text-slate-900 dark:text-white">
                                                {new Date(b.date + 'T00:00:00').getDate()}
                                            </p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">
                                                {formatDisplayMonth(b.date)}
                                            </p>
                                        </div>
                                        <div className="h-8 w-px bg-slate-100 dark:bg-slate-800"></div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3 text-sm font-bold text-slate-900 dark:text-white">
                                                <Clock size={14} className="text-slate-400" />
                                                {b.time?.substring(0, 5)}
                                                <span className="text-slate-300">•</span>
                                                <Users size={14} className="text-slate-400" />
                                                {b.guests} {t('customerDetail.guests')}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {Array.isArray(b.table_numbers) && b.table_numbers.length > 0 && (
                                                    <span>{t('customerDetail.table')}: {b.table_numbers.join(', ')}</span>
                                                )}
                                                {typeof b.budget === 'number' && (
                                                    <span>{t('customerDetail.budget')}: {Math.round(b.budget)}</span>
                                                )}
                                                {b.is_checked_in && (
                                                    <span>{t('customerDetail.checkedIn')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyles(b.status)}`}>
                                        {b.status_display || b.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-4">{t('customerDetail.visits')}</h3>
                            {(customer.visit_history || []).length === 0 ? (
                                <p className="text-sm text-slate-400 font-medium">{t('customerDetail.noVisits')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {(customer.visit_history || []).slice(0, 10).map(v => (
                                        <div key={v.id} className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {v.created_at ? new Date(v.created_at).toLocaleString() : v.date}
                                                </p>
                                                {(v.staff_notes || v.feedback) && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
                                                        {v.staff_notes || v.feedback}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{Math.round(Number(v.spent_amount || 0))}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('customerDetail.spent')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-4">{t('customerDetail.notesTimeline')}</h3>
                            {(customer.internal_notes || []).length === 0 ? (
                                <p className="text-sm text-slate-400 font-medium">{t('customerDetail.noNotes')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {(customer.internal_notes || []).slice(0, 10).map(n => (
                                        <div key={n.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                                                        {n.updated_at ? new Date(n.updated_at).toLocaleString() : ''}
                                                    </p>
                                                    {n.author_name && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{n.author_name}</p>
                                                    )}
                                                </div>
                                                {n.is_important && (
                                                    <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">
                                                        {t('customerDetail.important')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap break-words">
                                                {n.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
