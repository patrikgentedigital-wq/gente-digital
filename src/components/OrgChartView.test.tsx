// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TeamMember } from '../types';
import { OrgChartView } from './OrgChartView';

const base = { role: 'Cargo', teamColor: '#000000', rank: 0, score: 0, maxScore: 150, status: 'Alarme' as const, avatarUrl: '', evaluationStatus: 'Pendente' as const, email: '' };
const members: TeamMember[] = [
  { ...base, id: '1', name: 'Mariza Leite', team: 'Mariza Leite', score: 135, evaluationStatus: 'Concluído' },
  { ...base, id: '2', name: 'Danielle', team: 'Mariza Leite' },
];

afterEach(() => cleanup());

describe('OrgChartView', () => {
  it('mostra a árvore, a nota de quem foi avaliado e Sem avaliação para os demais', () => {
    render(<OrgChartView members={members} onSelectMemberForDetail={() => {}} />);
    expect(screen.getByText('Mariza Leite')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
    expect(screen.getByText('Sem avaliação')).toBeTruthy();
    expect(screen.getByText('1 pessoa')).toBeTruthy();
  });

  it('abre o detalhe ao clicar no nome', () => {
    const onSelect = vi.fn();
    render(<OrgChartView members={members} onSelectMemberForDetail={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Danielle' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
  });

  it('avisa quando não há colaboradores', () => {
    render(<OrgChartView members={[]} onSelectMemberForDetail={() => {}} />);
    expect(screen.getByRole('status').textContent).toContain('Nenhum colaborador');
  });
});
