import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { X, Calendar, Clock, Users, Phone, User, Armchair, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/modules/auth/logic/AuthContext';

interface Table {
    id: number;
    name: string;
    number: string;
    capacity: number;
    seats: number;
    is_active: boolean;
}

interface ManualBookingFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ManualBookingForm({ isOpen, onClose, onSuccess }: ManualBookingFormProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        user_name: '',
        user_phone: '',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        guests: 2,
        table_id: '' as string | number,
    });
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) { loadTables(); setError(null); }
    }, [isOpen]);

    const loadTables = async () => {
        try {
            const res = await api.get('/tables/');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setTables(data.filter((t: Table) => t.is_active));
        } catch { /* non-fatal */ }
    };

    const validate = (): string | null => {
        if (!formData.user_name.trim()) return 'Введите имя гостя';
        if (!formData.user_phone.trim()) return 'Введите номер телефона';
        if (!formData.date) return 'Выберите дату';
        if (!formData.time) return 'Выберите время';
        if (formData.guests < 1 || formData.guests > 20) return 'Гостей: от 1 до 20';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) { toast.error(err); return; }
        if (!user?.restaurant) { toast.error('Ресторан не найден'); return; }

        setLoading(true);
        setError(null);
        try {
            const payload: Record<string, unknown> = {
                restaurant: user.restaurant,
                user_name: formData.user_name,
                user_phone: formData.user_phone,
                date: formData.date,
                time: formData.time,
                guests: formData.guests,
                status: 'confirmed',
            };
            if (formData.table_id !== '') payload.table_id = Number(formData.table_id);

            await api.post('/bookings/create_manual/', payload);
            toast.success('Бронирование создано');
            onSuccess();
            onClose();
            setFormData({ user_name: '', user_phone: '', date: new Date().toISOString().split('T')[0], time: '19:00', guests: 2, table_id: '' });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string; guests?: string[]; time?: string[] } } };
            const msg = e.response?.data?.detail || e.response?.data?.guests?.[0] || e.response?.data?.time?.[0] || 'Не удалось создать бронирование';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const suitableTables = tables.filter(t => (t.capacity || t.seats) >= formData.guests);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.18 }}
                        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Новое бронирование</h2>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2 text-sm">
                                    <AlertCircle size={15} className="shrink-0" />{error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><User size={11} /> Имя гостя</label>
                                    <input required type="text" value={formData.user_name} onChange={e => setFormData(p => ({ ...p, user_name: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" placeholder="Иван Иванов" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Phone size={11} /> Телефон</label>
                                    <input required type="tel" value={formData.user_phone} onChange={e => setFormData(p => ({ ...p, user_phone: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" placeholder="+7 777 000 00 00" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Calendar size={11} /> Дата</label>
                                    <input required type="date" min={new Date().toISOString().split('T')[0]} value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value, table_id: '' }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Clock size={11} /> Время</label>
                                    <input required type="time" value={formData.time} onChange={e => setFormData(p => ({ ...p, time: e.target.value, table_id: '' }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Users size={11} /> Гостей</label>
                                    <input required type="number" min={1} max={20} value={formData.guests} onChange={e => setFormData(p => ({ ...p, guests: parseInt(e.target.value) || 1, table_id: '' }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Armchair size={11} /> Стол (опционально)</label>
                                    <select value={formData.table_id} onChange={e => setFormData(p => ({ ...p, table_id: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer">
                                        <option value="">Авто-назначение</option>
                                        {suitableTables.map(t => (
                                            <option key={t.id} value={t.id}>Стол {t.name || t.number} · {t.capacity || t.seats} мест</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">Отмена</button>
                                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                                    {loading ? 'Создание...' : 'Создать бронь'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
