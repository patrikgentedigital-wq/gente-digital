import { PerformanceStatus, TeamMember } from '../types';
import { CRITERIA_CATEGORIES } from '../data/catalogData';

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

export const AVAILABLE_EVALUATION_CYCLES: EvaluationCycleOption[] = generateEvaluationCycles();
export const DEFAULT_EVALUATION_CYCLE: string = AVAILABLE_EVALUATION_CYCLES[0]?.id || 'Agosto/2026';

export const CRITERIA_SCORE_KEYS = CRITERIA_CATEGORIES.flatMap((category) =>
  category.items.map((_, index) => `${category.id}-${index}`),
);

export function normalizeCriteriaScores(scores: unknown): Record<string, number> {
  if (!scores || typeof scores !== 'object') return {};

  const source = scores as Record<string, unknown>;
  return Object.fromEntries(
    CRITERIA_SCORE_KEYS.flatMap((key) => {
      const value = source[key];
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5
        ? [[key, value]]
        : [];
    }),
  );
}

export function getCategoryScorePercent(
  criteriaScores: Record<string, number> | undefined,
  categoryId: number,
) {
  const category = CRITERIA_CATEGORIES.find((item) => item.id === categoryId);
  if (!category || !criteriaScores) return null;

  const scores = category.items.map((_, index) => criteriaScores[`${categoryId}-${index}`]);
  if (scores.some((score) => typeof score !== 'number' || !Number.isFinite(score))) return null;

  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round((total / (category.items.length * 5)) * 100);
}

export function hasCompleteCriteriaScores(scores: Record<string, number | undefined>) {
  return CRITERIA_SCORE_KEYS.every((key) => typeof scores[key] === 'number');
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
