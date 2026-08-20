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
      <div className="bg-surface border border-line p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-faint mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Média Geral da Empresa
          </span>
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-accent">
            {avgScore}
          </span>
          <span className="text-xs text-faint font-mono">/ 155 pts</span>
        </div>
        <div className="mt-2 text-[11px] text-success flex items-center gap-1 font-mono">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Desempenho consolidado</span>
        </div>
      </div>

      {/* Card 2: Nível Voando */}
      <div className="bg-surface border border-line p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-faint mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Taxa na Meta (&gt;140)
          </span>
          <Trophy className="w-4 h-4 text-accent" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white">
            {voandoPercent}%
          </span>
          <span className="text-xs text-faint font-mono">
            ({statusCounts.Voando}/{totalMembers})
          </span>
        </div>
        <div className="mt-2 text-[11px] text-muted font-mono">
          Meta desejada: &ge; 60% da equipe
        </div>
      </div>

      {/* Card 3: Total Colaboradores */}
      <div className="bg-surface border border-line p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-faint mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Colaboradores Avaliados
          </span>
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white">
            {totalMembers}
          </span>
          <span className="text-xs text-faint font-mono">em 9 equipes</span>
        </div>
        <div className="mt-2 text-[11px] text-success font-mono">
          {evalPercent}% com avaliação concluída ({completedEvaluationsCount}/{totalMembers})
        </div>
      </div>

      {/* Card 4: Equipe Destaque */}
      <div className="bg-surface border border-line p-4 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between text-faint mb-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
            Equipe em Destaque
          </span>
          <Award className="w-4 h-4 text-accent" />
        </div>
        {bestTeam ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white truncate">
                Time {bestTeam.leader}
              </span>
              <span className="font-mono text-sm font-bold text-accent">
                {bestTeam.avgScore} pts
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted flex justify-between font-mono">
              <span>{bestTeam.count} integrantes</span>
              <span className="text-success">Top Performance</span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-faint">Sem dados</span>
        )}
      </div>
    </div>
  );
};
