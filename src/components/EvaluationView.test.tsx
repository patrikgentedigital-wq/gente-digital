// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EvaluationView } from './EvaluationView';
import type { TeamMember } from '../types';
import { CRITERIA_SCORE_KEYS, getDefaultEvaluationCycle, getEvaluationCycles } from '../lib/evaluation';
import { clearDraft, saveDraft } from '../lib/draftUtils';
import { DEFAULT_CRITERIA_CATEGORIES } from '../data/catalogData';
import { loadDraft } from '../lib/draftUtils';
import { criteriaFingerprint } from '../lib/criteria';
import { toast } from '../utils/toastUtils';

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
    criteria: DEFAULT_CRITERIA_CATEGORIES,
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

  it('avisa quando o ciclo escolhido não é o atual, e não avisa no ciclo atual', async () => {
    const { onLoadEvaluation } = renderEvaluation();
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalled());
    expect(screen.queryByText(/ciclo anterior/i)).toBeNull();

    const previous = getEvaluationCycles()[1];
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: previous.id } });

    const banner = await screen.findByRole('status', { name: /ciclo anterior/i });
    expect(banner.textContent).toContain(previous.id.replace('/', ' / '));
    expect(banner.textContent).toContain(getDefaultEvaluationCycle().replace('/', ' / '));

    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: getDefaultEvaluationCycle() } });
    await waitFor(() => expect(screen.queryByText(/ciclo anterior/i)).toBeNull());
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

  it('explica por que o botão Salvar está travado e mostra o selo "Salva às" depois de salvar', async () => {
    const { onSaveEvaluation, onLoadEvaluation } = renderEvaluation();
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalled());

    expect(screen.getByText(/marque a nota de todas as perguntas \(faltam 31\)/)).toBeTruthy();
    expect(screen.getByText(/preencha o parecer da liderança/)).toBeTruthy();
    expect(screen.queryByText(/Salva às/)).toBeNull();

    for (const button of screen.getAllByRole('button', { name: '+' })) {
      fireEvent.click(button);
    }
    fireEvent.change(screen.getByPlaceholderText('Insira as principais considerações do feedback...'), {
      target: { value: 'Parecer validado pela liderança.' },
    });
    expect(screen.queryByText(/Para salvar:/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Avaliação' }));
    await waitFor(() => expect(onSaveEvaluation).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Salva às .* revisão 2 · 31\/155/)).toBeTruthy());
  });

  it('clicar em Salvar com notas ou parecer faltando avisa o que falta, em vez de não fazer nada', async () => {
    const errorSpy = vi.spyOn(toast, 'error').mockImplementation(() => undefined as never);
    const { onSaveEvaluation, onLoadEvaluation } = renderEvaluation();
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalled());

    const saveButton = screen.getByRole('button', { name: 'Salvar Avaliação' }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    fireEvent.click(saveButton);

    expect(onSaveEvaluation).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/Faltam 31 notas e o parecer da liderança/));
    errorSpy.mockRestore();
  });

  it('depois de salvar, não mostra nem deixa guardado o rascunho local', async () => {
    const { onSaveEvaluation, onLoadEvaluation } = renderEvaluation();
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalled());

    for (const button of screen.getAllByRole('button', { name: '+' })) {
      fireEvent.click(button);
    }
    fireEvent.change(screen.getByPlaceholderText('Insira as principais considerações do feedback...'), {
      target: { value: 'Parecer validado pela liderança.' },
    });
    await waitFor(() => expect(screen.getByText(/Rascunho salvo às/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Avaliação' }));
    await waitFor(() => expect(onSaveEvaluation).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Salva às/)).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 900));

    expect(screen.queryByText(/Rascunho salvo às/)).toBeNull();
    expect(loadDraft(member.id, getDefaultEvaluationCycle())).toBeNull();
  });

  it('mostra o total máximo do conjunto de perguntas do membro, não um valor fixo', async () => {
    const own = [{ id: 'c1', name: 'Própria', items: [{ id: '9-0', text: 'Z' }, { id: '9-1', text: 'Y' }] }];
    const { onLoadEvaluation } = renderEvaluation({ criteria: own });
    await waitFor(() => expect(onLoadEvaluation).toHaveBeenCalled());
    expect(screen.getByText('/ 10')).toBeTruthy();
  });
});

describe('EvaluationView com avaliação já salva', () => {
  const saved = Object.fromEntries(CRITERIA_SCORE_KEYS.map((key) => [key, 2]));
  const savedEvaluation = {
    id: 'evaluation_member-1_x',
    memberId: member.id,
    memberName: member.name,
    leaderName: '',
    score: 62,
    status: 'Alarme' as const,
    cycle: 'x',
    comments: 'Parecer salvo.',
    pdiGoals: [],
    criteriaScores: saved,
    revision: 3,
  };
  const baseProps = (): React.ComponentProps<typeof EvaluationView> => ({
    members: [member],
    criteria: null,
    selectedMember: member,
    onSelectMember: vi.fn(),
    onSaveEvaluation: vi.fn().mockResolvedValue(4),
    onOpenReportModal: vi.fn(),
    onLoadEvaluation: vi.fn().mockResolvedValue(savedEvaluation),
  });

  it('mostra as notas salvas mesmo quando as perguntas chegam depois da avaliação', async () => {
    const props = baseProps();
    const { rerender } = render(<EvaluationView {...props} />);
    await waitFor(() => expect(props.onLoadEvaluation).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByRole('button', { name: /salvar/i }) as HTMLButtonElement).disabled).toBe(true));

    rerender(<EvaluationView {...props} criteria={DEFAULT_CRITERIA_CATEGORIES} />);
    await waitFor(() => expect(screen.getByText('62')).toBeTruthy());
  });

  it('descarta um rascunho feito com outras perguntas, em vez de aplicá-lo às perguntas novas', async () => {
    const props = { ...baseProps(), criteria: DEFAULT_CRITERIA_CATEGORIES };
    const cycle = getDefaultEvaluationCycle();
    // rascunho de quando a pessoa usava OUTRAS perguntas (outra chave), com todas as notas preenchidas
    saveDraft(member.id, cycle, {
      scores: Object.fromEntries(CRITERIA_SCORE_KEYS.map((key) => [key, 4])),
      leaderComments: 'Parecer de outras perguntas.',
      pdiGoals: [],
      criteriaKey: 'chave-de-outro-conjunto',
    });
    try {
      render(<EvaluationView {...props} />);
      await waitFor(() => expect(props.onLoadEvaluation).toHaveBeenCalled());
      await waitFor(() => expect(loadDraft(member.id, cycle, 'chave-de-outro-conjunto')).toBeNull());

      // nada do rascunho antigo foi aplicado: aparece a avaliação salva no servidor, não as notas 4 nem o parecer antigo
      expect((screen.getByPlaceholderText('Insira as principais considerações do feedback...') as HTMLTextAreaElement).value).toBe('Parecer salvo.');
      expect(screen.queryByText(/Rascunho salvo às/)).toBeNull();
      expect(screen.getByText('62')).toBeTruthy(); // 31 perguntas x nota 2 (servidor), e não 124 (rascunho antigo)
    } finally {
      clearDraft(member.id, cycle);
    }
  });

  it('restaura o rascunho com a revisão do servidor, para o salvar não dar conflito', async () => {
    const props = { ...baseProps(), criteria: DEFAULT_CRITERIA_CATEGORIES };
    const cycle = getDefaultEvaluationCycle();
    saveDraft(member.id, cycle, {
      scores: Object.fromEntries(CRITERIA_SCORE_KEYS.map((key) => [key, 5])),
      leaderComments: 'Rascunho novo.',
      pdiGoals: [],
      criteriaKey: criteriaFingerprint(DEFAULT_CRITERIA_CATEGORIES),
    });
    try {
      render(<EvaluationView {...props} />);
      const saveButton = screen.getByRole('button', { name: 'Salvar Avaliação' });
      await waitFor(() => expect((saveButton as HTMLButtonElement).disabled).toBe(false));
      fireEvent.click(saveButton);

      await waitFor(() => expect(props.onSaveEvaluation).toHaveBeenCalledTimes(1));
      expect(props.onSaveEvaluation).toHaveBeenCalledWith(
        member.id, 155, expect.any(Object), 'Rascunho novo.', cycle, [], 3,
      );
    } finally {
      clearDraft(member.id, cycle);
    }
  });
});

describe('EvaluationView sem perguntas da equipe', () => {
  it('avisa que a equipe ainda não tem perguntas e não deixa salvar', async () => {
    const { onSaveEvaluation } = renderEvaluation({ criteria: null });
    expect(screen.getByText('Esta equipe ainda não tem perguntas de avaliação.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => expect(onSaveEvaluation).not.toHaveBeenCalled());
  });
});
