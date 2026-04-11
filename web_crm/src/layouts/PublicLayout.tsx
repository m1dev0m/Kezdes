import { Outlet } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { Logo } from '@/components/ui/Logo';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-[#f6f5f8] flex flex-col font-inter">
            <PublicHeader />

            <main className="flex-1 w-full pt-[122px] sm:pt-[132px]">
                <Outlet />
            </main>

            <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 sm:px-6 sm:py-10">
                <p className="flex items-center justify-center gap-2">
                    <span>Powered by</span>
                    <span className="inline-flex items-center"><Logo className="h-4" /></span>
                    <span>CRM</span>
                </p>
            </footer>
        </div>
    );
}
