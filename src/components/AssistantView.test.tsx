// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const askAssistant = vi.fn();
vi.mock('../lib/backend', () => ({ askAssistant: (...args: unknown[]) => askAssistant(...args) }));

import { AssistantView } from './AssistantView';

beforeAll(() => {
  // O Recharts mede o contêiner; no jsdom ele precisa de um ResizeObserver de mentira.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  cleanup();
  askAssistant.mockReset();
});

const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText('Pergunte sobre os dados'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
};

describe('AssistantView', () => {
  it('mostra sugestões de perguntas e envia a escolhida', async () => {
    askAssistant.mockResolvedValue({ text: 'A equipe Campo está em 63%.', chart: null });
    render(<AssistantView />);
    fireEvent.click(screen.getByRole('button', { name: /Qual equipe está melhor/ }));
    await screen.findByText('A equipe Campo está em 63%.');
    expect(askAssistant).toHaveBeenCalledWith([{ role: 'user', content: expect.stringContaining('Qual equipe está melhor') }]);
  });

  it('manda o histórico da conversa nas perguntas seguintes', async () => {
    askAssistant.mockResolvedValueOnce({ text: 'Primeira resposta.', chart: null });
    render(<AssistantView />);
    ask('Como está a equipe Campo?');
    await screen.findByText('Primeira resposta.');
    askAssistant.mockResolvedValueOnce({ text: 'Segunda resposta.', chart: null });
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

  it('não envia pergunta vazia', () => {
    render(<AssistantView />);
    expect((screen.getByRole('button', { name: 'Perguntar' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
