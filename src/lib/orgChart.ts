import type { TeamMember } from '../types';

export interface OrgNode {
  key: string;
  /** Nome mostrado: o do colaborador, ou o do time quando o líder dele não é um colaborador cadastrado. */
  label: string;
  member: TeamMember | null;
  children: OrgNode[];
}

const byName = (a: string, b: string) => a.localeCompare(b, 'pt-BR');
const norm = (text: string) => text.trim().toLocaleLowerCase('pt-BR');

/**
 * Organograma a partir do cadastro: o time de cada pessoa leva o nome do líder, então quem tem `team` igual ao
 * nome de outro colaborador (ou ao primeiro nome dele, quando só há um com ele) responde a esse colaborador.
 * Time sem colaborador com o nome do líder vira um nó só com o nome do time.
 */
export function buildOrgChart(members: readonly TeamMember[]): OrgNode[] {
  const active = members.filter((member) => !member.deleted).sort((a, b) => byName(a.name, b.name));

  const leaderOf = (team: string): TeamMember | null => {
    const key = norm(team);
    const exact = active.find((member) => norm(member.name) === key);
    if (exact) return exact;
    const byFirstName = active.filter((member) => norm(member.name).split(/\s+/)[0] === key);
    return byFirstName.length === 1 ? byFirstName[0] : null;
  };

  const pseudo = new Map<string, OrgNode>();
  const pseudoNode = (team: string): OrgNode => {
    let node = pseudo.get(team);
    if (!node) {
      node = { key: `team:${team}`, label: team, member: null, children: [] };
      pseudo.set(team, node);
    }
    return node;
  };

  const nodes = new Map<string, OrgNode>(active.map((member) => [member.id, { key: member.id, label: member.name, member, children: [] }]));

  // Quem responde a quem: um colaborador, ou null quando a pessoa lidera o próprio time (fica na raiz).
  const parent = new Map<string, TeamMember | null>();
  for (const member of active) {
    const leader = leaderOf(member.team);
    parent.set(member.id, leader && leader.id !== member.id ? leader : null);
  }

  // Dois times apontando um para o outro: quebra o laço no primeiro nome, que passa a responder ao nome do time.
  const brokenByTeam = new Set<string>();
  for (const member of active) {
    const seen = new Set([member.id]);
    let cursor = parent.get(member.id);
    while (cursor) {
      if (seen.has(cursor.id)) {
        if (cursor.id === member.id) {
          parent.set(member.id, null);
          brokenByTeam.add(member.id);
        }
        break;
      }
      seen.add(cursor.id);
      cursor = parent.get(cursor.id);
    }
  }

  const roots: OrgNode[] = [];
  for (const member of active) {
    const node = nodes.get(member.id)!;
    const leader = parent.get(member.id);
    if (leader) {
      nodes.get(leader.id)!.children.push(node);
    } else if (brokenByTeam.has(member.id) || !leaderOf(member.team)) {
      pseudoNode(member.team).children.push(node);
    } else {
      roots.push(node); // lidera o próprio time
    }
  }

  return [...roots, ...pseudo.values()].sort((a, b) => byName(a.label, b.label));
}
