import type { PerformanceStatus } from '../types';

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
