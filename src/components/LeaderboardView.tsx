import React, { useState } from 'react';
import { TeamMember, LeaderName, PerformanceStatus } from '../types';
import { TEAMS } from '../data/catalogData';
import { getMemberBadges } from '../utils/badgeUtils';
import { exportMembersToCSV } from '../utils/exportUtils';
import { toast } from '../utils/toastUtils';
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
          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#6C7C99] bg-[#0A1424] px-1.5 py-0.5 rounded border border-[#22365C]"
          title="Posição mantida no ranking"
        >
          <Minus className="w-3 h-3 text-[#6C7C99]" />
          {showLabel && <span>=</span>}
        </div>
      );
    }

    if (currentRank < prevRank) {
      const diff = prevRank - currentRank;
      return (
        <div
          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#4fb579] bg-[#132a1c] px-1.5 py-0.5 rounded border border-[#4fb579]/30"
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
        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#e2687a] bg-[#3A1620] px-1.5 py-0.5 rounded border border-[#e2687a]/30"
        title={`Desceu ${diff} posição(ões) no ranking`}
      >
        <ArrowDown className="w-3 h-3 stroke-[2.5]" />
        {showLabel && <span>-{diff}</span>}
      </div>
    );
  };

  // Helper for status badge
  const getTierInfo = (score: number) => {
    if (score > 140) return { label: 'Voando', cls: 'bg-[#3A2E14] text-[#E3A73B] border border-[#E3A73B]/30' };
    if (score > 130) return { label: 'Caminho certo', cls: 'bg-[#132a1c] text-[#4fb579] border border-[#4fb579]/30' };
    if (score >= 120) return { label: 'Atenção', cls: 'bg-[#332715] text-[#d99a3d] border border-[#d99a3d]/30' };
    return { label: 'Alarme', cls: 'bg-[#3A1620] text-[#e2687a] border border-[#e2687a]/30' };
  };

  // Helper for initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
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
                isFilled ? 'bg-[#E3A73B]' : 'bg-[#22365C]'
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
          <div className="inline-flex bg-[#0F1E38] border border-[#22365C] rounded-xl p-1">
            <button
              onClick={() => setView('geral')}
              className={`font-sans font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer ${
                view === 'geral'
                  ? 'bg-[#E3A73B] text-[#1a1200] shadow-sm font-bold'
                  : 'text-[#A9B7CE] hover:text-white'
              }`}
            >
              Ranking Geral
            </button>
            <button
              onClick={() => setView('equipe')}
              className={`font-sans font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer ${
                view === 'equipe'
                  ? 'bg-[#E3A73B] text-[#1a1200] shadow-sm font-bold'
                  : 'text-[#A9B7CE] hover:text-white'
              }`}
            >
              Por Equipe
            </button>
          </div>

          {view === 'equipe' && (
            <select
              value={selectedTeamLeader}
              onChange={(e) => setSelectedTeamLeader(e.target.value)}
              className="bg-[#0F1E38] border border-[#22365C] text-[#F2F5FA] font-sans text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-[#E3A73B]"
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
            className="bg-[#0F1E38] hover:bg-[#14294A] border border-[#22365C] hover:border-[#E3A73B] text-[#A9B7CE] hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Exportar dados filtrados em CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#E3A73B]" />
            Exportar CSV
          </button>

          {onOpenMemberForm && (
            <button
              onClick={() => onOpenMemberForm()}
              className="bg-[#E3A73B] hover:bg-[#eeb64f] text-[#1a1200] text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Novo Colaborador
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 text-xs font-mono">
        <span className="text-[#6C7C99] text-[11px] uppercase mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Status:
        </span>
        {[
          { id: 'all', label: 'Todos' },
          { id: 'Voando', label: 'Voando (>140)', color: 'text-[#E3A73B]' },
          { id: 'Caminho Certo', label: 'Caminho Certo (>130)', color: 'text-[#4fb579]' },
          { id: 'Atenção', label: 'Atenção (120-130)', color: 'text-[#d99a3d]' },
          { id: 'Alarme', label: 'Alarme (<120)', color: 'text-[#e2687a]' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === f.id
                ? 'bg-[#14294A] border-[#E3A73B] text-white shadow-sm'
                : 'bg-[#0F1E38]/60 border-[#22365C] text-[#A9B7CE] hover:text-white'
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
            <div className="order-2 md:order-1 bg-gradient-to-b from-[#14294A] to-[#0F1E38] border border-[#22365C] rounded-2xl p-5 text-center relative group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-[#6C7C99] tracking-wider font-bold">
                  #2
                </span>
                {renderRankTrend(2, top3[1].previousRank)}
              </div>

              <div className="relative w-14 h-14 mx-auto mt-2 mb-2 group/avatar">
                {top3[1].avatarUrl ? (
                  <img
                    src={top3[1].avatarUrl}
                    alt={top3[1].name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover border-2 border-[#22365C] bg-[#0A1424]"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center font-display font-bold text-lg text-white"
                    style={{ backgroundColor: top3[1].teamColor || '#3B6FE0' }}
                  >
                    {getInitials(top3[1].name)}
                  </div>
                )}
                {onOpenImageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(top3[1]!)}
                    className="absolute -bottom-1 -right-1 bg-[#14294A] border border-[#22365C] text-[#E3A73B] p-1 rounded-full hover:scale-110 transition-all shadow-md"
                    title="Editar Foto"
                  >
                    <ImageIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onSelectMemberForDetail?.(top3[1]!)}
                className="font-display font-semibold text-base text-[#F2F5FA] my-0.5 truncate hover:text-[#E3A73B] hover:underline cursor-pointer block mx-auto max-w-full"
                title="Ver Detalhes e Gráfico"
              >
                {top3[1].name}
              </button>
              <div className="text-xs text-[#6C7C99] mb-2 font-mono">Time {top3[1].team}</div>
              <div className="font-mono font-bold text-xl text-[#E3A73B]">
                {top3[1].score} <span className="text-xs text-[#6C7C99] font-medium">/155</span>
              </div>
            </div>
          )}

          {/* #1 Rank (Center on desktop - Gold highlight) */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-gradient-to-b from-[#14294A] to-[#0F1E38] border-2 border-[#E3A73B] rounded-2xl p-5 text-center relative shadow-[0_0_20px_rgba(227,167,59,0.25)] md:-translate-y-2 group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-[#E3A73B] tracking-wider font-bold">
                  #1 ★
                </span>
                {renderRankTrend(1, top3[0].previousRank)}
              </div>

              <div className="relative w-16 h-16 mx-auto mt-1 mb-2 group/avatar">
                {top3[0].avatarUrl ? (
                  <img
                    src={top3[0].avatarUrl}
                    alt={top3[0].name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover border-2 border-[#E3A73B] bg-[#0A1424] shadow-md"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center font-display font-bold text-xl text-white"
                    style={{ backgroundColor: top3[0].teamColor || '#3B6FE0' }}
                  >
                    {getInitials(top3[0].name)}
                  </div>
                )}
                {onOpenImageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(top3[0]!)}
                    className="absolute -bottom-1 -right-1 bg-[#E3A73B] text-[#1a1200] p-1 rounded-full hover:scale-110 transition-all shadow-md font-bold"
                    title="Editar Foto"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onSelectMemberForDetail?.(top3[0]!)}
                className="font-display font-bold text-lg text-white my-0.5 truncate hover:text-[#E3A73B] hover:underline cursor-pointer block mx-auto max-w-full"
                title="Ver Detalhes e Gráfico"
              >
                {top3[0].name}
              </button>
              <div className="text-xs text-[#6C7C99] mb-2 font-mono">Time {top3[0].team}</div>
              <div className="font-mono font-bold text-2xl text-[#E3A73B]">
                {top3[0].score} <span className="text-xs text-[#6C7C99] font-medium">/155</span>
              </div>
            </div>
          )}

          {/* #3 Rank (Right on desktop) */}
          {top3[2] && (
            <div className="order-3 bg-gradient-to-b from-[#14294A] to-[#0F1E38] border border-[#22365C] rounded-2xl p-5 text-center relative group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-[#6C7C99] tracking-wider font-bold">
                  #3
                </span>
                {renderRankTrend(3, top3[2].previousRank)}
              </div>

              <div className="relative w-14 h-14 mx-auto mt-2 mb-2 group/avatar">
                {top3[2].avatarUrl ? (
                  <img
                    src={top3[2].avatarUrl}
                    alt={top3[2].name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-full object-cover border-2 border-[#22365C] bg-[#0A1424]"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center font-display font-bold text-lg text-white"
                    style={{ backgroundColor: top3[2].teamColor || '#3B6FE0' }}
                  >
                    {getInitials(top3[2].name)}
                  </div>
                )}
                {onOpenImageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenImageModal(top3[2]!)}
                    className="absolute -bottom-1 -right-1 bg-[#14294A] border border-[#22365C] text-[#E3A73B] p-1 rounded-full hover:scale-110 transition-all shadow-md"
                    title="Editar Foto"
                  >
                    <ImageIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onSelectMemberForDetail?.(top3[2]!)}
                className="font-display font-semibold text-base text-[#F2F5FA] my-0.5 truncate hover:text-[#E3A73B] hover:underline cursor-pointer block mx-auto max-w-full"
                title="Ver Detalhes e Gráfico"
              >
                {top3[2].name}
              </button>
              <div className="text-xs text-[#6C7C99] mb-2 font-mono">Time {top3[2].team}</div>
              <div className="font-mono font-bold text-xl text-[#E3A73B]">
                {top3[2].score} <span className="text-xs text-[#6C7C99] font-medium">/155</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List Rows */}
      <div className="flex flex-col gap-2">
        {sortedData.length === 0 && (
          <div className="bg-[#0F1E38] border border-[#22365C] rounded-2xl p-8 text-center space-y-3 my-4">
            <div className="text-[#E3A73B] font-mono text-sm font-bold uppercase tracking-wider">
              Nenhum colaborador encontrado
            </div>
            <p className="text-xs text-[#A9B7CE] max-w-md mx-auto">
              Não encontramos nenhum integrante correspondente aos filtros atuais. Verifique os termos digitados ou redefina o filtro.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-[#14294A] hover:bg-[#22365C] border border-[#22365C] text-xs font-bold text-[#E3A73B] rounded-xl transition-all cursor-pointer"
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
              className="bg-[#0F1E38] border border-[#22365C] hover:border-[#E3A73B]/50 rounded-xl p-3.5 px-4 flex items-center justify-between gap-3 transition-colors group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Rank # & Trend */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="font-mono text-xs text-[#6C7C99] w-6 font-bold text-center">
                    #{person.rank}
                  </div>
                  {renderRankTrend(person.rank, person.previousRank)}
                </div>

                {/* Avatar */}
                <div className="relative group/avatar shrink-0">
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-xl object-cover border border-[#22365C] bg-[#0A1424]"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-xs text-white"
                      style={{ backgroundColor: person.teamColor || '#3B6FE0' }}
                    >
                      {getInitials(person.name)}
                    </div>
                  )}
                  {onOpenImageModal && (
                    <button
                      type="button"
                      onClick={() => onOpenImageModal(person)}
                      className="absolute -bottom-1 -right-1 bg-[#0F1E38] border border-[#22365C] text-[#E3A73B] p-0.5 rounded-full opacity-0 group-hover/avatar:opacity-100 hover:scale-110 transition-all shadow-sm"
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
                      className="font-semibold text-sm text-[#F2F5FA] truncate group-hover:text-[#E3A73B] transition-colors text-left hover:underline cursor-pointer block"
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
                            className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#14294A] border border-[#22365C] text-[#E3A73B] font-mono cursor-pointer hover:border-[#E3A73B] transition-colors"
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
                  <div className="text-[11.5px] text-[#6C7C99]">{person.role} • Time {person.team}</div>
                </div>
              </div>

              {/* Meter bars */}
              {renderBars(person.score)}

              {/* Tier Badge */}
              <div
                className={`font-mono text-[10.5px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase whitespace-nowrap ${tier.cls}`}
              >
                {tier.label}
              </div>

              {/* Score */}
              <div className="font-mono font-bold text-base text-[#F2F5FA] text-right min-w-[70px]">
                {person.score}
                <span className="text-[11px] text-[#6C7C99] font-normal"> /155</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#22365C]">
                {onOpenMemberForm && (
                  <button
                    onClick={() => onOpenMemberForm(person)}
                    className="p-1.5 rounded-lg border border-[#22365C] hover:border-[#E3A73B] hover:bg-[#14294A] text-[#A9B7CE] hover:text-[#E3A73B] transition-colors cursor-pointer"
                    title="Editar Dados do Colaborador"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onSelectMemberForDetail && (
                  <button
                    onClick={() => onSelectMemberForDetail(person)}
                    className="p-1.5 rounded-lg border border-[#22365C] hover:border-[#E3A73B] hover:bg-[#14294A] text-[#A9B7CE] hover:text-[#E3A73B] transition-colors cursor-pointer"
                    title="Ver Histórico em Gráfico"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onOpenReportModal(person)}
                  className="p-1.5 rounded-lg border border-[#22365C] hover:border-[#E3A73B] hover:bg-[#14294A] text-[#A9B7CE] hover:text-[#E3A73B] transition-colors cursor-pointer"
                  title="Gerar Relatório PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onSelectMemberForEvaluation(person)}
                  className="px-2.5 py-1 rounded-lg bg-[#14294A] hover:bg-[#E3A73B] hover:text-[#1a1200] text-xs font-bold text-white transition-all border border-[#22365C] cursor-pointer"
                  title="Avaliar Desempenho"
                >
                  Avaliar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-5 mt-6 pt-5 border-t border-[#22365C]">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2 text-xs text-[#6C7C99]">
            <span className="w-2 h-2 rounded-xs bg-[#E3A73B]" />
            <span>Voando (&gt;140 pts)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6C7C99]">
            <span className="w-2 h-2 rounded-xs bg-[#4fb579]" />
            <span>Caminho certo (&gt;130 pts)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6C7C99]">
            <span className="w-2 h-2 rounded-xs bg-[#d99a3d]" />
            <span>Atenção (&lt;130 pts)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6C7C99]">
            <span className="w-2 h-2 rounded-xs bg-[#e2687a]" />
            <span>Alarme (&lt;120 pts)</span>
          </div>
        </div>

        {/* Trend Legend */}
        <div className="flex items-center gap-3 text-xs text-[#6C7C99]">
          <span className="text-[11px] font-mono font-semibold uppercase text-[#A9B7CE]">Evolução:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-[#4fb579] bg-[#132a1c] px-1.5 py-0.5 rounded border border-[#4fb579]/30">
              <ArrowUp className="w-3 h-3 stroke-[2.5]" /> Subiu
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-[#e2687a] bg-[#3A1620] px-1.5 py-0.5 rounded border border-[#e2687a]/30">
              <ArrowDown className="w-3 h-3 stroke-[2.5]" /> Desceu
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-[#6C7C99] bg-[#0A1424] px-1.5 py-0.5 rounded border border-[#22365C]">
              <Minus className="w-3 h-3" /> Mantido
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
