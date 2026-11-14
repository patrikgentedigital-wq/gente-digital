import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../types';
import { cyclesFromMembers, membersAtCycle } from './cycleView';

function member(over: Partial<TeamMember>): TeamMember {
  return {
    id: 'a', name: 'Ana', role: 'x', team: 'T', teamColor: '#000000', rank: 1, score: 140, maxScore: 150,
    status: 'Voando', avatarUrl: '', evaluationStatus: 'Concluído', email: '', history: [], ...over,
  };
}

describe('cyclesFromMembers', () => {
  it('junta os meses do histórico, do mais recente para o mais antigo, sem repetir', () => {
    const members = [
      member({ history: [{ month: 'Outubro/2026', score: 1 }, { month: 'Novembro/2026', score: 1 }] }),
      member({ id: 'b', history: [{ month: 'Novembro/2026', score: 1 }, { month: 'Dezembro/2025', score: 1 }] }),
    ];
    expect(cyclesFromMembers(members)).toEqual(['Novembro/2026', 'Outubro/2026', 'Dezembro/2025']);
  });

  it('ignora quem não tem histórico', () => {
    expect(cyclesFromMembers([member({ history: undefined })])).toEqual([]);
  });
});

describe('membersAtCycle', () => {
  const ana = member({
    id: 'a', name: 'Ana', score: 135, maxScore: 150,
    history: [{ month: 'Outubro/2026', score: 100, max: 150 }, { month: 'Novembro/2026', score: 135, max: 150 }],
  });
  const bia = member({ id: 'b', name: 'Bia', score: 60, maxScore: 150, status: 'Alarme', history: [{ month: 'Novembro/2026', score: 60, max: 150 }] });

  it('sem ciclo escolhido devolve os membros como estão', () => {
    const members = [ana, bia];
    expect(membersAtCycle(members, null)).toBe(members);
  });

  it('usa a nota e o máximo do ciclo escolhido e recalcula o status', () => {
    const [a] = membersAtCycle([ana], 'Outubro/2026');
    expect(a.score).toBe(100);
    expect(a.maxScore).toBe(150);
    expect(a.status).toBe('Alarme');
    expect(a.evaluationStatus).toBe('Concluído');
  });

  it('quem não tem nota no ciclo vira Sem avaliação', () => {
    const result = membersAtCycle([ana, bia], 'Outubro/2026');
    expect(result[1].evaluationStatus).toBe('Pendente');
    expect(result[1].score).toBe(0);
  });

  it('entrada antiga sem máximo vale 155', () => {
    const [a] = membersAtCycle([member({ history: [{ month: 'Agosto/2026', score: 150 }] })], 'Agosto/2026');
    expect(a.maxScore).toBe(155);
    expect(a.status).toBe('Voando');
  });

  it('recalcula a posição só entre os avaliados do ciclo', () => {
    const result = membersAtCycle([ana, bia], 'Novembro/2026');
    expect(result.find((m) => m.id === 'a')?.rank).toBe(1);
    expect(result.find((m) => m.id === 'b')?.rank).toBe(2);
  });
});
