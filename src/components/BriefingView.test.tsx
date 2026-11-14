// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TeamMember } from '../types';

// Função comum (não vi.fn) para a recusa: o espião do vitest deixa a rejeição sem tratamento.
const requestCycleBriefing = vi.fn();
let failWith: Error | null = null;
vi.mock('../lib/backend', () => ({
  requestCycleBriefing: (payload: unknown) => (failWith ? Promise.reject(failWith) : Promise.resolve(requestCycleBriefing(payload))),
}));

import { BriefingView } from './BriefingView';

afterEach(() => cleanup());
beforeEach(() => {
  requestCycleBriefing.mockReset();
  failWith = null;
});

const m = (id: string, name: string, history: TeamMember['history']): TeamMember => ({
  id, name, role: 'Técnico', team: 'Danielle', teamColor: '#000000', rank: 0, score: 0, maxScore: 100,
  status: 'Alarme', avatarUrl: '', evaluationStatus: 'Concluído', email: '', history,
});
const members = [
  m('1', 'Ana', [{ month: 'Outubro/2026', score: 70, max: 100 }, { month: 'Novembro/2026', score: 92, max: 100 }]),
  m('2', 'Bia', [{ month: 'Outubro/2026', score: 95, max: 100 }, { month: 'Novembro/2026', score: 80, max: 100 }]),
];

describe('BriefingView', () => {
  it('mostra os números do ciclo sem precisar da IA', () => {
    render(<BriefingView members={members} />);
    expect(screen.getByText(/Avaliados:/).textContent).toContain('2 de 2');
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
    expect(screen.getByText(/subiu de Alarme para Voando/)).toBeTruthy();
  });

  it('manda para a IA só códigos, e mostra a resposta com os nomes de volta', async () => {
    requestCycleBriefing.mockResolvedValue({
      headline: 'P1 liderou o ciclo',
      highlights: ['P1 subiu 22 pontos'],
      attention: [],
      talkingPoints: [{ code: 'P2', point: 'Conversar sobre a queda' }],
      nextSteps: [],
    });
    render(<BriefingView members={members} />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto com IA/ }));
    await waitFor(() => expect(screen.getByText('Ana liderou o ciclo')).toBeTruthy());
    expect(JSON.stringify(requestCycleBriefing.mock.calls[0][0])).not.toMatch(/Ana|Bia|Danielle/);
    expect(screen.getByText('Bia:')).toBeTruthy();
  });

  it('mostra o erro em português quando a IA falha', async () => {
    failWith = new Error('A IA está indisponível agora. Tente de novo em instantes.');
    render(<BriefingView members={members} />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto com IA/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('indisponível'));
  });

  it('avisa quando ainda não há avaliações', () => {
    render(<BriefingView members={[]} />);
    expect(screen.getByRole('status').textContent).toContain('Ainda não há avaliações');
  });
});
