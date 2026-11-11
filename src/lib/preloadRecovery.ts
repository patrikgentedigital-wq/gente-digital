const STORAGE_KEY = 'quadro:preload-reload-at';
const RETRY_WINDOW_MS = 60_000;

/**
 * Depois de uma atualização do site, os arquivos antigos deixam de existir. Quem estava com a
 * aba aberta leva erro ao abrir uma tela nova. Aqui a página recarrega sozinha, uma vez, para
 * pegar a versão nova. Se falhar de novo logo em seguida (ou se não der para guardar a marca),
 * o erro segue o caminho normal, sem laço de recarga.
 */
export function installPreloadErrorRecovery(win: Window = window, now: () => number = Date.now): void {
  win.addEventListener('vite:preloadError', (event) => {
    try {
      const last = Number(win.sessionStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(last) && last > 0 && now() - last < RETRY_WINDOW_MS) return;
      win.sessionStorage.setItem(STORAGE_KEY, String(now()));
    } catch {
      return;
    }
    event.preventDefault();
    win.location.reload();
  });
}
