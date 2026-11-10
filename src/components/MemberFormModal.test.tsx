// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemberFormModal } from './MemberFormModal';
import type { TeamMember } from '../types';

const member = (id: string, team: string): TeamMember => ({
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
});

afterEach(() => cleanup());

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
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = [...select.options].map((option) => option.text);
    expect(options).toEqual(expect.arrayContaining(['Time Danielle', 'Time Djemerson', 'Time Mariza Leite']));
    for (const antiga of ['Fernanda', 'Alfredo', 'Vinicius', 'Hellody', 'Samile', 'Diego']) {
      expect(options).not.toContain(`Time ${antiga}`);
    }
  });
});
