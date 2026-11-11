// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installPreloadErrorRecovery } from './preloadRecovery';

function makeWindow() {
  const target = new EventTarget();
  const store = new Map<string, string>();
  return {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
    location: { reload: vi.fn() },
  };
}

function preloadError() {
  return new Event('vite:preloadError', { cancelable: true });
}

describe('installPreloadErrorRecovery', () => {
  let win: ReturnType<typeof makeWindow>;
  beforeEach(() => {
    win = makeWindow();
  });
  afterEach(() => vi.restoreAllMocks());

  it('recarrega a página quando um arquivo novo não carrega (aba aberta antes de uma atualização)', () => {
    installPreloadErrorRecovery(win as unknown as Window, () => 1_000_000);
    const event = preloadError();
    win.dispatchEvent(event);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('não entra em laço: uma segunda falha logo depois segue como erro normal', () => {
    let clock = 1_000_000;
    installPreloadErrorRecovery(win as unknown as Window, () => clock);
    win.dispatchEvent(preloadError());
    clock += 5_000;
    const second = preloadError();
    win.dispatchEvent(second);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it('volta a recarregar numa falha bem depois da anterior', () => {
    let clock = 1_000_000;
    installPreloadErrorRecovery(win as unknown as Window, () => clock);
    win.dispatchEvent(preloadError());
    clock += 10 * 60_000;
    win.dispatchEvent(preloadError());
    expect(win.location.reload).toHaveBeenCalledTimes(2);
  });

  it('se o navegador não deixa guardar a marca, não recarrega (evita laço infinito)', () => {
    const broken = makeWindow();
    broken.sessionStorage.setItem = () => {
      throw new Error('bloqueado');
    };
    installPreloadErrorRecovery(broken as unknown as Window, () => 1_000_000);
    const event = preloadError();
    broken.dispatchEvent(event);
    expect(broken.location.reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
