import { describe, expect, it } from 'vitest';
import { compareByPercent, percentOf, statusForScore } from './scoring';

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
