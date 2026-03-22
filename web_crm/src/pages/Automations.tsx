import { useState } from 'react';
import {
    Zap,
    Mail,
    MessageSquare,
    Plus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useI18n } from '@/i18n';

export default function Automations() {
    const { t } = useI18n();

    const [automationsState, setAutomationsState] = useState([
        { id: 1, type: 'email', active: true },
        { id: 2, type: 'sms', active: true },
        { id: 3, type: 'email', active: false },
        { id: 4, type: 'sms', active: true }
    ]);

    const automations = automationsState.map(a => {
        switch (a.id) {
            case 1:
                return { ...a, name: t('automations.bookingConfirmation'), trigger: t('automations.onNewBooking'), desc: t('automations.bookingConfirmationDesc') };
            case 2:
                return { ...a, name: t('automations.reminder24h'), trigger: t('automations.before24h'), desc: t('automations.reminder24hDesc') };
            case 3:
                return { ...a, name: t('automations.reviewRequest'), trigger: t('automations.after2h'), desc: t('automations.reviewRequestDesc') };
            case 4:
                return { ...a, name: t('automations.birthdaySpecial'), trigger: t('automations.onGuestBirthday'), desc: t('automations.birthdaySpecialDesc') };
            default:
                return { ...a, name: '', trigger: '', desc: '' };
        }
    });

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const toggleActive = (id: number) => {
        setAutomationsState(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
        const auto = automations.find(a => a.id === id);
        if (auto) {
            const status = !auto.active ? t('automations.activated') : t('automations.deactivated');
            toast.success(`${auto.name} ${status}`);
        }
    };

    const handleDelete = (id: number) => {
        setAutomationsState(prev => prev.filter(a => a.id !== id));
        toast.success(t('automations.removed'));
        setDeleteId(null);
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('automations.title')}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('automations.description')}</p>
                </div>
                <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-xl shadow-slate-200 dark:shadow-none">
                    <Plus className="w-5 h-5" /> {t('automations.newAutomation')}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {automations.map((auto) => (
                        <motion.div
                            key={auto.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${auto.type === 'email' ? 'bg-primary/5 text-primary dark:bg-primary/5' : 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'}`}>
                                    {auto.type === 'email' ? <Mail size={28} /> : <MessageSquare size={28} />}
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => toggleActive(auto.id)}
                                        className="transition-transform active:scale-90"
                                    >
                                        {auto.active ?
                                            <ToggleRight size={44} className="text-slate-900 dark:text-slate-400" /> :
                                            <ToggleLeft size={44} className="text-slate-300 dark:text-slate-700" />
                                        }
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight mb-1">{auto.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                        {auto.type === 'email' ? t('automations.email') : t('automations.sms')}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">•</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{auto.trigger}</span>
                                </div>
                            </div>

                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed mb-8">
                                {auto.desc}
                            </p>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                                <button className="text-[10px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
                                    <Settings className="w-3.5 h-3.5" /> {t('automations.editWorkflow')}
                                </button>
                                <button
                                    onClick={() => setDeleteId(auto.id)}
                                    className="text-rose-400 hover:text-rose-600 transition-colors p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 group hover:border-slate-900 dark:hover:border-slate-400 transition-all bg-slate-50/30 dark:bg-slate-900/50"
                >
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                        <Zap size={32} className="text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-slate-900 dark:text-white tracking-tight">{t('automations.createCustomFlow')}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{t('automations.startFromScratch')}</p>
                    </div>
                </motion.button>
            </div>

            <ConfirmModal
                isOpen={!!deleteId}
                title={t('automations.deleteTitle')}
                description={t('automations.deleteDesc')}
                confirmLabel={t('automations.delete')}
                onConfirm={() => deleteId && handleDelete(deleteId)}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
