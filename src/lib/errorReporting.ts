export type ErrorSource = 'window' | 'promise' | 'boundary' | 'save';

export interface ErrorReport {
  source: ErrorSource;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
}

export function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message || error.name, stack: error.stack };
  if (typeof error === 'string') return { message: error || 'Erro desconhecido' };
  if (error === undefined || error === null) return { message: 'Erro desconhecido' };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

// Ruído que o navegador gera sem que exista defeito no app.
const IGNORED = [/ResizeObserver loop/i, /^Script error\.?$/i, /AbortError/i];

export function shouldIgnoreError(message: string): boolean {
  return IGNORED.some((pattern) => pattern.test(message));
}

const REPEAT_WINDOW_MS = 30_000;

/**
 * Monta o registrador de erros. O registro nunca pode causar outro erro: qualquer falha ao
 * descrever ou enviar é engolida, e a mesma mensagem não é reenviada por 30 segundos.
 */
export function createErrorReporter(
  send: (report: ErrorReport) => Promise<void>,
  now: () => number = Date.now,
) {
  const recent = new Map<string, number>();

  return {
    report(error: unknown, source: ErrorSource): void {
      try {
        const { message, stack } = describeError(error);
        if (shouldIgnoreError(message)) return;

        const time = now();
        const last = recent.get(message);
        if (last !== undefined && time - last < REPEAT_WINDOW_MS) return;
        recent.set(message, time);
        if (recent.size > 100) recent.clear();

        void send({
          source,
          message,
          stack,
          url: typeof location === 'undefined' ? '' : location.href,
          userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
        }).catch(() => undefined);
      } catch {
        // O registro de erros não pode derrubar a tela que está tentando registrar.
      }
    },
  };
}

/** Escuta os erros que ninguém tratou na janela e as promessas rejeitadas; devolve como parar de escutar. */
export function installGlobalErrorReporting(reporter: { report: (error: unknown, source: ErrorSource) => void }): () => void {
  const onError = (event: ErrorEvent) => reporter.report(event.error ?? event.message, 'window');
  const onRejection = (event: PromiseRejectionEvent) => reporter.report(event.reason, 'promise');
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
