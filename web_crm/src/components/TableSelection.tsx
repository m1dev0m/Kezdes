import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Users } from 'lucide-react';
import api from '@/services/api';

interface RealTable {
    id: number;
    number: string;
    seats: number;
    is_active: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    table_type: string;
}

interface TableSelectionProps {
    restaurantId: string;
    date: string;
    time: string;
    guests: number;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (tableId: number) => void;
}

export default function TableSelection({
    restaurantId,
    date,
    time,
    guests,
    isOpen,
    onClose,
    onSelect
}: TableSelectionProps) {
    const [realTables, setRealTables] = useState<RealTable[]>([]);
    const [availableTableIds, setAvailableTableIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && restaurantId) {
            setLoading(true);

            const fetchTables = api.get(`/restaurants/${restaurantId}/`).then(res => {
                const tables: RealTable[] = res.data.tables || [];
                setRealTables(tables.filter(t => t.is_active));
            }).catch(() => {
                setRealTables([]);
            });

            const fetchAvailability = (date && time)
                ? api.get(`/bookings/available_tables/?restaurant_id=${restaurantId}&date=${date}&time=${time}`).then(res => {
                    setAvailableTableIds(res.data.available_table_ids || []);
                }).catch(() => {
                    setAvailableTableIds([]);
                })
                : Promise.resolve();

            Promise.all([fetchTables, fetchAvailability]).finally(() => {
                setLoading(false);
            });
        }
    }, [isOpen, restaurantId, date, time]);

    if (!isOpen) return null;

    // Auto-layout tables in a grid if they have no coordinates
    const layoutTables = realTables.map((table, idx) => {
        const hasCoords = table.x > 0 || table.y > 0;
        if (hasCoords) return table;
        // Auto-grid: 3 columns
        const cols = 3;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
            ...table,
            x: 10 + col * 30,
            y: 10 + row * 28,
            width: table.width || 22,
            height: table.height || 18,
        };
    });

    const isAvailable = (tableId: number) => {
        if (availableTableIds.length > 0) {
            return availableTableIds.includes(tableId);
        }
        return true;
    };

    const isLargeEnough = (table: RealTable) => table.seats >= guests;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
                >
                    <div className="p-8 bg-slate-50 border-b-2 border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Выберите стол</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {date} в {time} · {guests} гост.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-8">
                        {loading ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Проверяем доступность...</span>
                            </div>
                        ) : realTables.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
                                <Users className="w-10 h-10" />
                                <span className="text-sm font-bold">Столы не найдены</span>
                                <span className="text-xs text-slate-400">У ресторана пока нет столов</span>
                            </div>
                        ) : (
                            <div className="relative w-full aspect-[4/3] bg-slate-100 rounded-[2rem] border-2 border-slate-200 overflow-hidden shadow-inner">
                                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                                {layoutTables.map(table => {
                                    const available = isAvailable(table.id);
                                    const fits = isLargeEnough(table);
                                    const selectable = available && fits;
                                    return (
                                        <button
                                            key={table.id}
                                            disabled={!selectable}
                                            onClick={() => onSelect(table.id)}
                                            title={`Стол ${table.number} · ${table.seats} мест${!available ? ' · Занят' : !fits ? ' · Мало мест' : ''}`}
                                            style={{
                                                left: `${table.x}%`,
                                                top: `${table.y}%`,
                                                width: `${table.width}%`,
                                                height: `${table.height}%`
                                            }}
                                            className={`absolute transition-all duration-300 group flex flex-col items-center justify-center gap-0.5
                                                ${table.table_type === 'circle' ? 'rounded-full' : 'rounded-2xl'}
                                                ${selectable
                                                    ? 'bg-white border-4 border-emerald-400 hover:bg-emerald-50 hover:scale-105 cursor-pointer shadow-lg shadow-emerald-500/20'
                                                    : !available
                                                        ? 'bg-rose-50 border-4 border-rose-200 cursor-not-allowed opacity-60'
                                                        : 'bg-amber-50 border-4 border-amber-200 cursor-not-allowed opacity-60'}
                                            `}
                                        >
                                            <span className="text-[10px] font-black text-slate-700">T{table.number}</span>
                                            <span className="text-[8px] font-bold text-slate-400">{table.seats}p</span>
                                            {selectable && (
                                                <div className="opacity-0 group-hover:opacity-100 absolute -bottom-5 bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full transition-opacity whitespace-nowrap">
                                                    Выбрать
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-white"></div>
                                Свободен
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full border-2 border-rose-300 bg-rose-50"></div>
                                Занят
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full border-2 border-amber-300 bg-amber-50"></div>
                                Мало мест
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
