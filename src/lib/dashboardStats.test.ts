import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../types';
import { dashboardStats } from './dashboardStats';

let seq = 0;
const m = (over: Partial<TeamMember>): TeamMember => ({
  id: `m${++seq}`,
  name: `Pessoa ${seq}`,
  role: 'Técnico',
  team: 'Equipe A',
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

describe('dashboardStats', () => {
  it('ignora quem não foi avaliado na média', () => {
    const s = dashboardStats([
      m({ score: 90, status: 'Caminho Certo' }),
      m({ score: 80, status: 'Atenção' }),
      m({ score: 0, evaluationStatus: 'Pendente' }),
    ]);
    expect(s.avgPercent).toBe(85);
    expect(s.evaluatedCount).toBe(2);
    expect(s.totalMembers).toBe(3);
    expect(s.levelCounts['Sem avaliação']).toBe(1);
  });

  it('ninguém avaliado: média null, sem equipe destaque e tudo em Sem avaliação', () => {
    const s = dashboardStats([m({ evaluationStatus: 'Pendente' }), m({ evaluationStatus: 'Pendente' })]);
    expect(s.avgPercent).toBeNull();
    expect(s.bestTeam).toBeNull();
    expect(s.levelCounts).toEqual({ Voando: 0, 'Caminho Certo': 0, Atenção: 0, Alarme: 0, 'Sem avaliação': 2 });
  });

  it('equipe sem avaliados tem média null e fica por último', () => {
    const s = dashboardStats([
      m({ team: 'Sem nota', evaluationStatus: 'Pendente' }),
      m({ team: 'Com nota', score: 70 }),
    ]);
    expect(s.teamStats.map((t) => [t.leader, t.avgPercent])).toEqual([
      ['Com nota', 70],
      ['Sem nota', null],
    ]);
    expect(s.bestTeam?.leader).toBe('Com nota');
  });

  it('avaliado com nota 0 conta em Alarme', () => {
    const s = dashboardStats([m({ score: 0, status: 'Alarme' })]);
    expect(s.levelCounts.Alarme).toBe(1);
    expect(s.levelCounts['Sem avaliação']).toBe(0);
    expect(s.bestTeam).toBeNull();
  });

  it('topMember é o melhor avaliado da equipe, ou null', () => {
    const melhor = m({ score: 95, status: 'Voando' });
    const s = dashboardStats([m({ score: 60 }), melhor, m({ team: 'B', evaluationStatus: 'Pendente' })]);
    expect(s.teamStats.find((t) => t.leader === 'Equipe A')?.topMember?.id).toBe(melhor.id);
    expect(s.teamStats.find((t) => t.leader === 'B')?.topMember).toBeNull();
    expect(s.onTargetCount).toBe(1);
  });

  it('destaque da equipe exige nota acima de 0%', () => {
    const s = dashboardStats([m({ team: 'Z', score: 0 })]);
    expect(s.teamStats[0].topMember).toBeNull();
  });
});
