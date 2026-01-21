import { useMemo } from 'react';
import type { Theme, ThemeColors } from '../types';

/**
 * Custom hook for theme management
 * Returns memoized theme colors based on current theme setting
 */
export const useTheme = (theme: Theme): ThemeColors => {
    return useMemo(() => {
        const isDark = theme === 'dark';
        return {
            isDark,
            bg: isDark ? 'bg-neutral-900' : 'bg-gray-50',
            text: isDark ? 'text-white' : 'text-gray-900',
            textSub: isDark ? 'text-neutral-400' : 'text-gray-500',
            card: isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-gray-200 shadow-xl',
            button: isDark ? 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600' : 'bg-white hover:bg-gray-100 active:bg-gray-200 border border-gray-200 shadow-sm',
            input: isDark ? 'bg-neutral-800 focus:ring-pink-500' : 'bg-white border-gray-300 focus:ring-pink-500',
            border: isDark ? 'border-neutral-700' : 'border-gray-200',
            hexBg: isDark ? '#171717' : '#f9fafb',
            dragHighlight: isDark ? 'bg-neutral-700' : 'bg-gray-200',
        };
    }, [theme]);
};
