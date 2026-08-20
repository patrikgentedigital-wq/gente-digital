import React from 'react';
import { TeamMember } from '../../types';

interface TeamAnalyticSummaryProps {
  sortedTeamStats: Array<{
    leader: string;
    color: string;
    count: number;
    avgScore: number;
    topMember: TeamMember | null;
    voandoCount: number;
  }>;
  onSelectTeamFilter: (team: string) => void;
  onSelectMemberForDetail: (member: TeamMember) => void;
}

export const TeamAnalyticSummary: React.FC<TeamAnalyticSummaryProps> = ({
  sortedTeamStats,
  onSelectTeamFilter,
  onSelectMemberForDetail,
}) => {
  return (
    <div className="bg-surface border border-line p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            Resumo Analítico por Equipe
          </h3>
          <p className="text-xs text-muted">
            Detalhamento de métricas por líder e atalho rápido para filtragem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {sortedTeamStats.map((team) => (
          <div
            key={team.leader}
            className="bg-app border border-line hover:border-accent/50 p-4 rounded-xl space-y-3 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span className="font-bold text-sm text-white group-hover:text-accent transition-colors">
                  Time {team.leader}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-accent bg-surface-2 px-2 py-0.5 rounded border border-line">
                {team.avgScore} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted bg-surface p-2.5 rounded-lg border border-line">
              <div>
                <span className="text-[10px] text-faint block">MEMBROS</span>
                <span className="font-bold text-white">{team.count} colaboradores</span>
              </div>
              <div>
                <span className="text-[10px] text-faint block">NA META (&gt;140)</span>
                <span className="font-bold text-success">{team.voandoCount} pessoas</span>
              </div>
            </div>

            {team.topMember && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-faint">Destaque do Time:</span>
                <button
                  onClick={() => onSelectMemberForDetail(team.topMember!)}
                  className="font-bold text-white hover:text-accent hover:underline cursor-pointer truncate max-w-[140px]"
                >
                  {team.topMember.name} ({team.topMember.score}p)
                </button>
              </div>
            )}

            <button
              onClick={() => onSelectTeamFilter(team.leader)}
              className="w-full py-1.5 rounded-lg bg-surface-2 hover:bg-accent hover:text-accent-ink text-xs font-bold text-ink transition-all border border-line cursor-pointer"
            >
              Ver Integrantes no Ranking
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
