import { describe, expect, it } from 'vitest';
import { compareByPercent, historyPercent, isEvaluated, percentOf, scaleScore, statusForScore } from './scoring';

describe('statusForScore (faixas de 155 pontos)', () => {
  it.each([
    [141, 'Voando'],
    [140, 'Caminho Certo'],
    [131, 'Caminho Certo'],
    [130, 'Atenção'],
    [120, 'Atenção'],
    [119, 'Alarme'],
    [0, 'Alarme'],
  ])('%i de 155 é %s', (score, status) => {
    expect(statusForScore(score, 155)).toBe(status);
  });

  it('usa o mesmo percentual em equipes com outro total', () => {
    expect(statusForScore(28, 30)).toBe('Voando');
    expect(statusForScore(26, 30)).toBe('Caminho Certo');
    expect(statusForScore(24, 30)).toBe('Atenção');
    expect(statusForScore(23, 30)).toBe('Alarme');
    expect(statusForScore(20, 30)).toBe('Alarme');
  });

  it('trata máximo 0 como Alarme, sem dividir por zero', () => {
    expect(statusForScore(0, 0)).toBe('Alarme');
  });
});

describe('percentOf', () => {
  it('devolve 0 a 100 e 0 quando o máximo é 0', () => {
    expect(percentOf(155, 155)).toBe(100);
    expect(percentOf(15, 30)).toBe(50);
    expect(percentOf(5, 0)).toBe(0);
  });
});

describe('compareByPercent', () => {
  it('ordena pelo percentual, não pelos pontos, e desempata por nome', () => {
    const ordered = [
      { name: 'Bia', score: 130, maxScore: 155 },
      { name: 'Ana', score: 27, maxScore: 30 },
      { name: 'Caio', score: 27, maxScore: 30 },
    ].sort(compareByPercent);
    expect(ordered.map((item) => item.name)).toEqual(['Ana', 'Caio', 'Bia']);
  });
});

describe('scaleScore e historyPercent (conjuntos com máximos diferentes)', () => {
  it('leva uma pontuação de um máximo para outro', () => {
    expect(scaleScore(150, 150, 155)).toBeCloseTo(155);
    expect(scaleScore(87.5, 175, 100)).toBeCloseTo(50);
    expect(scaleScore(100, 100, 150)).toBeCloseTo(150);
  });

  it('sem máximo conhecido (histórico antigo), assume a escala de 155', () => {
    expect(scaleScore(155, undefined, 150)).toBeCloseTo(150);
    expect(scaleScore(31, 0, 62)).toBeCloseTo(12.4);
  });

  it('devolve 0 quando o destino não tem máximo', () => {
    expect(scaleScore(50, 100, 0)).toBe(0);
  });

  it('historyPercent usa o máximo da entrada, ou 155 quando não há', () => {
    expect(historyPercent({ score: 75, max: 150 })).toBeCloseTo(50);
    expect(historyPercent({ score: 175, max: 175 })).toBeCloseTo(100);
    expect(historyPercent({ score: 155 })).toBeCloseTo(100);
  });
});

describe('isEvaluated', () => {
  it('só quem tem avaliação concluída conta como avaliado', () => {
    expect(isEvaluated({ evaluationStatus: 'Concluído' })).toBe(true);
    expect(isEvaluated({ evaluationStatus: 'Pendente' })).toBe(false);
    expect(isEvaluated({ evaluationStatus: 'Forms Respondido' })).toBe(false);
  });
});
