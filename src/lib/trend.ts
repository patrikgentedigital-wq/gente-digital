import type { TeamMember } from '../types';
import { historyPercent } from './scoring';

export interface TrendPoint {
  month: string;
  year: number;
  /** Percentuais (0 a 100) do mês; nulos quando ninguém tem avaliação nele. */
  avg: number | null;
  max: number | null;
  min: number | null;
}

function matchesMonth(label: string, terms: readonly string[], year: number): boolean {
  const lower = label.toLowerCase();
  if (!terms.some((term) => lower.includes(term))) return false;
  const found = /\b(\d{4})\b/.exec(lower);
  return !found || Number(found[1]) === year;
}

/**
 * Evolução mensal em percentual do máximo de cada avaliação. Cada pessoa pode usar um conjunto de perguntas
 * com máximo diferente (150, 155, 175...), então somar pontos brutos distorceria a média.
 */
export function monthlyTrend(
  members: ReadonlyArray<Pick<TeamMember, 'history'>>,
  reference = new Date(),
  months = 4,
): TrendPoint[] {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth() - (months - 1 - index), 1);
    const shortName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const fullName = date.toLocaleDateString('pt-BR', { month: 'long' });
    const terms = [shortName.toLowerCase(), fullName.toLowerCase()];
    const year = date.getFullYear();

    const percents = members
      .map((member) => member.history?.find((entry) => matchesMonth(entry.month, terms, year)))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
      .map(historyPercent);

    return {
      month: shortName.charAt(0).toUpperCase() + shortName.slice(1),
      year,
      avg: percents.length > 0 ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length) : null,
      max: percents.length > 0 ? Math.round(Math.max(...percents)) : null,
      min: percents.length > 0 ? Math.round(Math.min(...percents)) : null,
    };
  });
}
