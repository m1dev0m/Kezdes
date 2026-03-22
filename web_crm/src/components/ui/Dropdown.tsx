import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface Option {
    value: string;
    label: string;
    icon?: React.ReactNode;
    [key: string]: any;
}

export interface DropdownProps {
    options: Option[];
    value?: string | string[];
    onChange?: (value: any) => void;
    placeholder?: string;
    searchable?: boolean;
    multiple?: boolean;
    className?: string;
    renderOption?: (option: Option) => React.ReactNode;
    disabled?: boolean;
}

export function Dropdown({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    searchable = false,
    multiple = false,
    className,
    renderOption,
    disabled = false,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (optionValue: string) => {
        if (multiple) {
            const currentValue = Array.isArray(value) ? value : [];
            const newValue = currentValue.includes(optionValue)
                ? currentValue.filter(v => v !== optionValue)
                : [...currentValue, optionValue];
            onChange?.(newValue);
        } else {
            onChange?.(optionValue);
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    const selectedLabels = () => {
        if (multiple) {
            const currentValue = Array.isArray(value) ? value : [];
            if (currentValue.length === 0) return placeholder;
            if (currentValue.length === 1) {
                return options.find(o => o.value === currentValue[0])?.label || placeholder;
            }
            return `${currentValue.length} items selected`;
        } else {
            const selectedOption = options.find(o => o.value === value);
            return selectedOption ? (
                <div className="flex items-center gap-2">
                    {selectedOption.icon}
                    {selectedOption.label}
                </div>
            ) : placeholder;
        }
    };

    const isSelected = (optionValue: string) => {
        if (multiple) {
            return Array.isArray(value) && value.includes(optionValue);
        }
        return value === optionValue;
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2 bg-white border rounded-lg text-sm transition-colors",
                    isOpen ? "border-primary ring-1 ring-primary/20" : "border-slate-200 hover:border-slate-300",
                    disabled && "opacity-50 cursor-not-allowed bg-slate-50",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                )}
            >
                <span className={cn("truncate", !value || (Array.isArray(value) && value.length === 0) ? "text-slate-500" : "text-slate-900")}>
                    {selectedLabels()}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 pb-2 flex items-center gap-2 relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border-none rounded-md focus:ring-0 text-slate-900 placeholder:text-slate-400 transition-colors hover:bg-slate-100 outline-none"
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchQuery && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery('');
                                    }}
                                    className="absolute right-4 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-center text-slate-500">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const selected = isSelected(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleSelect(option.value);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left",
                                            selected ? "bg-primary/5 text-primary" : "text-slate-700 hover:bg-slate-100"
                                        )}
                                    >
                                        {renderOption ? (
                                            renderOption(option)
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {multiple && (
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                        selected ? "bg-primary border-primary text-white" : "border-slate-300"
                                                    )}>
                                                        {selected && <Check className="w-3 h-3" />}
                                                    </div>
                                                )}
                                                {!multiple && option.icon}
                                                <span className={cn(selected && !multiple && "font-medium")}>
                                                    {option.label}
                                                </span>
                                            </div>
                                        )}
                                        {!multiple && selected && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
