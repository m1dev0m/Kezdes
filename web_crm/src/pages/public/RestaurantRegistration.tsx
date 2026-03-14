import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Logo } from '@/components/ui/Logo';

export default function RestaurantRegistration() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        password: '',
        instagram: '',
    });
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreed) {
            setError('You must agree to the Terms of Service.');
            return;
        }
        if (!formData.name || !formData.email || !formData.phone || !formData.city || !formData.password) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/restaurants/requests/', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                city: formData.city,
                password: formData.password,
            });
            navigate('/pending-approval');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || err.message || 'An error occurred during registration.');
            setError(err.response?.data?.detail || err.message || 'An error occurred during registration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col lg:flex-row font-sans">
            <div className="flex w-full flex-col bg-white dark:bg-slate-900 lg:w-1/2 p-8 md:p-16 lg:p-24 justify-center">
                <div className="max-w-md w-full mx-auto">
                    <div className="mb-10 flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="bg-primary p-2 rounded-lg">
                                <span className="material-symbols-outlined text-white text-2xl">restaurant_menu</span>
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"><Logo /> Admin</span>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Your Account</h1>
                        <p className="text-slate-500 dark:text-slate-400">Join thousands of professional restaurateurs managing their business with Kezdes.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Restaurant Name</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">store</span>
                                <input name="name" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="The Golden Grille" type="text" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Business Email</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                                <input name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="manager@restaurant.com" type="email" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">call</span>
                                    <input name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="+1 (555) 000-0000" type="tel" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">City</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">location_on</span>
                                    <input name="city" value={formData.city} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="New York" type="text" />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                                <input name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" placeholder="••••••••" type="password" />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters long.</p>
                        </div>

                        <div className="flex items-start gap-2 py-2">
                            <input checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 rounded border-slate-300 text-primary focus:ring-primary" id="terms" type="checkbox" />
                            <label className="text-sm text-slate-600 dark:text-slate-400" htmlFor="terms">
                                By creating an account, I agree to the <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
                            </label>
                        </div>

                        <button disabled={loading} className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70" type="submit">
                            <span>{loading ? 'Submitting...' : 'Create Account'}</span>
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-slate-600 dark:text-slate-400">Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link></p>
                    </div>
                </div>
            </div>

            <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-24">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full -ml-48 -mb-48 blur-3xl"></div>

                <div className="relative z-10 text-white max-w-lg text-center lg:text-left">
                    <div className="mb-12 inline-flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                        <span className="material-symbols-outlined text-white">verified</span>
                        <span className="text-sm font-medium">Trusted by 5,000+ Restaurants</span>
                    </div>

                    <h2 className="text-5xl font-black leading-tight mb-6">
                        Streamline your <br />
                        <span className="text-blue-200">restaurant operations.</span>
                    </h2>

                    <p className="text-blue-100 text-xl leading-relaxed mb-10">
                        From inventory management to staff scheduling, Kezdes Admin gives you the tools to scale your business with confidence and precision.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <span className="material-symbols-outlined">analytics</span>
                            </div>
                            <span className="font-medium">Deep Analytics</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <span className="material-symbols-outlined">inventory_2</span>
                            </div>
                            <span className="font-medium">Stock Control</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <span className="material-symbols-outlined">groups</span>
                            </div>
                            <span className="font-medium">Staff Management</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <span className="font-medium">Quick Payouts</span>
                        </div>
                    </div>

                    <div className="mt-16 flex justify-center lg:justify-start">
                        <div className="h-64 w-full bg-blue-800/40 rounded-xl border border-white/10 backdrop-blur-sm overflow-hidden p-4 shadow-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                                <div className="h-4 w-full bg-white/10 rounded"></div>
                                <div className="h-20 w-full bg-white/5 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white/20 text-4xl">bar_chart</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            </div>
        </div>
    );
}
