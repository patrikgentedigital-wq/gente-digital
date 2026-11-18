// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const reply = (headline: string) => ({ headline, highlights: [], attention: [], talkingPoints: [], nextSteps: [] });

describe('BriefingView', () => {
  it('descarta resposta de equipe anterior mesmo ao voltar e preserva o carregamento da nova requisição', async () => {
    const first = deferred<ReturnType<typeof reply>>();
    const second = deferred<ReturnType<typeof reply>>();
    requestCycleBriefing.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const other = { ...m('3', 'Caio', [{ month: 'Novembro/2026', score: 80, max: 100 }]), team: 'Outra' };
    render(<BriefingView members={[...members, other]} />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto com IA/ }));
    fireEvent.change(screen.getByLabelText('Equipe'), { target: { value: 'Outra' } });
    fireEvent.change(screen.getByLabelText('Equipe'), { target: { value: 'Danielle' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto com IA/ }));
    await act(async () => first.resolve(reply('P1 resultado antigo')));
    expect(screen.queryByText('Ana resultado antigo')).toBeNull();
    expect((screen.getByRole('button', { name: /Gerando briefing/ }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => second.resolve(reply('P1 resultado novo')));
    expect(screen.getByText('Ana resultado novo')).toBeTruthy();
  });

  it('descarta erros e textos quando dados ou associação dos códigos mudam', async () => {
    const first = deferred<ReturnType<typeof reply>>();
    requestCycleBriefing.mockReturnValueOnce(first.promise);
    const { rerender } = render(<BriefingView members={members} />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto com IA/ }));
    rerender(<BriefingView members={[{ ...members[0], id: 'nova-pessoa' }, members[1]]} />);
    await act(async () => first.reject(new Error('erro antigo')));
    expect(screen.queryByRole('alert')).toBeNull();
    requestCycleBriefing.mockResolvedValueOnce(reply('P1 resultado'));
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto com IA/ }));
    await screen.findByText('Ana resultado');
    rerender(<BriefingView members={[{ ...members[0], id: 'nova-pessoa', history: [{ month: 'Novembro/2026', score: 60, max: 100 }] }, members[1]]} />);
    expect(screen.queryByText('Ana resultado')).toBeNull();
  });

  it('descarta a resposta em voo ao trocar de ciclo', async () => {
    const pending = deferred<ReturnType<typeof reply>>();
    requestCycleBriefing.mockReturnValueOnce(pending.promise);
    render(<BriefingView members={members} />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar texto com IA/ }));
    fireEvent.change(screen.getByLabelText('Ciclo'), { target: { value: 'Outubro/2026' } });
    await act(async () => pending.resolve(reply('P1 do ciclo anterior')));
    expect(screen.queryByText('Ana do ciclo anterior')).toBeNull();
  });
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

  it('abre na primeira equipe que tem avaliação, mesmo que outra venha antes na ordem alfabética', () => {
    const semAvaliacao: TeamMember = { ...m('9', 'Zeca', undefined), team: 'Alexandre', evaluationStatus: 'Pendente' };
    render(<BriefingView members={[semAvaliacao, ...members]} />);
    expect(screen.getByText(/Avaliados:/).textContent).toContain('2 de 2');
    expect((screen.getByLabelText('Equipe') as HTMLSelectElement).value).toBe('Danielle');
  });

  it('equipe sem avaliação mostra aviso e mantém os seletores para trocar de equipe', () => {
    const semAvaliacao: TeamMember = { ...m('9', 'Zeca', undefined), team: 'Alexandre', evaluationStatus: 'Pendente' };
    render(<BriefingView members={[semAvaliacao, ...members]} />);
    fireEvent.change(screen.getByLabelText('Equipe'), { target: { value: 'Alexandre' } });
    expect(screen.getByRole('status').textContent).toContain('Alexandre ainda não tem avaliações');
    fireEvent.change(screen.getByLabelText('Equipe'), { target: { value: 'Danielle' } });
    expect(screen.getByText(/Avaliados:/)).toBeTruthy();
  });

  it('avisa quando ainda não há avaliações', () => {
    render(<BriefingView members={[]} />);
    expect(screen.getByRole('status').textContent).toContain('Ainda não há avaliações');
  });
});
