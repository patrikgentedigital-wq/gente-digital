// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createErrorReporter, describeError, installGlobalErrorReporting, shouldIgnoreError } from './errorReporting';

describe('describeError', () => {
  it('extrai mensagem e pilha de um Error, de um texto e de um valor qualquer', () => {
    const error = new Error('Falha ao salvar');
    expect(describeError(error)).toEqual({ message: 'Falha ao salvar', stack: error.stack });
    expect(describeError('texto solto')).toEqual({ message: 'texto solto' });
    expect(describeError({ code: 42 })).toEqual({ message: '{"code":42}' });
    expect(describeError(undefined).message).toBe('Erro desconhecido');
  });
});

describe('shouldIgnoreError', () => {
  it('ignora ruído que o navegador gera sem defeito do app', () => {
    expect(shouldIgnoreError('ResizeObserver loop completed with undelivered notifications.')).toBe(true);
    expect(shouldIgnoreError('Script error.')).toBe(true);
    expect(shouldIgnoreError('The operation was aborted. AbortError')).toBe(true);
    expect(shouldIgnoreError('Cannot read properties of undefined')).toBe(false);
  });
});

describe('createErrorReporter', () => {
  it('envia o erro com endereço e navegador, e não repete a mesma mensagem em 30 segundos', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    let now = 1_000;
    const reporter = createErrorReporter(send, () => now);

    reporter.report(new Error('Quebrou A'), 'window');
    reporter.report(new Error('Quebrou A'), 'window');
    now += 31_000;
    reporter.report(new Error('Quebrou A'), 'window');
    reporter.report(new Error('Quebrou B'), 'boundary');
    await Promise.resolve();

    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[0][0]).toMatchObject({ source: 'window', message: 'Quebrou A', url: expect.any(String), userAgent: expect.any(String) });
    expect(send.mock.calls[2][0]).toMatchObject({ source: 'boundary', message: 'Quebrou B' });
  });

  it('não envia ruído e nunca lança, mesmo se o envio falhar', async () => {
    const send = vi.fn().mockRejectedValue(new Error('sem rede'));
    const reporter = createErrorReporter(send, () => 0);
    reporter.report(new Error('ResizeObserver loop limit exceeded'), 'window');
    expect(send).not.toHaveBeenCalled();
    expect(() => reporter.report(new Error('Outro erro'), 'save')).not.toThrow();
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('installGlobalErrorReporting', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

  it('captura erros da janela e promessas rejeitadas, e para de ouvir ao desfazer', () => {
    const report = vi.fn();
    cleanups.push(installGlobalErrorReporting({ report }));

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('Erro na janela'), message: 'Erro na janela' }));
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'Erro na janela' }), 'window');

    const rejection = new Event('unhandledrejection') as Event & { reason: unknown };
    rejection.reason = new Error('Promessa rejeitada');
    window.dispatchEvent(rejection);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'Promessa rejeitada' }), 'promise');

    // Disparar um erro real depois do cleanup seria visto pelo próprio Vitest como falha do teste;
    // então confirma-se que os dois ouvintes foram removidos.
    const removed = vi.spyOn(window, 'removeEventListener');
    cleanups.splice(0).forEach((cleanup) => cleanup());
    expect(removed).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removed).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    removed.mockRestore();
  });
});
