import React, { useEffect, useMemo, useState } from 'react';
import { TeamMember, PerformanceStatus } from '../types';
import { TEAMS } from '../data/catalogData';
import { deriveTeams } from '../lib/teams';
import { compareByPercent, isEvaluated, percentOf } from '../lib/scoring';
import { getMemberBadges } from '../utils/badgeUtils';
import { exportMembersToCSV } from '../utils/exportUtils';
import { toast } from '../utils/toastUtils';
import { Avatar } from './Avatar';
import { PageActions } from './PageHeader';
import {
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Award,
  CheckSquare,
  ChevronDown,
  Crown,
  Download,
  MoreHorizontal,
  Rocket,
  Star,
  TrendingUp,
  Trophy,
  Zap,
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

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Award,
  Rocket,
  Crown,
  Zap,
  Star,
  TrendingUp,
  CheckSquare,
};

const LEVELS: Array<{ id: PerformanceStatus; label: string; cls: string; dot: string }> = [
  { id: 'Voando', label: 'Voando', cls: 'bg-gold-soft text-ink border-block-edge', dot: 'bg-accent' },
  { id: 'Caminho Certo', label: 'Caminho certo', cls: 'bg-success-soft text-success border-success', dot: 'bg-success' },
  { id: 'Atenção', label: 'Atenção', cls: 'bg-warn-soft text-warn border-warn', dot: 'bg-warn' },
  { id: 'Alarme', label: 'Alarme', cls: 'bg-danger-soft text-danger border-danger', dot: 'bg-danger' },
];

const LEVEL_RANGES: Record<PerformanceStatus, string> = {
  Voando: 'acima de 90%',
  'Caminho Certo': '84% a 90%',
  Atenção: '77% a 84%',
  Alarme: 'abaixo de 77%',
};

const levelOf = (status: PerformanceStatus) => LEVELS.find((level) => level.id === status) ?? LEVELS[3];

const pct = (member: TeamMember) => Math.round(percentOf(member.score, member.maxScore));

const RankTrend: React.FC<{ rank: number; previous?: number }> = ({ rank, previous }) => {
  if (previous === undefined || previous === rank) return null;
  const up = rank < previous;
  const diff = Math.abs(previous - rank);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-success' : 'text-danger'}`}
      title={`${up ? 'Subiu' : 'Desceu'} ${diff} ${diff === 1 ? 'posição' : 'posições'} no ranking`}
    >
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {diff}
    </span>
  );
};

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
  const [selectedTeamChoice, setSelectedTeamLeader] = useState<string>('Djemerson');
  const teamList = useMemo(() => deriveTeams(members, TEAMS), [members]);
  // A equipe escolhida pode não existir (ex.: Djemerson sem membros); cai na primeira disponível.
  const selectedTeamLeader = teamList.some((t) => t.leader === selectedTeamChoice)
    ? selectedTeamChoice
    : (teamList[0]?.leader ?? selectedTeamChoice);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useEffect(() => {
    if (!menuFor) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && (event.target as HTMLElement).closest('[data-row-menu]')) return;
      setMenuFor(null);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, [menuFor]);

  const { ranked, pending, top3 } = useMemo(() => {
    let filtered = members;
    if (view === 'equipe') filtered = filtered.filter((m) => m.team === selectedTeamLeader);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) => m.name.toLowerCase().includes(q) || m.team.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
      );
    }

    // Quem nunca foi avaliado não disputa posição: fica num bloco à parte, fora dos filtros de nível.
    const evaluated = filtered.filter(isEvaluated);
    const byLevel = statusFilter === 'all' ? evaluated : evaluated.filter((m) => m.status === statusFilter);
    const sorted = [...byLevel].sort(compareByPercent);
    const waiting = statusFilter === 'all' ? filtered.filter((m) => !isEvaluated(m)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) : [];
    const podium = statusFilter === 'all' && !searchQuery.trim() && sorted.length >= 3 ? sorted.slice(0, 3) : [];

    return { ranked: sorted, pending: waiting, top3: podium };
  }, [members, view, selectedTeamLeader, statusFilter, searchQuery]);

  const handleExportCSV = () => {
    const rows = [...ranked, ...pending];
    exportMembersToCSV(rows, `ranking-gente-digital-${view}.csv`);
    toast.success(`${rows.length} colaboradores exportados para CSV.`, 'Exportação concluída');
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
      active ? 'bg-band-ink text-band border-block-edge' : 'bg-surface border-line text-ink hover:border-block-edge'
    }`;

  const editPhoto = (person: TeamMember, size: 'sm' | 'md') =>
    onOpenImageModal && (
      <button
        type="button"
        onClick={() => onOpenImageModal(person)}
        className={`absolute -bottom-1 -right-1 bg-surface border-2 border-block-edge text-ink rounded-full hover:scale-110 transition-transform ${
          size === 'sm' ? 'p-0.5 opacity-0 group-hover/avatar:opacity-100' : 'p-1'
        }`}
        title="Editar foto"
      >
        <ImageIcon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      </button>
    );

  const podiumCard = (person: TeamMember, place: 1 | 2 | 3) => {
    const style =
      place === 1 ? 'blk-hero md:-translate-y-2' : 'blk';
    // O 3º lugar é o único bloco ciano da tela.
    const tint = place === 3 ? { background: 'var(--color-teal)', color: '#000000' } : undefined;
    const order = place === 1 ? 'order-1 md:order-2' : place === 2 ? 'order-2 md:order-1' : 'order-3';
    return (
      <div key={person.id} className={`${style} ${order} p-4 text-center`} style={tint}>
        <div className="flex items-center justify-between text-xs font-bold">
          <span>{place === 1 ? '#1 · Destaque' : `#${place}`}</span>
          <RankTrend rank={person.rank} previous={person.previousRank} />
        </div>
        <div className="relative w-14 h-14 mx-auto my-2 group/avatar">
          <Avatar name={person.name} src={person.avatarUrl} teamColor={person.teamColor} size="lg" shape="circle" className="w-full h-full border-2 border-block-edge" />
          {editPhoto(person, 'md')}
        </div>
        <button
          type="button"
          onClick={() => onSelectMemberForDetail?.(person)}
          className="font-display font-bold text-base truncate hover:underline cursor-pointer block mx-auto max-w-full"
          title="Ver detalhes"
        >
          {person.name}
        </button>
        <div className="text-xs opacity-75">Time {person.team}</div>
        <div className={`font-display font-extrabold leading-none mt-2 ${place === 1 ? 'text-5xl' : 'text-4xl'}`}>
          {pct(person)}
          <span className="text-lg">%</span>
        </div>
        <div className="text-[11px] opacity-75 mt-1">
          {person.score} de {person.maxScore} pontos
        </div>
      </div>
    );
  };

  const rowMenu = (person: TeamMember) => {
    const items = [
      ...(onOpenMemberForm ? [{ label: 'Editar dados', run: () => onOpenMemberForm(person) }] : []),
      ...(onSelectMemberForDetail ? [{ label: 'Ver evolução', run: () => onSelectMemberForDetail(person) }] : []),
      { label: 'Gerar relatório PDF', run: () => onOpenReportModal(person) },
    ];
    return (
      <div className="relative" data-row-menu>
        <button
          type="button"
          aria-label={`Mais ações de ${person.name}`}
          aria-haspopup="menu"
          aria-expanded={menuFor === person.id}
          onClick={() => setMenuFor((open) => (open === person.id ? null : person.id))}
          className="p-1.5 rounded-lg border-2 border-line hover:border-block-edge text-ink cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuFor === person.id && (
          <div role="menu" className="blk absolute right-0 top-full mt-1 z-30 min-w-44 p-1.5">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuFor(null);
                  item.run();
                }}
                className="w-full text-left rounded-lg px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-2 cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const personInfo = (person: TeamMember, withBadges: boolean) => (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="relative group/avatar shrink-0">
        <Avatar name={person.name} src={person.avatarUrl} teamColor={person.teamColor} size="sm" className="border-2 border-block-edge" />
        {editPhoto(person, 'sm')}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectMemberForDetail?.(person)}
            className="font-bold text-sm text-ink truncate text-left hover:underline cursor-pointer"
            title="Ver detalhes"
          >
            {person.name}
          </button>
          {withBadges &&
            getMemberBadges(person, members)
              .filter((b) => b.unlocked)
              .slice(0, 3)
              .map((b) => {
                const Icon = BADGE_ICONS[b.iconName] ?? Award;
                return (
                  <span key={b.id} title={`${b.name}: ${b.description}`} className="text-ink shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                );
              })}
        </div>
        <div className="text-[11.5px] text-muted truncate">
          {person.role} · Time {person.team}
        </div>
      </div>
    </div>
  );

  const evaluateButton = (person: TeamMember) => (
    <button
      type="button"
      onClick={() => onSelectMemberForEvaluation(person)}
      className="px-3 py-1.5 rounded-lg bg-band-ink text-band text-xs font-bold cursor-pointer hover:opacity-90"
      title="Avaliar desempenho"
    >
      Avaliar
    </button>
  );

  const nothingFound = ranked.length === 0 && pending.length === 0;

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      <PageActions>
        <button
          type="button"
          onClick={handleExportCSV}
          className="bg-surface border-2 border-block-edge text-ink text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-surface-2"
          title="Exportar a lista filtrada em CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </PageActions>

      {/* Visão e filtros */}
      <div className="flex flex-col gap-3 my-6">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setView('geral')} className={chip(view === 'geral')}>
            Ranking geral
          </button>
          <button type="button" onClick={() => setView('equipe')} className={chip(view === 'equipe')}>
            Por equipe
          </button>
          {view === 'equipe' && (
            <select
              value={selectedTeamLeader}
              onChange={(e) => setSelectedTeamLeader(e.target.value)}
              className="bg-surface border-2 border-block-edge text-ink text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none"
            >
              {teamList.map((t) => (
                <option key={t.leader} value={t.leader}>
                  Time {t.leader} ({members.filter((member) => member.team === t.leader).length} membros)
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => setStatusFilter('all')} className={chip(statusFilter === 'all')}>
            Todos
          </button>
          {LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => setStatusFilter(level.id)}
              className={`${chip(statusFilter === level.id)} inline-flex items-center gap-1.5`}
            >
              <span className={`w-2 h-2 rounded-full ${level.dot}`} aria-hidden="true" />
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {top3.length === 3 && (
        <section aria-label="Pódio" className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-7 items-end">
          {podiumCard(top3[0], 1)}
          {podiumCard(top3[1], 2)}
          {podiumCard(top3[2], 3)}
        </section>
      )}

      {nothingFound && (
        <div className="blk p-8 text-center space-y-3 my-4">
          <div className="font-display text-sm font-bold text-ink">Nenhum colaborador encontrado</div>
          <p className="text-xs text-muted max-w-md mx-auto">Nenhum integrante corresponde aos filtros atuais.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 border-2 border-block-edge text-xs font-bold text-ink rounded-lg cursor-pointer hover:bg-surface-2"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Avaliados */}
      <div className="flex flex-col gap-2">
        {ranked.map((person) => {
          const level = levelOf(person.status);
          return (
            <div
              key={person.id}
              className="bg-surface border-2 border-block-edge rounded-[10px] px-4 py-2.5 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex flex-col items-center w-8 shrink-0">
                  <span className="font-display font-extrabold text-sm text-ink">{String(person.rank).padStart(2, '0')}</span>
                  <RankTrend rank={person.rank} previous={person.previousRank} />
                </div>
                {personInfo(person, true)}
              </div>
              <div className="flex items-center gap-3 justify-end">
                <span className={`border-[1.5px] rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase whitespace-nowrap ${level.cls}`}>
                  {level.label}
                </span>
                <span className="font-display font-extrabold text-lg text-ink w-14 text-right" title={`${person.score} de ${person.maxScore} pontos`}>
                  {pct(person)}%
                </span>
                {evaluateButton(person)}
                {rowMenu(person)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Nunca avaliados */}
      {pending.length > 0 && (
        <details className="blk mt-6 group/pending">
          <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none">
            <span className="font-display font-extrabold text-sm text-ink">Aguardando avaliação ({pending.length})</span>
            <ChevronDown className="w-4 h-4 text-ink transition-transform group-open/pending:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-line-soft divide-y divide-line-soft">
            {pending.map((person) => (
              <div key={person.id} className="px-4 py-2.5 flex flex-col md:flex-row md:items-center gap-3">
                {personInfo(person, false)}
                <div className="flex items-center gap-3 justify-end">
                  <span className="border-[1.5px] border-dashed border-faint text-muted rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase whitespace-nowrap">
                    Sem avaliação
                  </span>
                  <span className="font-display font-extrabold text-lg text-faint w-14 text-right">—</span>
                  {evaluateButton(person)}
                  {rowMenu(person)}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-5 mt-6 pt-5 border-t border-line-soft text-xs text-muted">
        {LEVELS.map((level) => (
          <span key={level.id} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${level.dot}`} aria-hidden="true" />
            {level.label} ({LEVEL_RANGES[level.id]})
          </span>
        ))}
      </div>
    </div>
  );
};
