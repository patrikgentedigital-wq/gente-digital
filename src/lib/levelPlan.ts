import type { PerformanceStatus } from '../types';
import { MAX_SCORE_PER_ITEM, maxScoreFor, type CriteriaCategory } from './criteria';
import { statusForScore } from './scoring';

export interface PlanQuestion {
  id: string;
  text: string;
  category: string;
  /** Nota atual (0 a 5; sem resposta conta zero). */
  current: number;
  /** Pontos que ainda dá para ganhar nela. */
  gain: number;
}

export interface LevelPlan {
  score: number;
  maxScore: number;
  status: PerformanceStatus;
  /** Próxima faixa, quanto vale o piso dela e quantos pontos faltam; null quando já está na mais alta. */
  next: { status: PerformanceStatus; target: number; missing: number } | null;
  /** Perguntas com pontos a ganhar, as de maior ganho primeiro. */
  candidates: PlanQuestion[];
  /** Menor conjunto dessas perguntas (as de maior ganho) que, em nota máxima, leva à próxima faixa. */
  path: PlanQuestion[];
}

const ORDER: PerformanceStatus[] = ['Alarme', 'Atenção', 'Caminho Certo', 'Voando'];

function clampScore(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(MAX_SCORE_PER_ITEM, Math.max(0, value)) : 0;
}

/** Soma das notas das perguntas do conjunto (o que não é pergunta dele é ignorado). */
export function projectScore(categories: readonly CriteriaCategory[], scores: Record<string, number>): number {
  return categories.reduce((sum, category) => sum + category.items.reduce((acc, item) => acc + clampScore(scores[item.id]), 0), 0);
}

/** Pontos que faltam para a próxima faixa e as perguntas que mais rendem para chegar lá. */
export function buildLevelPlan(categories: readonly CriteriaCategory[], scores: Record<string, number>): LevelPlan {
  const maxScore = maxScoreFor(categories);
  const score = projectScore(categories, scores);
  const status = statusForScore(score, maxScore);

  const nextStatus = ORDER[ORDER.indexOf(status) + 1];
  let next: LevelPlan['next'] = null;
  if (nextStatus && maxScore > 0) {
    let target = score + 1;
    while (target <= maxScore && statusForScore(target, maxScore) !== nextStatus) target += 1;
    if (target <= maxScore) next = { status: nextStatus, target, missing: target - score };
  }

  const candidates: PlanQuestion[] = next
    ? categories
        .flatMap((category) =>
          category.items.map((item) => {
            const current = clampScore(scores[item.id]);
            return { id: item.id, text: item.text, category: category.name, current, gain: MAX_SCORE_PER_ITEM - current };
          }),
        )
        .filter((question) => question.gain > 0)
        .sort((a, b) => b.gain - a.gain)
    : [];

  const path: PlanQuestion[] = [];
  if (next) {
    let gained = 0;
    for (const question of candidates) {
      if (gained >= next.missing) break;
      path.push(question);
      gained += question.gain;
    }
  }

  return { score, maxScore, status, next, candidates, path };
}
