import { Outlet } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Logo } from '@/components/ui/Logo';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-brand-cream flex flex-col font-display">
            <PublicHeader />

            <main className="flex-1 w-full pt-32">
                <Outlet />
            </main>

            <footer className="bg-white border-t border-brand-accent py-12 px-6 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <p className="flex items-center justify-center gap-2">
                    <span>Powered by</span>
                    <span className="inline-flex items-center italic"><Logo className="h-4" /></span>
                    <span>CRM</span>
                </p>
            </footer>
        </div>
    );
}
