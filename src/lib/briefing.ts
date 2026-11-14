import type { PerformanceStatus, TeamMember } from '../types';
import { cyclesFromMembers, membersAtCycle } from './cycleView';
import { isPdiGoalOverdue } from './evaluation';
import { percentOf } from './scoring';

export type StatusChange = 'subiu' | 'caiu' | 'manteve';

export interface BriefingPerson {
  /** Código usado no lugar do nome quando os dados vão para a IA (P1, P2...). */
  code: string;
  name: string;
  role: string;
  evaluated: boolean;
  percent: number | null;
  previousPercent: number | null;
  /** Pontos percentuais a mais (ou a menos) que no ciclo anterior; null quando falta uma das duas notas. */
  delta: number | null;
  status: PerformanceStatus | null;
  previousStatus: PerformanceStatus | null;
  statusChange: StatusChange | null;
  overduePdi: number;
}

export interface BriefingFacts {
  team: string;
  cycle: string;
  previousCycle: string | null;
  people: BriefingPerson[];
  summary: {
    total: number;
    evaluated: number;
    pending: number;
    average: number | null;
    previousAverage: number | null;
    averageDelta: number | null;
    byStatus: Record<PerformanceStatus, number>;
  };
  highlights: { biggestRise: BriefingPerson | null; biggestDrop: BriefingPerson | null };
}

const LEVELS: PerformanceStatus[] = ['Alarme', 'Atenção', 'Caminho Certo', 'Voando'];

function averageOf(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

/** Fatos do ciclo de uma equipe, calculados só com os dados do quadro (a IA não calcula nada). */
export function buildBriefingFacts(members: TeamMember[], team: string, cycle: string, now = new Date()): BriefingFacts {
  const teamMembers = members.filter((member) => member.team === team && !member.deleted).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const cycles = cyclesFromMembers(teamMembers);
  const index = cycles.indexOf(cycle);
  const previousCycle = index >= 0 && index + 1 < cycles.length ? cycles[index + 1] : null;

  const current = membersAtCycle(teamMembers, cycle);
  const previous = previousCycle ? membersAtCycle(teamMembers, previousCycle) : null;

  const people = current.map((member, i): BriefingPerson => {
    const evaluated = member.evaluationStatus === 'Concluído';
    const before = previous?.[i];
    const hadBefore = before?.evaluationStatus === 'Concluído';
    const percent = evaluated ? Math.round(percentOf(member.score, member.maxScore)) : null;
    const previousPercent = before && hadBefore ? Math.round(percentOf(before.score, before.maxScore)) : null;
    const status = evaluated ? member.status : null;
    const previousStatus = before && hadBefore ? before.status : null;
    let statusChange: StatusChange | null = null;
    if (status && previousStatus) {
      const diff = LEVELS.indexOf(status) - LEVELS.indexOf(previousStatus);
      statusChange = diff > 0 ? 'subiu' : diff < 0 ? 'caiu' : 'manteve';
    }
    return {
      code: `P${i + 1}`,
      name: member.name,
      role: member.role,
      evaluated,
      percent,
      previousPercent,
      delta: percent !== null && previousPercent !== null ? percent - previousPercent : null,
      status,
      previousStatus,
      statusChange,
      overduePdi: (teamMembers[i].pdiGoals ?? []).filter((goal) => isPdiGoalOverdue(goal, now)).length,
    };
  });

  const evaluated = people.filter((person) => person.evaluated);
  const byStatus: Record<PerformanceStatus, number> = { Voando: 0, 'Caminho Certo': 0, Atenção: 0, Alarme: 0 };
  for (const person of evaluated) if (person.status) byStatus[person.status] += 1;

  const average = averageOf(evaluated.map((person) => person.percent ?? 0));
  const previousAverage = previous
    ? averageOf(previous.filter((member) => member.evaluationStatus === 'Concluído').map((member) => Math.round(percentOf(member.score, member.maxScore))))
    : null;

  const withDelta = people.filter((person) => person.delta !== null);
  const rise = [...withDelta].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];
  const drop = [...withDelta].sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0];

  return {
    team,
    cycle,
    previousCycle,
    people,
    summary: {
      total: people.length,
      evaluated: evaluated.length,
      pending: people.length - evaluated.length,
      average,
      previousAverage,
      averageDelta: average !== null && previousAverage !== null ? average - previousAverage : null,
      byStatus,
    },
    highlights: {
      biggestRise: rise && (rise.delta ?? 0) > 0 ? rise : null,
      biggestDrop: drop && (drop.delta ?? 0) < 0 ? drop : null,
    },
  };
}

export interface BriefingAiPayload {
  cycle: string;
  previousCycle: string | null;
  summary: BriefingFacts['summary'];
  people: Array<Omit<BriefingPerson, 'name'>>;
}

/** O que vai para a IA: códigos no lugar dos nomes, e sem o nome da equipe (que é o do líder). */
export function toAiPayload(facts: BriefingFacts): BriefingAiPayload {
  return {
    cycle: facts.cycle,
    previousCycle: facts.previousCycle,
    summary: facts.summary,
    people: facts.people.map(({ name: _name, ...rest }) => rest),
  };
}

/** Troca os códigos (P1, P2...) do texto da IA pelos nomes; código desconhecido fica como veio. */
export function revealNames(text: string, people: readonly Pick<BriefingPerson, 'code' | 'name'>[]): string {
  const byCode = new Map(people.map((person) => [person.code, person.name]));
  return text.replace(/\bP\d+\b/g, (code) => byCode.get(code) ?? code);
}

export interface BriefingTalkingPoint {
  /** Código da pessoa (P1...) ou null quando o ponto é da equipe toda. */
  code: string | null;
  point: string;
}

export interface BriefingText {
  headline: string;
  highlights: string[];
  attention: string[];
  talkingPoints: BriefingTalkingPoint[];
  nextSteps: string[];
}

const MAX_TEXT = 400;

function textList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim().slice(0, MAX_TEXT))
    .slice(0, max);
}

/** Valida a resposta da função: manchete obrigatória e listas dentro dos limites. */
export function parseBriefingResponse(data: unknown): BriefingText {
  if (typeof data !== 'object' || data === null) throw new Error('Resposta inválida da IA.');
  const { headline, highlights, attention, talkingPoints, nextSteps } = data as Record<string, unknown>;
  if (typeof headline !== 'string' || !headline.trim()) throw new Error('A IA não devolveu o resumo do ciclo.');

  const points: BriefingTalkingPoint[] = [];
  if (Array.isArray(talkingPoints)) {
    for (const entry of talkingPoints) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { code, point } = entry as { code?: unknown; point?: unknown };
      if (typeof point !== 'string' || !point.trim()) continue;
      points.push({ code: typeof code === 'string' && /^P\d+$/.test(code) ? code : null, point: point.trim().slice(0, MAX_TEXT) });
      if (points.length === 8) break;
    }
  }

  return {
    headline: headline.trim().slice(0, MAX_TEXT),
    highlights: textList(highlights, 4),
    attention: textList(attention, 4),
    talkingPoints: points,
    nextSteps: textList(nextSteps, 3),
  };
}

const arrow = (delta: number | null) => (delta === null ? '' : delta > 0 ? ` (+${delta} pp)` : delta < 0 ? ` (${delta} pp)` : ' (igual)');

/** Briefing em texto puro, para copiar e colar (os fatos sempre; o texto da IA quando já foi gerado). */
export function formatBriefing(facts: BriefingFacts, text: BriefingText | null): string {
  const { summary } = facts;
  const lines: string[] = [`Briefing do ciclo ${facts.cycle} · equipe ${facts.team}`, ''];
  if (text) lines.push(revealNames(text.headline, facts.people), '');
  lines.push(
    `Avaliados: ${summary.evaluated} de ${summary.total}` + (summary.pending ? ` (${summary.pending} sem avaliação)` : ''),
    summary.average === null
      ? 'Média da equipe: ainda sem avaliados'
      : `Média da equipe: ${summary.average}%` + (summary.averageDelta !== null ? `${arrow(summary.averageDelta)} contra ${facts.previousCycle}` : ''),
    '',
    'Pessoas:',
  );
  for (const person of facts.people) {
    if (!person.evaluated) {
      lines.push(`- ${person.name}: sem avaliação no ciclo`);
      continue;
    }
    const change = person.statusChange === 'subiu' || person.statusChange === 'caiu' ? `, ${person.statusChange} de ${person.previousStatus} para ${person.status}` : `, ${person.status}`;
    const pdi = person.overduePdi > 0 ? `, ${person.overduePdi} meta(s) de PDI atrasada(s)` : '';
    lines.push(`- ${person.name}: ${person.percent}%${arrow(person.delta)}${change}${pdi}`);
  }
  if (text) {
    const section = (title: string, items: string[]) => {
      if (items.length) lines.push('', `${title}:`, ...items.map((item) => `- ${revealNames(item, facts.people)}`));
    };
    section('Destaques', text.highlights);
    section('Pontos de atenção', text.attention);
    section('Pauta para conversas 1:1', text.talkingPoints.map((entry) => `${entry.code ? `${revealNames(entry.code, facts.people)}: ` : ''}${entry.point}`));
    section('Próximos passos', text.nextSteps);
  }
  return lines.join('\n');
}
