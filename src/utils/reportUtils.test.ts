import { describe, expect, it } from 'vitest';
import { getCategoryScore } from './reportUtils';

describe('report score calculations', () => {
  it('returns null for a partially filled category instead of treating missing scores as zero', () => {
    expect(getCategoryScore(1, { '1-0': 5, '1-1': 4 })).toEqual({ sum: null, max: 25 });
  });

  it('sums a complete category', () => {
    expect(getCategoryScore(1, {
      '1-0': 5,
      '1-1': 4,
      '1-2': 3,
      '1-3': 2,
      '1-4': 1,
    })).toEqual({ sum: 15, max: 25 });
  });
});
