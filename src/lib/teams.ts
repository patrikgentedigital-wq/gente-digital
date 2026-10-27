import type { TeamStructure } from '../types';

export const TEAM_LEADERS = [
  'Djemerson',
  'Fernanda',
  'Brenda',
  'Alexandre',
  'Alfredo',
  'Vinicius',
  'Hellody',
  'Samile',
  'Diego',
] as const;

export type TeamLeaderName = (typeof TEAM_LEADERS)[number];

const NEUTRAL_TEAM_COLOR = '#86868b';
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface TeamSource {
  team: string;
  teamColor?: string;
  deleted?: boolean;
}

/**
 * Lista de equipes a partir dos membros salvos no Firestore. A coleção `teams` só guarda as
 * equipes iniciais, então equipes novas (ex.: Mariza Leite) só existem no campo `team` dos membros.
 * As equipes conhecidas mantêm ordem e cor; as novas vêm depois, em ordem alfabética, com a
 * cor cadastrada no primeiro membro.
 */
export function deriveTeams(
  members: readonly TeamSource[],
  known: readonly TeamStructure[],
  { includeEmpty = false }: { includeEmpty?: boolean } = {},
): TeamStructure[] {
  const firstColor = new Map<string, string>();
  for (const member of members) {
    if (member.deleted || !member.team || firstColor.has(member.team)) continue;
    firstColor.set(member.team, member.teamColor && HEX_COLOR.test(member.teamColor) ? member.teamColor : NEUTRAL_TEAM_COLOR);
  }

  const knownNames = new Set(known.map((team) => team.leader));
  const fromKnown = known.filter((team) => includeEmpty || firstColor.has(team.leader));
  const extras = [...firstColor.keys()]
    .filter((name) => !knownNames.has(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((name): TeamStructure => ({ leader: name, color: firstColor.get(name) ?? NEUTRAL_TEAM_COLOR, members: [] }));

  return [...fromKnown, ...extras];
}
