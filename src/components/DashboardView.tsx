import React, { useMemo } from 'react';
import { TeamMember } from '../types';
import { TEAMS } from '../data/catalogData';
import { exportMembersToCSV } from '../utils/exportUtils';
import { toast } from '../utils/toastUtils';
import { BarChart3, Filter, Download } from 'lucide-react';
import { DashboardKpiCards } from './dashboard/DashboardKpiCards';
import { TeamComparisonChart } from './dashboard/TeamComparisonChart';
import { StatusDistributionChart } from './dashboard/StatusDistributionChart';
import { HistoricalTrendChart } from './dashboard/HistoricalTrendChart';
import { ScoreBucketHistogram } from './dashboard/ScoreBucketHistogram';
import { TeamAnalyticSummary } from './dashboard/TeamAnalyticSummary';

interface DashboardViewProps {
  members: TeamMember[];
  onSelectTeamFilter: (team: string) => void;
  onSelectMemberForDetail: (member: TeamMember) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  onSelectTeamFilter,
  onSelectMemberForDetail,
}) => {
  // --- Memoized Computations ---
  const {
    totalMembers,
    avgScore,
    completedEvaluationsCount,
    statusCounts,
    voandoPercent,
    teamStats,
    bestTeam,
    pieData,
    scoreBuckets,
    timelineData,
  } = useMemo(() => {
    const total = members.length;
    const average =
      total > 0
        ? Math.round(members.reduce((acc, m) => acc + m.score, 0) / total)
        : 0;

    const completedCount = members.filter((m) => m.evaluationStatus === 'Concluído').length;

    const counts = {
      Voando: members.filter((m) => m.score > 140).length,
      'Caminho Certo': members.filter((m) => m.score > 130 && m.score <= 140).length,
      Atenção: members.filter((m) => m.score >= 120 && m.score <= 130).length,
      Alarme: members.filter((m) => m.score < 120).length,
    };

    const voandoPct = Math.round((counts.Voando / (total || 1)) * 100);

    const teams = TEAMS.map((t) => {
      const teamMembers = members.filter((m) => m.team === t.leader);
      const count = teamMembers.length;
      const teamAvg =
        count > 0
          ? Math.round(teamMembers.reduce((acc, m) => acc + m.score, 0) / count)
          : 0;
      const topMember =
        count > 0
          ? [...teamMembers].sort((a, b) => b.score - a.score)[0] || null
          : null;

      return {
        leader: t.leader,
        color: t.color,
        count,
        avgScore: teamAvg,
        topMember,
        voandoCount: teamMembers.filter((m) => m.score > 140).length,
      };
    }).filter((t) => t.count > 0);

    const sortedTeams = [...teams].sort((a, b) => b.avgScore - a.avgScore);
    const topTeam = sortedTeams[0] || null;

    const pie = [
      {
        name: 'Voando (>140 pts)',
        shortName: 'Voando',
        value: counts.Voando,
        color: '#E3A73B',
        pct: Math.round((counts.Voando / (total || 1)) * 100),
      },
      {
        name: 'Caminho Certo (131-140 pts)',
        shortName: 'Caminho Certo',
        value: counts['Caminho Certo'],
        color: '#4fb579',
        pct: Math.round((counts['Caminho Certo'] / (total || 1)) * 100),
      },
      {
        name: 'Atenção (120-130 pts)',
        shortName: 'Atenção',
        value: counts.Atenção,
        color: '#d99a3d',
        pct: Math.round((counts.Atenção / (total || 1)) * 100),
      },
      {
        name: 'Alarme (<120 pts)',
        shortName: 'Alarme',
        value: counts.Alarme,
        color: '#e2687a',
        pct: Math.round((counts.Alarme / (total || 1)) * 100),
      },
    ].filter((item) => item.value > 0);

    const buckets = [
      {
        range: '145 - 155 pts',
        label: 'Excelência',
        count: members.filter((m) => m.score >= 145).length,
        color: '#E3A73B',
      },
      {
        range: '135 - 144 pts',
        label: 'Alto Desempenho',
        count: members.filter((m) => m.score >= 135 && m.score < 145).length,
        color: '#4fb579',
      },
      {
        range: '125 - 134 pts',
        label: 'Em Desenvolvimento',
        count: members.filter((m) => m.score >= 125 && m.score < 135).length,
        color: '#d99a3d',
      },
      {
        range: '< 125 pts',
        label: 'Atenção Especial',
        count: members.filter((m) => m.score < 125).length,
        color: '#e2687a',
      },
    ];

    const months = ['Mai', 'Jun', 'Jul', 'Ago'];
    const trend = months.map((month) => {
      const monthScores = members
        .map((m) => m.history?.find((h) => h.month === month)?.score)
        .filter((s): s is number => typeof s === 'number');

      const monthAvg =
        monthScores.length > 0
          ? Math.round(monthScores.reduce((acc, s) => acc + s, 0) / monthScores.length)
          : average;

      return {
        month,
        avg: monthAvg,
        max: monthScores.length > 0 ? Math.max(...monthScores) : 0,
        min: monthScores.length > 0 ? Math.min(...monthScores) : 0,
      };
    });

    return {
      totalMembers: total,
      avgScore: average,
      completedEvaluationsCount: completedCount,
      statusCounts: counts,
      voandoPercent: voandoPct,
      teamStats: sortedTeams,
      bestTeam: topTeam,
      pieData: pie,
      scoreBuckets: buckets,
      timelineData: trend,
    };
  }, [members]);

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-[#F2F5FA] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#E3A73B]" />
            Dashboard Analytics de Desempenho
          </h2>
          <p className="text-xs text-[#A9B7CE] mt-0.5">
            Métricas consolidadas de performance, médias por equipe e distribuição de resultados.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              exportMembersToCSV(members, 'dashboard-analytics-gente-digital.csv');
              toast.success('Métricas e dados do dashboard exportados para CSV!', 'Exportação Concluída');
            }}
            className="flex items-center gap-1.5 bg-[#0F1E38] hover:bg-[#14294A] border border-[#22365C] hover:border-[#E3A73B] text-[#A9B7CE] hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#E3A73B]" />
            Exportar CSV
          </button>

          <div className="flex items-center gap-2 bg-[#0F1E38] border border-[#22365C] rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-[#E3A73B]" />
            <span className="text-xs font-mono font-bold text-[#A9B7CE]">Período:</span>
            <span className="text-xs font-mono font-bold text-[#E3A73B]">Agosto / 2026</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <DashboardKpiCards
        members={members}
        avgScore={avgScore}
        voandoPercent={voandoPercent}
        statusCounts={statusCounts}
        bestTeam={bestTeam}
        completedEvaluationsCount={completedEvaluationsCount}
      />

      {/* Main Charts Section 1: Team Comparison BarChart & Status PieChart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TeamComparisonChart teamStats={teamStats} />
        <StatusDistributionChart pieData={pieData} totalMembers={totalMembers} />
      </div>

      {/* Main Charts Section 2: Historical Trend AreaChart & Score Bucket Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HistoricalTrendChart timelineData={timelineData} />
        <ScoreBucketHistogram scoreBuckets={scoreBuckets} totalMembers={totalMembers} />
      </div>

      {/* Detailed Team Breakdown Grid */}
      <TeamAnalyticSummary
        sortedTeamStats={teamStats}
        onSelectTeamFilter={onSelectTeamFilter}
        onSelectMemberForDetail={onSelectMemberForDetail}
      />
    </div>
  );
};
