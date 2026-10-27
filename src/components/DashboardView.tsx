import React, { useMemo } from 'react';
import { TeamMember } from '../types';
import { TEAMS } from '../data/catalogData';
import { deriveTeams } from '../lib/teams';
import { compareByPercent, percentOf } from '../lib/scoring';
import { getDefaultEvaluationCycle } from '../lib/evaluation';
import { exportMembersToCSV } from '../utils/exportUtils';
import { toast } from '../utils/toastUtils';
import { Filter, Download } from 'lucide-react';
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
    avgPercent,
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
        ? Math.round(members.reduce((acc, m) => acc + percentOf(m.score, m.maxScore), 0) / total)
        : 0;

    const completedCount = members.filter((m) => m.evaluationStatus === 'Concluído').length;

    const counts = {
      Voando: members.filter((m) => m.status === 'Voando').length,
      'Caminho Certo': members.filter((m) => m.status === 'Caminho Certo').length,
      Atenção: members.filter((m) => m.status === 'Atenção').length,
      Alarme: members.filter((m) => m.status === 'Alarme').length,
    };

    const voandoPct = Math.round((counts.Voando / (total || 1)) * 100);

    const teams = deriveTeams(members, TEAMS).map((t) => {
      const teamMembers = members.filter((m) => m.team === t.leader);
      const count = teamMembers.length;
      const teamAvg =
        count > 0
          ? Math.round(teamMembers.reduce((acc, m) => acc + percentOf(m.score, m.maxScore), 0) / count)
          : 0;
      const topMember =
        count > 0
          ? [...teamMembers].sort(compareByPercent)[0] || null
          : null;

      return {
        leader: t.leader,
        color: t.color,
        count,
        avgPercent: teamAvg,
        topMember,
        voandoCount: teamMembers.filter((m) => m.status === 'Voando').length,
      };
    }).filter((t) => t.count > 0);

    const sortedTeams = [...teams].sort((a, b) => b.avgPercent - a.avgPercent);
    const topTeam = sortedTeams[0] || null;

    const pie = [
      {
        name: 'Voando (acima de 90%)',
        shortName: 'Voando',
        value: counts.Voando,
        color: '#39d3cf',
        pct: Math.round((counts.Voando / (total || 1)) * 100),
      },
      {
        name: 'Caminho Certo (84% a 90%)',
        shortName: 'Caminho Certo',
        value: counts['Caminho Certo'],
        color: '#34c759',
        pct: Math.round((counts['Caminho Certo'] / (total || 1)) * 100),
      },
      {
        name: 'Atenção (77% a 84%)',
        shortName: 'Atenção',
        value: counts.Atenção,
        color: '#ff9f0a',
        pct: Math.round((counts.Atenção / (total || 1)) * 100),
      },
      {
        name: 'Alarme (abaixo de 77%)',
        shortName: 'Alarme',
        value: counts.Alarme,
        color: '#ff3b30',
        pct: Math.round((counts.Alarme / (total || 1)) * 100),
      },
    ].filter((item) => item.value > 0);

    const buckets = [
      {
        range: '93% a 100%',
        label: 'Excelência',
        count: members.filter((m) => percentOf(m.score, m.maxScore) >= 93).length,
        color: '#39d3cf',
      },
      {
        range: '87% a 92%',
        label: 'Alto Desempenho',
        count: members.filter((m) => percentOf(m.score, m.maxScore) >= 87 && percentOf(m.score, m.maxScore) < 93).length,
        color: '#34c759',
      },
      {
        range: '81% a 86%',
        label: 'Em Desenvolvimento',
        count: members.filter((m) => percentOf(m.score, m.maxScore) >= 81 && percentOf(m.score, m.maxScore) < 87).length,
        color: '#ff9f0a',
      },
      {
        range: 'abaixo de 81%',
        label: 'Atenção Especial',
        count: members.filter((m) => percentOf(m.score, m.maxScore) < 81).length,
        color: '#ff3b30',
      },
    ];

    const reference = new Date();
    const months = Array.from({ length: 4 }, (_, i) => {
      const date = new Date(reference.getFullYear(), reference.getMonth() - (3 - i), 1);
      const shortName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const fullName = date.toLocaleDateString('pt-BR', { month: 'long' });
      return {
        label: shortName.charAt(0).toUpperCase() + shortName.slice(1),
        year: date.getFullYear(),
        searchTerms: [shortName.toLowerCase(), fullName.toLowerCase()],
      };
    });
    const trend = months.map(({ label, year, searchTerms }) => {
      const monthScores = members
        .map((m) =>
          m.history?.find((h) =>
            searchTerms.some((term) => h.month.toLowerCase().includes(term))
          )?.score
        )
        .filter((s): s is number => typeof s === 'number');

      const monthAvg =
        monthScores.length > 0
          ? Math.round(monthScores.reduce((acc, s) => acc + s, 0) / monthScores.length)
          : null;

      return {
        month: label,
        year,
        avg: monthAvg,
        max: monthScores.length > 0 ? Math.max(...monthScores) : null,
        min: monthScores.length > 0 ? Math.min(...monthScores) : null,
      };
    });

    return {
      totalMembers: total,
      avgPercent: average,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              exportMembersToCSV(members, 'dashboard-analytics-gente-digital.csv');
              toast.success('Métricas e dados do dashboard exportados para CSV!', 'Exportação Concluída');
            }}
            className="flex items-center gap-1.5 bg-surface hover:bg-surface-2 border border-line hover:border-accent text-muted hover:text-ink text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-accent-text" />
            Exportar CSV
          </button>

          <div className="flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-accent-text" />
            <span className="text-xs font-mono font-bold text-muted">Período:</span>
            <span className="text-xs font-mono font-bold text-accent-text">Ciclo {getDefaultEvaluationCycle()}</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <DashboardKpiCards
        members={members}
        avgPercent={avgPercent}
        voandoPercent={voandoPercent}
        statusCounts={statusCounts}
        bestTeam={bestTeam}
        completedEvaluationsCount={completedEvaluationsCount}
        teamCount={teamStats.length}
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
