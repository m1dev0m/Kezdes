import type { ReactNode } from 'react';
import { memo } from 'react';

type Props = {
    label: string;
    value: ReactNode;
    icon?: React.ComponentType<{ size?: number }>;
    iconBgClassName?: string;
    className?: string;
};

function KpiCardComponent({ label, value, icon: Icon, iconBgClassName = '', className = '' }: Props) {
    return (
        <div className={`bg-white border border-slate-100 rounded-[28px] p-6 transition-all shadow-sm group hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-600/5 ${className}`}>
            <div className="flex items-center gap-3 mb-5">
                {Icon && (
                    <div className={`p-2 rounded-xl border border-slate-50 ${iconBgClassName}`}>
                        <Icon size={16} />
                    </div>
                )}
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none italic">{label}</p>
            </div>
            <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter leading-none italic">{value}</p>
        </div>
    );
}

export const KpiCard = memo(KpiCardComponent);

