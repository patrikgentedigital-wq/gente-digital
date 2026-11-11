import React from 'react';
import type { LevelKey } from '../../lib/dashboardStats';

interface StatusDistributionChartProps {
  levelCounts: Record<LevelKey, number>;
  totalMembers: number;
}

const STRIPES = 'repeating-linear-gradient(45deg, var(--color-line-soft) 0 5px, var(--color-surface-2) 5px 10px)';

const LEVELS: Array<{ key: LevelKey; label: string; fill: string }> = [
  { key: 'Voando', label: 'Voando', fill: 'var(--color-accent)' },
  { key: 'Caminho Certo', label: 'Caminho certo', fill: 'var(--color-success)' },
  { key: 'Atenção', label: 'Atenção', fill: 'var(--color-warn)' },
  { key: 'Alarme', label: 'Alarme', fill: 'var(--color-danger)' },
  { key: 'Sem avaliação', label: 'Sem avaliação', fill: STRIPES },
];

/** Uma barra dividida por nível, com quem ainda não foi avaliado à parte. */
export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ levelCounts, totalMembers }) => (
  <section aria-label="Distribuição por nível" className="blk p-5 text-ink">
    <h3 className="font-display font-extrabold text-base mb-4">Por nível</h3>
    <div className="flex h-6 rounded-md border-2 border-block-edge overflow-hidden mb-4" aria-hidden="true">
      {LEVELS.filter((level) => levelCounts[level.key] > 0).map((level) => (
        <div
          key={level.key}
          className="h-full border-r-2 border-block-edge last:border-r-0"
          style={{ width: `${(levelCounts[level.key] / (totalMembers || 1)) * 100}%`, background: level.fill }}
        />
      ))}
    </div>
    <ul className="space-y-1.5 text-xs">
      {LEVELS.map((level) => (
        <li key={level.key} className={`flex items-center justify-between ${level.key === 'Sem avaliação' ? 'text-muted' : ''}`}>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`w-3 h-3 rounded-sm border-[1.5px] ${level.key === 'Sem avaliação' ? 'border-dashed border-faint' : 'border-block-edge'}`}
              style={{ background: level.fill }}
            />
            {level.label}
          </span>
          <span className="font-bold">{levelCounts[level.key]}</span>
        </li>
      ))}
    </ul>
  </section>
);
