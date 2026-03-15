import { Outlet, Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-display">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-6 md:px-12">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <span className="font-bold text-lg tracking-tight"><Logo /></span>
                    </Link>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                        CRM PLATFORM
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
                <Outlet />
            </main>

            <footer className="bg-white border-t border-slate-100 py-12 px-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <p>Powered by <span className="text-indigo-600 italic">Kezdes CRM</span></p>
            </footer>
        </div>
    );
}
