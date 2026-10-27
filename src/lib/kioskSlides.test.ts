import { describe, expect, it } from 'vitest';
import { activeSlide, availableSlides, nextSlide } from './kioskSlides';

describe('availableSlides', () => {
  it('sem nenhuma avaliação, nenhum slide aparece', () => {
    expect(availableSlides({ topScore: 0, growth: 0, teamsWithScore: 0, levelUp: 0 })).toEqual([false, false, false, false]);
  });

  it('cada slide aparece só quando tem o que mostrar', () => {
    expect(availableSlides({ topScore: 120, growth: 0, teamsWithScore: 2, levelUp: 0 })).toEqual([true, false, true, false]);
    expect(availableSlides({ topScore: 120, growth: 3, teamsWithScore: 2, levelUp: 1 })).toEqual([true, true, true, true]);
  });
});

describe('nextSlide', () => {
  const available = [true, false, true, false];

  it('pula slides vazios e dá a volta', () => {
    expect(nextSlide(0, available, 1)).toBe(2);
    expect(nextSlide(2, available, 1)).toBe(0);
    expect(nextSlide(0, available, -1)).toBe(2);
    expect(nextSlide(2, available, -1)).toBe(0);
  });

  it('com um só slide, fica nele; sem nenhum, não sai do lugar', () => {
    expect(nextSlide(0, [true, false, false, false], 1)).toBe(0);
    expect(nextSlide(2, [false, false, false, false], 1)).toBe(2);
  });
});

describe('activeSlide', () => {
  it('mantém o slide atual quando ele tem conteúdo e senão vai para o primeiro disponível', () => {
    expect(activeSlide(2, [true, false, true, false])).toBe(2);
    expect(activeSlide(1, [true, false, true, false])).toBe(0);
    expect(activeSlide(3, [false, false, true, false])).toBe(2);
  });

  it('devolve -1 quando não há nenhum slide para mostrar', () => {
    expect(activeSlide(0, [false, false, false, false])).toBe(-1);
  });
});
