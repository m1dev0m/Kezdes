import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Save, Camera, LogOut } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/modules/auth/logic/AuthContext';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

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
        <div className="max-w-5xl mx-auto pb-20">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-brand-green tracking-tight">Profile Settings</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your dining experience and personal preferences</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-3 bg-gold/10 px-4 py-2 rounded-full">
                        <span className="text-gold font-bold text-sm tracking-wide">GOLD TIER MEMBER</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </header>

            <div className="grid gap-8">
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full object-cover ring-4 ring-gold/20 bg-slate-100 flex items-center justify-center text-3xl font-black text-brand-green">
                                {formData.username?.charAt(0).toUpperCase()}
                            </div>
                            <button
                                type="button"
                                className="absolute bottom-0 right-0 bg-brand-green text-white p-2 rounded-full shadow-lg border-4 border-white hover:bg-brand-green/90 transition-colors"
                                aria-label="Change photo"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-brand-green">{formData.username || 'Guest'}</h2>
                            <p className="text-slate-500">Member since 2026 • {formData.email || '—'}</p>
                            <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                                <button type="button" className="px-6 py-2 bg-brand-green text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                                    Change Photo
                                </button>
                                <button type="button" className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <form onSubmit={handleSave} className="space-y-8">
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-xl font-bold text-brand-green uppercase tracking-wider text-sm">Personal Information</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600">Full Name</label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className="w-full pl-10 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-gold/30"
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600">Email Address</label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className="w-full pl-10 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-gold/30"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600">Phone Number</label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className="w-full pl-10 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-gold/30"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+7 (777) 000-00-00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600">Location</label>
                                <input
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-gold/30"
                                    type="text"
                                    defaultValue="Manhattan, New York"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-xl font-bold text-brand-green uppercase tracking-wider text-sm">Dining Preferences</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p className="font-bold text-slate-700 text-sm">Dietary Restrictions</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-xs font-bold border border-brand-green/20">Vegetarian</span>
                                    <span className="bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-xs font-bold border border-brand-green/20">Nut Allergy</span>
                                    <button type="button" className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-dashed border-slate-300 hover:border-gold transition-colors">
                                        + Add New
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="font-bold text-slate-700 text-sm">Preferred Cuisines</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold border border-gold/20">Italian</span>
                                    <span className="bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold border border-gold/20">Japanese Fusion</span>
                                    <span className="bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold border border-gold/20">French</span>
                                    <button type="button" className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-dashed border-slate-300 hover:border-gold transition-colors">
                                        + Add New
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-xl font-bold text-brand-green uppercase tracking-wider text-sm">Security & Privacy</h2>
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                    <span className="text-slate-400 text-sm font-black">•••</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">Password</p>
                                    <p className="text-xs text-slate-500 font-medium">Last updated 3 months ago</p>
                                </div>
                            </div>
                            <button type="button" className="w-full md:w-auto px-6 py-2 border-2 border-brand-green text-brand-green rounded-xl font-bold text-sm hover:bg-brand-green hover:text-white transition-all">
                                Change Password
                            </button>
                        </div>
                    </section>

                    <div className="flex justify-end gap-4 pb-12">
                        <button type="button" className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors">
                            Discard Changes
                        </button>
                        <Button type="submit" isLoading={loading} className="px-8 py-3 bg-brand-green text-white rounded-xl font-black shadow-lg shadow-brand-green/20 hover:brightness-110 transition-all">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
