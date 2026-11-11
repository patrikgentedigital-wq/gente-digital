import type { PerformanceStatus, TeamMember } from '../types';

/** Avaliado = já tem alguma avaliação salva. O status não volta a "Pendente" quando o ciclo muda. */
export function isEvaluated(member: Pick<TeamMember, 'evaluationStatus'>): boolean {
  return member.evaluationStatus === 'Concluído';
}

/** Percentual do máximo, de 0 a 100; 0 quando a equipe não tem perguntas. */
export function percentOf(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return (score * 100) / maxScore;
}

/**
 * Faixas de 155 pontos mantidas como percentual do máximo da equipe, em aritmética inteira:
 * Voando > 140/155, Caminho Certo > 130/155, Atenção >= 120/155, Alarme abaixo disso.
 */
export function statusForScore(score: number, maxScore: number): PerformanceStatus {
  if (maxScore <= 0) return 'Alarme';
  const scaled = score * 155;
  if (scaled > 140 * maxScore) return 'Voando';
  if (scaled > 130 * maxScore) return 'Caminho Certo';
  if (scaled >= 120 * maxScore) return 'Atenção';
  return 'Alarme';
}

interface Rankable {
  name: string;
  score: number;
  maxScore: number;
}

/** Maior percentual primeiro; empate por nome. */
export function compareByPercent(a: Rankable, b: Rankable): number {
  const difference = percentOf(b.score, b.maxScore) - percentOf(a.score, a.maxScore);
  return difference !== 0 ? difference : a.name.localeCompare(b.name, 'pt-BR');
}

/** Escala em que as avaliações antigas (sem máximo gravado no histórico) foram feitas. */
export const LEGACY_MAX = 155;

/** Leva uma pontuação de um máximo (`fromMax`) para outro (`toMax`); sem máximo de origem, assume 155. */
export function scaleScore(score: number, fromMax: number | undefined, toMax: number): number {
  if (toMax <= 0) return 0;
  const from = fromMax && fromMax > 0 ? fromMax : LEGACY_MAX;
  return (score * toMax) / from;
}

/** Percentual de uma entrada do histórico (mês, nota e máximo do conjunto daquele mês). */
export function historyPercent(entry: { score: number; max?: number }): number {
  return percentOf(entry.score, entry.max && entry.max > 0 ? entry.max : LEGACY_MAX);
}
