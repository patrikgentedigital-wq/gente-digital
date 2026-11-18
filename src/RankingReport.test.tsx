// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import type { TeamMember } from './types';

const fake = vi.hoisted(() => ({
  getEvaluation: vi.fn(), getLatestEvaluation: vi.fn(), getCriteriaSet: vi.fn(), toastError: vi.fn(),
}));
vi.mock('./hooks/useAuthSession', () => ({ useAuthSession: () => ({
  authUser: { id: 'lider' }, authReady: true, authRole: 'admin', authRoleReady: true,
}) }));
vi.mock('./hooks/useMembers', () => ({ useMembers: () => ({
  members: [member], setMembers: vi.fn(), membersError: null, membersLoading: false,
}) }));
vi.mock('./lib/backend', async (load) => ({
  ...await load<typeof import('./lib/backend')>(),
  getEvaluation: fake.getEvaluation, getLatestEvaluation: fake.getLatestEvaluation,
  getCriteriaSet: fake.getCriteriaSet, countOpenClientErrors: vi.fn().mockResolvedValue(0),
  initialAuthLink: { type: null, failed: false },
}));
vi.mock('./utils/toastUtils', async (load) => ({
  ...await load<typeof import('./utils/toastUtils')>(),
  toast: { error: fake.toastError, success: vi.fn(), info: vi.fn(), subscribe: () => () => {} },
}));

const member: TeamMember = {
  id: 'pessoa-1', name: 'Pessoa Exemplo', role: 'Analista', team: 'Equipe', teamColor: '#ffe708',
  rank: 1, score: 4, maxScore: 5, status: 'Atenção', avatarUrl: '', email: '', evaluationStatus: 'Concluído',
  history: [{ month: 'Outubro/2026', score: 4, max: 5 }],
};
const evaluation = {
  id: 'evaluation_pessoa-1_outubro_2026', memberId: member.id, memberName: member.name,
  leaderName: '', score: 4, maxScore: 5, status: 'Atenção', cycle: 'Outubro/2026',
  comments: 'Parecer sintético salvo.', pdiGoals: [], criteriaScores: { q1: 4 },
  criteriaTeamId: 'Equipe', criteriaVersion: 1, revision: 1,
};
beforeEach(() => {
  fake.getEvaluation.mockReset(); fake.getLatestEvaluation.mockReset(); fake.getCriteriaSet.mockReset(); fake.toastError.mockReset();
  fake.getCriteriaSet.mockResolvedValue({ teamId: 'Equipe', version: 1, maxScore: 5, categories: [{ id: 'c1', name: 'Entrega', items: [{ id: 'q1', text: 'Entrega?' }] }] });
  window.history.replaceState(null, '', '/');
});
afterEach(cleanup);

async function openReport() {
  fireEvent.click(await screen.findByRole('button', { name: 'Mais ações de Pessoa Exemplo' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Gerar relatório PDF' }));
}

it('Ranking abre a última avaliação salva de outubro com seu parecer e pontuação', async () => {
  fake.getEvaluation.mockResolvedValue(evaluation);
  render(<App />);
  await openReport();
  const dialog = await screen.findByRole('dialog', { name: 'Relatório Consolidado de Desempenho' });
  expect(within(dialog).getByText(/Parecer sintético salvo/)).toBeTruthy();
  expect(within(dialog).getByText(/Ciclo: Outubro\/2026/)).toBeTruthy();
  expect(await within(dialog).findByText('4/5')).toBeTruthy();
  expect(fake.getEvaluation).toHaveBeenCalledWith('evaluation_pessoa-1_outubro_2026');
});

it('Ranking seleciona o ciclo filtrado para o PDF', async () => {
  fake.getEvaluation.mockResolvedValue(evaluation);
  render(<App />);
  const option = await screen.findByRole('option', { name: 'Outubro/2026' });
  fireEvent.change(option.closest('select')!, { target: { value: 'Outubro/2026' } });
  await openReport();
  const dialog = await screen.findByRole('dialog', { name: 'Relatório Consolidado de Desempenho' });
  expect(within(dialog).getByText(/Ciclo: Outubro\/2026/)).toBeTruthy();
  expect(fake.getEvaluation).toHaveBeenCalledWith('evaluation_pessoa-1_outubro_2026');
  expect(fake.getLatestEvaluation).not.toHaveBeenCalled();
});

it('não abre relatório quando não existe avaliação', async () => {
  fake.getLatestEvaluation.mockResolvedValue(null);
  fake.getEvaluation.mockResolvedValue(null);
  render(<App />);
  await openReport();
  await waitFor(() => expect(fake.toastError).toHaveBeenCalled());
  expect(screen.queryByRole('dialog', { name: 'Relatório Consolidado de Desempenho' })).toBeNull();
});
