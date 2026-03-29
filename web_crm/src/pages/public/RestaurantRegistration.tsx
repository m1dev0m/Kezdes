import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';

export default function RestaurantRegistration() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
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

    const safeSetToken = (key: string, value: string) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch {
            try {
                sessionStorage.setItem(key, value);
                return true;
            } catch {
                return false;
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = () => {
        if (step === 1 && (!formData.name || !formData.city)) {
            setError('Node identification required.');
            return;
        }
        if (step === 2 && (!formData.email || !formData.phone)) {
            setError('Communication protocol required.');
            return;
        }
        setError('');
        setStep(step + 1);
    };

    const prevStep = () => setStep(step - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreed) {
            setError('SLA acceptance required.');
            return;
        }
        if (!formData.password) {
            setError('Access key required.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await api.post('/restaurants/requests/', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                city: formData.city,
                password: formData.password,
            });

            const access = res.data?.access;
            const refresh = res.data?.refresh;
            if (access && refresh) {
                const ok1 = safeSetToken('accessToken', access);
                const ok2 = safeSetToken('refreshToken', refresh);
                if (!ok1 || !ok2) {
                    toast.error('Local buffer synchronization failed.');
                    return;
                }
            } else {
                toast.error('Authentication handshake failed.');
                return;
            }
            navigate('/pending-approval');
        } catch (err: any) {
            toast.error(err.response?.data?.detail || err.message || 'Transmission error.');
            setError(err.response?.data?.detail || err.message || 'Transmission error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-display selection:bg-[#0047FF]/20 italic">
            <header className="h-24 px-10 md:px-20 flex items-center justify-between shrink-0 border-b border-slate-50 dark:border-slate-900 shadow-sm relative z-20">
                <Link to="/" className="flex items-center gap-4 group">
                    <div>
                        <Logo className="h-8" />
                        <p className="text-[9px] font-black text-[#0047FF] uppercase tracking-[0.3em] leading-none mt-1">Onboarding</p>
                    </div>
                </Link>
                <Link to="/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic hover:text-[#0047FF] transition-colors">SignIn_Node</Link>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row items-center relative overflow-hidden">
                {/* Decorative background grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px] opacity-10 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] bg-[#0047FF]/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="w-full lg:w-1/2 p-10 md:p-24 relative z-10 flex flex-col justify-center">
                    <div className="max-w-xl mx-auto w-full space-y-12">
                        <section className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                <span className="text-[9px] font-black text-[#0047FF] uppercase tracking-[0.4em] italic leading-none">Initialization: Phase 0{step}</span>
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-[0.85]">Join the <span className="text-[#0047FF]">Network</span>.</h1>
                            <p className="text-slate-400 text-lg md:text-xl font-medium italic leading-relaxed">Systemizing restaurant operations with elite precision and world-class architecture.</p>
                        </section>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-widest italic leading-none mb-3 px-1">Node Identity</p>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0047FF] transition-colors text-[24px]">storefront</span>
                                                <input name="name" value={formData.name} onChange={handleChange} className="w-full h-20 pl-16 pr-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-[#0047FF] rounded-[1.5rem] outline-none transition-all text-[11px] font-black uppercase tracking-widest italic placeholder:text-slate-200 dark:placeholder:text-slate-800" placeholder="Brand Nom-De-Guerre" type="text" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-widest italic leading-none mb-3 px-1">Geographic Coordinates</p>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0047FF] transition-colors text-[24px]">location_on</span>
                                                <input name="city" value={formData.city} onChange={handleChange} className="w-full h-20 pl-16 pr-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-[#0047FF] rounded-[1.5rem] outline-none transition-all text-[11px] font-black uppercase tracking-widest italic placeholder:text-slate-200 dark:placeholder:text-slate-800" placeholder="Primary Sector (City)" type="text" />
                                            </div>
                                        </div>
                                        <button type="button" onClick={nextStep} className="w-full h-20 bg-slate-950 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-black/20 hover:bg-black active:scale-95 transition-all italic flex items-center justify-center gap-4">
                                            Next Sequence <span className="material-symbols-outlined font-black">arrow_forward</span>
                                        </button>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-widest italic leading-none mb-3 px-1">Communication Link</p>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0047FF] transition-colors text-[24px]">alternate_email</span>
                                                <input name="email" value={formData.email} onChange={handleChange} className="w-full h-20 pl-16 pr-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-[#0047FF] rounded-[1.5rem] outline-none transition-all text-[11px] font-black uppercase tracking-widest italic placeholder:text-slate-200 dark:placeholder:text-slate-800" placeholder="Operational Email" type="email" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-widest italic leading-none mb-3 px-1">Signal Protocol</p>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0047FF] transition-colors text-[24px]">phone_enabled</span>
                                                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full h-20 pl-16 pr-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-[#0047FF] rounded-[1.5rem] outline-none transition-all text-[11px] font-black uppercase tracking-widest italic placeholder:text-slate-200 dark:placeholder:text-slate-800" placeholder="Emergency Comms" type="tel" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button type="button" onClick={prevStep} className="h-20 bg-slate-50 dark:bg-slate-900 text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] hover:text-[#0047FF] transition-all italic flex items-center justify-center gap-4">
                                                <span className="material-symbols-outlined font-black">arrow_back</span> Back
                                            </button>
                                            <button type="button" onClick={nextStep} className="h-20 bg-slate-950 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-black/20 hover:bg-black active:scale-95 transition-all italic flex items-center justify-center gap-4">
                                                Security <span className="material-symbols-outlined font-black">shield</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-widest italic leading-none mb-3 px-1">Secured Access Key</p>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0047FF] transition-colors text-[24px]">key</span>
                                                <input name="password" value={formData.password} onChange={handleChange} className="w-full h-20 pl-16 pr-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-[#0047FF] rounded-[1.5rem] outline-none transition-all text-[11px] font-black uppercase tracking-widest italic placeholder:text-slate-200 dark:placeholder:text-slate-800" placeholder="••••••••••••" type="password" />
                                            </div>
                                        </div>

                                        <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="flex items-start gap-4 cursor-pointer group" onClick={() => setAgreed(!agreed)}>
                                                <div className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all ${agreed ? 'bg-[#0047FF] border-[#0047FF]' : 'border-slate-200 group-hover:border-[#0047FF]'}`}>
                                                    {agreed && <span className="material-symbols-outlined text-white text-[16px] font-black">check</span>}
                                                </div>
                                                <p className="text-[10px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-white uppercase tracking-widest italic flex-1 transition-colors">
                                                    I acknowledge the Kezdes Network <span className="text-[#0047FF] underline underline-offset-4">Protocols</span> and <span className="text-[#0047FF] underline underline-offset-4">SLA</span>.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-[1fr,2fr] gap-4">
                                            <button type="button" onClick={prevStep} className="h-20 bg-slate-50 dark:bg-slate-900 text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] hover:text-[#0047FF] transition-all italic flex items-center justify-center">
                                                <span className="material-symbols-outlined font-black">arrow_back</span>
                                            </button>
                                            <button disabled={loading} type="submit" className="h-20 bg-[#0047FF] text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-[#0047FF]/20 hover:bg-[#0039cc] active:scale-95 transition-all italic flex items-center justify-center gap-4">
                                                {loading ? <span className="material-symbols-outlined animate-spin font-black">sync</span> : <span className="material-symbols-outlined font-black">rocket_launch</span>}
                                                Broadcast Identity
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-rose-500/10 text-rose-600 text-[9px] font-black uppercase tracking-[0.3em] text-center border border-rose-500/20 italic">
                                    Transmission Error: {error}
                                </motion.div>
                            )}
                        </form>
                    </div>
                </div>

                <div className="hidden lg:block w-1/2 h-[calc(100vh-6rem)] p-20 relative">
                    <div className="h-full w-full bg-slate-950 rounded-[4rem] border border-slate-900 shadow-2xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale opacity-20 group-hover:scale-110 transition-transform duration-[2s]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                        <div className="absolute bottom-20 left-20 right-20 space-y-10 relative z-10">
                            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                                <span className="material-symbols-outlined text-[#0047FF] font-black">verified</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white italic">Operational Alpha Deployment</span>
                            </div>
                            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.85]">Evolve your <br />Space into a <br /><span className="text-[#0047FF]">Precision</span> Machine.</h2>
                            <p className="text-white/40 text-lg font-medium italic leading-relaxed max-w-sm">
                                Join the elite network of restaurateurs who demand architecture over ad-hoc management.
                            </p>

                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="size-14 rounded-2xl border-4 border-slate-950 bg-slate-800 overflow-hidden shadow-xl">
                                        <img src={`https://i.pravatar.cc/150?u=${i}`} alt="" className="w-full h-full object-cover grayscale" />
                                    </div>
                                ))}
                                <div className="size-14 rounded-2xl border-4 border-slate-950 bg-slate-900 flex items-center justify-center text-[10px] font-black text-white italic">
                                    +5K
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
