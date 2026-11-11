import React from 'react';
import type { DashboardStats } from '../../lib/dashboardStats';

interface DashboardKpiCardsProps {
  stats: DashboardStats;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-bold uppercase tracking-[0.06em]">{children}</div>
);

const Big: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="font-display text-4xl font-extrabold leading-tight">{children}</div>
);

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({ stats }) => {
  const { avgPercent, evaluatedCount, totalMembers, onTargetCount, bestTeam } = stats;
  const evaluatedShare = totalMembers > 0 ? Math.round((evaluatedCount / totalMembers) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <section aria-label="Média geral" className="blk-hero p-4">
        <Label>Média geral</Label>
        <Big>{avgPercent === null ? '—' : `${avgPercent}%`}</Big>
        <div className="text-xs opacity-80">
          {evaluatedCount === 0 ? 'ninguém avaliado ainda' : `dos ${evaluatedCount} avaliados`}
        </div>
      </section>

      <section aria-label="Na meta" className="blk p-4 text-ink">
        <Label>Na meta</Label>
        <Big>{onTargetCount}</Big>
        <div className="text-xs text-muted">{onTargetCount === 1 ? 'pessoa' : 'pessoas'} acima de 90%</div>
      </section>

      <section aria-label="Avaliados" className="blk p-4" style={{ background: 'var(--color-teal)', color: '#000000' }}>
        <Label>Avaliados</Label>
        <Big>
          {evaluatedCount}
          <span className="text-lg">/{totalMembers}</span>
        </Big>
        <div className="h-2 mt-1 rounded border-[1.5px] border-black bg-white overflow-hidden">
          <div className="h-full bg-black" style={{ width: `${evaluatedShare}%` }} />
        </div>
      </section>

      <section aria-label="Equipe destaque" className="blk p-4 text-ink">
        <Label>Equipe destaque</Label>
        {bestTeam ? (
          <>
            <div className="font-display text-2xl font-extrabold leading-tight mt-1 truncate">{bestTeam.leader}</div>
            <div className="text-xs text-muted">média {bestTeam.avgPercent}%</div>
          </>
        ) : (
          <>
            <Big>—</Big>
            <div className="text-xs text-muted">sem avaliações suficientes</div>
          </>
        )}
      </section>
    </div>
  );
};
