// Cálculos do assistente do admin. Código puro (sem Deno nem rede) para poder ser testado com Vitest.

export interface Dataset {
  teams: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string; teamId: string; jobTitle: string }>;
  criteriaSets: Array<{
    teamId: string;
    version: number;
    categories: Array<{ id: string; name: string; items: Array<{ id: string; text: string }> }>;
  }>;
  evaluations: Array<{
    memberId: string;
    teamId: string;
    cycle: string;
    criteriaVersion: number;
    scores: Record<string, number>;
    score: number;
    maxScore: number;
    createdAt: string;
  }>;
}

export interface Aliases {
  codeByMemberId: Record<string, string>;
  memberIdByCode: Record<string, string>;
  nameByCode: Record<string, string>;
}

interface Filter {
  teamName?: string;
  cycle?: string;
}

export function percentOf(score: number, max: number): number {
  return max > 0 ? Math.round((score * 100) / max) : 0;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** Nomes nunca saem do servidor: a IA só vê P1, P2... e a resposta final volta com os nomes. */
export function buildAliases(members: Dataset['members']): Aliases {
  const aliases: Aliases = { codeByMemberId: {}, memberIdByCode: {}, nameByCode: {} };
  members.forEach((member, index) => {
    const code = `P${index + 1}`;
    aliases.codeByMemberId[member.id] = code;
    aliases.memberIdByCode[code] = member.id;
    aliases.nameByCode[code] = member.name;
  });
  return aliases;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** O caminho inverso: nomes que o admin digitou (ou que vieram do histórico) viram códigos antes de ir à IA. */
export function hideNames(text: string, members: Dataset['members'], aliases: Aliases): string {
  let result = text;
  for (const member of [...members].sort((a, b) => b.name.length - a.name.length)) {
    if (!member.name.trim()) continue;
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(member.name)}(?![\\p{L}\\p{N}])`, 'giu');
    result = result.replace(pattern, aliases.codeByMemberId[member.id]);
  }
  return result;
}

export function revealNames(text: string, nameByCode: Record<string, string>): string {
  return text.replace(/\bP\d+\b/g, (code) => nameByCode[code] ?? code);
}

/** Ciclos na ordem em que apareceram (pela data da primeira avaliação de cada um). */
function cycleOrder(ds: Dataset): string[] {
  const first = new Map<string, string>();
  for (const evaluation of ds.evaluations) {
    const current = first.get(evaluation.cycle);
    if (!current || evaluation.createdAt < current) first.set(evaluation.cycle, evaluation.createdAt);
  }
  return [...first.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([cycle]) => cycle);
}

const teamName = (ds: Dataset, id: string) => ds.teams.find((team) => team.id === id)?.name ?? id;

/** Uma avaliação por pessoa e ciclo: fica a mais recente. */
function latestPerMemberCycle(ds: Dataset): Dataset['evaluations'] {
  const latest = new Map<string, Dataset['evaluations'][number]>();
  for (const evaluation of ds.evaluations) {
    const key = `${evaluation.memberId}|${evaluation.cycle}`;
    const current = latest.get(key);
    if (!current || evaluation.createdAt > current.createdAt) latest.set(key, evaluation);
  }
  return [...latest.values()];
}

export function teamsByCycle(ds: Dataset) {
  const evaluations = latestPerMemberCycle(ds);
  const rows: Array<{ team: string; cycle: string; evaluated: number; members: number; avgPercent: number }> = [];
  for (const cycle of cycleOrder(ds)) {
    for (const team of ds.teams) {
      const inGroup = evaluations.filter((e) => e.cycle === cycle && e.teamId === team.id);
      if (inGroup.length === 0) continue;
      rows.push({
        team: team.name,
        cycle,
        evaluated: inGroup.length,
        members: ds.members.filter((member) => member.teamId === team.id).length,
        avgPercent: Math.round(mean(inGroup.map((e) => (e.maxScore > 0 ? (e.score * 100) / e.maxScore : 0)))),
      });
    }
  }
  return rows;
}

export function categoriesByTeam(ds: Dataset, filter: Filter = {}) {
  const evaluations = latestPerMemberCycle(ds);
  const rows: Array<{ team: string; cycle: string; category: string; avgPercent: number }> = [];
  for (const cycle of cycleOrder(ds)) {
    if (filter.cycle && cycle !== filter.cycle) continue;
    for (const team of ds.teams) {
      if (filter.teamName && team.name !== filter.teamName) continue;
      const inGroup = evaluations.filter((e) => e.cycle === cycle && e.teamId === team.id);
      if (inGroup.length === 0) continue;
      const perCategory = new Map<string, number[]>();
      for (const evaluation of inGroup) {
        const set = ds.criteriaSets.find((s) => s.teamId === team.id && s.version === evaluation.criteriaVersion);
        if (!set) continue;
        for (const category of set.categories) {
          const values = category.items.map((item) => evaluation.scores[item.id]).filter((v): v is number => typeof v === 'number');
          if (values.length === 0) continue;
          const list = perCategory.get(category.name) ?? [];
          list.push((values.reduce((a, b) => a + b, 0) * 100) / (category.items.length * 5));
          perCategory.set(category.name, list);
        }
      }
      for (const [category, values] of perCategory) {
        rows.push({ team: team.name, cycle, category, avgPercent: Math.round(mean(values)) });
      }
    }
  }
  return rows;
}

export function collaborators(ds: Dataset, aliases: Aliases, filter: Filter = {}) {
  const rows: Array<{ code: string; team: string; jobTitle: string; cycle: string; percent: number }> = [];
  const order = cycleOrder(ds);
  for (const evaluation of latestPerMemberCycle(ds)) {
    if (filter.cycle && evaluation.cycle !== filter.cycle) continue;
    const name = teamName(ds, evaluation.teamId);
    if (filter.teamName && name !== filter.teamName) continue;
    const member = ds.members.find((m) => m.id === evaluation.memberId);
    if (!member) continue;
    rows.push({
      code: aliases.codeByMemberId[member.id],
      team: name,
      jobTitle: member.jobTitle,
      cycle: evaluation.cycle,
      percent: percentOf(evaluation.score, evaluation.maxScore),
    });
  }
  return rows.sort((a, b) => order.indexOf(a.cycle) - order.indexOf(b.cycle) || Number(a.code.slice(1)) - Number(b.code.slice(1)));
}

export function evolution(ds: Dataset, aliases: Aliases, code: string) {
  const memberId = aliases.memberIdByCode[code];
  if (!memberId) return [];
  const order = cycleOrder(ds);
  return latestPerMemberCycle(ds)
    .filter((e) => e.memberId === memberId)
    .sort((a, b) => order.indexOf(a.cycle) - order.indexOf(b.cycle))
    .map((e) => ({ cycle: e.cycle, percent: percentOf(e.score, e.maxScore) }));
}
