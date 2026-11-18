// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EvaluationView } from './EvaluationView';
import { getDefaultEvaluationCycle, getEvaluationCycles } from '../lib/evaluation';
import { loadDraft } from '../lib/draftUtils';
import { criteriaFingerprint } from '../lib/criteria';
import type { TeamMember } from '../types';

const { requestDraft } = vi.hoisted(() => ({ requestDraft: vi.fn() }));
vi.mock('../lib/backend', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/backend')>(),
  requestEvaluationDraft: requestDraft,
}));

Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({
  matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
}) });
Object.defineProperty(globalThis, 'ResizeObserver', { value: class { observe() {} unobserve() {} disconnect() {} } });
afterEach(() => { cleanup(); window.localStorage.clear(); requestDraft.mockReset(); });

const member: TeamMember = {
  id: 'teste-1', name: 'Pessoa A', role: 'Cargo A', team: 'Equipe', teamColor: '#000000',
  rank: 1, score: 0, maxScore: 5, status: 'Alarme', avatarUrl: '', evaluationStatus: 'Pendente',
  email: '', history: [],
};
const categories = [{ id: 'c1', name: 'Resultados', items: [{ id: 'q1', text: 'Cumpre prazos?' }] }];
const cycle = () => getDefaultEvaluationCycle();
const key = () => criteriaFingerprint(categories);
function props() {
  return {
    members: [member], selectedMember: member, criteria: categories,
    onSelectMember: vi.fn(), onOpenReportModal: vi.fn(),
    onSaveEvaluation: vi.fn().mockResolvedValue(1),
    onLoadEvaluation: vi.fn().mockResolvedValue(null),
    onLoadCriteria: vi.fn().mockResolvedValue({ teamId: member.team, version: 1, categories, maxScore: 5 }),
  };
}
async function ready() {
  await waitFor(() => expect((screen.getByRole('button', { name: 'Salvar Avaliação' }) as HTMLButtonElement).disabled).toBe(false));
}
function fill() {
  fireEvent.click(screen.getByRole('button', { name: '+' }));
  fireEvent.change(screen.getByPlaceholderText('Insira as principais considerações do feedback...'), { target: { value: 'Parecer de teste' } });
}

describe('proteção da avaliação e rascunhos', () => {
  it('não descarta a edição ao mudar o filtro sem trocar o colaborador', async () => {
    render(<EvaluationView {...props()} />);
    await ready(); fill();
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: member.team } });
    expect(screen.queryByRole('dialog', { name: 'Descartar alterações?' })).toBeNull();
    expect((screen.getByPlaceholderText('Insira as principais considerações do feedback...') as HTMLTextAreaElement).value).toBe('Parecer de teste');
  });
  it('remove o rascunho quando o usuário confirma descartar ao trocar o ciclo', async () => {
    const p = props(); const view = render(<EvaluationView {...p} />);
    await ready(); fill();
    await waitFor(() => expect(loadDraft(member.id, cycle(), key())).not.toBeNull(), { timeout: 2000 });
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: getEvaluationCycles()[1].id } });
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    view.unmount(); render(<EvaluationView {...p} />);
    await ready();
    expect((screen.getByPlaceholderText('Insira as principais considerações do feedback...') as HTMLTextAreaElement).value).toBe('');
    expect(loadDraft(member.id, cycle(), key())).toBeNull();
  });

  it('mantém um rascunho com nota zero', async () => {
    render(<EvaluationView {...props()} />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: '−' }));
    await waitFor(() => expect(loadDraft(member.id, cycle(), key())?.scores.q1).toBe(0), { timeout: 2000 });
  });

  it('restaura a edição mesmo se o avaliador navegar logo após escrever', async () => {
    const p = props();
    const view = render(<EvaluationView {...p} />);
    await ready();
    fill();
    view.unmount();
    render(<EvaluationView {...p} />);
    await ready();
    expect((screen.getByPlaceholderText('Insira as principais considerações do feedback...') as HTMLTextAreaElement).value).toBe('Parecer de teste');
  });

  it('usa a equipe da avaliação no relatório de um ciclo já salvo', async () => {
    const p = props();
    p.onLoadEvaluation.mockResolvedValue({ criteriaScores: { q1: 3 }, comments: '', pdiGoals: [], revision: 1,
      teamId: 'Equipe original', criteriaTeamId: member.team, criteriaVersion: 1 } as never);
    render(<EvaluationView {...p} />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Relatório PDF' }));
    expect(p.onOpenReportModal).toHaveBeenCalledWith(
      expect.objectContaining({ team: 'Equipe original' }),
      expect.objectContaining({ cycle: cycle(), draft: false }),
    );
  });

  it('remove o rascunho anterior se todas as alterações forem apagadas', async () => {
    const p = props(); const view = render(<EvaluationView {...p} />);
    await ready();
    const input = screen.getByPlaceholderText('Insira as principais considerações do feedback...');
    fireEvent.change(input, { target: { value: 'Texto temporário' } });
    await waitFor(() => expect(loadDraft(member.id, cycle(), key())?.leaderComments).toBe('Texto temporário'), { timeout: 2000 });
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(loadDraft(member.id, cycle(), key())).toBeNull(), { timeout: 2000 });
    view.unmount(); render(<EvaluationView {...p} />);
    await ready();
    expect((screen.getByPlaceholderText('Insira as principais considerações do feedback...') as HTMLTextAreaElement).value).toBe('');
  });

  it('bloqueia edição durante salvamento e conserva o rascunho se falhar', async () => {
    const p = props();
    let rejectSave!: (error: Error) => void;
    p.onSaveEvaluation.mockImplementation(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    render(<EvaluationView {...p} />);
    await ready(); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Avaliação' }));
    expect(p.onSaveEvaluation).toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Insira as principais considerações do feedback...').matches(':disabled')).toBe(true);
    expect((screen.getByRole('button', { name: 'Salvar Avaliação' }) as HTMLButtonElement).disabled).toBe(true);
    rejectSave(new Error('falha simulada'));
    await waitFor(() => expect(loadDraft(member.id, cycle(), key())?.leaderComments).toBe('Parecer de teste'));
  });

  it('descarta a sugestão de IA ao trocar de pessoa', async () => {
    requestDraft.mockResolvedValue({ comment: 'Sugestão para pessoa A', goals: [] });
    const p = props(); const second = { ...member, id: 'teste-2', name: 'Pessoa B' };
    const view = render(<EvaluationView {...p} />);
    await ready(); fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: /Sugerir rascunho/ }));
    await screen.findByText('Sugestão para pessoa A');
    view.rerender(<EvaluationView {...p} members={[member, second]} selectedMember={second} />);
    await ready();
    expect(screen.queryByText('Sugestão para pessoa A')).toBeNull();
  });

  it('não exibe resposta tardia da IA após mudar de pessoa', async () => {
    let resolveDraft!: (value: { comment: string; goals: never[] }) => void;
    requestDraft.mockImplementation(() => new Promise((resolve) => { resolveDraft = resolve; }));
    const p = props(); const second = { ...member, id: 'teste-2', name: 'Pessoa B' };
    const view = render(<EvaluationView {...p} />);
    await ready(); fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: /Sugerir rascunho/ }));
    view.rerender(<EvaluationView {...p} members={[member, second]} selectedMember={second} />);
    resolveDraft({ comment: 'Resposta tardia da pessoa A', goals: [] });
    await ready();
    expect(screen.queryByText('Resposta tardia da pessoa A')).toBeNull();
  });

  it('descarta a sugestão da IA após alteração de nota', async () => {
    requestDraft.mockResolvedValue({ comment: 'Sugestão antiga', goals: [] });
    render(<EvaluationView {...props()} />);
    await ready(); fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: /Sugerir rascunho/ }));
    await screen.findByText('Sugestão antiga');
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(screen.queryByText('Sugestão antiga')).toBeNull();
  });

  it('descarta a sugestão da IA ao mudar o ciclo', async () => {
    requestDraft.mockResolvedValue({ comment: 'Sugestão para o ciclo anterior', goals: [] });
    const p = props();
    p.onLoadEvaluation.mockResolvedValue({ criteriaScores: { q1: 3 }, comments: '', pdiGoals: [], revision: 1, criteriaTeamId: member.team, criteriaVersion: 1 } as never);
    render(<EvaluationView {...p} />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: /Sugerir rascunho/ }));
    await screen.findByText('Sugestão para o ciclo anterior');
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: getEvaluationCycles()[1].id } });
    await ready();
    expect(screen.queryByText('Sugestão para o ciclo anterior')).toBeNull();
  });
});
