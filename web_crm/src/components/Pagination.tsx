import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        const endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            pages.push(
                <button
                    key={1}
                    onClick={() => onPageChange(1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    1
                </button>
            );
            if (startPage > 2) {
                pages.push(<span key="ellipsis1" className="px-1 text-slate-400">...</span>);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === i
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="ellipsis2" className="px-1 text-slate-400">...</span>);
            }
            pages.push(
                <button
                    key={totalPages}
                    onClick={() => onPageChange(totalPages)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    {totalItems !== undefined && itemsPerPage !== undefined && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Показано <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span>–{' '}
                            <span className="font-bold text-slate-900 dark:text-white">
                                {Math.min(currentPage * itemsPerPage, totalItems)}
                            </span>{' '}
                            из <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                        {renderPageNumbers()}
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-lg bg-white dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                    Назад
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-lg bg-white dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                    Далее
                </button>
            </div>
        </div>
    );
}
