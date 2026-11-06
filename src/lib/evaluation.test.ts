import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../types';
import {
  CRITERIA_SCORE_KEYS,
  cleanCriteriaScores,
  getCategoryScorePercent,
  generateEvaluationCycles,
  getDefaultEvaluationCycle,
  getPerformanceStatus,
  hasCompleteCriteriaScores,
  isPdiGoalOverdue,
  makeEvaluationId,
  normalizeCriteriaScores,
  rankMembers,
  sumCriteriaScores,
} from './evaluation';

describe('evaluation domain rules', () => {
  it('maps score thresholds exactly on all boundary values', () => {
    // Voando: score > 140
    expect(getPerformanceStatus(155)).toBe('Voando');
    expect(getPerformanceStatus(141)).toBe('Voando');

    // Caminho Certo: score > 130 and <= 140
    expect(getPerformanceStatus(140)).toBe('Caminho Certo');
    expect(getPerformanceStatus(131)).toBe('Caminho Certo');

    // Atenção: score >= 120 and <= 130
    expect(getPerformanceStatus(130)).toBe('Atenção');
    expect(getPerformanceStatus(120)).toBe('Atenção');

    // Alarme: score < 120
    expect(getPerformanceStatus(119)).toBe('Alarme');
    expect(getPerformanceStatus(50)).toBe('Alarme');
    expect(getPerformanceStatus(0)).toBe('Alarme');
  });

  it('creates a deterministic evaluation id per member and cycle', () => {
    expect(makeEvaluationId('emp-1', 'Agosto/2026')).toBe('evaluation_emp-1_agosto_2026');
    expect(makeEvaluationId('emp-1', 'Agosto/2026')).toBe(makeEvaluationId('emp-1', 'Agosto/2026'));
  });

  it('generates cycles dynamically across a year boundary', () => {
    const referenceDate = new Date(2026, 0, 15);
    const cycles = generateEvaluationCycles(referenceDate);

    expect(cycles[0]?.id).toBe('Janeiro/2026');
    expect(cycles[1]?.id).toBe('Dezembro/2025');
    expect(getDefaultEvaluationCycle(referenceDate)).toBe('Janeiro/2026');
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

  it('compares PDI deadlines using the local calendar date', () => {
    const localDate = new Date(2026, 2, 10, 23, 30);

    expect(isPdiGoalOverdue({ status: 'pending', dueDate: '2026-03-10' }, localDate)).toBe(false);
    expect(isPdiGoalOverdue({ status: 'pending', dueDate: '2026-03-09' }, localDate)).toBe(true);
  });
});

describe('rankMembers', () => {
  const member = (name: string, score: number, maxScore: number) =>
    ({ name, score, maxScore, rank: 0 }) as unknown as TeamMember;

  it('ordena pelo percentual do máximo, não pelos pontos', () => {
    // 140/150 = 93,3% passa 142/155 = 91,6%, mesmo com menos pontos.
    const ranked = rankMembers([member('Ana', 142, 155), member('Danielle', 140, 150)]);
    expect(ranked.map((m) => m.name)).toEqual(['Danielle', 'Ana']);
    expect(ranked.map((m) => m.rank)).toEqual([1, 2]);
  });

  it('desempata por nome', () => {
    expect(rankMembers([member('Bia', 10, 20), member('Ana', 10, 20)]).map((m) => m.name)).toEqual(['Ana', 'Bia']);
  });
});

describe('cleanCriteriaScores', () => {
  it('mantém notas válidas de qualquer pergunta, inclusive de ids que não são os padrão', () => {
    expect(cleanCriteriaScores({ '1-0': 4, novo_7: 5, ruim: 9, texto: 'x', nan: Number.NaN, zero: 0 })).toEqual({
      '1-0': 4,
      novo_7: 5,
      zero: 0,
    });
  });

  it('devolve vazio para entradas que não são objeto', () => {
    expect(cleanCriteriaScores(null)).toEqual({});
    expect(cleanCriteriaScores('oi')).toEqual({});
  });
});
