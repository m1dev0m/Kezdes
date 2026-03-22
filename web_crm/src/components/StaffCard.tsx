import { User, Mail, Phone, Edit, Trash } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Dropdown } from './ui/Dropdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface StaffCardProps {
    id: string;
    name: string;
    role: string;
    status: 'active' | 'inactive';
    avatarUrl?: string;
    email?: string;
    phone?: string;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    className?: string;
}

export function StaffCard({
    id,
    name,
    role,
    status,
    avatarUrl,
    email,
    phone,
    onEdit,
    onDelete,
    className
}: StaffCardProps) {
    return (
        <div className={cn("bg-white border text-center border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative group", className, status === 'inactive' && "opacity-75")}>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Dropdown
                    className="w-8 shrink-0 border-none bg-transparent hover:bg-slate-100 p-0 shadow-none [&>button]:border-none [&>button]:shadow-none [&>button]:px-1"
                    options={[
                        { value: 'edit', label: 'Edit', icon: <Edit className="w-4 h-4" /> },
                        { value: 'delete', label: 'Delete', icon: <Trash className="w-4 h-4 text-red-500" /> }
                    ]}
                    onChange={(val) => {
                        if (val === 'edit' && onEdit) onEdit(id);
                        if (val === 'delete' && onDelete) onDelete(id);
                    }}
                    renderOption={(opt) => (
                        <div className="flex items-center gap-2">
                            {opt.icon}
                            <span className={opt.value === 'delete' ? 'text-red-500' : ''}>{opt.label}</span>
                        </div>
                    )}
                />
            </div>

            <div className="relative mx-auto w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center mb-4">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
                ) : (
                    <User className="w-8 h-8 text-slate-400" />
                )}
                <div className={cn(
                    "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white",
                    status === 'active' ? "bg-green-500" : "bg-slate-300"
                )}></div>
            </div>

            <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{name}</h3>
            <div className="flex justify-center mb-4">
                <Badge variant={role === 'Manager' || role === 'Admin' ? 'warning' : 'neutral'} className="text-[10px] uppercase tracking-wider">
                    {role}
                </Badge>
            </div>

            <div className="flex flex-col gap-2 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-left">
                <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate" title={email}>{email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{phone || 'No phone provided'}</span>
                </div>
            </div>
        </div>
    );
}
