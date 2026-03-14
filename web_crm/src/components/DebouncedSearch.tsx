import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface DebouncedSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    delay?: number;
    className?: string;
}

export function DebouncedSearch({
    value,
    onChange,
    placeholder = 'Поиск...',
    delay = 300,
    className = ''
}: DebouncedSearchProps) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue);
            }
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [localValue, delay, onChange, value]);

    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input
                type="text"
                placeholder={placeholder}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 placeholder:text-slate-400 focus:outline-none transition-all"
            />
        </div>
    );
}
