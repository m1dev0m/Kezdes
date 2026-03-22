import { Image as ImageIcon, Edit, Trash, AlertCircle } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface MenuItemCardProps {
    id: string;
    name: string;
    price: string | number;
    category: string;
    imageUrl?: string;
    inStock: boolean;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onToggleStock?: (id: string, inStock: boolean) => void;
    className?: string;
}

export function MenuItemCard({
    id,
    name,
    price,
    category,
    imageUrl,
    inStock,
    onEdit,
    onDelete,
    onToggleStock,
    className
}: MenuItemCardProps) {
    return (
        <div className={cn("group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow", className)}>
            <div className="relative aspect-video bg-slate-100 flex items-center justify-center shrink-0">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                        <span className="text-xs">No image</span>
                    </div>
                )}

                <div className="absolute top-2 left-2">
                    <Badge variant="neutral" className="bg-white/90 backdrop-blur-sm shadow-sm">{category}</Badge>
                </div>

                {!inStock && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center text-red-600 font-bold tracking-tight gap-1">
                        <AlertCircle className="w-5 h-5" /> OUT OF STOCK
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-slate-800 leading-tight flex-1">{name}</h3>
                    <div className="font-bold text-slate-900 tabular-nums">
                        {typeof price === 'number' ? `$${price.toFixed(2)}` : price}
                    </div>
                </div>

                <div className="mt-auto pt-4 flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 py-1 h-8 px-2 text-xs"
                        onClick={() => onToggleStock?.(id, !inStock)}
                    >
                        {inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 shrink-0 text-slate-400 hover:text-slate-800"
                        onClick={() => onEdit?.(id)}
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 shrink-0 text-red-400 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDelete?.(id)}
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
