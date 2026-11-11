import React from 'react';
import type { TeamStat } from '../../lib/dashboardStats';

interface TeamComparisonChartProps {
  teamStats: TeamStat[];
}

const GOAL = 90;

/** Barras horizontais com a média de cada equipe e a linha da meta. Equipe sem avaliados fica tracejada. */
export const TeamComparisonChart: React.FC<TeamComparisonChartProps> = ({ teamStats }) => (
  <section aria-label="Média por equipe" className="blk p-5 lg:col-span-2 text-ink">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display font-extrabold text-base">Média por equipe</h3>
      <span className="text-[11px] font-bold">┆ meta {GOAL}%</span>
    </div>
    <ul className="space-y-2.5">
      {teamStats.map((team) => (
        <li key={team.leader} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs font-bold">{team.leader}</span>
          <div className="relative flex-1 h-5">
            {team.avgPercent === null ? (
              <div className="h-full rounded-md border-2 border-dashed border-faint" />
            ) : (
              <div className="h-full rounded-md border-2 border-block-edge bg-surface overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${team.avgPercent}%` }} />
              </div>
            )}
            <div
              aria-hidden="true"
              className="absolute -top-1 -bottom-1 border-l-2 border-dashed border-block-edge"
              style={{ left: `${GOAL}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-display font-extrabold text-sm">
            {team.avgPercent === null ? <span className="text-faint">—</span> : team.avgPercent}
          </span>
        </li>
      ))}
    </ul>
  </section>
);
