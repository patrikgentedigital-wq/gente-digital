// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const askAssistant = vi.fn();
const confirmAssistantAction = vi.fn();
vi.mock('../lib/backend', () => ({
  askAssistant: (...args: unknown[]) => askAssistant(...args),
  confirmAssistantAction: (...args: unknown[]) => confirmAssistantAction(...args),
}));

import { AssistantView } from './AssistantView';

beforeAll(() => {
  // O Recharts mede o contêiner; no jsdom ele precisa de um ResizeObserver de mentira.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  cleanup();
  askAssistant.mockReset();
  confirmAssistantAction.mockReset();
});

const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText('Pergunte sobre os dados'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
};

describe('AssistantView', () => {
  it('mostra sugestões de perguntas e envia a escolhida', async () => {
    askAssistant.mockResolvedValue({ text: 'A equipe Campo está em 63%.', chart: null, actions: [] });
    render(<AssistantView />);
    fireEvent.click(screen.getByRole('button', { name: /Qual equipe está melhor/ }));
    await screen.findByText('A equipe Campo está em 63%.');
    expect(askAssistant).toHaveBeenCalledWith([{ role: 'user', content: expect.stringContaining('Qual equipe está melhor') }]);
  });

  it('manda o histórico da conversa nas perguntas seguintes', async () => {
    askAssistant.mockResolvedValueOnce({ text: 'Primeira resposta.', chart: null, actions: [] });
    render(<AssistantView />);
    ask('Como está a equipe Campo?');
    await screen.findByText('Primeira resposta.');
    askAssistant.mockResolvedValueOnce({ text: 'Segunda resposta.', chart: null, actions: [] });
    ask('E a Rede?');
    await screen.findByText('Segunda resposta.');
    expect(askAssistant).toHaveBeenLastCalledWith([
      { role: 'user', content: 'Como está a equipe Campo?' },
      { role: 'assistant', content: 'Primeira resposta.' },
      { role: 'user', content: 'E a Rede?' },
    ]);
  });

  it('mostra o erro em português e deixa tentar de novo', async () => {
    askAssistant.mockRejectedValue(new Error('A IA está indisponível agora.'));
    render(<AssistantView />);
    ask('Teste');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('A IA está indisponível agora.'));
    expect((screen.getByRole('button', { name: 'Perguntar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('mostra a ação proposta e só executa depois do clique em Confirmar', async () => {
    const action = { type: 'arquivar_membro' as const, memberId: 'm1', summary: 'Arquivar Ana Souza (equipe Campo)' };
    askAssistant.mockResolvedValue({ text: 'Preparei o arquivamento.', chart: null, actions: [action] });
    confirmAssistantAction.mockResolvedValue({ text: 'Feito: Arquivar Ana Souza (equipe Campo).', chart: null, actions: [] });
    render(<AssistantView />);
    ask('Arquive a Ana');
    await screen.findByText('Arquivar Ana Souza (equipe Campo)');
    expect(confirmAssistantAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByText('Feito: Arquivar Ana Souza (equipe Campo).');
    expect(confirmAssistantAction).toHaveBeenCalledWith(action);
    expect(screen.getByText('Executada.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
  });

  it('cancelar não executa nada', async () => {
    askAssistant.mockResolvedValue({ text: 'Preparei.', chart: null, actions: [{ type: 'resolver_erro', errorId: 7, summary: 'Resolver erro #7' }] });
    render(<AssistantView />);
    ask('Resolva o erro 7');
    await screen.findByText('Resolver erro #7');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Cancelada.')).toBeTruthy();
    expect(confirmAssistantAction).not.toHaveBeenCalled();
  });

  it('se a execução falhar, mostra o erro e deixa confirmar de novo', async () => {
    askAssistant.mockResolvedValue({ text: 'Preparei.', chart: null, actions: [{ type: 'restaurar_membro', memberId: 'm9', summary: 'Restaurar Davi Reis (equipe Campo)' }] });
    confirmAssistantAction.mockRejectedValue(new Error('Este colaborador não está arquivado.'));
    render(<AssistantView />);
    ask('Restaure o Davi');
    await screen.findByText('Restaurar Davi Reis (equipe Campo)');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Este colaborador não está arquivado.'));
    expect((screen.getByRole('button', { name: 'Confirmar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('não envia pergunta vazia', () => {
    render(<AssistantView />);
    expect((screen.getByRole('button', { name: 'Perguntar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
