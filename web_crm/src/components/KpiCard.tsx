import { ReactNode, memo } from 'react';

type Props = {
    label: string;
    value: ReactNode;
    icon?: React.ComponentType<{ size?: number }>;
    iconBgClassName?: string;
    className?: string;
};

function KpiCardComponent({ label, value, icon: Icon, iconBgClassName = '', className = '' }: Props) {
    return (
        <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-7 hover:shadow-lg transition-all ${className}`}>
            <div className="flex items-start justify-between mb-5">
                {Icon ? (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBgClassName}`}>
                        <Icon size={20} />
                    </div>
                ) : (
                    <div />
                )}
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
        </div>
    );
}

export const KpiCard = memo(KpiCardComponent);

