// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ReportExportModal } from './ReportExportModal';
import type { TeamMember } from '../types';

afterEach(() => cleanup());

const member = {
  id: 'ana_ta',
  name: 'Ana',
  role: 'Analista',
  team: 'Equipe A',
  teamColor: '#ffe708',
  rank: 1,
  score: 8,
  maxScore: 10,
  status: 'Atenção',
  avatarUrl: '',
  evaluationStatus: 'Concluído',
  email: '',
} as TeamMember;

describe('ReportExportModal', () => {
  it('numera as categorias pela posição, mesmo com identificador gerado pelo editor', () => {
    const criteria = [
      { id: 'c8k2x1ab', name: 'Atendimento', items: [{ id: 'q1', text: 'Um' }, { id: 'q2', text: 'Dois' }] },
      { id: 'cz9m4tt0', name: 'Campo', items: [{ id: 'q3', text: 'Três' }] },
    ];
    render(<ReportExportModal member={member} isOpen onClose={vi.fn()} criteria={criteria} criteriaScores={{ q1: 5, q2: 4, q3: 3 }} />);
    expect(screen.getByText('1. Atendimento')).toBeTruthy();
    expect(screen.getByText('2. Campo')).toBeTruthy();
    expect(screen.queryByText(/c8k2x1ab/)).toBeNull();
  });
});
