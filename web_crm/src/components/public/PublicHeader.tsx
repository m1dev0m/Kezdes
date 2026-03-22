import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

type PublicHeaderActive = 'pricing' | 'contact' | null;

export function PublicHeader({ active = null }: { active?: PublicHeaderActive }) {
    const linkCls = (isActive: boolean) =>
        `text-xs font-black uppercase tracking-widest transition-all ${
            isActive ? 'text-brand-green' : 'text-slate-500 hover:text-brand-green'
        }`;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-cream/90 backdrop-blur-xl border-b border-brand-accent transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 bg-brand-green rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-green/20 group-hover:scale-105 transition-transform">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path clipRule="evenodd" d="M24 8L40 24L24 40L8 24L24 8ZM21 32V16L13 24L21 32Z" fill="currentColor" fillRule="evenodd"></path>
                        </svg>
                    </div>
                    <span className="text-xl font-black tracking-tight"><Logo /></span>
                </Link>

                <div className="hidden md:flex items-center gap-10">
                    <Link to="/#features" className={linkCls(false)}>Features</Link>
                    <Link to="/pricing" className={linkCls(active === 'pricing')}>Pricing</Link>
                    <Link to={active === 'contact' ? '/contact' : '/#crm'} className={linkCls(active === 'contact')}>Enterprise</Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/login" className="hidden sm:block text-sm font-bold text-slate-700 hover:text-brand-green transition-all px-5 py-2.5 border border-brand-accent rounded-lg hover:bg-brand-accent/30">Login</Link>
                    <Link to="/register" className="bg-gold text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-gold/20 hover:bg-gold/90 active:scale-[0.98] transition-all">Sign Up</Link>
                </div>
            </div>
        </nav>
    );
}
