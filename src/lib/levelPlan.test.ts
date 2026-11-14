import { describe, expect, it } from 'vitest';
import type { CriteriaCategory } from './criteria';
import { buildLevelPlan, projectScore } from './levelPlan';

// 10 perguntas, máximo 50: Voando acima de 45,16 (46+), Caminho Certo acima de 41,9 (42+), Atenção a partir de 38,7 (39+).
const categories: CriteriaCategory[] = [
  { id: 'c1', name: 'Entrega', items: Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, text: `Pergunta A${i}` })) },
  { id: 'c2', name: 'Postura', items: Array.from({ length: 5 }, (_, i) => ({ id: `b${i}`, text: `Pergunta B${i}` })) },
];
const all = (value: number) => Object.fromEntries(categories.flatMap((c) => c.items.map((i) => [i.id, value])));

describe('projectScore', () => {
  it('soma as notas das perguntas do conjunto e ignora o que não é pergunta', () => {
    expect(projectScore(categories, { a0: 5, b0: 3, outra: 5 })).toBe(8);
  });
});

describe('buildLevelPlan', () => {
  it('calcula quanto falta para a próxima faixa', () => {
    const plan = buildLevelPlan(categories, { ...all(4), a0: 3 }); // 39 pontos: Atenção
    expect(plan.score).toBe(39);
    expect(plan.maxScore).toBe(50);
    expect(plan.status).toBe('Atenção');
    expect(plan.next).toEqual({ status: 'Caminho Certo', target: 42, missing: 3 });
  });

  it('sugere primeiro as perguntas com mais pontos a ganhar e para quando a meta é alcançada', () => {
    const scores = { ...all(4), a0: 1, b0: 2 }; // 39 pontos
    const plan = buildLevelPlan(categories, scores);
    expect(plan.candidates[0].id).toBe('a0');
    expect(plan.candidates[0].gain).toBe(4);
    expect(plan.path.map((c) => c.id)).toEqual(['a0']); // +4 já passa dos 3 que faltam
  });

  it('em Voando não há próxima faixa', () => {
    const plan = buildLevelPlan(categories, all(5));
    expect(plan.status).toBe('Voando');
    expect(plan.next).toBeNull();
    expect(plan.candidates).toEqual([]);
  });

  it('pergunta sem nota conta como zero', () => {
    const plan = buildLevelPlan(categories, { a0: 5 });
    expect(plan.score).toBe(5);
    expect(plan.candidates.find((c) => c.id === 'a1')?.current).toBe(0);
  });

  it('avisa quando mesmo com tudo no máximo não chega (não acontece, mas não quebra)', () => {
    expect(buildLevelPlan([], {}).next).toBeNull();
  });
});
