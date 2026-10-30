import { describe, expect, it } from 'vitest';
import { parseAssistantResponse, toHistory } from './assistant';

describe('parseAssistantResponse', () => {
  it('aceita texto e gráfico válidos', () => {
    const parsed = parseAssistantResponse({
      text: ' Campo caiu. ',
      chart: { type: 'barras', title: 'Média', labels: ['Set', 'Out'], values: [100, 63], unit: '%' },
    });
    expect(parsed).toEqual({
      text: 'Campo caiu.',
      chart: { type: 'barras', title: 'Média', labels: ['Set', 'Out'], values: [100, 63], unit: '%' },
    });
  });

  it('descarta gráfico malformado, mas mantém o texto', () => {
    expect(parseAssistantResponse({ text: 'ok', chart: { type: 'barras', title: 't', labels: ['a'], values: [1, 2] } })).toEqual({ text: 'ok', chart: null });
    expect(parseAssistantResponse({ text: 'ok', chart: null })).toEqual({ text: 'ok', chart: null });
  });

  it('falha sem texto', () => {
    expect(() => parseAssistantResponse({ chart: null })).toThrow();
    expect(() => parseAssistantResponse(null)).toThrow();
  });
});

describe('toHistory', () => {
  it('guarda só texto das últimas 6 mensagens', () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      text: `m${i}`,
      chart: null,
    }));
    const history = toHistory(messages);
    expect(history).toHaveLength(6);
    expect(history[0]).toEqual({ role: 'user', content: 'm4' });
  });
});
