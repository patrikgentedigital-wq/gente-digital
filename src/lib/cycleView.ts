import type { TeamMember } from '../types';
import { compareByPercent, LEGACY_MAX, statusForScore } from './scoring';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Posição de um ciclo no calendário ("Novembro/2026" → ano * 12 + mês); formato desconhecido fica por último. */
function cycleRank(cycle: string): number {
  const [name, year] = cycle.split('/');
  const month = MONTHS.indexOf(name);
  return month < 0 || !/^\d{4}$/.test(year ?? '') ? -1 : Number(year) * 12 + month;
}

/** Ciclos que aparecem no histórico de alguém, do mais recente para o mais antigo. */
export function cyclesFromMembers(members: readonly TeamMember[]): string[] {
  const found = new Set<string>();
  for (const member of members) for (const entry of member.history ?? []) found.add(entry.month);
  return [...found].sort((a, b) => cycleRank(b) - cycleRank(a));
}

/**
 * Os membros como estavam num ciclo: nota, máximo e status daquele mês, e "Sem avaliação" para quem não tem
 * nota nele. Sem ciclo escolhido, devolve a lista como veio (a última avaliação de cada pessoa).
 */
export function membersAtCycle(members: TeamMember[], cycle: string | null): TeamMember[] {
  if (!cycle) return members;

  const atCycle = members.map((member): TeamMember => {
    const entry = member.history?.find((item) => item.month === cycle);
    if (!entry) return { ...member, score: 0, status: 'Alarme', evaluationStatus: 'Pendente', rank: 0, previousRank: undefined };
    const maxScore = entry.max && entry.max > 0 ? entry.max : LEGACY_MAX;
    return {
      ...member,
      score: entry.score,
      maxScore,
      status: statusForScore(entry.score, maxScore),
      evaluationStatus: 'Concluído',
      previousRank: undefined,
    };
  });

  const ranked = atCycle.filter((m) => m.evaluationStatus === 'Concluído').sort(compareByPercent);
  const position = new Map(ranked.map((m, index) => [m.id, index + 1]));
  return atCycle.map((m) => ({ ...m, rank: position.get(m.id) ?? 0 }));
}
