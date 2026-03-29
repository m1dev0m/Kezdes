import re

with open('web_crm/src/pages/Bookings.tsx', 'r') as f:
    content = f.read()

# Add RightActionPanel before Bookings
right_action_panel = """
// ── Right Action Panel ────────────────────────────────────────────────────────
function RightActionPanel({ booking, onClose, onAction, pendingAction, onSeat }: { booking: any, onClose: () => void, onAction: any, pendingAction: string | null, onSeat: any }) {
    const { t } = useI18n();
    const history = booking?.history || [];
    const guestFlag = booking.user_profile?.flag || 'new';

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 text-lg">Детали брони</h2>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                {booking.user_name || 'Guest'}
                            </h3>
                            <p className="text-slate-500 font-medium mt-1 flex items-center gap-1.5 w-fit hover:text-slate-700 transition-colors">
                                <Phone size={14} /> {booking.user_phone || '—'}
                            </p>
                        </div>
                        {guestFlag === 'vip' && <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold rounded-md">VIP</span>}
                        {guestFlag === 'problem' && <span className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-md">Problem</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Время</span>
                            <span className="font-bold text-slate-900">{booking.time?.substring(0, 5)} <span className="font-medium text-slate-500 ml-1">{new Date(booking.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span></span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Гости / Стол</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Users size={14} className="text-slate-400"/> {booking.guests} чел.
                                <span className="text-slate-300">|</span> 
                                {booking.table_number || booking.table ? `T${booking.table_number || booking.table}` : '—'}
                            </span>
                        </div>
                    </div>

                    {booking.special_requests && (
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-sm">
                            <span className="block text-blue-800 font-semibold mb-1">Пожелания:</span>
                            <p className="text-blue-900 font-medium">{booking.special_requests}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Быстрые действия</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {booking.status === 'pending' && (
                            <>
                                <button
                                    onClick={() => onAction(booking.id, 'confirm')}
                                    disabled={!!pendingAction}
                                    className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg border border-emerald-200 text-sm transition-colors flex items-center justify-center gap-1"
                                >
                                    <Check size={16} /> Подтвердить
                                </button>
                                <button
                                    onClick={() => onAction(booking.id, 'reject')}
                                    disabled={!!pendingAction}
                                    className="py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg border border-slate-200 text-sm transition-colors flex items-center justify-center gap-1"
                                >
                                    <X size={16} /> Отклонить
                                </button>
                            </>
                        )}
                        {(booking.status === 'confirmed' || booking.status === 'approved') && (
                            <>
                                <button
                                    onClick={() => onSeat(booking)}
                                    disabled={!!pendingAction}
                                    className="col-span-2 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-sm text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                                >
                                    Посадить
                                </button>
                                <button
                                    onClick={() => onAction(booking.id, 'no_show')}
                                    disabled={!!pendingAction}
                                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg border border-slate-200 text-sm transition-colors flex items-center justify-center gap-1"
                                >
                                    Неявка
                                </button>
                                <button
                                    onClick={() => onAction(booking.id, 'cancel_by_restaurant')}
                                    disabled={!!pendingAction}
                                    className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-lg border border-rose-200 text-sm transition-colors flex items-center justify-center gap-1"
                                >
                                    Отменить
                                </button>
                            </>
                        )}
                        {booking.status === 'seated' && (
                            <button
                                onClick={() => onAction(booking.id, 'complete')}
                                disabled={!!pendingAction}
                                className="col-span-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                                <Check size={16}/> Завершить
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">История</h4>
                    {history.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">Нет записей</p>
                    ) : (
                        <div className="relative border-l-2 border-slate-100 ml-2 space-y-4 py-2">
                            {history.map((h: any, idx: number) => (
                                <div key={idx} className="relative pl-4">
                                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white" />
                                    <p className="text-sm text-slate-700 font-medium">
                                        {h.status === 'created' || h.action === 'created' ? 'Создано' : (h.action || h.status)}
                                    </p>
                                    <span className="text-xs text-slate-400 font-medium">{new Date(h.changed_at || h.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
"""

content = content.replace('// ── Main Page ──────────────────────────────────────────────────────────────────', right_action_panel)

# State updates
state_add = """    const [pendingAction, setPendingAction] = useState<string | null>(null); // "bookingId:action"
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [timeScope, setTimeScope] = useState('today');
    const selectedBooking = useMemo(() => bookings.find(b => b.id === selectedBookingId), [bookings, selectedBookingId]);
"""

content = re.sub(r'const \[pendingAction, setPendingAction\] = [^\n]+\n', state_add, content)

# Filters rewrite
filters_logic = """
    const filteredBookings = useMemo(() => {
        const tabStatuses = TABS.find(t => t.id === activeTab)?.statuses || [];
        let list = bookings.filter(b => tabStatuses.includes(b.status));

        if (sourceFilter !== 'all') {
            list = list.filter(b => {
                const src = b.source || (b.special_requests?.includes('source: telegram') ? 'telegram' : 'web');
                return src === sourceFilter;
            });
        }

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        if (timeScope === 'today') {
             list = list.filter(b => b.date === todayStr);
        } else if (timeScope === 'now') {
             const currentTime = now.toTimeString().substring(0, 5);
             list = list.filter(b => b.date === todayStr && b.time >= currentTime);
        } else if (timeScope === '30min') {
             const in30m = new Date(now.getTime() + 30*60000);
             const currentTime = now.toTimeString().substring(0, 5);
             const maxTime = in30m.toTimeString().substring(0, 5);
             list = list.filter(b => b.date === todayStr && b.time >= currentTime && b.time <= maxTime);
        } else if (timeScope === 'all_time') {
             // no date filter
        }

        if (debouncedSearch) {
            const lower = debouncedSearch.toLowerCase();
            list = list.filter(b =>
                (b.user_name || '').toLowerCase().includes(lower) ||
                (b.user_phone || '').includes(lower)
            );
        }
        return list;
    }, [bookings, activeTab, debouncedSearch, sourceFilter, timeScope]);
"""

content = re.sub(r'const filteredBookings = useMemo\(\(\) => \{.*?\}, \[bookings, activeTab, debouncedSearch, sourceFilter, dateFilter\]\);', filters_logic, content, flags=re.DOTALL)

# HTML Layout rewrite
new_layout = """
    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-4 sm:-m-6 md:-m-8">
            <div className="flex-1 flex min-h-0 bg-slate-50/50">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 md:p-8 space-y-4 overflow-y-auto">
                    <header className="flex flex-col flex-wrap sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('bookings.title', 'Бронирования')}</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Управление потоком гостей</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all duration-150 flex items-center gap-2 active:scale-[0.98]"
                            >
                                <Plus size={16} /> Новая бронь
                            </button>
                        </div>
                    </header>

                    <div className="flex space-x-1 border-b border-slate-200">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors duration-150 relative ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {tab.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                    {tabCounts[tab.id] || 0}
                                </span>
                                {activeTab === tab.id && <motion.div layoutId="book-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <div className="relative group flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-150" size={16} />
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Поиск по имени или телефону..."
                                className="w-full pl-9 pr-4 py-1.5 bg-transparent outline-none text-sm text-slate-800"
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                        <div className="flex gap-2">
                            <select
                                value={timeScope}
                                onChange={e => setTimeScope(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
                            >
                                <option value="all_time">Все время</option>
                                <option value="today">Сегодня</option>
                                <option value="now">Сейчас &gt;</option>
                                <option value="30min">Ближайшие 30 мин</option>
                            </select>
                            <select
                                value={sourceFilter}
                                onChange={e => setSourceFilter(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
                            >
                                {SOURCE_FILTERS.map(sf => (
                                    <option key={sf.id} value={sf.id}>{sf.label}</option>
                                ))}
                            </select>
                            <button onClick={loadBookings} className="h-8 w-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-md text-slate-500 hover:text-primary hover:bg-slate-100 transition-all shrink-0">
                                <RefreshCw size={14} className={refreshing ? "animate-spin text-primary" : ""} />
                            </button>
                        </div>
                    </div>

                    {loading && !bookings.length ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white rounded-lg animate-pulse border border-slate-200"></div>)}
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-lg border border-rose-200 flex items-center gap-3">
                            <AlertCircle size={18} />
                            <p className="font-semibold text-sm">{error}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 min-h-0 overflow-y-auto w-full relative">
                            {filteredBookings.length === 0 ? (
                                <div className="p-16 text-center space-y-3 absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                                        <CalendarDays size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-medium text-sm">Нет бронирований</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                        <tr className="border-b border-slate-200 bg-slate-50/50">
                                            <th className="py-2.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Гость</th>
                                            <th className="py-2.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Телефон</th>
                                            <th className="py-2.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Пакс</th>
                                            <th className="py-2.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Время</th>
                                            <th className="py-2.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Стол</th>
                                            <th className="py-2.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 relative">
                                        <AnimatePresence mode="popLayout">
                                            {filteredBookings.map((b) => (
                                                <motion.tr
                                                    layout
                                                    key={b.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    onClick={() => setSelectedBookingId(b.id)}
                                                    className={`hover:bg-primary/5 transition-colors duration-150 group cursor-pointer ${selectedBookingId === b.id ? 'bg-primary/5' : ''} ${b.user_profile?.flag === 'vip' ? 'border-l-2 border-l-amber-400' : ''} ${b.user_profile?.flag === 'problem' ? 'border-l-2 border-l-red-400' : ''}`}
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 ring-1 ring-slate-200">
                                                                {b.user_name?.charAt(0).toUpperCase() || 'G'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-sm text-slate-900 truncate max-w-[140px]">{b.user_name || 'Guest'}</span>
                                                                    <SourceBadge source={getSource(b)} />
                                                                </div>
                                                                <span className={`inline-flex px-1.5 py-[1px] rounded text-[10px] font-bold border mt-0.5 ${getStatusStyle(b.status)}`}>
                                                                    {getStatusLabel(b.status)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm font-medium text-slate-600 whitespace-nowrap">
                                                        {b.user_phone || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm font-bold text-slate-900">{b.guests}</td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className="text-sm font-bold text-slate-900">{b.time?.substring(0, 5)}</span>
                                                        <span className="text-xs font-medium text-slate-400 ml-1.5 hidden lg:inline">{new Date(b.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            {b.table_number || b.table ? (
                                                                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">T{b.table_number || b.table}</span>
                                                            ) : <span className="text-slate-400 text-xs">—</span>}
                                                            {b.special_requests && !b.special_requests.startsWith('source:') && (
                                                                <MessageSquare size={14} className="text-blue-400" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                            {b.status === 'pending' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAction(b.id, 'confirm'); }}
                                                                    disabled={!!pendingAction}
                                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                                                >
                                                                    Принять
                                                                </button>
                                                            )}
                                                            {b.status === 'pending' && (
                                                                 <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAction(b.id, 'reject'); }}
                                                                    disabled={!!pendingAction}
                                                                    className="px-2 py-1.5 text-slate-400 hover:text-rose-600 transition-colors hover:bg-rose-50 rounded-md"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                            {(b.status === 'confirmed' || b.status === 'approved') && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleSeatClick(b); }}
                                                                    disabled={!!pendingAction}
                                                                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                                                                >
                                                                    Посадить
                                                                </button>
                                                            )}
                                                            {b.status === 'seated' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAction(b.id, 'complete'); }}
                                                                    disabled={!!pendingAction}
                                                                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                                                                >
                                                                    Завершить
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelectedBookingId(b.id); }}
                                                                className="px-2 py-1.5 text-slate-400 hover:text-slate-700 transition-colors hover:bg-slate-100 rounded-md xl:hidden"
                                                            >
                                                                ›
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {selectedBooking && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 360, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="w-[360px] flex-shrink-0 border-l border-slate-200 bg-white shadow-[-8px_0_30px_-15px_rgba(0,0,0,0.1)] z-10"
                        >
                            {selectedBooking && (
                                <RightActionPanel 
                                    booking={selectedBooking} 
                                    onClose={() => setSelectedBookingId(null)}
                                    onAction={handleAction}
                                    pendingAction={pendingAction}
                                    onSeat={handleSeatClick}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <ManualBookingForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={loadBookings}
            />

            {seatingBooking && (
                <TableSeatingModal
                    booking={seatingBooking}
                    onClose={() => setSeatingBooking(null)}
                    onConfirm={executeSeating}
                />
            )}
        </div>
    );
}
"""

content = re.sub(r'    return \(\n        <div className="space-y-4 pb-12">.*?        </div>\n    \);\n}', new_layout, content, flags=re.DOTALL)

with open('web_crm/src/pages/Bookings.tsx', 'w') as f:
    f.write(content)
