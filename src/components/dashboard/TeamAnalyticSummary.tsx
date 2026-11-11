import React from 'react';
import type { TeamStat } from '../../lib/dashboardStats';

interface TeamAnalyticSummaryProps {
  teamStats: TeamStat[];
  onSelectTeamFilter: (team: string) => void;
}

/** Um bloco por equipe; clicar abre o ranking filtrado pela equipe. */
export const TeamAnalyticSummary: React.FC<TeamAnalyticSummaryProps> = ({ teamStats, onSelectTeamFilter }) => (
  <section aria-label="Resumo por equipe">
    <h3 className="font-display font-extrabold text-base text-ink mb-3">Equipes</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {teamStats.map((team) => (
        <button
          key={team.leader}
          type="button"
          onClick={() => onSelectTeamFilter(team.leader)}
          className="blk p-4 text-left text-ink cursor-pointer hover:-translate-y-0.5 transition-transform"
          title={`Ver o Time ${team.leader} no ranking`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-bold text-sm min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team.color }} aria-hidden="true" />
              <span className="truncate">Time {team.leader}</span>
            </span>
            <span className="font-display font-extrabold text-xl">
              {team.avgPercent === null ? <span className="text-faint">—</span> : `${team.avgPercent}%`}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-line-soft grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-muted">Pessoas</div>
              <div className="font-bold">{team.count}</div>
            </div>
            <div>
              <div className="text-muted">Avaliadas</div>
              <div className="font-bold">{team.evaluatedCount}</div>
            </div>
            <div className="min-w-0">
              <div className="text-muted">Destaque</div>
              <div className="font-bold truncate">{team.topMember?.name ?? '—'}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  </section>
);
