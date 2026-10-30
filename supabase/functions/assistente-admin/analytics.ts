// Cálculos do assistente do admin. Código puro (sem Deno nem rede) para poder ser testado com Vitest.

export interface Dataset {
  teams: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string; teamId: string; jobTitle: string; archived?: boolean }>;
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
    comments?: string;
    pdiGoals?: Array<{ title: string; deadline: string; status: string; dueDate?: string }>;
  }>;
  auditLogs?: Array<{
    action: string;
    memberId: string | null;
    cycle: string | null;
    score: number | null;
    maxScore: number | null;
    previousScore: number | null;
    createdAt: string;
  }>;
  clientErrors?: Array<{ id: number; createdAt: string; source: string; message: string; url: string; resolved: boolean }>;
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

/** Equipes, quantas pessoas e quais cargos, independente de haver avaliações. */
export function structure(ds: Dataset) {
  return ds.teams.map((team) => {
    const people = ds.members.filter((member) => member.teamId === team.id && !member.archived);
    const jobTitles: Record<string, number> = {};
    for (const person of people) jobTitles[person.jobTitle] = (jobTitles[person.jobTitle] ?? 0) + 1;
    return { team: team.name, members: people.length, jobTitles };
  });
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
        members: ds.members.filter((member) => member.teamId === team.id && !member.archived).length,
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

const MAX_COMMENT_CHARS = 600;

function memberFilter(ds: Dataset, aliases: Aliases, filter: Filter & { code?: string }) {
  const memberId = filter.code ? aliases.memberIdByCode[filter.code] : undefined;
  return (evaluation: Dataset['evaluations'][number]) =>
    (!filter.cycle || evaluation.cycle === filter.cycle) &&
    (!filter.teamName || teamName(ds, evaluation.teamId) === filter.teamName) &&
    (!filter.code || evaluation.memberId === memberId);
}

/** Pareceres escritos pelos líderes (texto livre), por código. */
export function commentsList(ds: Dataset, aliases: Aliases, filter: Filter & { code?: string } = {}) {
  const order = cycleOrder(ds);
  return latestPerMemberCycle(ds)
    .filter(memberFilter(ds, aliases, filter))
    .filter((e) => e.comments && e.comments.trim())
    .sort((a, b) => order.indexOf(a.cycle) - order.indexOf(b.cycle) || a.memberId.localeCompare(b.memberId))
    .map((e) => ({
      code: aliases.codeByMemberId[e.memberId],
      team: teamName(ds, e.teamId),
      cycle: e.cycle,
      percent: percentOf(e.score, e.maxScore),
      comment: (e.comments as string).trim().slice(0, MAX_COMMENT_CHARS),
    }));
}

/** Metas de PDI da avaliação mais recente de cada pessoa. */
export function pdiGoalsList(ds: Dataset, aliases: Aliases, filter: Filter & { code?: string } = {}) {
  const order = cycleOrder(ds);
  const newest = new Map<string, Dataset['evaluations'][number]>();
  for (const evaluation of latestPerMemberCycle(ds)) {
    const current = newest.get(evaluation.memberId);
    if (!current || order.indexOf(evaluation.cycle) > order.indexOf(current.cycle)) newest.set(evaluation.memberId, evaluation);
  }
  const rows: Array<{ code: string; team: string; cycle: string; title: string; deadline: string; status: string; dueDate?: string }> = [];
  for (const evaluation of newest.values()) {
    if (!memberFilter(ds, aliases, filter)(evaluation)) continue;
    for (const goal of evaluation.pdiGoals ?? []) {
      rows.push({
        code: aliases.codeByMemberId[evaluation.memberId],
        team: teamName(ds, evaluation.teamId),
        cycle: evaluation.cycle,
        title: goal.title,
        deadline: goal.deadline,
        status: goal.status,
        ...(goal.dueDate ? { dueDate: goal.dueDate } : {}),
      });
    }
  }
  return rows.sort((a, b) => Number(a.code.slice(1)) - Number(b.code.slice(1)));
}

/** Perguntas atuais (versão mais recente) de cada equipe. */
export function criteriaOverview(ds: Dataset, filter: { teamName?: string } = {}) {
  const rows: Array<{ team: string; version: number; maxScore: number; categories: Array<{ name: string; questions: string[] }> }> = [];
  for (const team of ds.teams) {
    if (filter.teamName && team.name !== filter.teamName) continue;
    const sets = ds.criteriaSets.filter((s) => s.teamId === team.id);
    if (sets.length === 0) continue;
    const latest = sets.reduce((a, b) => (b.version > a.version ? b : a));
    rows.push({
      team: team.name,
      version: latest.version,
      maxScore: latest.categories.reduce((total, c) => total + c.items.length, 0) * 5,
      categories: latest.categories.map((c) => ({ name: c.name, questions: c.items.map((item) => item.text) })),
    });
  }
  return rows;
}

/** Últimos registros da auditoria; o nome gravado no log não sai: só o código. */
export function auditOverview(ds: Dataset, aliases: Aliases, limit = 30) {
  return [...(ds.auditLogs ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((log) => ({
      when: log.createdAt,
      action: log.action,
      code: (log.memberId && aliases.codeByMemberId[log.memberId]) || 'desconhecido',
      cycle: log.cycle,
      score: log.score,
      maxScore: log.maxScore,
      previousScore: log.previousScore,
    }));
}

export function openErrors(ds: Dataset) {
  return (ds.clientErrors ?? [])
    .filter((e) => !e.resolved)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((e) => ({ id: e.id, when: e.createdAt, source: e.source, message: e.message, url: e.url }));
}

export function archivedMembers(ds: Dataset, aliases: Aliases) {
  return ds.members
    .filter((m) => m.archived)
    .map((m) => ({ code: aliases.codeByMemberId[m.id], team: teamName(ds, m.teamId), jobTitle: m.jobTitle }));
}

// --- Ações: a IA só propõe; quem executa é o clique do admin. O resumo é montado aqui, nunca pela IA. ---

export type ActionType = 'arquivar_membro' | 'restaurar_membro' | 'mover_membro' | 'resolver_erro';

export interface ActionInput {
  type: ActionType;
  memberId?: string;
  teamId?: string;
  errorId?: number;
}

export type ActionResult = { action: ActionInput; summary: string } | { error: string };

export function buildAction(ds: Dataset, input: ActionInput): ActionResult {
  const member = input.memberId ? ds.members.find((m) => m.id === input.memberId) : undefined;
  const label = (m: Dataset['members'][number]) => `${m.name} (equipe ${teamName(ds, m.teamId)})`;

  switch (input.type) {
    case 'arquivar_membro':
      if (!member) return { error: 'Colaborador não encontrado.' };
      if (member.archived) return { error: 'Este colaborador já está arquivado.' };
      return { action: { type: input.type, memberId: member.id }, summary: `Arquivar ${label(member)}` };
    case 'restaurar_membro':
      if (!member) return { error: 'Colaborador não encontrado.' };
      if (!member.archived) return { error: 'Este colaborador não está arquivado.' };
      return { action: { type: input.type, memberId: member.id }, summary: `Restaurar ${label(member)}` };
    case 'mover_membro': {
      if (!member) return { error: 'Colaborador não encontrado.' };
      const target = ds.teams.find((t) => t.id === input.teamId);
      if (!target) return { error: 'Equipe não encontrada.' };
      if (member.teamId === target.id) return { error: 'O colaborador já está nessa equipe.' };
      return {
        action: { type: input.type, memberId: member.id, teamId: target.id },
        summary: `Mover ${member.name} da equipe ${teamName(ds, member.teamId)} para a equipe ${target.name}`,
      };
    }
    case 'resolver_erro': {
      const error = (ds.clientErrors ?? []).find((e) => e.id === input.errorId);
      if (!error) return { error: 'Erro não encontrado.' };
      if (error.resolved) return { error: 'Esse erro não está aberto.' };
      return { action: { type: input.type, errorId: error.id }, summary: `Marcar como resolvido o erro #${error.id}: ${error.message}` };
    }
    default:
      return { error: 'Ação não permitida.' };
  }
}
