import { PerformanceStatus, TeamMember } from '../types';
import { DEFAULT_CRITERIA_CATEGORIES } from '../data/catalogData';
import type { CriteriaCategory } from './criteria';

export interface EvaluationCycleOption {
  id: string;
  label: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function generateEvaluationCycles(referenceDate = new Date()): EvaluationCycleOption[] {
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  const cycles: EvaluationCycleOption[] = [];

  for (let i = 0; i < 6; i++) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m < 0) {
      m += 12;
      y -= 1;
    }
    const name = MONTH_NAMES[m];
    const id = `${name}/${y}`;
    cycles.push({
      id,
      label: i === 0 ? `${name} / ${y} (Atual)` : `${name} / ${y}`,
    });
  }
  return cycles;
}

export function getEvaluationCycles(referenceDate = new Date()): EvaluationCycleOption[] {
  return generateEvaluationCycles(referenceDate);
}

export function getDefaultEvaluationCycle(referenceDate = new Date()): string {
  return getEvaluationCycles(referenceDate)[0]?.id || `${MONTH_NAMES[referenceDate.getMonth()]}/${referenceDate.getFullYear()}`;
}

/** Ids das perguntas, na ordem das categorias. Sem argumento, usa as 31 perguntas padrão. */
export function criteriaScoreKeys(categories: readonly CriteriaCategory[] = DEFAULT_CRITERIA_CATEGORIES): string[] {
  return categories.flatMap((category) => category.items.map((item) => item.id));
}

export const CRITERIA_SCORE_KEYS = criteriaScoreKeys();

export function normalizeCriteriaScores(
  scores: unknown,
  categories: readonly CriteriaCategory[] = DEFAULT_CRITERIA_CATEGORIES,
): Record<string, number> {
  if (!scores || typeof scores !== 'object') return {};

  const source = scores as Record<string, unknown>;
  return Object.fromEntries(
    criteriaScoreKeys(categories).flatMap((key) => {
      const value = source[key];
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5
        ? [[key, value]]
        : [];
    }),
  );
}

export function getCategoryScorePercent(
  criteriaScores: Record<string, number> | undefined,
  categoryId: number | string,
  categories: readonly CriteriaCategory[] = DEFAULT_CRITERIA_CATEGORIES,
): number | null {
  const category = categories.find((item) => item.id === String(categoryId));
  if (!category || !criteriaScores || category.items.length === 0) return null;

  const scores = category.items.map((item) => criteriaScores[item.id]);
  if (scores.some((score) => typeof score !== 'number' || !Number.isFinite(score))) return null;

  const total = (scores as number[]).reduce((sum, score) => sum + score, 0);
  return Math.round((total / (category.items.length * 5)) * 100);
}

export function hasCompleteCriteriaScores(
  scores: Record<string, number | undefined>,
  categories: readonly CriteriaCategory[] = DEFAULT_CRITERIA_CATEGORIES,
): boolean {
  const keys = criteriaScoreKeys(categories);
  return keys.length > 0 && keys.every((key) => typeof scores[key] === 'number' && Number.isFinite(scores[key]));
}

export function getPerformanceStatus(score: number): PerformanceStatus {
  if (score > 140) return 'Voando';
  if (score > 130) return 'Caminho Certo';
  if (score >= 120) return 'Atenção';
  return 'Alarme';
}

export function makeEvaluationId(memberId: string, cycle: string) {
  const cycleId = cycle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `evaluation_${memberId}_${cycleId}`;
}

export function isPdiGoalOverdue(goal: { status: 'pending' | 'completed'; dueDate?: string }, referenceDate = new Date()) {
  if (goal.status !== 'pending' || !goal.dueDate) return false;
  const today = [
    referenceDate.getFullYear(),
    String(referenceDate.getMonth() + 1).padStart(2, '0'),
    String(referenceDate.getDate()).padStart(2, '0'),
  ].join('-');
  return goal.dueDate < today;
}

export function sumCriteriaScores(scores: Record<string, number>, keys: string[]) {
  if (keys.some((key) => typeof scores[key] !== 'number')) return null;
  return keys.reduce((total, key) => total + scores[key], 0);
}

export function rankMembers(members: TeamMember[]) {
  return [...members]
    .sort((a, b) => b.score - a.score)
    .map((member, index) => ({
      ...member,
      previousRank: member.rank,
      rank: index + 1,
    }));
}
