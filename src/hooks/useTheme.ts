import { useCallback, useEffect, useState } from 'react';
import { applyTheme, nextTheme, readStoredTheme, saveTheme, type Theme } from '../lib/theme';

/** Tema claro/escuro do site, lembrado no navegador. Relatórios impressos saem sempre claros. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const toLight = () => applyTheme(root, 'light');
    const back = () => applyTheme(root, theme);
    window.addEventListener('beforeprint', toLight);
    window.addEventListener('afterprint', back);
    return () => {
      window.removeEventListener('beforeprint', toLight);
      window.removeEventListener('afterprint', back);
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = nextTheme(theme);
    setTheme(next);
    saveTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}
