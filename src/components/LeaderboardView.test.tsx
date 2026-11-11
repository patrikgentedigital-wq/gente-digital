// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { TeamMember } from '../types';
import { LeaderboardView } from './LeaderboardView';

afterEach(() => cleanup());

let seq = 0;
const m = (over: Partial<TeamMember>): TeamMember => ({
  id: `m${++seq}`,
  name: `Pessoa ${seq}`,
  role: 'Técnico',
  team: 'Djemerson',
  teamColor: '#123456',
  rank: seq,
  score: 0,
  maxScore: 100,
  status: 'Alarme',
  avatarUrl: '',
  evaluationStatus: 'Concluído',
  email: '',
  ...over,
});

const props = {
  onSelectMemberForEvaluation: vi.fn(),
  onOpenReportModal: vi.fn(),
  onSelectMemberForDetail: vi.fn(),
  setSearchQuery: vi.fn(),
  searchQuery: '',
};

const avaliados = () => [
  m({ name: 'Ana', rank: 1, score: 95, status: 'Voando' }),
  m({ name: 'Bruno', rank: 2, score: 88, status: 'Caminho Certo' }),
  m({ name: 'Carla', rank: 3, score: 80, status: 'Atenção' }),
];

describe('LeaderboardView', () => {
  it('não avaliados ficam no bloco Aguardando avaliação, sem posição', () => {
    render(<LeaderboardView {...props} members={[...avaliados(), m({ name: 'Diego', rank: 4, evaluationStatus: 'Pendente' })]} />);
    const pendentes = screen.getByText('Aguardando avaliação (1)').closest('details') as HTMLElement;
    expect(within(pendentes).getByText('Diego')).toBeTruthy();
    expect(within(pendentes).queryByText('#4')).toBeNull();
    expect(within(pendentes).getByText('Sem avaliação')).toBeTruthy();
  });

  it('sem ninguém avaliado não há pódio', () => {
    render(
      <LeaderboardView
        {...props}
        members={[m({ evaluationStatus: 'Pendente' }), m({ evaluationStatus: 'Pendente' }), m({ evaluationStatus: 'Pendente' })]}
      />,
    );
    expect(screen.queryByLabelText('Pódio')).toBeNull();
    expect(screen.getByText('Aguardando avaliação (3)')).toBeTruthy();
  });

  it('com três avaliados, o pódio mostra os três primeiros', () => {
    render(<LeaderboardView {...props} members={avaliados()} />);
    const podio = screen.getByLabelText('Pódio');
    for (const nome of ['Ana', 'Bruno', 'Carla']) expect(within(podio).getByText(nome)).toBeTruthy();
  });

  it('busca que só encontra não avaliados mostra o bloco, não a mensagem de vazio', () => {
    render(
      <LeaderboardView
        {...props}
        searchQuery="diego"
        members={[...avaliados(), m({ name: 'Diego', evaluationStatus: 'Pendente' })]}
      />,
    );
    expect(screen.queryByText('Nenhum colaborador encontrado')).toBeNull();
    expect(screen.getByText('Aguardando avaliação (1)')).toBeTruthy();
  });

  it('editar, evolução e PDF ficam no menu ⋯', () => {
    const onOpenReportModal = vi.fn();
    const ana = avaliados()[0];
    render(<LeaderboardView {...props} onOpenReportModal={onOpenReportModal} onOpenMemberForm={vi.fn()} members={[ana]} />);
    expect(screen.queryByRole('menuitem', { name: 'Gerar relatório PDF' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mais ações de Ana' }));
    expect(screen.getByRole('menuitem', { name: 'Editar dados' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Ver evolução' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Gerar relatório PDF' }));
    expect(onOpenReportModal).toHaveBeenCalledWith(ana);
  });

  it('pendentes não oferecem relatório PDF no menu ⋯', () => {
    render(<LeaderboardView {...props} members={[m({ name: 'Diego', evaluationStatus: 'Pendente' })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mais ações de Diego' }));
    expect(screen.queryByRole('menuitem', { name: 'Gerar relatório PDF' })).toBeNull();
  });

  it('posições seguem a ordem dos avaliados, sem pular números', () => {
    render(
      <LeaderboardView
        {...props}
        members={[m({ name: 'Ana', rank: 1, score: 90 }), m({ name: 'Zé', rank: 4, score: 50 }), m({ name: 'Pendente', rank: 2, evaluationStatus: 'Pendente' })]}
      />,
    );
    expect(screen.getByText('02')).toBeTruthy();
    expect(screen.queryByText('04')).toBeNull();
  });

  it('sem pódio quando o primeiro avaliado tem 0%', () => {
    render(<LeaderboardView {...props} members={[m({ rank: 1 }), m({ rank: 2 }), m({ rank: 3 })]} />);
    expect(screen.queryByLabelText('Pódio')).toBeNull();
  });

  it('o bloco de pendentes abre sozinho quando é o único conteúdo', () => {
    render(<LeaderboardView {...props} members={[m({ evaluationStatus: 'Pendente' })]} />);
    const details = screen.getByText('Aguardando avaliação (1)').closest('details') as HTMLDetailsElement;
    expect(details.open).toBe(true);
  });
});
