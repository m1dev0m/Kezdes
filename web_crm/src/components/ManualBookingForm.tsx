import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { X, Calendar, Clock, Users, Phone, User, Armchair, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/modules/auth/logic/AuthContext';

interface ManualBookingFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

/** Extract human-readable errors from Django REST response */
function extractErrors(data: any): string[] {
    if (!data || typeof data !== 'object') return [];
    const msgs: string[] = [];
    for (const [key, val] of Object.entries(data)) {
        if (key === 'detail' && typeof val === 'string') {
            msgs.push(val);
        } else if (Array.isArray(val)) {
            msgs.push(...val.map(v => typeof v === 'string' ? v : JSON.stringify(v)));
        } else if (typeof val === 'string') {
            msgs.push(val);
        } else if (typeof val === 'object' && val !== null) {
            msgs.push(...extractErrors(val));
        }
    }
    return msgs;
}

export function ManualBookingForm({ isOpen, onClose, onSuccess }: ManualBookingFormProps) {
    const { user } = useAuth();
    const restaurantId = user?.restaurant;
    const [formData, setFormData] = useState({
        user_name: '',
        user_phone: '',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        guests: 2,
        table_id: '',
    });
    const [allTables, setAllTables] = useState<any[]>([]);
    const [availableIds, setAvailableIds] = useState<number[] | null>(null);
    const [loadingTables, setLoadingTables] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    // Load all tables once when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setErrors([]);
        api.get('/tables/')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setAllTables(data);
            })
            .catch(() => setAllTables([]));
    }, [isOpen]);

    // Load available tables when date/time change
    const loadAvailability = useCallback(async () => {
        if (!formData.date || !formData.time || !restaurantId) {
            setAvailableIds(null);
            return;
        }
        setLoadingTables(true);
        try {
            const res = await api.get('/bookings/available_tables/', {
                params: { restaurant_id: restaurantId, date: formData.date, time: formData.time }
            });
            setAvailableIds(res.data.available_table_ids ?? []);
        } catch {
            setAvailableIds(null);
        } finally {
            setLoadingTables(false);
        }
    }, [formData.date, formData.time, restaurantId]);

    useEffect(() => {
        if (isOpen) loadAvailability();
    }, [isOpen, loadAvailability]);

    // Filter tables: available + fits guests
    const filteredTables = allTables.filter(t => {
        const cap = t.capacity || t.seats || 0;
        const isAvail = availableIds === null || availableIds.includes(t.id);
        return t.is_active !== false && isAvail && cap >= formData.guests;
    });

    const validate = () => {
        if (!formData.user_name.trim()) return "Имя гостя обязательно";
        if (!formData.user_phone.trim()) return "Телефон обязателен";
        if (!formData.date) return "Выберите дату";
        if (!formData.time) return "Выберите время";
        if (formData.guests < 1) return "Минимум 1 гость";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            toast.error(err);
            return;
        }

        setLoading(true);
        setErrors([]);
        try {
            await api.post('/bookings/create_manual/', formData);
            toast.success("Бронирование создано");
            onSuccess();
            onClose();
        } catch (err: any) {
            const apiErrors = extractErrors(err.response?.data);
            if (apiErrors.length > 0) {
                setErrors(apiErrors);
                apiErrors.forEach(e => toast.error(e));
            } else {
                const fallback = "Не удалось создать бронирование";
                setErrors([fallback]);
                toast.error(fallback);
            }
        } finally {
            setLoading(false);
        }
    };

    const tableName = (t: any) => t.name || t.number || `#${t.id}`;
    const tableCap = (t: any) => t.capacity || t.seats || '?';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Новое бронирование</h2>
                            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {errors.length > 0 && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                                    {errors.map((e, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                            <span>{e}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        <User size={12} className="inline mr-1" />Имя гостя *
                                    </label>
                                    <input
                                        required type="text" value={formData.user_name}
                                        onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="Иван Иванов"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        <Phone size={12} className="inline mr-1" />Телефон *
                                    </label>
                                    <input
                                        required type="tel" value={formData.user_phone}
                                        onChange={e => setFormData({ ...formData, user_phone: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="+7 900 123 4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        <Calendar size={12} className="inline mr-1" />Дата *
                                    </label>
                                    <input
                                        required type="date" value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        <Clock size={12} className="inline mr-1" />Время *
                                    </label>
                                    <input
                                        required type="time" value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        <Users size={12} className="inline mr-1" />Гостей *
                                    </label>
                                    <input
                                        required type="number" min={1} max={20} value={formData.guests}
                                        onChange={e => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        <Armchair size={12} className="inline mr-1" />Стол
                                        {loadingTables && <Loader2 size={12} className="inline ml-1 animate-spin" />}
                                    </label>
                                    <select
                                        value={formData.table_id}
                                        onChange={e => setFormData({ ...formData, table_id: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        <option value="">Авто-назначение</option>
                                        {filteredTables.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {tableName(t)} — {tableCap(t)} мест
                                            </option>
                                        ))}
                                        {filteredTables.length === 0 && allTables.length > 0 && (
                                            <option disabled>Нет подходящих столов</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button" onClick={onClose}
                                    className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit" disabled={loading}
                                    className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
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
