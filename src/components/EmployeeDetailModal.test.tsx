// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { TeamMember } from '../types';
import { EmployeeDetailModal } from './EmployeeDetailModal';

afterEach(() => cleanup());

const pendente: TeamMember = {
  id: 'z',
  name: 'Zé',
  role: 'Técnico',
  team: 'Brenda',
  teamColor: '#123456',
  rank: 9,
  score: 0,
  maxScore: 150,
  status: 'Alarme',
  avatarUrl: '',
  evaluationStatus: 'Pendente',
  email: '',
};

describe('EmployeeDetailModal', () => {
  it('quem nunca foi avaliado aparece como Sem avaliação, sem posição nem Alarme', () => {
    render(<EmployeeDetailModal member={pendente} allMembers={[pendente]} onClose={vi.fn()} onSelectForEvaluation={vi.fn()} />);
    expect(screen.getAllByText('Sem avaliação').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Rank #9/)).toBeNull();
    expect(screen.queryByText('Alarme')).toBeNull();
  });
});
