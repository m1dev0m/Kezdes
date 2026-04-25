import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Users } from 'lucide-react';
import api from '@/services/api';

interface RealTable {
    id: number;
    name: string;
    number: string;
    capacity: number;
    seats: number;
    is_active: boolean;
    x: number | null;
    y: number | null;
    width: number;
    height: number;
    table_type: string;
}

interface LayoutTable extends RealTable {
    lx: number;
    ly: number;
    lw: number;
    lh: number;
}

interface TableSelectionProps {
    restaurantId: string;
    date: string;
    time: string;
    guests: number;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (tableId: number, tableName: string) => void;
}

const COLS = 4;
const CELL_W = 200;
const CELL_H = 160;
const PAD = 40;

export default function TableSelection({
    restaurantId,
    date,
    time,
    guests,
    isOpen,
    onClose,
    onSelect,
}: TableSelectionProps) {
    const [tables, setTables] = useState<RealTable[]>([]);
    const [availableIds, setAvailableIds] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !restaurantId) return;
        setLoading(true);
        setAvailableIds(null);

        const fetchTables = api
            .get(`/restaurants/${restaurantId}/`)
            .then(res => {
                const raw: RealTable[] = res.data.tables || [];
                setTables(raw.filter(t => t.is_active));
            })
            .catch(() => setTables([]));

        const fetchAvail =
            date && time
                ? api
                      .get(`/bookings/available_tables/?restaurant_id=${restaurantId}&date=${date}&time=${time}`)
                      .then(res => setAvailableIds(res.data.available_table_ids ?? []))
                      .catch(() => setAvailableIds([]))
                : Promise.resolve();

        Promise.all([fetchTables, fetchAvail]).finally(() => setLoading(false));
    }, [isOpen, restaurantId, date, time]);

    if (!isOpen) return null;

    
    const layoutTables: LayoutTable[] = tables.map((t, idx) => {
        const hasCoords = t.x != null && t.y != null && (t.x > 0 || t.y > 0);
        const lw = t.width > 10 ? t.width : 140;
        const lh = t.height > 10 ? t.height : 100;
        if (hasCoords) {
            return { ...t, lx: t.x!, ly: t.y!, lw, lh };
        }
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        return {
            ...t,
            lx: PAD + col * CELL_W,
            ly: PAD + row * CELL_H,
            lw,
            lh,
        };
    });

    const rows = Math.ceil(tables.length / COLS);
    const vbW = PAD * 2 + COLS * CELL_W;
    const vbH = PAD * 2 + rows * CELL_H;

    const isAvailable = (id: number) => (availableIds === null ? true : availableIds.includes(id));
    const fitsGuests = (t: RealTable) => (t.capacity || t.seats) >= guests;

    const label = (t: RealTable) => t.name || t.number || String(t.id);
    const cap = (t: RealTable) => t.capacity || t.seats;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ duration: 0.18 }}
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                >
                    {}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Выберите стол</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {date} · {time} · {guests} {guests === 1 ? 'гость' : 'гостей'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="h-56 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                                <span className="text-xs font-semibold">Проверяем доступность...</span>
                            </div>
                        ) : tables.length === 0 ? (
                            <div className="h-56 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <Users className="w-9 h-9" />
                                <span className="text-sm font-semibold">Столы не найдены</span>
                                <span className="text-xs">У ресторана пока нет столов</span>
                            </div>
                        ) : (
                            <div className="w-full overflow-auto rounded-xl border border-slate-200 bg-slate-50">
                                <svg
                                    viewBox={`0 0 ${vbW} ${vbH}`}
                                    className="w-full"
                                    style={{ minHeight: 200, maxHeight: 420 }}
                                >
                                    {layoutTables.map(t => {
                                        const avail = isAvailable(t.id);
                                        const fits = fitsGuests(t);
                                        const selectable = avail && fits;

                                        const fill = selectable ? '#f0fdf4' : !avail ? '#fff1f2' : '#fffbeb';
                                        const stroke = selectable ? '#34d399' : !avail ? '#fca5a5' : '#fcd34d';
                                        const textColor = selectable ? '#065f46' : '#94a3b8';

                                        return (
                                            <g
                                                key={t.id}
                                                transform={`translate(${t.lx}, ${t.ly})`}
                                                onClick={() => selectable && onSelect(t.id, label(t))}
                                                style={{ cursor: selectable ? 'pointer' : 'not-allowed' }}
                                            >
                                                {t.table_type === 'circle' ? (
                                                    <circle
                                                        cx={t.lw / 2} cy={t.lh / 2}
                                                        r={Math.min(t.lw, t.lh) / 2 - 4}
                                                        fill={fill} stroke={stroke} strokeWidth={3}
                                                    />
                                                ) : (
                                                    <rect
                                                        width={t.lw} height={t.lh}
                                                        rx={t.table_type === 'square' ? 10 : 16}
                                                        fill={fill} stroke={stroke} strokeWidth={3}
                                                    />
                                                )}
                                                <text
                                                    x={t.lw / 2} y={t.lh / 2 - 8}
                                                    textAnchor="middle" dominantBaseline="middle"
                                                    fontSize={22} fontWeight="700"
                                                    fill={textColor}
                                                >
                                                    {label(t)}
                                                </text>
                                                <text
                                                    x={t.lw / 2} y={t.lh / 2 + 18}
                                                    textAnchor="middle" dominantBaseline="middle"
                                                    fontSize={14} fill="#94a3b8"
                                                >
                                                    {cap(t)} мест
                                                </text>
                                                {selectable && (
                                                    <text
                                                        x={t.lw / 2} y={t.lh - 10}
                                                        textAnchor="middle" dominantBaseline="middle"
                                                        fontSize={11} fontWeight="600" fill="#059669"
                                                    >
                                                        Выбрать
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                        )}

                        {}
                        <div className="mt-4 flex items-center justify-center gap-5 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-50 inline-block" />
                                Свободен
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border-2 border-red-300 bg-red-50 inline-block" />
                                Занят
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border-2 border-amber-300 bg-amber-50 inline-block" />
                                Мало мест
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
