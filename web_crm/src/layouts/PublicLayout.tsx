import { Outlet } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Logo } from '@/components/ui/Logo';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-[#f6f5f8] flex flex-col font-inter">
            <PublicHeader />

            <main className="flex-1 w-full pt-32">
                <Outlet />
            </main>

            <footer className="border-t border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
                <p className="flex items-center justify-center gap-2">
                    <span>Powered by</span>
                    <span className="inline-flex items-center"><Logo className="h-4" /></span>
                    <span>CRM</span>
                </p>
            </footer>
        </div>
    );
}
