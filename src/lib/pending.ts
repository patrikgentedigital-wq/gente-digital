import type { TeamMember } from '../types';

export interface PendingMember {
  id: string;
  name: string;
}

export interface PendingTeam {
  team: string;
  total: number;
  pending: number;
  /** Só quem ainda não foi avaliado no ciclo, em ordem alfabética. */
  members: PendingMember[];
}

export interface PendingSummary {
  total: number;
  pending: number;
  /** Só equipes com alguém pendente; as que mais faltam primeiro. */
  teams: PendingTeam[];
}

const sameCycle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** O histórico guarda o ciclo de cada avaliação ("Novembro/2026"); quem tem esse ciclo já foi avaliado nele. */
export function hasEvaluationInCycle(member: Pick<TeamMember, 'history'>, cycle: string): boolean {
  return (member.history ?? []).some((entry) => sameCycle(entry.month, cycle));
}

/** Quem falta avaliar no ciclo, por equipe. */
export function pendingByTeam(members: readonly TeamMember[], cycle: string): PendingSummary {
  const byTeam = new Map<string, PendingTeam>();
  let pending = 0;

  for (const member of members) {
    const entry = byTeam.get(member.team) ?? { team: member.team, total: 0, pending: 0, members: [] };
    entry.total += 1;
    if (!hasEvaluationInCycle(member, cycle)) {
      entry.pending += 1;
      entry.members.push({ id: member.id, name: member.name });
      pending += 1;
    }
    byTeam.set(member.team, entry);
  }

  const teams = [...byTeam.values()]
    .filter((team) => team.pending > 0)
    .map((team) => ({ ...team, members: [...team.members].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }))
    .sort((a, b) => b.pending - a.pending || a.team.localeCompare(b.team, 'pt-BR'));

  return { total: members.length, pending, teams };
}

/** A próxima pessoa sem avaliação no ciclo depois da atual, dando a volta na lista; nulo se não houver outra. */
export function nextPendingMember(members: readonly TeamMember[], current: Pick<TeamMember, 'id'> | null, cycle: string): TeamMember | null {
  if (members.length === 0) return null;
  const start = current ? members.findIndex((member) => member.id === current.id) : -1;
  for (let step = 1; step <= members.length; step += 1) {
    const candidate = members[(start + step + members.length) % members.length];
    if (candidate.id !== current?.id && !hasEvaluationInCycle(candidate, cycle)) return candidate;
  }
  return null;
}
