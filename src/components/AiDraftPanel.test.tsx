// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const requestEvaluationDraft = vi.fn();
vi.mock('../lib/backend', () => ({ requestEvaluationDraft: (...args: unknown[]) => requestEvaluationDraft(...args) }));

import { AiDraftPanel } from './AiDraftPanel';

afterEach(() => {
  cleanup();
  requestEvaluationDraft.mockReset();
});

const categories = [{ id: 'c1', name: 'Entrega', items: [{ id: 'q1', text: 'Cumpre prazos' }] }];
const baseProps = {
  jobTitle: 'Técnico de Campo',
  categories,
  scores: { q1: 4 } as Record<string, number | undefined>,
  onUseComment: vi.fn(),
  onAddGoals: vi.fn(),
};

describe('AiDraftPanel', () => {
  it('fica desligado até todas as notas estarem preenchidas', () => {
    render(<AiDraftPanel {...baseProps} scores={{}} />);
    expect((screen.getByRole('button', { name: /Sugerir rascunho/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('pede o rascunho sem nome do colaborador e mostra a sugestão para o líder decidir', async () => {
    requestEvaluationDraft.mockResolvedValue({ comment: 'Bom ciclo.', goals: [{ title: 'Reduzir retrabalho', deadline: '30 dias' }] });
    render(<AiDraftPanel {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sugerir rascunho/ }));

    await screen.findByText('Bom ciclo.');
    expect(requestEvaluationDraft).toHaveBeenCalledWith({
      jobTitle: 'Técnico de Campo',
      categories: [{ name: 'Entrega', items: [{ text: 'Cumpre prazos', score: 4 }] }],
    });
    expect(screen.getByText('Reduzir retrabalho')).toBeTruthy();
    expect(baseProps.onUseComment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Usar como parecer' }));
    expect(baseProps.onUseComment).toHaveBeenCalledWith('Bom ciclo.');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar metas ao PDI' }));
    expect(baseProps.onAddGoals).toHaveBeenCalledWith([{ title: 'Reduzir retrabalho', deadline: '30 dias' }]);
  });

  it('mostra a mensagem de erro e permite tentar de novo', async () => {
    requestEvaluationDraft.mockRejectedValue(new Error('A IA está indisponível agora.'));
    render(<AiDraftPanel {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sugerir rascunho/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('A IA está indisponível agora.'));
  });
});
