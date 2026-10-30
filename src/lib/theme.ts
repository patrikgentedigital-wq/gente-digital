export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'gd-theme';

const safeStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Tema escolhido neste navegador; claro por padrão (e se o armazenamento estiver bloqueado). */
export function readStoredTheme(storage: Storage | null = safeStorage()): Theme {
  try {
    return storage?.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: Theme, storage: Storage | null = safeStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sem armazenamento, o tema só vale até recarregar a página.
  }
}

/** `theme-dark` troca as cores base; `theme-dark-app` completa as cores extras que só o site usa. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.classList.toggle('theme-dark', theme === 'dark');
  root.classList.toggle('theme-dark-app', theme === 'dark');
}

export const nextTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');
