// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { TeamMember } from '../types';
import { TeamsView } from './TeamsView';

afterEach(() => cleanup());

let seq = 0;
const m = (over: Partial<TeamMember>): TeamMember => ({
  id: `t${++seq}`,
  name: `Pessoa ${seq}`,
  role: 'Técnico',
  team: 'Brenda',
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

describe('TeamsView', () => {
  it('equipe sem avaliados mostra — na média e nenhum destaque', () => {
    render(<TeamsView members={[m({ name: 'Zé' })]} onSelectTeamFilter={vi.fn()} />);
    const bloco = screen.getByText('Time Brenda').closest('section') as HTMLElement;
    expect(within(bloco).getByText('—')).toBeTruthy();
    expect(within(bloco).queryByText('Zé', { selector: 'button' })).toBeNull();
  });

  it('a média e o destaque consideram só os avaliados', () => {
    render(
      <TeamsView
        members={[m({ name: 'Ana', score: 80, evaluationStatus: 'Concluído', status: 'Atenção' }), m({ name: 'Zé' })]}
        onSelectTeamFilter={vi.fn()}
      />,
    );
    const bloco = screen.getByText('Time Brenda').closest('section') as HTMLElement;
    expect(within(bloco).getByText('80%')).toBeTruthy();
    expect(within(bloco).getByRole('button', { name: 'Ana' })).toBeTruthy();
  });
});
