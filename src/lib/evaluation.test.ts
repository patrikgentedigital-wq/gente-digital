import { describe, expect, it } from 'vitest';
import {
  CRITERIA_SCORE_KEYS,
  getCategoryScorePercent,
  getPerformanceStatus,
  hasCompleteCriteriaScores,
  makeEvaluationId,
  normalizeCriteriaScores,
  sumCriteriaScores,
} from './evaluation';

describe('evaluation domain rules', () => {
  it('maps score thresholds without inventing a pending score', () => {
    expect(getPerformanceStatus(155)).toBe('Voando');
    expect(getPerformanceStatus(140)).toBe('Caminho Certo');
    expect(getPerformanceStatus(120)).toBe('Atenção');
    expect(getPerformanceStatus(0)).toBe('Alarme');
  });

  it('creates a deterministic evaluation id per member and cycle', () => {
    expect(makeEvaluationId('emp-1', 'Agosto/2026')).toBe('evaluation_emp-1_agosto_2026');
    expect(makeEvaluationId('emp-1', 'Agosto/2026')).toBe(makeEvaluationId('emp-1', 'Agosto/2026'));
  });

  it('rejects incomplete criteria instead of treating missing values as five', () => {
    expect(sumCriteriaScores({ '1-0': 5 }, ['1-0', '1-1'])).toBeNull();
    expect(sumCriteriaScores({ '1-0': 5, '1-1': 4 }, ['1-0', '1-1'])).toBe(9);
  });

  it('recognizes a complete evaluation and calculates category adherence', () => {
    const scores = Object.fromEntries(CRITERIA_SCORE_KEYS.map((key) => [key, 5]));

    expect(hasCompleteCriteriaScores(scores)).toBe(true);
    expect(getCategoryScorePercent(scores, 1)).toBe(100);
    expect(getCategoryScorePercent({ '1-0': 5 }, 1)).toBeNull();
  });

  it('normalizes persisted score maps before rendering or exporting', () => {
    expect(normalizeCriteriaScores({ '1-0': 4, '1-1': 'invalid', '99-1': 5 })).toEqual({ '1-0': 4 });
  });
});
