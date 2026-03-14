import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Save, Camera, LogOut, Shield, Sparkles } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

export default function GuestProfile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        phone: (user as any)?.profile?.phone || '',
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch('/auth/me/', formData);
            toast.success('Profile updated successfully');
        } catch (err) {
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
        toast.success('Logged out successfully');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                        <Shield size={14} /> Account Security
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Profile Settings</h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200/50"
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-[#0D0D1F] border border-slate-100 dark:border-white/5 rounded-[3rem] p-10 text-center shadow-2xl shadow-slate-100/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -mr-8 -mt-8"></div>

                        <div className="relative z-10 space-y-6">
                            <div className="relative mx-auto w-32 h-32">
                                <div className="w-full h-full rounded-[2.5rem] bg-slate-50 dark:bg-white/5 border-4 border-white dark:border-[#0D0D1F] shadow-2xl overflow-hidden flex items-center justify-center">
                                    <span className="text-4xl font-black text-primary">
                                        {formData.username?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
                                    <Camera size={18} />
                                </button>
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formData.username}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Premium Member</p>
                            </div>

                            <div className="pt-6 border-t border-slate-50 dark:border-white/5 grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Visits</p>
                                    <p className="font-black text-slate-900 dark:text-white">12</p>
                                </div>
                                <div className="text-center border-l border-slate-50 dark:border-white/5">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Rank</p>
                                    <p className="font-black text-slate-900 dark:text-white">#12</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                            <Sparkles size={20} className="fill-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest">Rewards Program</h4>
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-widest">
                            You are 3 visits away from becoming an <span className="text-primary">Elite Partner</span>.
                        </p>
                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '70%' }}
                                className="h-full bg-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-[#0D0D1F] border border-slate-100 dark:border-white/5 rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-slate-100/50">
                        <form onSubmit={handleSave} className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity</label>
                                    <div className="relative group">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#0D0D1F] focus:border-primary rounded-[1.5rem] text-sm font-black transition-all outline-none shadow-sm placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#0D0D1F] focus:border-primary rounded-[1.5rem] text-sm font-black transition-all outline-none shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+7 (777) 000-00-00"
                                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#0D0D1F] focus:border-primary rounded-[1.5rem] text-sm font-black transition-all outline-none shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Language Preference</label>
                                    <select className="w-full px-6 py-5 bg-slate-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#0D0D1F] focus:border-primary rounded-[1.5rem] text-sm font-black transition-all outline-none shadow-sm appearance-none">
                                        <option>English (US)</option>
                                        <option>Russian</option>
                                        <option>Kazakh</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-50 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Shield size={16} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your data is encrypted and secure</span>
                                </div>
                                <Button
                                    type="submit"
                                    isLoading={loading}
                                    className="w-full sm:w-auto bg-[#140B2D] hover:bg-primary text-white font-black px-12 py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-2xl transition-all"
                                >
                                    <Save size={18} className="mr-2" /> Save Profile
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
