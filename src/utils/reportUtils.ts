import { CRITERIA_CATEGORIES } from '../data/catalogData';

export function getCategoryScore(
  catId: number,
  criteriaScores?: Record<string, number>,
): { sum: number | null; max: number } {
  const category = CRITERIA_CATEGORIES.find((item) => item.id === catId);
  if (!category) return { sum: null, max: 25 };

  const max = category.items.length * 5;
  if (!criteriaScores) return { sum: null, max };

  const values = category.items.map((_, index) => criteriaScores[`${catId}-${index}`]);
  if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    return { sum: null, max };
  }

  return { sum: values.reduce((total, value) => total + value, 0), max };
}
