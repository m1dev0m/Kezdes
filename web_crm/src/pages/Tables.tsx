import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Trash2,
    Edit2,
    Layout,
    List,
    X,
    RotateCw,
    Users,
    Calendar,
    Clock,
    ChevronRight,
    Combine
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useI18n } from '@/i18n/index.tsx';
import { AxiosError } from 'axios';
import type { PanInfo } from 'framer-motion';

interface TableModel {
    id: number;
    number: string;
    seats: number;
    is_active: boolean;
    status: 'free' | 'reserved' | 'occupied' | 'cleaning';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    table_type: 'rectangle' | 'circle' | 'square';
    current_booking?: {
        id: number;
        guest_name: string;
        guests: number;
        time: string;
        duration_minutes: number;
    };
}

interface ApiErrorResponse {
    detail?: string;
}

const statusColors = {
    free: {
        fill: 'fill-emerald-50',
        stroke: 'stroke-emerald-200',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        bg: 'bg-emerald-50'
    },
    reserved: {
        fill: 'fill-amber-50',
        stroke: 'stroke-amber-300',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        bg: 'bg-amber-50'
    },
    occupied: {
        fill: 'fill-rose-50',
        stroke: 'stroke-rose-300',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
        bg: 'bg-rose-50'
    },
    cleaning: {
        fill: 'fill-slate-50',
        stroke: 'stroke-slate-300',
        text: 'text-slate-500',
        dot: 'bg-slate-400',
        bg: 'bg-slate-50'
    }
};

export default function Tables() {
    const { t } = useI18n();
    const [tables, setTables] = useState<TableModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'visual'>(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            return 'grid';
        }
        return 'visual';
    });
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [formData, setFormData] = useState<Partial<TableModel>>({
        number: '',
        seats: 4,
        is_active: true,
        table_type: 'rectangle',
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        rotation: 0
    });

    const floorPlanRef = useRef<SVGSVGElement>(null);

    useEffect(() => { loadTables(); }, []);

    const loadTables = async () => {
        setLoading(true);
        try {
            const res = await api.get('/restaurants/tables/status/');
            setTables(res.data);
        } catch {
            toast.error(t('tables.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.number || !formData.number.trim()) {
            toast.error('Введите номер стола');
            return;
        }

        if (!formData.seats || formData.seats < 1) {
            toast.error('Количество мест должно быть至少 1');
            return;
        }

        setSaving(true);
        try {
            if (modalMode === 'add') {
                await api.post('/restaurants/tables/', formData);
                toast.success(t('tables.tableCreated'));
            } else if (selectedTableId) {
                await api.patch(`/restaurants/tables/${selectedTableId}/`, formData);
                toast.success(t('tables.tableUpdated'));
            }
            setShowModal(false);
            loadTables();
        } catch (err: unknown) {
            const apiErr = err as AxiosError<ApiErrorResponse>;
            toast.error(apiErr.response?.data?.detail || t('tables.errorSaving'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/restaurants/tables/${id}/`);
            toast.success(t('tables.tableRemoved'));
            loadTables();
            setDeleteId(null);
            if (selectedTableId === id) setSelectedTableId(null);
        } catch {
            toast.error(t('tables.couldNotDelete'));
        }
    };

    const handleDragStart = () => { setIsDragging(true); };

    const openEditModal = (table: TableModel) => {
        setModalMode('edit');
        setSelectedTableId(table.id);
        setFormData(table);
        setShowModal(true);
    };

    const handleRotate = async (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;
        const newRotation = (table.rotation + 90) % 360;
        try {
            await api.patch(`/restaurants/tables/${tableId}/`, { rotation: newRotation });
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, rotation: newRotation } : t));
        } catch {
            toast.error(t('tables.rotationFailed'));
        }
    };

    const handleDragEnd = async (tableId: number, info: PanInfo) => {
        setTimeout(() => setIsDragging(false), 100);
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        const newX = Math.round(table.x + info.offset.x);
        const newY = Math.round(table.y + info.offset.y);

        try {
            await api.patch(`/restaurants/tables/${tableId}/`, { x: newX, y: newY });
            setTables(prev => prev.map(t => t.id === tableId ? { ...t, x: newX, y: newY } : t));
        } catch {
            toast.error(t('tables.failedToSavePos'));
            loadTables();
        }
    };

    const selectedTable = tables.find(t => t.id === selectedTableId);

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-8 relative overflow-hidden">
            <div className="flex-1 flex flex-col space-y-4 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.2em] italic">{t('tables.title')}</h1>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 opacity-60">{t('tables.restaurantSeatingLayout')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List size={12} /> {t('tables.listView')}
                            </button>
                            <button
                                onClick={() => setViewMode('visual')}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Layout size={12} /> {t('tables.planView')}
                            </button>
                        </div>
                        <Button onClick={() => { setModalMode('add'); setFormData({ number: '', seats: 4, is_active: true, table_type: 'rectangle', x: 200, y: 200, width: 80, height: 80, rotation: 0 }); setShowModal(true); }} className="h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] shadow-lg shadow-indigo-600/20 bg-indigo-600 text-white border-none outline-none">
                            <Plus size={14} className="mr-2" /> {t('tables.addTable')}
                        </Button>
                    </div>
                </div>

                {!loading && viewMode === 'visual' && (
                    <div className="flex gap-4 p-3 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-100 w-fit">
                        {(['free', 'reserved', 'occupied', 'cleaning'] as const).map(s => (
                            <div key={s} className="flex items-center gap-2 px-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${statusColors[s].dot}`} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t(`tables.${s}`)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-8">
                        <Skeleton className="w-full h-full rounded-lg" />
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 overflow-y-auto pr-1 no-scrollbar pb-12">
                        {tables.map(table => (
                            <motion.div
                                key={table.id}
                                layout
                                onClick={() => setSelectedTableId(table.id)}
                                className={`aspect-square bg-white border ${selectedTableId === table.id
                                    ? 'border-indigo-600 shadow-xl shadow-indigo-600/10'
                                    : 'border-slate-100'} rounded-[24px] p-6 flex flex-col justify-between group hover:border-indigo-600 transition-all cursor-pointer relative overflow-hidden`}
                            >
                                <div className="flex justify-between items-start relative z-10">
                                    <div className={`w-2 h-2 rounded-full ${statusColors[table.status]?.dot} shadow-sm`}></div>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60 italic">{t(`tables.${table.status}`)}</div>
                                </div>
                                <div className="text-center relative z-10">
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">{table.number}</h3>
                                    <div className="flex items-center justify-center gap-1 text-slate-400 mt-2">
                                        <Users size={12} className="opacity-40" /> <span className="text-[10px] font-black uppercase tracking-widest">{table.seats}</span>
                                    </div>
                                </div>
                                <div className="flex justify-center relative z-10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteId(table.id); }}
                                        className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                {selectedTableId === table.id && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-600" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm relative flex flex-col group/canvas">
                        <div className="flex-1 bg-slate-50 relative overflow-hidden">
                            <svg
                                ref={floorPlanRef}
                                className="w-full h-full touch-none select-none"
                                viewBox="0 0 1000 800"
                                onMouseDown={() => !isDragging && setSelectedTableId(null)}
                            >
                                <defs>
                                    <pattern id="grid-p" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200/50" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#grid-p)" />

                                {tables.map(table => (
                                    <motion.g
                                        key={table.id}
                                        drag
                                        dragElastic={0}
                                        dragMomentum={false}
                                        onDragStart={handleDragStart}
                                        onDragEnd={(_, info) => handleDragEnd(table.id, info)}
                                        initial={false}
                                        animate={{
                                            x: table.x,
                                            y: table.y,
                                            rotate: table.rotation,
                                            scale: selectedTableId === table.id ? 1.05 : 1
                                        }}
                                        className="cursor-move group/table origin-center"
                                        onClick={(e) => { e.stopPropagation(); if (!isDragging) setSelectedTableId(table.id); }}
                                    >
                                        <rect width={table.width} height={table.height} rx={table.table_type === 'circle' ? 999 : 12} className="fill-slate-900/5 blur-sm" />
                                        {table.table_type === 'circle' ? (
                                            <circle
                                                r={table.width / 2} cx={table.width / 2} cy={table.width / 2}
                                                className={`transition-all duration-300 stroke-[1.5] ${selectedTableId === table.id ? 'stroke-indigo-600' : statusColors[table.status].stroke} ${statusColors[table.status].fill}`}
                                            />
                                        ) : (
                                            <rect
                                                width={table.width} height={table.height}
                                                rx={table.table_type === 'square' ? 8 : 12}
                                                className={`transition-all duration-300 stroke-[1.5] ${selectedTableId === table.id ? 'stroke-indigo-600' : statusColors[table.status].stroke} ${statusColors[table.status].fill}`}
                                            />
                                        )}
                                        <text
                                            x={table.width / 2} y={table.height / 2}
                                            textAnchor="middle" dominantBaseline="middle"
                                            className={`text-[13px] font-black italic ${statusColors[table.status].text} pointer-events-none tracking-tighter`}
                                        >
                                            {table.number}
                                        </text>
                                        {selectedTableId === table.id && (
                                            <rect width={table.width + 12} height={table.height + 12} x={-6} y={-6} rx={table.table_type === 'circle' ? 999 : 14} fill="none" stroke="currentColor" className="text-indigo-600" strokeWidth="1" strokeDasharray="4 4" />
                                        )}
                                    </motion.g>
                                ))}
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedTableId && (
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        className="w-[340px] bg-white border-l border-slate-100 shadow-2xl flex flex-col gap-8 p-8 overflow-y-auto no-scrollbar"
                    >
                        <div className="flex justify-between items-start relative">
                            <div className={`px-6 py-8 rounded-[24px] text-center border ${statusColors[selectedTable?.status || 'free'].stroke} ${statusColors[selectedTable?.status || 'free'].bg} w-full shadow-inner`}>
                                <h2 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic">{selectedTable?.number}</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2 opacity-60 italic">{t(`tables.${selectedTable?.status}`)}</p>
                            </div>
                            <button onClick={() => setSelectedTableId(null)} className="absolute -top-2 -right-2 p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('tables.seatsCount')}</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{selectedTable?.seats} <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">PAX</span></p>
                                </div>
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('tables.rotation')}</p>
                                    <button onClick={() => selectedTableId && handleRotate(selectedTableId)} className="h-10 w-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-900 hover:border-indigo-600 transition-all shadow-sm active:scale-95"><RotateCw size={14} /></button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => selectedTable && openEditModal(selectedTable)}
                                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-600 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all"><Edit2 size={14} /></div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900">{t('tables.editTable')}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-600 transition-all group opacity-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all"><Combine size={14} /></div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900">{t('tables.mergeTables')}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300" />
                                </button>
                                <button onClick={() => selectedTableId && setDeleteId(selectedTableId)} className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-rose-500 hover:bg-rose-50 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-rose-500 transition-all"><Trash2 size={14} /></div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 group-hover:text-rose-600">{t('tables.deletePermanently')}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300" />
                                </button>
                            </div>

                            <div className="space-y-4 pt-4">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-3 italic">
                                    {t('tables.nextReservation')}
                                    <div className="h-[1px] flex-1 bg-slate-50"></div>
                                </h4>
                                {selectedTable?.status === 'free' || !selectedTable?.current_booking ? (
                                    <div className="p-8 border border-dashed border-slate-100 rounded-2xl text-center bg-slate-50/20 space-y-4">
                                        <Calendar size={28} className="mx-auto text-slate-200" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60 leading-relaxed max-w-[160px] mx-auto">{t('bookings.noBookings')}</p>
                                        <Button variant="secondary" size="sm" className="w-full text-[9px] h-10 font-black uppercase tracking-widest rounded-xl border-slate-100">
                                            {t('bookings.newBooking')}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-indigo-600 rounded-3xl text-white space-y-6 shadow-2xl shadow-indigo-600/20">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center italic font-black text-sm">{selectedTable.current_booking.guest_name.charAt(0)}</div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight italic">{selectedTable.current_booking.guest_name}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-0.5">{selectedTable.current_booking.guests} {t('calendar.guestsCount')}</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black tabular-nums tracking-widest">
                                                {selectedTable.current_booking.time.substring(0, 5)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest opacity-60 border-t border-white/20 pt-4">
                                            <div className="flex items-center gap-2"><Clock size={12} /> {selectedTable.current_booking.duration_minutes} MINS</div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full bg-white text-indigo-600 hover:opacity-90 text-[9px] h-10 font-black uppercase tracking-[0.15em] rounded-xl border-none"
                                            onClick={() => {
                                                window.location.href = `/app/bookings?booking=${selectedTable.current_booking?.id}`;
                                            }}
                                        >
                                            {t('bookings.details')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-800/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
                            <form onSubmit={handleSave} className="p-10 space-y-8">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.2em] italic">{modalMode === 'add' ? t('tables.newTable') : t('tables.editTable')}</h2>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{t('tables.configureSeating')}</p>
                                    </div>
                                    <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl transition-all"><X size={16} /></button>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('tables.tableNumber')}</label>
                                            <input required type="text" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-600 transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('tables.seatsCount')}</label>
                                            <input required type="number" value={formData.seats} onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-600 transition-all tabular-nums" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('tables.shapeType')}</label>
                                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                                            {(['rectangle', 'square', 'circle'] as const).map((type) => (
                                                <button key={type} type="button" onClick={() => setFormData({ ...formData, table_type: type })} className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${formData.table_type === type ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>{type}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">DIMENSIONS (PX)</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="number" placeholder="W" value={formData.width} onChange={e => setFormData({ ...formData, width: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black outline-none tabular-nums" />
                                                <input type="number" placeholder="H" value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black outline-none tabular-nums" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{t('tables.rotation')}°</label>
                                            <input type="number" value={formData.rotation} onChange={(e) => setFormData({ ...formData, rotation: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black outline-none tabular-nums" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <Button variant="secondary" className="flex-1 text-[9px] h-11 font-black uppercase tracking-widest rounded-xl border-slate-100" onClick={() => setShowModal(false)}>{t('tables.cancel')}</Button>
                                    <Button type="submit" isLoading={saving} className="flex-1 bg-indigo-600 text-white text-[9px] h-11 font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/20 border-none"> {t('tables.saveTable')}</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal isOpen={!!deleteId} title={t('tables.deleteTableTitle')} description={t('tables.deleteTableDesc')} confirmLabel={t('tables.deletePermanently')} onConfirm={() => deleteId && handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />
        </div>
    );
}
