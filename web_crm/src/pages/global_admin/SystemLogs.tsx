import { motion } from 'framer-motion';

export default function SystemLogs() {
    return (
        <div className="space-y-12 italic">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-[#0047FF] uppercase tracking-[0.4em] italic leading-none">Core Activity Stream</p>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-[0.9]">System <span className="text-[#0047FF]">Logs</span>.</h1>
                </div>
                <div className="flex gap-4">
                    <button className="h-14 px-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest italic hover:border-[#0047FF] transition-all">
                        <span className="material-symbols-outlined text-[20px]">filter_list</span> Adjust Scope
                    </button>
                </div>
            </header>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-950 rounded-[4rem] border border-slate-800/50 shadow-2xl shadow-black/40 overflow-hidden relative"
            >
                {/* Visual Glitch/Effect Background */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
                <div className="absolute top-0 right-0 size-96 bg-[#0047FF]/10 rounded-full blur-[120px] -mr-48 -mt-48" />

                <div className="p-16 md:p-24 flex flex-col items-center justify-center text-center space-y-12 relative z-10">
                    <div className="size-32 rounded-[3.5rem] bg-slate-900 border-4 border-slate-800 flex items-center justify-center shadow-2xl group transition-all">
                        <span className="material-symbols-outlined text-[#0047FF] text-[48px] font-black group-hover:scale-125 transition-transform">terminal</span>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Stream Encryption Active</h3>
                        <p className="text-white/40 text-lg font-medium max-w-lg mx-auto italic leading-relaxed">
                            System logs are currently restricted or disabled for this clearance level. Initialize a secure handshake with your DevOps terminal to view encrypted platform events.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl pt-10 border-t border-slate-800/50">
                        <LogService name="Datadog" status="Linked" color="text-purple-500" />
                        <LogService name="Sentry" status="Active" color="text-rose-500" />
                        <LogService name="ELK Stack" status="Pending" color="text-emerald-500" />
                        <LogService name="CloudWatch" status="Syncing" color="text-blue-500" />
                    </div>

                    <button className="h-20 px-16 bg-[#0047FF] text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-[#0047FF]/20 hover:bg-[#0039cc] active:scale-95 transition-all italic">
                        Initialize Secure Access
                    </button>
                </div>
            </motion.div>

            <footer className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic opacity-60">
                    Proprietary Intelligence Stream © 2026 Kezdes Ops.
                </p>
            </footer>
        </div>
    );
}

function LogService({ name, status, color }: { name: string; status: string; color: string }) {
    return (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-[#0047FF]/20 transition-all group">
            <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2 italic leading-none">{name}</p>
            <div className="flex items-center gap-2 justify-center">
                <span className={`size-1.5 rounded-full ${color.replace('text-', 'bg-')} animate-pulse`} />
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] italic ${color}`}>{status}</span>
            </div>
        </div>
    );
}
