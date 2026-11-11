import { describe, expect, it } from 'vitest';
import { monthlyTrend } from './trend';

const member = (history: Array<{ month: string; score: number; max?: number }>) => ({ history });
const november = new Date(2026, 10, 15);

describe('monthlyTrend', () => {
  it('devolve 4 meses terminando no mês de referência, sem dados quando ninguém tem histórico', () => {
    const trend = monthlyTrend([member([])], november);
    expect(trend.map((point) => point.month)).toEqual(['Ago', 'Set', 'Out', 'Nov']);
    expect(trend.every((point) => point.avg === null && point.max === null && point.min === null)).toBe(true);
  });

  it('calcula em percentual de cada entrada, não em pontos brutos de conjuntos diferentes', () => {
    const trend = monthlyTrend(
      [
        member([{ month: 'Novembro/2026', score: 150, max: 150 }]), // 100%
        member([{ month: 'Novembro/2026', score: 75, max: 150 }]), // 50%
        member([{ month: 'Novembro/2026', score: 175, max: 175 }]), // 100%
      ],
      november,
    );
    const nov = trend[3];
    expect(nov.avg).toBe(83);
    expect(nov.max).toBe(100);
    expect(nov.min).toBe(50);
  });

  it('entrada antiga sem máximo vale na escala de 155', () => {
    const nov = monthlyTrend([member([{ month: 'Novembro/2026', score: 155 }])], november)[3];
    expect(nov.avg).toBe(100);
  });

  it('não mistura o mesmo mês de outro ano', () => {
    const nov = monthlyTrend([member([{ month: 'Novembro/2025', score: 155 }])], november)[3];
    expect(nov.avg).toBeNull();
  });
});
