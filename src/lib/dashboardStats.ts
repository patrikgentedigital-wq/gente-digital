import type { PerformanceStatus, TeamMember } from '../types';
import { TEAMS } from '../data/catalogData';
import { deriveTeams } from './teams';
import { compareByPercent, isEvaluated, percentOf } from './scoring';

export type LevelKey = PerformanceStatus | 'Sem avaliação';

export interface TeamStat {
  leader: string;
  color: string;
  count: number;
  evaluatedCount: number;
  /** Média só dos avaliados; null quando ninguém da equipe foi avaliado. */
  avgPercent: number | null;
  topMember: TeamMember | null;
  onTargetCount: number;
}

export interface DashboardStats {
  totalMembers: number;
  evaluatedCount: number;
  /** Média só dos avaliados, arredondada; null quando ninguém foi avaliado. */
  avgPercent: number | null;
  /** Avaliados no nível Voando. */
  onTargetCount: number;
  levelCounts: Record<LevelKey, number>;
  /** Maior média primeiro; equipes sem avaliados por último. */
  teamStats: TeamStat[];
  /** Equipe de maior média, desde que acima de 0%. */
  bestTeam: TeamStat | null;
}

function averagePercent(members: TeamMember[]): number | null {
  if (members.length === 0) return null;
  return Math.round(members.reduce((sum, m) => sum + percentOf(m.score, m.maxScore), 0) / members.length);
}

/** Números da Visão geral. Quem nunca foi avaliado fica fora de médias, destaques e níveis. */
export function dashboardStats(members: TeamMember[]): DashboardStats {
  const evaluated = members.filter(isEvaluated);

  const levelCounts: Record<LevelKey, number> = { Voando: 0, 'Caminho Certo': 0, Atenção: 0, Alarme: 0, 'Sem avaliação': 0 };
  for (const member of members) levelCounts[isEvaluated(member) ? member.status : 'Sem avaliação'] += 1;

  const teamStats = deriveTeams(members, TEAMS)
    .map((team): TeamStat => {
      const teamMembers = members.filter((m) => m.team === team.leader);
      const teamEvaluated = teamMembers.filter(isEvaluated);
      return {
        leader: team.leader,
        color: team.color,
        count: teamMembers.length,
        evaluatedCount: teamEvaluated.length,
        avgPercent: averagePercent(teamEvaluated),
        // Destaque só com nota acima de 0%, como a coroa.
        topMember: [...teamEvaluated].filter((m) => percentOf(m.score, m.maxScore) > 0).sort(compareByPercent)[0] ?? null,
        onTargetCount: teamEvaluated.filter((m) => m.status === 'Voando').length,
      };
    })
    .filter((team) => team.count > 0)
    .sort((a, b) => (b.avgPercent ?? -1) - (a.avgPercent ?? -1));

  const best = teamStats[0];

  return {
    totalMembers: members.length,
    evaluatedCount: evaluated.length,
    avgPercent: averagePercent(evaluated),
    onTargetCount: levelCounts.Voando,
    levelCounts,
    teamStats,
    bestTeam: best && best.avgPercent !== null && best.avgPercent > 0 ? best : null,
  };
}
