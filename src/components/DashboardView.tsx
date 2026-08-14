import React from 'react';
import { TeamMember } from '../types';
import { TEAMS } from '../data/initialData';
import { BarChart3, Filter } from 'lucide-react';
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
  // --- Aggregate Computations ---
  const totalMembers = members.length;
  const avgScore =
    totalMembers > 0
      ? Math.round(members.reduce((acc, m) => acc + m.score, 0) / totalMembers)
      : 0;

  // Real calculation of evaluations completed
  const completedEvaluationsCount = members.filter(
    (m) => m.evaluationStatus === 'Concluído'
  ).length;

  // Status breakdown count
  const statusCounts = {
    Voando: members.filter((m) => m.score > 140).length,
    'Caminho Certo': members.filter((m) => m.score > 130 && m.score <= 140).length,
    Atenção: members.filter((m) => m.score >= 120 && m.score <= 130).length,
    Alarme: members.filter((m) => m.score < 120).length,
  };

  const voandoPercent = Math.round((statusCounts.Voando / (totalMembers || 1)) * 100);

  // Department / Team averages
  const teamStats = TEAMS.map((t) => {
    const teamMembers = members.filter((m) => m.team === t.leader);
    const count = teamMembers.length;
    const teamAvg =
      count > 0
        ? Math.round(teamMembers.reduce((acc, m) => acc + m.score, 0) / count)
        : 0;
    const topMember =
      count > 0
        ? [...teamMembers].sort((a, b) => b.score - a.score)[0]
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

  // Sort teams by average score descending
  const sortedTeamStats = [...teamStats].sort((a, b) => b.avgScore - a.avgScore);
  const bestTeam = sortedTeamStats[0] || null;

  // Pie chart data for status distribution
  const pieData = [
    {
      name: 'Voando (>140 pts)',
      shortName: 'Voando',
      value: statusCounts.Voando,
      color: '#E3A73B',
      pct: Math.round((statusCounts.Voando / (totalMembers || 1)) * 100),
    },
    {
      name: 'Caminho Certo (131-140 pts)',
      shortName: 'Caminho Certo',
      value: statusCounts['Caminho Certo'],
      color: '#4fb579',
      pct: Math.round((statusCounts['Caminho Certo'] / (totalMembers || 1)) * 100),
    },
    {
      name: 'Atenção (120-130 pts)',
      shortName: 'Atenção',
      value: statusCounts.Atenção,
      color: '#d99a3d',
      pct: Math.round((statusCounts.Atenção / (totalMembers || 1)) * 100),
    },
    {
      name: 'Alarme (<120 pts)',
      shortName: 'Alarme',
      value: statusCounts.Alarme,
      color: '#e2687a',
      pct: Math.round((statusCounts.Alarme / (totalMembers || 1)) * 100),
    },
  ].filter((item) => item.value > 0);

  // Score Bucket Distribution Data
  const scoreBuckets = [
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

  // Historical Timeline Evolution Data
  const monthsList = ['Mai', 'Jun', 'Jul', 'Ago'];
  const timelineData = monthsList.map((month) => {
    let monthScores: number[] = [];
    members.forEach((m) => {
      if (m.history) {
        const item = m.history.find((h) => h.month === month);
        if (item) monthScores.push(item.score);
      }
    });

    if (monthScores.length === 0) {
      return { month, avg: 130, max: 145, min: 115 };
    }

    const monthAvg = Math.round(
      monthScores.reduce((a, b) => a + b, 0) / monthScores.length
    );
    const monthMax = Math.max(...monthScores);
    const monthMin = Math.min(...monthScores);

    return { month, avg: monthAvg, max: monthMax, min: monthMin };
  });

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

        <div className="flex items-center gap-2 bg-[#0F1E38] border border-[#22365C] rounded-xl px-3 py-1.5 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-[#E3A73B]" />
          <span className="text-xs font-mono font-bold text-[#A9B7CE]">Período:</span>
          <span className="text-xs font-mono font-bold text-[#E3A73B]">Agosto / 2026</span>
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
        sortedTeamStats={sortedTeamStats}
        onSelectTeamFilter={onSelectTeamFilter}
        onSelectMemberForDetail={onSelectMemberForDetail}
      />
    </div>
  );
};
