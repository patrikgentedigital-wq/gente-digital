import { describe, expect, it } from 'vitest';
import type { CriteriaCategory } from './criteria';
import {
  criteriaScoreKeys,
  getCategoryScorePercent,
  hasCompleteCriteriaScores,
  normalizeCriteriaScores,
} from './evaluation';
import { getCategoryScore } from '../utils/reportUtils';

const team: CriteriaCategory[] = [
  { id: 'a', name: 'Atendimento', items: [{ id: 'q1', text: 'Um' }, { id: 'q2', text: 'Dois' }] },
  { id: 'b', name: 'Campo', items: [{ id: 'q3', text: 'Três' }] },
];

describe('funções de avaliação com as perguntas da equipe', () => {
  it('lista os ids das perguntas na ordem das categorias', () => {
    expect(criteriaScoreKeys(team)).toEqual(['q1', 'q2', 'q3']);
  });

  it('só considera completa a avaliação que cobre todas as perguntas da equipe', () => {
    expect(hasCompleteCriteriaScores({ q1: 5, q2: 4 }, team)).toBe(false);
    expect(hasCompleteCriteriaScores({ q1: 5, q2: 4, q3: 0 }, team)).toBe(true);
    expect(hasCompleteCriteriaScores({}, [])).toBe(false);
  });

  it('descarta notas de perguntas que não são da equipe e notas fora de 0 a 5', () => {
    expect(normalizeCriteriaScores({ q1: 5, q2: 9, q3: 2, '1-0': 5 }, team)).toEqual({ q1: 5, q3: 2 });
  });

  it('calcula o percentual por categoria usando o id da categoria', () => {
    expect(getCategoryScorePercent({ q1: 5, q2: 5, q3: 0 }, 'a', team)).toBe(100);
    expect(getCategoryScorePercent({ q1: 5, q2: 0, q3: 0 }, 'a', team)).toBe(50);
    expect(getCategoryScorePercent({ q1: 5 }, 'a', team)).toBeNull();
    expect(getCategoryScorePercent({ q1: 5 }, 'zzz', team)).toBeNull();
  });

  it('calcula a soma e o máximo da categoria no relatório', () => {
    expect(getCategoryScore('a', { q1: 3, q2: 4, q3: 1 }, team)).toEqual({ sum: 7, max: 10 });
    expect(getCategoryScore('b', undefined, team)).toEqual({ sum: null, max: 5 });
  });
});
