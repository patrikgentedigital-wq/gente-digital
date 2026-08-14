import React from 'react';
import { TeamMember } from '../../types';
import { Trophy, Users, TrendingUp, Award, ArrowUpRight } from 'lucide-react';

interface DashboardKpiCardsProps {
  members: TeamMember[];
  avgScore: number;
  voandoPercent: number;
  statusCounts: { Voando: number; 'Caminho Certo': number; Atenção: number; Alarme: number };
  bestTeam: { leader: string; avgScore: number; count: number } | null;
  completedEvaluationsCount: number;
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  members,
  avgScore,
  voandoPercent,
  statusCounts,
  bestTeam,
  completedEvaluationsCount,
}) => {
  const totalMembers = members.length;
  const evalPercent = totalMembers > 0 ? Math.round((completedEvaluationsCount / totalMembers) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Média Geral */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-[#6C7C99] mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Média Geral da Empresa
          </span>
          <TrendingUp className="w-4 h-4 text-[#E3A73B]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-[#E3A73B]">
            {avgScore}
          </span>
          <span className="text-xs text-[#6C7C99] font-mono">/ 155 pts</span>
        </div>
        <div className="mt-2 text-[11px] text-[#4fb579] flex items-center gap-1 font-mono">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Desempenho consolidado</span>
        </div>
      </div>

      {/* Card 2: Nível Voando */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-[#6C7C99] mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Taxa na Meta (&gt;140)
          </span>
          <Trophy className="w-4 h-4 text-[#E3A73B]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white">
            {voandoPercent}%
          </span>
          <span className="text-xs text-[#6C7C99] font-mono">
            ({statusCounts.Voando}/{totalMembers})
          </span>
        </div>
        <div className="mt-2 text-[11px] text-[#A9B7CE] font-mono">
          Meta desejada: &ge; 60% da equipe
        </div>
      </div>

      {/* Card 3: Total Colaboradores */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-[#6C7C99] mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Colaboradores Avaliados
          </span>
          <Users className="w-4 h-4 text-[#3B6FE0]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white">
            {totalMembers}
          </span>
          <span className="text-xs text-[#6C7C99] font-mono">em 9 equipes</span>
        </div>
        <div className="mt-2 text-[11px] text-[#4fb579] font-mono">
          {evalPercent}% com avaliação concluída ({completedEvaluationsCount}/{totalMembers})
        </div>
      </div>

      {/* Card 4: Equipe Destaque */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-[#6C7C99] mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Equipe em Destaque
          </span>
          <Award className="w-4 h-4 text-[#E3A73B]" />
        </div>
        {bestTeam ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white truncate">
                Time {bestTeam.leader}
              </span>
              <span className="font-mono text-sm font-bold text-[#E3A73B]">
                {bestTeam.avgScore} pts
              </span>
            </div>
            <div className="mt-2 text-[11px] text-[#A9B7CE] flex justify-between font-mono">
              <span>{bestTeam.count} integrantes</span>
              <span className="text-[#4fb579]">Top Performance</span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-[#6C7C99]">Sem dados</span>
        )}
      </div>
    </div>
  );
};
