// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TeamMember } from '../../types';
import { PendingPanel } from './PendingPanel';

afterEach(() => cleanup());

const CYCLE = 'Novembro/2026';
const member = (id: string, name: string, team: string, months: string[] = []): TeamMember =>
  ({ id, name, team, history: months.map((month) => ({ month, score: 10, max: 150 })) }) as TeamMember;

const members = [
  member('ana', 'Ana', 'Brenda', [CYCLE]),
  member('bia', 'Bia', 'Brenda'),
  member('davi', 'Davi', 'Diego'),
  member('caio', 'Caio', 'Diego', ['Outubro/2026']),
];

describe('PendingPanel', () => {
  it('diz quantos faltam no ciclo e lista por equipe', () => {
    render(<PendingPanel members={members} cycle={CYCLE} />);
    expect(screen.getByText(/Faltam avaliar em Novembro \/ 2026/)).toBeTruthy();
    expect(screen.getByText('3 de 4')).toBeTruthy();
    const brenda = screen.getByRole('group', { name: 'Equipe Brenda' });
    expect(brenda.textContent).toContain('1 de 2');
    expect(brenda.textContent).toContain('Bia');
    expect(brenda.textContent).not.toContain('Ana');
    expect(screen.getByRole('group', { name: 'Equipe Diego' }).textContent).toContain('Caio');
  });

  it('quando todos foram avaliados, mostra a mensagem de ciclo completo', () => {
    render(<PendingPanel members={[member('ana', 'Ana', 'Brenda', [CYCLE])]} cycle={CYCLE} />);
    expect(screen.getByText(/Todos foram avaliados em Novembro \/ 2026/)).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('sem login, os nomes são texto; com login, abrem a avaliação da pessoa', () => {
    const { unmount } = render(<PendingPanel members={members} cycle={CYCLE} />);
    expect(screen.queryByRole('button', { name: /Avaliar Bia/ })).toBeNull();
    unmount();

    const onEvaluate = vi.fn();
    render(<PendingPanel members={members} cycle={CYCLE} onEvaluateMember={onEvaluate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar Bia' }));
    expect(onEvaluate).toHaveBeenCalledWith('bia');
  });

  it('sem membros, não mostra nada', () => {
    const { container } = render(<PendingPanel members={[]} cycle={CYCLE} />);
    expect(container.textContent).toBe('');
  });
});
