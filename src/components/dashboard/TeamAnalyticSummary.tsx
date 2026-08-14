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
    <div className="bg-[#0F1E38] border border-[#22365C] p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-[#F2F5FA]">
            Resumo Analítico por Equipe
          </h3>
          <p className="text-xs text-[#A9B7CE]">
            Detalhamento de métricas por líder e atalho rápido para filtragem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {sortedTeamStats.map((team) => (
          <div
            key={team.leader}
            className="bg-[#0A1424] border border-[#22365C] hover:border-[#E3A73B]/50 p-4 rounded-xl space-y-3 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span className="font-bold text-sm text-white group-hover:text-[#E3A73B] transition-colors">
                  Time {team.leader}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-[#E3A73B] bg-[#14294A] px-2 py-0.5 rounded border border-[#22365C]">
                {team.avgScore} pts
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#A9B7CE] bg-[#0F1E38] p-2.5 rounded-lg border border-[#22365C]">
              <div>
                <span className="text-[10px] text-[#6C7C99] block">MEMBROS</span>
                <span className="font-bold text-white">{team.count} colaboradores</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6C7C99] block">NA META (&gt;140)</span>
                <span className="font-bold text-[#4fb579]">{team.voandoCount} pessoas</span>
              </div>
            </div>

            {team.topMember && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#6C7C99]">Destaque do Time:</span>
                <button
                  onClick={() => onSelectMemberForDetail(team.topMember!)}
                  className="font-bold text-white hover:text-[#E3A73B] hover:underline cursor-pointer truncate max-w-[140px]"
                >
                  {team.topMember.name} ({team.topMember.score}p)
                </button>
              </div>
            )}

            <button
              onClick={() => onSelectTeamFilter(team.leader)}
              className="w-full py-1.5 rounded-lg bg-[#14294A] hover:bg-[#E3A73B] hover:text-[#1a1200] text-xs font-bold text-[#F2F5FA] transition-all border border-[#22365C] cursor-pointer"
            >
              Ver Integrantes no Ranking
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
