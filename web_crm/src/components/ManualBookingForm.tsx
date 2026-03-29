import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/modules/auth/logic/AuthContext';

interface ManualBookingFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        api.get('/tables/')
            .then(res => setAllTables(Array.isArray(res.data) ? res.data : (res.data.results || [])))
            .catch(() => setAllTables([]));
    }, [isOpen]);

    const loadAvailability = useCallback(async () => {
        if (!formData.date || !formData.time || !restaurantId) return;
        try {
            const res = await api.get('/bookings/available_tables/', {
                params: { restaurant_id: restaurantId, date: formData.date, time: formData.time }
            });
            setAvailableIds(res.data.available_table_ids ?? []);
        } catch {
            setAvailableIds(null);
        }
    }, [formData.date, formData.time, restaurantId]);

    useEffect(() => {
        if (isOpen) loadAvailability();
    }, [isOpen, loadAvailability]);

    const filteredTables = allTables.filter(t => {
        const cap = t.capacity || t.seats || 0;
        const isAvail = availableIds === null || availableIds.includes(t.id);
        return t.is_active !== false && isAvail && cap >= formData.guests;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/bookings/create_manual/', formData);
            toast.success("Reservation created");
            onSuccess();
            onClose();
        } catch {
            toast.error("Failed to create reservation");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-200"
                    >
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-[#FDFBF7]">
                            <h2 className="text-lg font-black text-[#1A3C34] italic">New Table Request</h2>
                            <button onClick={onClose} className="p-1 text-slate-400 hover:text-[#1A3C34] transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Guest Name</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input required className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-black transition-all" type="text" value={formData.user_name} onChange={e => setFormData({ ...formData, user_name: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
                                    <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-black transition-all" type="tel" value={formData.user_phone} onChange={e => setFormData({ ...formData, user_phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Guests</label>
                                    <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-black transition-all" type="number" value={formData.guests} onChange={e => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
                                    <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-black transition-all" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Time</label>
                                    <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-black transition-all" type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Table (Optional)</label>
                                    <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-black transition-all" value={formData.table_id} onChange={e => setFormData({ ...formData, table_id: e.target.value })}>
                                        <option value="">Auto-assign</option>
                                        {filteredTables.map(t => <option key={t.id} value={t.id}>{t.name || t.number} ({t.capacity} seats)</option>)}
                                    </select>
                                </div>
                            </div>
                            <button disabled={loading} className="w-full py-4 bg-[#1A3C34] text-white font-bold rounded-xl hover:bg-[#234e44] transition-all disabled:opacity-50 shadow-lg shadow-[#1A3C34]/10 uppercase tracking-widest text-xs italic">
                                {loading ? 'Processing...' : 'Complete Reservation'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
