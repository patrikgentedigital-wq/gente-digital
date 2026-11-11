// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { TeamMember } from '../types';
import { DashboardView } from './DashboardView';

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
  evaluationStatus: 'Pendente',
  email: '',
  ...over,
});

const renderDashboard = (members: TeamMember[], onSelectTeamFilter = vi.fn()) =>
  render(<DashboardView members={members} onSelectTeamFilter={onSelectTeamFilter} onSelectMemberForDetail={vi.fn()} />);

describe('DashboardView', () => {
  it('mostra — na média quando ninguém foi avaliado', () => {
    renderDashboard([m({}), m({})]);
    expect(within(screen.getByLabelText('Média geral')).getByText('—')).toBeTruthy();
  });

  it('a distribuição lista Sem avaliação com a contagem', () => {
    renderDashboard([m({}), m({}), m({ evaluationStatus: 'Concluído', score: 95, status: 'Voando' })]);
    const dist = screen.getByLabelText('Distribuição por nível');
    const linha = within(dist).getByText('Sem avaliação').closest('li') as HTMLElement;
    expect(within(linha).getByText('2')).toBeTruthy();
  });

  it('não existe mais a Concentração por Faixa', () => {
    renderDashboard([m({ evaluationStatus: 'Concluído', score: 90, status: 'Caminho Certo' })]);
    expect(screen.queryByText(/Concentração por Faixa/i)).toBeNull();
  });

  it('equipe sem avaliados aparece com — na média por equipe', () => {
    renderDashboard([m({ team: 'Brenda' }), m({ team: 'Djemerson', evaluationStatus: 'Concluído', score: 80, status: 'Atenção' })]);
    const chart = screen.getByLabelText('Média por equipe');
    const brenda = within(chart).getByText('Brenda').closest('li') as HTMLElement;
    expect(within(brenda).getByText('—')).toBeTruthy();
  });

  it('clicar no bloco de uma equipe chama onSelectTeamFilter com o líder', () => {
    const onSelectTeamFilter = vi.fn();
    renderDashboard([m({ team: 'Djemerson' })], onSelectTeamFilter);
    fireEvent.click(screen.getByRole('button', { name: /Time Djemerson/ }));
    expect(onSelectTeamFilter).toHaveBeenCalledWith('Djemerson');
  });

  it('evolução sem histórico mostra aviso', () => {
    renderDashboard([m({})]);
    expect(screen.getByText('Ainda não há histórico para mostrar.')).toBeTruthy();
  });
});
