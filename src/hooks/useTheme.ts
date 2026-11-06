import { useEffect, useState, useCallback } from 'react';
import { ThemeMode } from '../types/system';
import { StorageService } from '../services/storageService';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return StorageService.getSettings().theme || 'dark';
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    let isDark = false;

    if (mode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = mode === 'dark';
    }

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    StorageService.saveSettings({ theme: newTheme });
    applyTheme(newTheme);
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return { theme, setTheme };
}
