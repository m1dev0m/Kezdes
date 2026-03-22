import { Clock, Users, User, Edit, XCircle } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Dropdown } from './ui/Dropdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

export interface BookingCardProps {
    id: string;
    status: BookingStatus;
    time: string;
    date?: string;
    tableNumber: string | number;
    guestName: string;
    guestCount: number;
    phone?: string;
    notes?: string;
    onEdit?: (id: string) => void;
    onCancel?: (id: string) => void;
    onStatusChange?: (id: string, newStatus: BookingStatus) => void;
    className?: string;
}

const statusConfig: Record<BookingStatus, { variant: 'success' | 'warning' | 'error' | 'neutral', label: string }> = {
    confirmed: { variant: 'success', label: 'Confirmed' },
    pending: { variant: 'warning', label: 'Pending' },
    cancelled: { variant: 'error', label: 'Cancelled' },
    completed: { variant: 'neutral', label: 'Completed' },
};

export function BookingCard({
    id,
    status,
    time,
    date,
    tableNumber,
    guestName,
    guestCount,
    phone,
    notes,
    onEdit,
    onCancel,
    onStatusChange,
    className
}: BookingCardProps) {
    const config = statusConfig[status];

    return (
        <div className={cn("bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow", className)}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <Badge variant={config.variant} className="w-fit">{config.label}</Badge>
                    <div className="flex items-center gap-2 text-slate-800 font-semibold mt-1">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span>{time}</span>
                        {date && <span className="text-sm font-normal text-slate-500 mx-1">• {date}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <div className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-lg text-sm">
                        Table {tableNumber}
                    </div>
                    <Dropdown
                        className="w-10 ml-1"
                        options={[
                            { value: 'edit', label: 'Edit Booking', icon: <Edit className="w-4 h-4" /> },
                            { value: 'cancel', label: 'Cancel Booking', icon: <XCircle className="w-4 h-4 text-red-500" /> }
                        ]}
                        onChange={(val) => {
                            if (val === 'edit' && onEdit) onEdit(id);
                            if (val === 'cancel' && onCancel) onCancel(id);
                        }}
                        placeholder=""
                        renderOption={(opt) => (
                            <div className="flex items-center gap-2">
                                {opt.icon}
                                <span className={opt.value === 'cancel' ? 'text-red-500' : ''}>{opt.label}</span>
                            </div>
                        )}
                    />
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-sm">{guestName}</span>
                    {phone && <span className="text-slate-500 text-sm ml-auto">{phone}</span>}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{guestCount} Guests</span>
                </div>
            </div>

            {notes && (
                <div className="bg-amber-50 border border-amber-100 p-2 rounded-lg text-xs justify-center mb-4 text-amber-800 italic">
                    "{notes}"
                </div>
            )}

            {onStatusChange && status !== 'cancelled' && status !== 'completed' && (
                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs py-1"
                        disabled={status === 'confirmed'}
                        onClick={() => onStatusChange(id, 'confirmed')}
                    >
                        Confirm
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 text-xs py-1 hover:text-red-600 hover:bg-red-50"
                        size="sm"
                        onClick={() => onStatusChange(id, 'cancelled')}
                    >
                        Decline
                    </Button>
                </div>
            )}
        </div>
    );
}
