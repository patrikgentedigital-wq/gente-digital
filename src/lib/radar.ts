import type { CriteriaCategory } from './criteria';

export interface RadarPoint {
  /** Rótulo curto da ponta do gráfico (precisa ser único: o gráfico junta pontas com o mesmo rótulo). */
  label: string;
  /** Nome completo da categoria ou texto da pergunta, para a dica ao passar o mouse. */
  fullName: string;
  /** Percentual de 0 a 100. */
  value: number;
}

/** Um radar precisa de pelo menos 3 pontas para formar uma área. */
const MIN_RADAR_AXES = 3;

const CONNECTORS = new Set(['e', 'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'à', 'ao', 'com', 'para']);

/** Nome curto da categoria: até a primeira vírgula ou " e ", no máximo 3 palavras, sem preposição solta no fim. */
export function radarAxisLabel(name: string): string {
  let label = name.split(',')[0].trim();
  const andIndex = label.indexOf(' e ');
  if (andIndex > 0) label = label.slice(0, andIndex);
  const words = label.split(/\s+/).filter(Boolean).slice(0, 3);
  while (words.length > 1 && CONNECTORS.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(' ') || name.trim();
}

/** Dica do gráfico (labelFormatter do Tooltip): mostra o nome completo da ponta em vez do rótulo curto. */
export function radarTooltipLabel(label: unknown, payload: readonly { payload?: Partial<RadarPoint> }[] | undefined): string {
  return payload?.[0]?.payload?.fullName ?? String(label ?? '');
}

const percent = (sum: number, questions: number) => Math.round((sum / (questions * 5)) * 100);
const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function withUniqueLabels(points: RadarPoint[]): RadarPoint[] {
  const used = new Set<string>();
  return points.map((point, index) => {
    const label = used.has(point.label) ? `${point.label} ${index + 1}` : point.label;
    used.add(label);
    return { ...point, label };
  });
}

/**
 * Dados do radar: uma ponta por categoria; com menos de 3 categorias, uma ponta por pergunta.
 * Nota ausente conta como 0, a não ser com skipIncomplete (a ponta fica de fora).
 */
export function buildRadarData(
  categories: readonly CriteriaCategory[],
  scores: Record<string, number | undefined> | undefined,
  options: { skipIncomplete?: boolean } = {},
): RadarPoint[] {
  const { skipIncomplete = false } = options;
  const source = scores ?? {};

  if (categories.length >= MIN_RADAR_AXES) {
    return withUniqueLabels(
      categories.flatMap((category) => {
        if (category.items.length === 0) return [];
        const values = category.items.map((item) => source[item.id]);
        if (skipIncomplete && !values.every(isScore)) return [];
        const sum = values.reduce<number>((total, value) => total + (isScore(value) ? value : 0), 0);
        return [{ label: radarAxisLabel(category.name), fullName: category.name, value: percent(sum, category.items.length) }];
      }),
    );
  }

  return categories
    .flatMap((category) => category.items)
    .flatMap((item, index) => {
      const value = source[item.id];
      if (skipIncomplete && !isScore(value)) return [];
      return [{ label: `P${index + 1}`, fullName: item.text, value: percent(isScore(value) ? value : 0, 1) }];
    });
}
