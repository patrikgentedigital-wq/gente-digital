// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, applyTheme, nextTheme, readStoredTheme, saveTheme } from './theme';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
});

describe('readStoredTheme', () => {
  it('começa claro quando nada foi escolhido', () => {
    expect(readStoredTheme()).toBe('light');
  });

  it('lembra a escolha salva e ignora valor estranho', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'azul');
    expect(readStoredTheme()).toBe('light');
  });

  it('não quebra se o navegador bloquear o armazenamento', () => {
    const blocked = { getItem: () => { throw new Error('bloqueado'); } } as unknown as Storage;
    expect(readStoredTheme(blocked)).toBe('light');
  });
});

describe('saveTheme', () => {
  it('guarda a escolha e não quebra se o armazenamento falhar', () => {
    saveTheme('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    const blocked = { setItem: () => { throw new Error('bloqueado'); } } as unknown as Storage;
    expect(() => saveTheme('light', blocked)).not.toThrow();
  });
});

describe('applyTheme', () => {
  it('liga e desliga as classes de tema escuro no elemento raiz', () => {
    applyTheme(document.documentElement, 'dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark-app')).toBe(true);
    applyTheme(document.documentElement, 'light');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-dark-app')).toBe(false);
  });
});

describe('nextTheme', () => {
  it('alterna entre claro e escuro', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });
});
