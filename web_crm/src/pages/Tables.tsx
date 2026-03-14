import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Trash2,
    Edit2,
    Layout,
    List,
    X,
    Save,
    RotateCw,
    Users,
    Calendar,
    Clock,
    User,
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
        fill: 'fill-emerald-50 dark:fill-emerald-950/20',
        stroke: 'stroke-emerald-200 dark:stroke-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10'
    },
    reserved: {
        fill: 'fill-amber-50 dark:fill-amber-950/20',
        stroke: 'stroke-amber-300 dark:stroke-amber-700',
        text: 'text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-500/10'
    },
    occupied: {
        fill: 'fill-rose-50 dark:fill-rose-950/20',
        stroke: 'stroke-rose-300 dark:stroke-rose-700',
        text: 'text-rose-700 dark:text-rose-400',
        dot: 'bg-rose-500',
        bg: 'bg-rose-50 dark:bg-rose-500/10'
    },
    cleaning: {
        fill: 'fill-slate-50 dark:fill-slate-900',
        stroke: 'stroke-slate-300 dark:stroke-slate-600',
        text: 'text-slate-500 dark:text-slate-400',
        dot: 'bg-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-800/50'
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
            <div className="flex-1 flex flex-col space-y-8 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('tables.title')}</h1>
                        <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">{t('tables.restaurantSeatingLayout')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-sm">
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><List size={20} /></button>
                            <button onClick={() => setViewMode('visual')} className={`p-2 rounded-xl transition-all ${viewMode === 'visual' ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><Layout size={20} /></button>
                        </div>
                        <Button onClick={() => { setModalMode('add'); setFormData({ number: '', seats: 4, is_active: true, table_type: 'rectangle', x: 200, y: 200, width: 80, height: 80, rotation: 0 }); setShowModal(true); }} className="flex items-center gap-2">
                            <Plus size={18} /> {t('tables.addTable')}
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-12">
                        <Skeleton className="w-full h-full rounded-[2rem]" />
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 overflow-y-auto pr-2">
                        {tables.map(table => (
                            <motion.div
                                key={table.id}
                                layout
                                onClick={() => setSelectedTableId(table.id)}
                                className={`aspect-square bg-white dark:bg-slate-900 border ${selectedTableId === table.id ? 'ring-2 ring-primary border-transparent shadow-xl' : 'border-slate-100 dark:border-slate-800'} rounded-[2.5rem] p-6 flex flex-col justify-between group hover:shadow-2xl transition-all cursor-pointer`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`w-2 h-2 rounded-full ${statusColors[table.status]?.dot}`}></div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t(`tables.${table.status}`)}</div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">T{table.number}</h3>
                                    <div className="flex items-center justify-center gap-1.5 text-slate-400 mt-1">
                                        <Users size={12} /> <span className="text-xs font-black">{table.seats}</span>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(table.id); }} className="mx-auto p-2 opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={14} /></button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col group/canvas">
                        <div className="absolute top-8 left-8 z-20 flex flex-wrap gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl opacity-0 group-hover/canvas:opacity-100 transition-opacity">
                            {(['free', 'reserved', 'occupied', 'cleaning'] as const).map(s => (
                                <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s].dot}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">{t(`tables.${s}`)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
                            <svg
                                ref={floorPlanRef}
                                className="w-full h-full touch-none select-none"
                                viewBox="0 0 1000 800"
                                onMouseDown={() => !isDragging && setSelectedTableId(null)}
                            >
                                <defs>
                                    <pattern id="grid-p" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
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
                                        <rect width={table.width} height={table.height} rx={table.table_type === 'circle' ? 999 : 20} className="fill-black/5 blur-md translate-y-2 translate-x-1" />
                                        {table.table_type === 'circle' ? (
                                            <circle
                                                r={table.width / 2} cx={table.width / 2} cy={table.width / 2}
                                                className={`transition-all duration-300 stroke-[3] ${selectedTableId === table.id ? 'stroke-primary' : statusColors[table.status].stroke} ${statusColors[table.status].fill}`}
                                            />
                                        ) : (
                                            <rect
                                                width={table.width} height={table.height}
                                                rx={table.table_type === 'square' ? 12 : 24}
                                                className={`transition-all duration-300 stroke-[3] ${selectedTableId === table.id ? 'stroke-primary' : statusColors[table.status].stroke} ${statusColors[table.status].fill}`}
                                            />
                                        )}
                                        <text
                                            x={table.width / 2} y={table.height / 2}
                                            textAnchor="middle" dominantBaseline="middle"
                                            className={`text-xl font-black ${statusColors[table.status].text} pointer-events-none tracking-tighter`}
                                        >
                                            {table.number}
                                        </text>
                                        {selectedTableId === table.id && (
                                            <g className="opacity-40">
                                                <circle cx={0} cy={0} r={5} fill="#4300FF" />
                                                <circle cx={table.width} cy={0} r={5} fill="#4300FF" />
                                                <circle cx={0} cy={table.height} r={5} fill="#4300FF" />
                                                <circle cx={table.width} cy={table.height} r={5} fill="#4300FF" />
                                            </g>
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
                        className="w-[400px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-2xl flex flex-col gap-8 scrollbar-hide overflow-y-auto"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`px-6 py-6 rounded-[2rem] text-center ${statusColors[selectedTable?.status || 'free'].bg}`}>
                                <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">T{selectedTable?.number}</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">{t(`tables.${selectedTable?.status}`)}</p>
                            </div>
                            <button onClick={() => setSelectedTableId(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors"><X size={24} /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('tables.seatsCount')}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedTable?.seats} <span className="text-xs text-slate-400">{t('calendar.guestsCount')}</span></p>
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('tables.rotation')}</p>
                                    <button onClick={() => selectedTableId && handleRotate(selectedTableId)} className="mx-auto w-10 h-10 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-center text-primary shadow-sm hover:scale-110 active:scale-95 transition-all"><RotateCw size={18} /></button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => selectedTable && openEditModal(selectedTable)}
                                    className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all"><Edit2 size={18} /></div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{t('tables.editTable')}</span>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </button>
                                <button className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all"><Combine size={18} /></div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{t('tables.mergeTables')}</span>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </button>
                                <button onClick={() => selectedTableId && setDeleteId(selectedTableId)} className="w-full flex items-center justify-between p-5 bg-rose-50/20 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all"><Trash2 size={18} /></div>
                                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{t('tables.deletePermanently')}</span>
                                    </div>
                                </button>
                            </div>

                            <div className="space-y-4 pt-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('tables.nextReservation')}</h4>
                                {selectedTable?.status === 'free' || !selectedTable?.current_booking ? (
                                    <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-center">
                                        <Calendar size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                                        <p className="text-xs font-bold text-slate-400 mb-4">{t('bookings.noBookings')}</p>
                                        <Button variant="secondary" size="sm" className="w-full">{t('bookings.newBooking')}</Button>
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><User size={20} /></div>
                                                <div>
                                                    <p className="text-sm font-black text-white">{selectedTable.current_booking.guest_name}</p>
                                                    <p className="text-[10px] font-bold text-white/50 tracking-widest uppercase">{selectedTable.current_booking.guests} {t('calendar.guestsCount')}</p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {selectedTable.current_booking.time.substring(0, 5)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/40 border-t border-white/5 pt-4">
                                            <div className="flex items-center gap-2"><Clock size={12} /> {selectedTable.current_booking.duration_minutes} MIN</div>
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full bg-white text-slate-900 hover:bg-slate-100"
                                                onClick={() => {
                                                    window.location.href = `/app/bookings?booking=${selectedTable.current_booking?.id}`;
                                                }}
                                            >
                                                Открыть бронь
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                            <form onSubmit={handleSave} className="p-10 space-y-8">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{modalMode === 'add' ? t('tables.newTable') : t('tables.editTable')}</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('tables.configureSeating')}</p>
                                    </div>
                                    <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 dark:bg-slate-800 rounded-xl"><X size={20} /></button>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('tables.tableNumber')}</label>
                                            <input required type="text" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('tables.seatsCount')}</label>
                                            <input required type="number" value={formData.seats} onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('tables.shapeType')}</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {(['rectangle', 'square', 'circle'] as const).map((type) => (
                                                <button key={type} type="button" onClick={() => setFormData({ ...formData, table_type: type })} className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.table_type === type ? 'bg-slate-900 dark:bg-slate-700 text-white border-slate-900' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 hover:border-slate-200'}`}>{type}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('tables.dimensions')}</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="number" value={formData.width} onChange={e => setFormData({ ...formData, width: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                                <input type="number" value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('tables.rotation')}</label>
                                            <input type="number" value={formData.rotation} onChange={(e) => setFormData({ ...formData, rotation: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <Button variant="ghost" className="flex-1 py-4" onClick={() => setShowModal(false)}>{t('tables.cancel')}</Button>
                                    <Button type="submit" isLoading={saving} className="flex-1 py-4 shadow-xl"><Save size={18} className="mr-2" /> {t('tables.saveTable')}</Button>
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
