import { describe, expect, it } from 'vitest';
import { parseAssistantResponse, toHistory } from './assistant';

describe('parseAssistantResponse', () => {
  it('aceita texto e gráfico válidos', () => {
    const parsed = parseAssistantResponse({
      text: ' Campo caiu. ',
      chart: { type: 'barras', title: 'Média', labels: ['Set', 'Out'], values: [100, 63], unit: '%' },
    });
    expect(parsed).toEqual({
      actions: [],
      text: 'Campo caiu.',
      chart: { type: 'barras', title: 'Média', labels: ['Set', 'Out'], values: [100, 63], unit: '%' },
    });
  });

  it('descarta gráfico malformado, mas mantém o texto', () => {
    expect(parseAssistantResponse({ text: 'ok', chart: { type: 'barras', title: 't', labels: ['a'], values: [1, 2] } })).toEqual({ text: 'ok', chart: null, actions: [] });
    expect(parseAssistantResponse({ text: 'ok', chart: null })).toEqual({ text: 'ok', chart: null, actions: [] });
  });

  it('aceita ações propostas e descarta as malformadas', () => {
    const parsed = parseAssistantResponse({
      text: 'Preparei.',
      chart: null,
      actions: [
        { type: 'arquivar_membro', memberId: 'm1', summary: 'Arquivar Ana (equipe Campo)' },
        { type: 'mover_membro', memberId: 'm1', teamId: 't2', summary: 'Mover Ana' },
        { type: 'resolver_erro', errorId: 7, summary: 'Resolver erro #7' },
        { type: 'apagar_tudo', summary: 'x' },
        { type: 'arquivar_membro', memberId: 'm2' },
      ],
    });
    expect(parsed.actions.map((a) => a.type)).toEqual(['arquivar_membro', 'mover_membro', 'resolver_erro']);
    expect(parsed.actions[0]).toEqual({ type: 'arquivar_membro', memberId: 'm1', summary: 'Arquivar Ana (equipe Campo)' });
  });

  it('sem campo de ações, devolve lista vazia', () => {
    expect(parseAssistantResponse({ text: 'ok' }).actions).toEqual([]);
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
      actions: [],
    }));
    const history = toHistory(messages);
    expect(history).toHaveLength(6);
    expect(history[0]).toEqual({ role: 'user', content: 'm4' });
  });
});
