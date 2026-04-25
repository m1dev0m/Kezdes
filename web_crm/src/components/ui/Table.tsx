import React from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface Column<T> {
    key: string;
    title: string | React.ReactNode;
    dataKey?: keyof T;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    render?: (record: T, index: number) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface TablePagination {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    totalItems?: number;
}

export interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    rowKey: (record: T) => string;
    isLoading?: boolean;

    
    selectedRowKeys?: string[];
    onSelectionChange?: (selectedKeys: string[]) => void;

    
    sortKey?: string;
    sortDirection?: SortDirection;
    onSort?: (key: string, direction: SortDirection) => void;

    
    pagination?: TablePagination;

    
    onRowClick?: (record: T) => void;
    className?: string;
    stickyHeader?: boolean;
}

export function Table<T>({
    columns,
    data,
    rowKey,
    isLoading,
    selectedRowKeys,
    onSelectionChange,
    sortKey,
    sortDirection,
    onSort,
    pagination,
    onRowClick,
    className,
    stickyHeader = true,
}: TableProps<T>) {
    const isSelectable = selectedRowKeys !== undefined && onSelectionChange !== undefined;

    const allSelected = data.length > 0 && selectedRowKeys && data.every(record => selectedRowKeys.includes(rowKey(record)));
    const someSelected = data.length > 0 && selectedRowKeys && data.some(record => selectedRowKeys.includes(rowKey(record))) && !allSelected;

    const handleSelectAll = () => {
        if (!onSelectionChange) return;
        if (allSelected) {
            onSelectionChange([]);
        } else {
            onSelectionChange(data.map(rowKey));
        }
    };

    const handleSelectRow = (key: string) => {
        if (!onSelectionChange || !selectedRowKeys) return;
        if (selectedRowKeys.includes(key)) {
            onSelectionChange(selectedRowKeys.filter(k => k !== key));
        } else {
            onSelectionChange([...selectedRowKeys, key]);
        }
    };

    const handleSort = (key: string) => {
        if (!onSort) return;
        let nextDirection: SortDirection = 'asc';
        if (sortKey === key) {
            if (sortDirection === 'asc') nextDirection = 'desc';
            else if (sortDirection === 'desc') nextDirection = null;
        }
        onSort(key, nextDirection);
    };

    return (
        <div className={cn("w-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden", className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className={cn(
                        "text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200",
                        stickyHeader && "sticky top-0 z-10"
                    )}>
                        <tr>
                            {isSelectable && (
                                <th scope="col" className="px-4 py-3 w-12 text-center">
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary focus:ring-1"
                                            checked={!!allSelected}
                                            ref={input => {
                                                if (input) input.indeterminate = !!someSelected;
                                            }}
                                            onChange={handleSelectAll}
                                        />
                                    </div>
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={cn(
                                        "px-4 py-3 font-medium tracking-wider",
                                        col.align === 'center' && 'text-center',
                                        col.align === 'right' && 'text-right',
                                        col.sortable && 'cursor-pointer select-none hover:bg-slate-100 transition-colors'
                                    )}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className={cn(
                                        "flex items-center gap-1",
                                        col.align === 'center' && 'justify-center',
                                        col.align === 'right' && 'justify-end'
                                    )}>
                                        {col.title}
                                        {col.sortable && (
                                            <div className="flex flex-col text-slate-400">
                                                <ChevronUp className={cn("w-3 h-3 -mb-1", sortKey === col.key && sortDirection === 'asc' && "text-slate-800")} />
                                                <ChevronDown className={cn("w-3 h-3 -mt-1", sortKey === col.key && sortDirection === 'desc' && "text-slate-800")} />
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + (isSelectable ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (isSelectable ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            data.map((record, index) => {
                                const key = rowKey(record);
                                const isSelected = selectedRowKeys?.includes(key);
                                return (
                                    <tr
                                        key={key}
                                        className={cn(
                                            "bg-white hover:bg-slate-50 transition-colors",
                                            onRowClick && "cursor-pointer",
                                            isSelected && "bg-slate-50"
                                        )}
                                        onClick={() => onRowClick?.(record)}
                                    >
                                        {isSelectable && (
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(key)}
                                                        className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary focus:ring-1"
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={cn(
                                                    "px-4 py-3",
                                                    col.align === 'center' && 'text-center',
                                                    col.align === 'right' && 'text-right'
                                                )}
                                            >
                                                {col.render
                                                    ? col.render(record, index)
                                                    : col.dataKey
                                                        ? (record[col.dataKey] as unknown as React.ReactNode)
                                                        : null}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 text-sm">
                    <div className="text-slate-500">
                        {pagination.totalItems !== undefined && (
                            <span>
                                Showing <span className="font-medium">{(pagination.currentPage - 1) * (pagination.pageSize || 10) + 1}</span> to <span className="font-medium">{Math.min(pagination.currentPage * (pagination.pageSize || 10), pagination.totalItems)}</span> of <span className="font-medium">{pagination.totalItems}</span> results
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage <= 1}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-2 text-slate-700">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </div>
                        <button
                            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage >= pagination.totalPages}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
