import { Outlet, Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-slate-950 flex flex-col font-display">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 md:px-12">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <span className="font-bold text-lg tracking-tight"><Logo /></span>
                    </Link>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        CRM PLATFORM
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
                <Outlet />
            </main>

            <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                <p>Powered by Kezdes CRM</p>
            </footer>
        </div>
    );
}
