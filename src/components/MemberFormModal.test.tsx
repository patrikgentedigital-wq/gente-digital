// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TeamMember, TeamStructure } from '../types';

const listTeams = vi.fn<() => Promise<TeamStructure[]>>();
vi.mock('../lib/backend', () => ({ listTeams: () => listTeams() }));

import { MemberFormModal } from './MemberFormModal';

const member = (id: string, team: string, over: Partial<TeamMember> = {}): TeamMember => ({
  id,
  name: id,
  role: 'Cargo',
  team,
  teamColor: '#3B6FE0',
  rank: 1,
  score: 0,
  maxScore: 155,
  status: 'Alarme',
  avatarUrl: '',
  evaluationStatus: 'Pendente',
  email: '',
  history: [],
  ...over,
});

const team = (leader: string): TeamStructure => ({ leader, color: '#111111', members: [] });
const optionsOf = () => [...(screen.getByRole('combobox') as HTMLSelectElement).options].map((option) => option.text);

beforeEach(() => listTeams.mockResolvedValue([]));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MemberFormModal', () => {
  it('só oferece equipes que existem (têm membros), não as antigas da lista fixa', () => {
    render(
      <MemberFormModal
        isOpen
        onClose={vi.fn()}
        members={[member('a', 'Danielle'), member('b', 'Djemerson'), member('c', 'Mariza Leite')]}
        onSaveMember={vi.fn()}
      />,
    );
    const options = optionsOf();
    expect(options).toEqual(expect.arrayContaining(['Time Danielle', 'Time Djemerson', 'Time Mariza Leite']));
    for (const antiga of ['Fernanda', 'Alfredo', 'Vinicius', 'Hellody', 'Samile', 'Diego']) {
      expect(options).not.toContain(`Time ${antiga}`);
    }
  });

  it('inclui equipes ativas do banco que estão sem membros, mas não os conjuntos de perguntas de uma pessoa', async () => {
    listTeams.mockResolvedValue([team('Danielle'), team('Equipe Nova'), team('Danielle - Wendel')]);
    render(
      <MemberFormModal
        isOpen
        onClose={vi.fn()}
        members={[member('a', 'Danielle'), member('wendel', 'Danielle', { criteriaTeamId: 'Danielle - Wendel' })]}
        onSaveMember={vi.fn()}
      />,
    );
    await waitFor(() => expect(optionsOf()).toContain('Time Equipe Nova'));
    expect(optionsOf()).not.toContain('Time Danielle - Wendel');
    expect(optionsOf().filter((text) => text === 'Time Danielle')).toHaveLength(1);
  });

  it('não manda o nome da pessoa para um serviço de avatar: sem foto, o avatar fica vazio (o app mostra as iniciais)', async () => {
    const onSaveMember = vi.fn().mockResolvedValue(undefined);
    render(<MemberFormModal isOpen onClose={vi.fn()} members={[member('a', 'Danielle')]} onSaveMember={onSaveMember} />);
    fireEvent.change(screen.getByPlaceholderText('Ex: João da Silva'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte IXC N1'), { target: { value: 'Designer' } });
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar Membro/ }));
    await waitFor(() => expect(onSaveMember).toHaveBeenCalledTimes(1));
    expect(onSaveMember.mock.calls[0][0].avatarUrl).toBe('');
  });
});
