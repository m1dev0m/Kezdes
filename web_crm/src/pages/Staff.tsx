import { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Mail,
    Trash2,
    Briefcase,
    Search,
    MoreHorizontal,
    Loader2,
    Shield,
    User
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/i18n';

export default function Staff() {
    const { t } = useI18n();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
            toast.error(t('staff.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            await api.post('/restaurants/staff/', formData);
            toast.success(t('staff.invitationSent'));
            setIsModalOpen(false);
            setFormData({
                username: '',
                email: '',
                first_name: '',
                role: 'manager',
                password: ''
            });
            loadStaff();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || t('staff.failedToInvite'));
        } finally {
            setInviting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/restaurants/staff/${id}/`);
            toast.success(t('staff.memberRemoved'));
            loadStaff();
            setConfirmDelete(null);
        } catch (err) {
            toast.error(t('staff.failedToRemove'));
        }
    };

    const filtered = staff.filter(s =>
        (s.first_name + ' ' + (s.last_name || '')).toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.username?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('staff.title')}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('staff.description')}</p>
                </div>
                <Button variant="primary" size="lg" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-5 h-5" /> {t('staff.inviteMember')}
                </Button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder={t('staff.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-700 transition-all outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-64 bg-slate-50 dark:bg-slate-800/10 rounded-[2.5rem] animate-pulse" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
                        <Users size={48} className="mx-auto mb-4 text-slate-200" />
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('staff.noMembers')}</h3>
                        <p className="text-slate-500 font-medium mt-1">{t('staff.noMembersDesc')}</p>
                    </div>
                ) : (
                    filtered.map((member) => (
                        <div key={member.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group relative">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white font-black text-xl">
                                    {member.first_name?.charAt(0).toUpperCase() || member.username?.charAt(0).toUpperCase()}
                                </div>
                                <button className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight truncate">{member.first_name || member.username} {member.last_name || ''}</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${(member.is_active ?? true) ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800/30' : 'bg-slate-50 text-slate-500'}`}>
                                        {t('staff.activeMember')}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                    <Briefcase className="w-4 h-4 text-slate-300" />
                                    <span className="uppercase tracking-widest truncate font-black text-[10px] text-slate-400">
                                        {member.role === 'manager' ? (t('staff.manager') || 'Менеджер') : member.role === 'host' ? (t('staff.host') || 'Хостес') : member.role?.replace('_', ' ') || 'Team Member'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                    <Mail className="w-4 h-4 text-slate-300" />
                                    <span className="truncate">{member.email || '—'}</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors">{t('staff.teamAccess')}</button>
                                <button
                                    onClick={() => setConfirmDelete(member.id)}
                                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('staff.inviteTitle')}>
                <form onSubmit={handleInvite} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('staff.fullName')}</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                            <input
                                type="text"
                                required
                                placeholder={t('staff.enterName')}
                                value={formData.first_name}
                                onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('staff.username')}</label>
                            <input
                                type="text"
                                required
                                placeholder={t('staff.enterUsername')}
                                value={formData.username}
                                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('staff.role')}</label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm appearance-none"
                                >
                                    <option value="manager">{t('staff.manager') || 'Менеджер'}</option>
                                    <option value="host">{t('staff.host') || 'Хостес'}</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2 col-span-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('staff.password')}</label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                <input
                                    type="password"
                                    required
                                    placeholder={t('staff.enterPassword')}
                                    value={formData.password}
                                    onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('staff.emailOptional')}</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                            <input
                                type="email"
                                placeholder={t('staff.emailPlaceholder')}
                                value={formData.email}
                                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-900 transition-all outline-none font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={inviting}
                            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                        >
                            {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus size={20} /> {t('staff.inviteMember')}</>}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={!!confirmDelete}
                title={t('staff.removeTitle')}
                description={t('staff.removeDesc')}
                confirmLabel={t('staff.removeConfirm')}
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
