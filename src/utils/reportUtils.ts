import { DEFAULT_CRITERIA_CATEGORIES } from '../data/catalogData';
import type { CriteriaCategory } from '../lib/criteria';

export function getCategoryScore(
  catId: number | string,
  criteriaScores?: Record<string, number>,
  categories: readonly CriteriaCategory[] = DEFAULT_CRITERIA_CATEGORIES,
): { sum: number | null; max: number } {
  const category = categories.find((item) => item.id === String(catId));
  if (!category) return { sum: null, max: 25 };

  const max = category.items.length * 5;
  if (!criteriaScores) return { sum: null, max };

  const values = category.items.map((item) => criteriaScores[item.id]);
  if (values.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    return { sum: null, max };
  }

  return { sum: values.reduce((total, value) => total + value, 0), max };
}
