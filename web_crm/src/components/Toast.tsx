import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    title?: string;
}

let toastListener: ((toast: ToastMessage) => void) | null = null;

export const toast = {
    success: (message: string, title?: string) => addToast('success', message, title),
    error: (message: string, title?: string) => addToast('error', message, title),
    warning: (message: string, title?: string) => addToast('warning', message, title),
    info: (message: string, title?: string) => addToast('info', message, title),
};

const addToast = (type: ToastType, message: string, title?: string) => {
    if (toastListener) {
        toastListener({
            id: Math.random().toString(36).substring(2, 9),
            type,
            message,
            title
        });
    }
};

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    useEffect(() => {
        toastListener = (toast) => {
            setToasts((prev) => [...prev, toast]);
            setTimeout(() => {
                removeToast(toast.id);
            }, 5000);
        };
        return () => {
            toastListener = null;
        };
    }, []);

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <XCircle className="w-5 h-5 text-rose-500" />,
        warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const backgrounds = {
        success: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50',
        error: 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50',
        warning: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50',
        info: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50'
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`flex gap-3 p-4 rounded-xl border shadow-lg shadow-black/5 transform transition-all animate-in slide-in-from-right-8 fade-in duration-300 ${backgrounds[t.type]}`}
                >
                    <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
                    <div className="flex-1 min-w-0">
                        {t.title && <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</h4>}
                        <p className={`text-sm ${t.title ? 'mt-1 text-slate-600 dark:text-slate-400' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                            {t.message}
                        </p>
                    </div>
                    <button
                        onClick={() => removeToast(t.id)}
                        className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
