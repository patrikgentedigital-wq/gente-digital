// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EvaluationView } from './EvaluationView';
import type { TeamMember } from '../types';
import { CRITERIA_SCORE_KEYS } from '../lib/evaluation';

const member: TeamMember = {
  id: 'member-1',
  name: 'Patrik',
  role: 'Analista de Redes',
  team: 'Djemerson',
  teamColor: '#3B6FE0',
  rank: 1,
  score: 135,
  maxScore: 155,
  status: 'Caminho Certo',
  avatarUrl: 'https://example.com/avatar.jpg',
  evaluationStatus: 'Pendente',
  email: 'patrik@example.com',
  history: [],
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub });

afterEach(() => cleanup());

function renderEvaluation(overrides: Partial<React.ComponentProps<typeof EvaluationView>> = {}) {
  const onLoadEvaluation = vi.fn().mockResolvedValue(null);
  const onSaveEvaluation = vi.fn().mockResolvedValue(2);
  const props: React.ComponentProps<typeof EvaluationView> = {
    members: [member],
    selectedMember: member,
    onSelectMember: vi.fn(),
    onSaveEvaluation,
    onOpenReportModal: vi.fn(),
    onLoadEvaluation,
    ...overrides,
  };

  render(<EvaluationView {...props} />);
  return { onLoadEvaluation, onSaveEvaluation };
}

describe('EvaluationView integration', () => {
  it('asks before discarding a dirty draft when changing cycle', async () => {
    const { onLoadEvaluation } = renderEvaluation();
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole('button', { name: '+' })[0]);
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'Janeiro/2026' } });

    expect(screen.getByRole('dialog', { name: 'Descartar alterações?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalledTimes(2));
  });

  it('submits all criteria and forwards the optimistic-concurrency revision', async () => {
    const { onSaveEvaluation, onLoadEvaluation } = renderEvaluation();
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalled());

    for (const button of screen.getAllByRole('button', { name: '+' })) {
      fireEvent.click(button);
    }
    fireEvent.change(screen.getByPlaceholderText('Insira as principais considerações do feedback...'), {
      target: { value: 'Parecer validado pela liderança.' },
    });

    const saveButton = screen.getByRole('button', { name: 'Salvar Avaliação' });
    await waitFor(() => expect((saveButton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSaveEvaluation).toHaveBeenCalledTimes(1));
    expect(onSaveEvaluation).toHaveBeenCalledWith(
      member.id,
      31,
      expect.objectContaining(Object.fromEntries(CRITERIA_SCORE_KEYS.map((key) => [key, 1]))),
      'Parecer validado pela liderança.',
      expect.any(String),
      [],
      0,
    );
  });
});
