import type { ReactNode } from 'react';
import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type TrendType = 'up' | 'down' | 'neutral';

type Props = {
    label: string;
    value: ReactNode;
    icon?: React.ComponentType<{ size?: number, className?: string }>;
    iconBgClassName?: string;
    className?: string;
    trend?: {
        value: string;
        type: TrendType;
    };
    mini?: boolean;
};

function KpiCardComponent({ label, value, icon: Icon, iconBgClassName = '', className = '', trend, mini = false }: Props) {
    return (
        <div className={`bg-white border border-slate-100 rounded-[28px] ${mini ? 'p-4' : 'p-6'} transition-all shadow-sm group hover:border-primary hover:shadow-xl hover:shadow-primary/5 ${className}`}>
            <div className={`flex items-start justify-between ${mini ? 'mb-3' : 'mb-5'}`}>
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`p-2 rounded-xl border border-slate-50 ${iconBgClassName}`}>
                            <Icon size={mini ? 16 : 20} />
                        </div>
                    )}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none italic">{label}</p>
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold ${trend.type === 'up' ? 'text-green-500' :
                            trend.type === 'down' ? 'text-red-500' :
                                'text-slate-400'
                        }`}>
                        {trend.type === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                        {trend.type === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                        {trend.type === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                        <span>{trend.value}</span>
                    </div>
                )}
            </div>
            <p className={`${mini ? 'text-2xl' : 'text-3xl'} font-black text-slate-900 tabular-nums tracking-tighter leading-none italic`}>{value}</p>
        </div>
    );
}

export const KpiCard = memo(KpiCardComponent);

