import React, { createContext, useContext, useState, useCallback } from 'react';
import { ru } from './ru';
import type { Translations } from './ru';

type Language = 'ru' | 'en';

interface I18nContextType {
    locale: Language;
    setLocale: (locale: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = {
    ru,
    en: ru,
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState<Language>('ru');

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let value: unknown = translations[locale];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
                value = (value as Record<string, unknown>)[k];
            } else {
                if (import.meta.env.DEV) {
                    console.warn(`Translation key not found: ${key}`);
                }
                return key;
            }
        }

        if (params && typeof params.count === 'number' && typeof value === 'object') {
            const count = params.count;
            const dict = value as Record<string, string>;

            if (locale === 'ru') {
                const mod10 = count % 10;
                const mod100 = count % 100;
                if (mod10 === 1 && mod100 !== 11) {
                    value = dict.one || dict.other || value;
                } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
                    value = dict.few || dict.other || value;
                } else {
                    value = dict.many || dict.many || dict.other || value;
                }
            } else {
                value = count === 1 ? (dict.one || value) : (dict.other || value);
            }
        }

        if (typeof value !== 'string') {
            if (typeof value === 'object' && value !== null && 'other' in value) {
                value = (value as any).other;
            } else {
                if (import.meta.env.DEV) {
                    console.warn(`Translation key is not a string: ${key}`);
                }
                return key;
            }
        }

        if (params) {
            return (value as string).replace(/\{(\w+)\}/g, (_, paramKey) =>
                String(params[paramKey] ?? `{${paramKey}}`)
            );
        }

        return value as string;
    }, [locale]);

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}
