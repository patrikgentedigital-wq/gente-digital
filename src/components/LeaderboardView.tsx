import React, { useState } from 'react';
import { TeamMember, LeaderName, PerformanceStatus } from '../types';
import { TEAMS } from '../data/catalogData';
import { getMemberBadges } from '../utils/badgeUtils';
import { exportMembersToCSV } from '../utils/exportUtils';
import { toast } from '../utils/toastUtils';
import { Avatar } from './Avatar';
import {
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  Download,
  UserPlus,
  Edit3,
  Filter,
} from 'lucide-react';

interface LeaderboardViewProps {
  members: TeamMember[];
  onOpenImageModal?: (member: TeamMember) => void;
  onSelectMemberForEvaluation: (member: TeamMember) => void;
  onOpenReportModal: (
    member: TeamMember,
    context?: { criteriaScores?: Record<string, number>; leaderComments?: string; cycle?: string },
  ) => void | Promise<void>;
  onSelectMemberForDetail?: (member: TeamMember) => void;
  onOpenMemberForm?: (member?: TeamMember) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  members,
  onOpenImageModal,
  onSelectMemberForEvaluation,
  onOpenReportModal,
  onSelectMemberForDetail,
  onOpenMemberForm,
  searchQuery,
  setSearchQuery,
}) => {
  const [view, setView] = useState<'geral' | 'equipe'>('geral');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('Djemerson');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Helper for rank trend indicator
  const renderRankTrend = (currentRank: number, prevRank?: number, showLabel = true) => {
    if (prevRank === undefined || prevRank === currentRank) {
      return (
        <div
          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-faint bg-app px-1.5 py-0.5 rounded border border-line"
          title="Posição mantida no ranking"
        >
          <Minus className="w-3 h-3 text-faint" />
          {showLabel && <span>=</span>}
        </div>
      );
    }

    if (currentRank < prevRank) {
      const diff = prevRank - currentRank;
      return (
        <div
          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-success bg-success-soft px-1.5 py-0.5 rounded border border-success/30"
          title={`Subiu ${diff} posição(ões) no ranking`}
        >
          <ArrowUp className="w-3 h-3 stroke-[2.5]" />
          {showLabel && <span>+{diff}</span>}
        </div>
      );
    }

    const diff = currentRank - prevRank;
    return (
      <div
        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-danger bg-danger-soft px-1.5 py-0.5 rounded border border-danger/30"
        title={`Desceu ${diff} posição(ões) no ranking`}
      >
        <ArrowDown className="w-3 h-3 stroke-[2.5]" />
        {showLabel && <span>-{diff}</span>}
      </div>
    );
  };

  // Helper for status badge
  const getTierInfo = (score: number) => {
    if (score > 140) return { label: 'Voando', cls: 'bg-gold-soft text-accent border border-accent/30' };
    if (score > 130) return { label: 'Caminho certo', cls: 'bg-success-soft text-success border border-success/30' };
    if (score >= 120) return { label: 'Atenção', cls: 'bg-warn-soft text-warn border border-warn/30' };
    return { label: 'Alarme', cls: 'bg-danger-soft text-danger border border-danger/30' };
  };

  // Filter members with useMemo
  const { sortedData, top3 } = React.useMemo(() => {
    let filtered = members;
    if (view === 'equipe') {
      filtered = members.filter((m) => m.team === selectedTeamLeader);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.team.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered].sort((a, b) => b.score - a.score);
    const podium = statusFilter === 'all' && !searchQuery.trim() ? sorted.slice(0, 3) : [];

    return { sortedData: sorted, top3: podium };
  }, [members, view, selectedTeamLeader, statusFilter, searchQuery]);

  // CSV Export Handler
  const handleExportCSV = () => {
    exportMembersToCSV(sortedData, `ranking-gente-digital-${view}.csv`);
    toast.success(`Exportados ${sortedData.length} colaboradores para CSV com sucesso!`, 'Exportação Concluída');
  };

  // Helper for 5-segment bars
  const renderBars = (score: number) => {
    const filled = score > 140 ? 5 : score > 130 ? 4 : score >= 120 ? 3 : score >= 100 ? 2 : 1;
    return (
      <div className="hidden sm:flex gap-1 items-end h-6">
        {[1, 2, 3, 4, 5].map((i) => {
          const heights = ['h-2', 'h-3', 'h-4', 'h-5', 'h-6'];
          const isFilled = i <= filled;
          return (
            <div
              key={i}
              className={`w-1.5 rounded-xs transition-all ${heights[i - 1]} ${
                isFilled ? 'bg-accent' : 'bg-line'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-6">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="inline-flex bg-surface border border-line rounded-xl p-1">
            <button
              onClick={() => setView('geral')}
              className={`font-sans font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer ${
                view === 'geral'
                  ? 'bg-accent text-accent-ink shadow-sm font-bold'
                  : 'text-muted hover:text-white'
              }`}
            >
              Ranking Geral
            </button>
            <button
              onClick={() => setView('equipe')}
              className={`font-sans font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer ${
                view === 'equipe'
                  ? 'bg-accent text-accent-ink shadow-sm font-bold'
                  : 'text-muted hover:text-white'
              }`}
            >
              Por Equipe
            </button>
          </div>

          {view === 'equipe' && (
            <select
              value={selectedTeamLeader}
              onChange={(e) => setSelectedTeamLeader(e.target.value)}
              className="bg-surface border border-line text-ink font-sans text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-accent"
            >
              {TEAMS.map((t) => (
                <option key={t.leader} value={t.leader}>
                  Time {t.leader} ({members.filter((member) => member.team === t.leader).length} membros)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Buttons: Export & Add Member */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-surface hover:bg-surface-2 border border-line hover:border-accent text-muted hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Exportar dados filtrados em CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            Exportar CSV
          </button>

          {onOpenMemberForm && (
            <button
              onClick={() => onOpenMemberForm()}
              className="bg-accent hover:bg-accent-hover text-accent-ink text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Novo Colaborador
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 text-xs font-mono">
        <span className="text-faint text-[11px] uppercase mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Status:
        </span>
        {[
          { id: 'all', label: 'Todos' },
          { id: 'Voando', label: 'Voando (>140)', color: 'text-accent' },
          { id: 'Caminho Certo', label: 'Caminho Certo (>130)', color: 'text-success' },
          { id: 'Atenção', label: 'Atenção (120-130)', color: 'text-warn' },
          { id: 'Alarme', label: 'Alarme (<120)', color: 'text-danger' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === f.id
                ? 'bg-surface-2 border-accent text-white shadow-sm'
                : 'bg-surface/60 border-line text-muted hover:text-white'
            }`}
          >
            <span className={f.color || ''}>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Podium (Top 3) - only displayed when no specific status filter is applied */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-7 items-end">
          {/* #2 Rank (Left on desktop) */}
          {top3[1] && (
            <div className="order-2 md:order-1 bg-gradient-to-b from-surface-2 to-surface border border-line rounded-2xl p-5 text-center relative group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-faint tracking-wider font-bold">
                  #2
                </span>
                {renderRankTrend(2, top3[1].previousRank)}
              </div>

              <div className="relative w-14 h-14 mx-auto mt-2 mb-2 group/avatar">
                <Avatar
                  name={top3[1].name}
                  src={top3[1].avatarUrl}
                  teamColor={top3[1].teamColor}
                  size="lg"
                  shape="circle"
                  className="w-full h-full border-2 border-line bg-app"
                />
                {onOpenImageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(top3[1]!)}
                    className="absolute -bottom-1 -right-1 bg-surface-2 border border-line text-accent p-1 rounded-full hover:scale-110 transition-all shadow-md"
                    title="Editar Foto"
                  >
                    <ImageIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onSelectMemberForDetail?.(top3[1]!)}
                className="font-display font-semibold text-base text-ink my-0.5 truncate hover:text-accent hover:underline cursor-pointer block mx-auto max-w-full"
                title="Ver Detalhes e Gráfico"
              >
                {top3[1].name}
              </button>
              <div className="text-xs text-faint mb-2 font-mono">Time {top3[1].team}</div>
              <div className="font-mono font-bold text-xl text-accent">
                {top3[1].score} <span className="text-xs text-faint font-medium">/155</span>
              </div>
            </div>
          )}

          {/* #1 Rank (Center on desktop - Gold highlight) */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-surface-2 to-surface border-2 border-accent rounded-2xl p-5 text-center relative shadow-[0_0_20px_rgba(227,167,59,0.25)] md:-translate-y-2 group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-accent tracking-wider font-bold">
                  #1 ★
                </span>
                {renderRankTrend(1, top3[0].previousRank)}
              </div>

              <div className="relative w-16 h-16 mx-auto mt-1 mb-2 group/avatar">
                <Avatar
                  name={top3[0].name}
                  src={top3[0].avatarUrl}
                  teamColor={top3[0].teamColor}
                  size="xl"
                  shape="circle"
                  className="w-full h-full border-2 border-accent bg-app shadow-md"
                />
                {onOpenImageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(top3[0]!)}
                    className="absolute -bottom-1 -right-1 bg-accent text-accent-ink p-1 rounded-full hover:scale-110 transition-all shadow-md font-bold"
                    title="Editar Foto"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onSelectMemberForDetail?.(top3[0]!)}
                className="font-display font-bold text-lg text-white my-0.5 truncate hover:text-accent hover:underline cursor-pointer block mx-auto max-w-full"
                title="Ver Detalhes e Gráfico"
              >
                {top3[0].name}
              </button>
              <div className="text-xs text-faint mb-2 font-mono">Time {top3[0].team}</div>
              <div className="font-mono font-bold text-2xl text-accent">
                {top3[0].score} <span className="text-xs text-faint font-medium">/155</span>
              </div>
            </div>
          )}

          {/* #3 Rank (Right on desktop) */}
          {top3[2] && (
            <div className="order-3 bg-gradient-to-b from-surface-2 to-surface border border-line rounded-2xl p-5 text-center relative group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-faint tracking-wider font-bold">
                  #3
                </span>
                {renderRankTrend(3, top3[2].previousRank)}
              </div>

              <div className="relative w-14 h-14 mx-auto mt-2 mb-2 group/avatar">
                <Avatar
                  name={top3[2].name}
                  src={top3[2].avatarUrl}
                  teamColor={top3[2].teamColor}
                  size="lg"
                  shape="circle"
                  className="w-full h-full border-2 border-line bg-app"
                />
                {onOpenImageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(top3[2]!)}
                    className="absolute -bottom-1 -right-1 bg-surface-2 border border-line text-accent p-1 rounded-full hover:scale-110 transition-all shadow-md"
                    title="Editar Foto"
                  >
                    <ImageIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onSelectMemberForDetail?.(top3[2]!)}
                className="font-display font-semibold text-base text-ink my-0.5 truncate hover:text-accent hover:underline cursor-pointer block mx-auto max-w-full"
                title="Ver Detalhes e Gráfico"
              >
                {top3[2].name}
              </button>
              <div className="text-xs text-faint mb-2 font-mono">Time {top3[2].team}</div>
              <div className="font-mono font-bold text-xl text-accent">
                {top3[2].score} <span className="text-xs text-faint font-medium">/155</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List Rows */}
      <div className="flex flex-col gap-2">
        {sortedData.length === 0 && (
          <div className="bg-surface border border-line rounded-2xl p-8 text-center space-y-3 my-4">
            <div className="text-accent font-mono text-sm font-bold uppercase tracking-wider">
              Nenhum colaborador encontrado
            </div>
            <p className="text-xs text-muted max-w-md mx-auto">
              Não encontramos nenhum integrante correspondente aos filtros atuais. Verifique os termos digitados ou redefina o filtro.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-surface-2 hover:bg-line border border-line text-xs font-bold text-accent rounded-xl transition-all cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          </div>
        )}

        {sortedData.map((person) => {
          const tier = getTierInfo(person.score);

          return (
            <div
              key={person.id}
              className="bg-surface border border-line hover:border-accent/50 rounded-xl p-3.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Rank # & Trend */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="font-mono text-xs text-faint w-6 font-bold text-center">
                    #{person.rank}
                  </div>
                  {renderRankTrend(person.rank, person.previousRank)}
                </div>

                {/* Avatar */}
                <div className="relative group/avatar shrink-0">
                  <Avatar
                    name={person.name}
                    src={person.avatarUrl}
                    teamColor={person.teamColor}
                    size="sm"
                    className="border border-line bg-app"
                  />
                  {onOpenImageModal && (
                    <button
                      type="button"
                      onClick={() => onOpenImageModal(person)}
                      className="absolute -bottom-1 -right-1 bg-surface border border-line text-accent p-0.5 rounded-full opacity-0 group-hover/avatar:opacity-100 hover:scale-110 transition-all shadow-sm"
                      title="Editar Link da Imagem"
                    >
                      <ImageIcon className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => onSelectMemberForDetail?.(person)}
                      className="font-semibold text-sm text-ink truncate group-hover:text-accent transition-colors text-left hover:underline cursor-pointer block"
                      title="Ver Detalhes e Conquistas"
                    >
                      {person.name}
                    </button>
                    <div className="flex items-center gap-1">
                      {getMemberBadges(person, members)
                        .filter((b) => b.unlocked)
                        .slice(0, 3)
                        .map((b) => (
                          <span
                            key={b.id}
                            className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-line text-accent font-mono cursor-pointer hover:border-accent transition-colors"
                            title={`${b.name}: ${b.description}`}
                            onClick={() => onSelectMemberForDetail?.(person)}
                          >
                            {b.name === 'Top Performer' && '🏆'}
                            {b.name === 'Nível Voando' && '🚀'}
                            {b.name === 'Pódio de Honra' && '🥇'}
                            {b.name === 'Destaque do Time' && '👑'}
                            {b.name === 'Evolução Rápida' && '⚡'}
                            {b.name === 'Consistência Ouro' && '⭐'}
                            {b.name === 'Trilha da Excelência' && '📈'}
                            {b.name === 'Avaliador Ativo' && '📋'}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="text-[11.5px] text-faint">{person.role} • Time {person.team}</div>
                </div>
              </div>

              {/* Meter bars */}
              <div className="flex items-center gap-2.5 flex-wrap md:flex-nowrap md:pl-2 md:border-l md:border-line md:justify-end">
                {renderBars(person.score)}

                {/* Tier Badge */}
                <div
                  className={`font-mono text-[10.5px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase whitespace-nowrap ${tier.cls}`}
                >
                  {tier.label}
                </div>

                {/* Score */}
                <div className="font-mono font-bold text-base text-ink text-right min-w-[70px]">
                  {person.score}
                  <span className="text-[11px] text-faint font-normal"> /155</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 md:pl-2 md:border-l md:border-line">
                {onOpenMemberForm && (
                  <button
                    onClick={() => onOpenMemberForm(person)}
                    className="p-1.5 rounded-lg border border-line hover:border-accent hover:bg-surface-2 text-muted hover:text-accent transition-colors cursor-pointer"
                    title="Editar Dados do Colaborador"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onSelectMemberForDetail && (
                  <button
                    onClick={() => onSelectMemberForDetail(person)}
                    className="p-1.5 rounded-lg border border-line hover:border-accent hover:bg-surface-2 text-muted hover:text-accent transition-colors cursor-pointer"
                    title="Ver Histórico em Gráfico"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onOpenReportModal(person)}
                  className="p-1.5 rounded-lg border border-line hover:border-accent hover:bg-surface-2 text-muted hover:text-accent transition-colors cursor-pointer"
                  title="Gerar Relatório PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onSelectMemberForEvaluation(person)}
                  className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-accent hover:text-accent-ink text-xs font-bold text-white transition-all border border-line cursor-pointer"
                  title="Avaliar Desempenho"
                >
                  Avaliar
                </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-5 mt-6 pt-5 border-t border-line">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <span className="w-2 h-2 rounded-xs bg-accent" />
            <span>Voando (&gt;140 pts)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-faint">
            <span className="w-2 h-2 rounded-xs bg-success" />
            <span>Caminho certo (&gt;130 pts)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-faint">
            <span className="w-2 h-2 rounded-xs bg-warn" />
            <span>Atenção (120-130 pts)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-faint">
            <span className="w-2 h-2 rounded-xs bg-danger" />
            <span>Alarme (&lt;120 pts)</span>
          </div>
        </div>

        {/* Trend Legend */}
        <div className="flex items-center gap-3 text-xs text-faint">
          <span className="text-[11px] font-mono font-semibold uppercase text-muted">Evolução:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-success bg-success-soft px-1.5 py-0.5 rounded border border-success/30">
              <ArrowUp className="w-3 h-3 stroke-[2.5]" /> Subiu
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-danger bg-danger-soft px-1.5 py-0.5 rounded border border-danger/30">
              <ArrowDown className="w-3 h-3 stroke-[2.5]" /> Desceu
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-faint bg-app px-1.5 py-0.5 rounded border border-line">
              <Minus className="w-3 h-3" /> Mantido
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
