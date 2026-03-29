import { useState, useEffect } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Staff() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
    const [inviting, setInviting] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        role: 'manager',
        password: ''
    });

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get('/restaurants/staff/');
            setStaff(res.data);
        } catch (err) {
            toast.error("Failed to load staff directory");
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            await api.post('/restaurants/staff/', formData);
            toast.success("Team member added");
            setIsModalOpen(false);
            setFormData({ username: '', email: '', first_name: '', role: 'manager', password: '' });
            loadStaff();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Invitation failed");
        } finally {
            setInviting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Revoke access for this team member?")) return;
        try {
            await api.delete(`/restaurants/staff/${id}/`);
            toast.success("Access revoked");
            if (selectedStaff?.id === id) setSelectedStaff(null);
            loadStaff();
        } catch (err) {
            toast.error("Revocation failed");
        }
    };

    const filtered = staff.filter(s =>
        (s.first_name + ' ' + (s.last_name || '')).toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.username?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#0047FF]/20 border-t-[#0047FF]"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing records...</span>
            </div>
        );
    }

    return (
        <div className="max-w-[1440px] mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Team Directory</h1>
                    <p className="text-lg text-slate-500 font-medium">Manage operational roles and platform permissions.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="h-14 px-8 rounded-2xl bg-[#0047FF] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0039cc] transition-all flex items-center gap-3 shadow-2xl shadow-[#0047FF]/20"
                >
                    <span className="material-symbols-outlined">person_add</span>
                    Add Team Member
                </button>
            </header>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="group relative w-full max-w-md">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0047FF] transition-colors text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Search by name, role, or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-14 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-[#0047FF]/5 focus:border-[#0047FF] transition-all outline-none text-sm font-bold"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                    {['All Roles', 'Managers', 'Hosts', 'Waiters'].map((tag, i) => (
                        <button key={tag} className={`shrink-0 px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${i === 0 ? 'bg-[#0047FF] text-white border-[#0047FF]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-[#0047FF] hover:text-[#0047FF]'}`}>
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Employee</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Role</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Settings</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-32 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                                    No operational matches found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((member) => (
                                <tr
                                    key={member.id}
                                    onClick={() => setSelectedStaff(member)}
                                    className={`group cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${selectedStaff?.id === member.id ? 'bg-[#0047FF]/5 border-l-4 border-l-[#0047FF]' : ''}`}
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#0047FF] font-black text-lg border border-slate-200 dark:border-slate-700">
                                                {(member.first_name || member.username)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#0047FF] transition-colors">{member.first_name || member.username} {member.last_name || ''}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 dark:border-slate-700">
                                            {member.role?.replace('_', ' ') || 'Staff'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Active</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="material-symbols-outlined text-slate-300 hover:text-[#0047FF] transition-colors">more_horiz</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details Side-Drawer Overlay */}
            <AnimatePresence>
                {selectedStaff && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedStaff(null)}
                            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60]"
                        />
                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 h-full w-full md:w-[450px] bg-white dark:bg-slate-900 shadow-[-20px_0_60px_rgba(0,0,0,0.1)] z-[70] flex flex-col"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">Team Member Profile</h3>
                                <button onClick={() => setSelectedStaff(null)} className="material-symbols-outlined text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">close</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-12">
                                <div className="text-center space-y-4">
                                    <div className="size-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-2xl mx-auto flex items-center justify-center text-4xl font-black text-[#0047FF]">
                                        {selectedStaff.first_name?.[0].toUpperCase() || 'S'}
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedStaff.first_name} {selectedStaff.last_name}</h4>
                                        <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.2em]">{selectedStaff.role?.replace('_', ' ')}</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-slate-800 pb-3">Contact Details</h5>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 group">
                                            <span className="material-symbols-outlined text-[#0047FF] bg-[#0047FF]/5 p-2 rounded-lg">mail</span>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedStaff.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 group">
                                            <span className="material-symbols-outlined text-[#0047FF] bg-[#0047FF]/5 p-2 rounded-lg">call</span>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Extension</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">+7 (707) 123-4567</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 dark:border-slate-800 pb-3">Performance Visual</h5>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Monthly Index</span>
                                            <span className="text-xl font-black text-[#0047FF]">98.2%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '98%' }}
                                                className="h-full bg-[#0047FF] rounded-full shadow-[0_0_15px_rgba(0,71,255,0.3)]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleDelete(selectedStaff.id)}
                                    className="h-14 rounded-2xl border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    Revoke
                                </button>
                                <button className="h-14 rounded-2xl bg-[#0047FF] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0039cc] transition-all shadow-xl shadow-[#0047FF]/20 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                    Edit Access
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Invite Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-[600px] overflow-hidden shadow-2xl relative"
                        >
                            <div className="h-2 bg-[#0047FF]" />
                            <div className="p-12 space-y-10">
                                <header className="space-y-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Add Team Member</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Create platform access credentials</p>
                                </header>

                                <form onSubmit={handleInvite} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <InputField label="Full Name" value={formData.first_name} onChange={v => setFormData(p => ({ ...p, first_name: v }))} placeholder="Alex Reed" />
                                        <InputField label="Username" value={formData.username} onChange={v => setFormData(p => ({ ...p, username: v.toLowerCase().replace(/\s/g, '_') }))} placeholder="alex_reed" />
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permission Role</label>
                                            <select
                                                value={formData.role}
                                                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                                                className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-[#0047FF] outline-none appearance-none"
                                            >
                                                <option value="manager">Manager</option>
                                                <option value="host">Host/Hostess</option>
                                                <option value="staff">Staff Member</option>
                                            </select>
                                        </div>
                                        <InputField label="Corporate Email" value={formData.email} onChange={v => setFormData(p => ({ ...p, email: v }))} placeholder="alex@kezdes.com" />
                                        <div className="md:col-span-2">
                                            <InputField label="Initial Password" type="password" value={formData.password} onChange={v => setFormData(p => ({ ...p, password: v }))} placeholder="••••••••" />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                                        <button
                                            type="submit"
                                            disabled={inviting}
                                            className="flex-[2] h-14 rounded-2xl bg-[#0047FF] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0039cc] transition-all shadow-xl shadow-[#0047FF]/20 flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            {inviting ? '...' : (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                                    Activate Access
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
    return (
        <div className="space-y-3 group/field">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
            <input
                type={type}
                required
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-[#0047FF] transition-all outline-none"
            />
        </div>
    );
}
