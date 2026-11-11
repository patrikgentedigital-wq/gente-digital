import React, { useMemo } from 'react';
import { TeamMember } from '../types';
import { monthlyTrend } from '../lib/trend';
import { dashboardStats } from '../lib/dashboardStats';
import { exportMembersToCSV } from '../utils/exportUtils';
import { toast } from '../utils/toastUtils';
import { Download } from 'lucide-react';
import { PageActions } from './PageHeader';
import { DashboardKpiCards } from './dashboard/DashboardKpiCards';
import { TeamComparisonChart } from './dashboard/TeamComparisonChart';
import { StatusDistributionChart } from './dashboard/StatusDistributionChart';
import { HistoricalTrendChart } from './dashboard/HistoricalTrendChart';
import { TeamAnalyticSummary } from './dashboard/TeamAnalyticSummary';

interface DashboardViewProps {
  members: TeamMember[];
  onSelectTeamFilter: (team: string) => void;
  onSelectMemberForDetail: (member: TeamMember) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ members, onSelectTeamFilter }) => {
  const stats = useMemo(() => dashboardStats(members), [members]);
  // Em percentual do máximo de cada avaliação: cada pessoa pode ter um conjunto de perguntas com máximo diferente.
  const timelineData = useMemo(() => monthlyTrend(members), [members]);

  return (
    <div className="w-full max-w-[1040px] mx-auto pt-6 pb-16 font-sans space-y-3.5">
      <PageActions>
        <button
          type="button"
          onClick={() => {
            exportMembersToCSV(members, 'dashboard-analytics-gente-digital.csv');
            toast.success('Dados da visão geral exportados para CSV.', 'Exportação concluída');
          }}
          className="bg-surface border-2 border-block-edge text-ink text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-surface-2"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </PageActions>

      <DashboardKpiCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <TeamComparisonChart teamStats={stats.teamStats} />
        <StatusDistributionChart levelCounts={stats.levelCounts} totalMembers={stats.totalMembers} />
      </div>

      <HistoricalTrendChart timelineData={timelineData} />

      <div className="pt-4">
        <TeamAnalyticSummary teamStats={stats.teamStats} onSelectTeamFilter={onSelectTeamFilter} />
      </div>
    </div>
  );
};
