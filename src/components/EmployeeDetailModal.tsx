import React, { useState } from 'react';
import type { TeamMember } from '../types';
import type { EvaluationPayload } from '../lib/firebaseLoader';
import { CRITERIA_CATEGORIES } from '../data/catalogData';
import { getCategoryScorePercent, isPdiGoalOverdue } from '../lib/evaluation';
import { getMemberBadges } from '../utils/badgeUtils';
import { useDialog } from '../hooks/useDialog';
import { Avatar } from './Avatar';
import {
  X,
  Award,
  ImageIcon,
  TrendingUp,
  LineChart as ChartIcon,
  Trophy,
  Rocket,
  Crown,
  Zap,
  Star,
  CheckSquare,
  Sparkles,
  Lock,
  Check,
  Target,
  Clock,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface EmployeeDetailModalProps {
  member: TeamMember | null;
  allMembers?: TeamMember[];
  onClose: () => void;
  onOpenImageModal?: (member: TeamMember) => void;
  onSelectForEvaluation: (member: TeamMember) => void;
  evaluation?: EvaluationPayload | null;
}

// Render Badge Icon Helper
const renderBadgeIcon = (iconName: string, className: string) => {
  switch (iconName) {
    case 'Trophy':
      return <Trophy className={className} />;
    case 'Award':
      return <Award className={className} />;
    case 'Rocket':
      return <Rocket className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Star':
      return <Star className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'CheckSquare':
      return <CheckSquare className={className} />;
    default:
      return <Award className={className} />;
  }
};

// Custom Tooltip component for Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-surface border border-line p-3 rounded-xl shadow-xl font-sans">
        <p className="text-[11px] font-mono font-semibold text-muted uppercase mb-1">
          Mês: {label}
        </p>
        <p className="text-sm font-mono font-bold text-accent flex items-center gap-1">
          <span>{data.value}</span>
          <span className="text-[11px] text-faint font-normal">/ 155 pts</span>
        </p>
      </div>
    );
  }
  return null;
};

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  member,
  allMembers = [],
  onClose,
  onOpenImageModal,
  onSelectForEvaluation,
  evaluation,
}) => {
  const dialogRef = useDialog(Boolean(member), onClose);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!member) return null;

  const historyData = member.history || [];

  const badges = getMemberBadges(member, allMembers);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const filteredBadges = badges.filter((b) => {
    if (badgeFilter === 'unlocked') return b.unlocked;
    if (badgeFilter === 'locked') return !b.unlocked;
    return true;
  });

  const radarData = evaluation
    ? CRITERIA_CATEGORIES.flatMap((category) => {
        const score = getCategoryScorePercent(evaluation.criteriaScores, category.id);
        return score === null
          ? []
          : [{ category: category.name.split(' ')[0], fullName: category.name, score }];
      })
    : [];

  const pdiGoals = member.pdiGoals || [];
  const completedGoalsCount = pdiGoals.filter((g) => g.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="presentation">
      <div
        ref={dialogRef}
        className="bg-surface border border-line w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 text-ink max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-detail-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-line pb-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar
                name={member.name}
                src={member.avatarUrl}
                teamColor={member.teamColor}
                size="xl"
                shape="circle"
                className="border-2 border-accent bg-app"
              />
              {onOpenImageModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenImageModal(member);
                  }}
                  className="absolute -bottom-1 -right-1 bg-accent text-accent-ink p-1.5 rounded-full shadow-lg hover:scale-110 transition-all font-bold cursor-pointer"
                  title="Editar Link Direto da Imagem"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <h3 id="employee-detail-title" className="text-xl font-display font-bold text-white">{member.name}</h3>
              <p className="text-xs text-muted">{member.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-accent bg-gold-soft px-2 py-0.5 rounded border border-accent/30 font-bold">
                  Time {member.team}
                </span>
                <span className="text-[10px] font-mono text-faint">
                  Rank #{member.rank}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do colaborador"
            className="text-faint hover:text-white p-1 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-app border border-line p-3.5 rounded-xl text-center">
            <span className="text-[10px] font-mono text-faint uppercase block mb-1">PONTUAÇÃO ATUAL</span>
            <span className="text-2xl font-bold text-accent font-mono">{member.score}</span>
            <span className="text-xs text-faint font-mono"> / {member.maxScore}</span>
          </div>

          <div className="bg-app border border-line p-3.5 rounded-xl text-center">
            <span className="text-[10px] font-mono text-faint uppercase block mb-1">APROVEITAMENTO</span>
            <span className="text-2xl font-bold text-white font-mono">
              {Math.round((member.score / member.maxScore) * 100)}%
            </span>
          </div>

          <div className="bg-app border border-line p-3.5 rounded-xl text-center flex flex-col justify-center items-center">
            <span className="text-[10px] font-mono text-faint uppercase block mb-1">STATUS</span>
            <span className="text-xs font-mono font-bold text-accent">
              {member.status}
            </span>
          </div>
        </div>

        {/* Competencies Radar Chart */}
        <div className="bg-app border border-line p-4.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Teia de Competências & Dimensões
            </span>
            <span className="text-[10px] font-mono text-faint">Aderência (%)</span>
          </div>

          <div className="w-full h-52">
            {radarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-faint">
                Nenhuma avaliação detalhada encontrada no ciclo atual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="#1F3356" />
                  <PolarAngleAxis dataKey="category" stroke="#A9B7CE" tick={{ fill: '#A9B7CE', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#22365C" tick={{ fill: '#6C7C99', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1E38',
                      borderColor: '#22365C',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Radar name="Aderência" dataKey="score" stroke="#E3A73B" fill="#E3A73B" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* PDI / Plano de Desenvolvimento Individual */}
        <div className="bg-app border border-line p-4.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-line-soft pb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-success" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Plano de Desenvolvimento Individual (PDI)
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded border border-line">
              {completedGoalsCount} de {pdiGoals.length} Metas Concluídas
            </span>
          </div>

          {pdiGoals.length === 0 ? (
            <div className="text-xs text-faint py-2 text-center">
              Nenhuma meta cadastrada no ciclo atual.
            </div>
          ) : (
            <div className="space-y-2">
              {pdiGoals.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {g.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-accent shrink-0" />
                    )}
                    <span
                      className={`truncate ${
                        g.status === 'completed' ? 'line-through text-faint' : 'text-white'
                      }`}
                    >
                      {g.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                  {isPdiGoalOverdue(g) && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-danger-ink bg-danger-soft border border-danger/40 px-2 py-0.5 rounded">
                      Vencida
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-faint shrink-0">{g.deadline}</span>
                </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges & Achievements Section */}
        <div className="bg-app border border-line p-4.5 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line-soft pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono font-bold text-ink uppercase tracking-wider">
                Badges & Conquistas
              </span>
              <span className="text-[10px] font-mono font-bold text-accent bg-gold-soft px-2 py-0.5 rounded border border-accent/40">
                {unlockedCount} / {badges.length} Concluídas
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-line self-start sm:self-auto">
              <button
                onClick={() => setBadgeFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-colors cursor-pointer ${
                  badgeFilter === 'all'
                    ? 'bg-accent text-accent-ink'
                    : 'text-muted hover:text-white'
                }`}
              >
                Todas ({badges.length})
              </button>
              <button
                onClick={() => setBadgeFilter('unlocked')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-colors cursor-pointer ${
                  badgeFilter === 'unlocked'
                    ? 'bg-accent text-accent-ink'
                    : 'text-muted hover:text-white'
                }`}
              >
                Desbloqueadas ({unlockedCount})
              </button>
              <button
                onClick={() => setBadgeFilter('locked')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-colors cursor-pointer ${
                  badgeFilter === 'locked'
                    ? 'bg-accent text-accent-ink'
                    : 'text-muted hover:text-white'
                }`}
              >
                Bloqueadas ({badges.length - unlockedCount})
              </button>
            </div>
          </div>

          {/* Badge Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {filteredBadges.map((badge) => {
              const isUnlocked = badge.unlocked;

              let cardBg = isUnlocked
                ? 'bg-surface border-line hover:border-accent/60'
                : 'bg-app-deep border-line-deep opacity-60';

              let iconRing = 'border-line bg-app text-faint';
              if (isUnlocked) {
                if (badge.rarity === 'diamond') {
                  iconRing =
                    'border-info bg-sky-deep/20 text-info shadow-[0_0_12px_rgba(56,189,248,0.3)]';
                } else if (badge.rarity === 'gold') {
                  iconRing =
                    'border-accent bg-gold-soft text-accent shadow-[0_0_12px_rgba(227,167,59,0.2)]';
                } else if (badge.rarity === 'silver') {
                  iconRing = 'border-silver bg-slate-deep/30 text-slate-ink';
                } else {
                  iconRing = 'border-amber-deep bg-amber-bg/20 text-amber-ink';
                }
              }

              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 relative transition-all ${cardBg}`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconRing}`}
                  >
                    {renderBadgeIcon(badge.iconName, 'w-5 h-5')}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-bold text-xs truncate ${
                          isUnlocked ? 'text-white' : 'text-slate-faint'
                        }`}
                      >
                        {badge.name}
                      </span>
                      {isUnlocked ? (
                        <span className="text-[10px] font-mono font-bold text-success bg-success-soft px-1.5 py-0.5 rounded border border-success/30 flex items-center gap-1 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Conquistado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-faint flex items-center gap-1 shrink-0">
                          <Lock className="w-2.5 h-2.5" /> Em breve
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-muted leading-snug">
                      {badge.description}
                    </p>

                    {!isUnlocked && badge.progress && (
                      <div className="pt-1.5 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-faint">
                          <span>Progresso</span>
                          <span>
                            {badge.progress.current} / {badge.progress.max} pts
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-app rounded-full overflow-hidden border border-line-deep">
                          <div
                            className="h-full bg-accent/70 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (badge.progress.current / badge.progress.max) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {isUnlocked && badge.unlockedAt && (
                      <p className="text-[10px] font-mono text-accent pt-0.5">
                        Em: {badge.unlockedAt}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Line Chart (Recharts) */}
        <div className="bg-app border border-line p-4.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <ChartIcon className="w-3.5 h-3.5" />
              Histórico de Desempenho ao Longo do Tempo
            </span>
            <span className="text-[10px] font-mono text-faint">Meta: 140 pts</span>
          </div>

          <div className="w-full h-48 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1F3356" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#6C7C99"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#22365C' }}
                />
                <YAxis
                  domain={[(dataMin: number) => Math.max(0, Math.floor((dataMin - 10) / 10) * 10), 155]}
                  stroke="#6C7C99"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#22365C' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={140}
                  stroke="#E3A73B"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: 'Meta (140)', fill: '#E3A73B', fontSize: 10, position: 'insideTopRight' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#E3A73B"
                  strokeWidth={3}
                  dot={{ fill: '#E3A73B', r: 4, stroke: '#0F1E38', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#E3A73B', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly summary badges */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-line-soft">
            {historyData.map((h, idx) => (
              <div key={idx} className="flex-1 min-w-[70px] bg-surface border border-line p-2 rounded-lg text-center">
                <span className="text-[10px] font-mono text-faint block">{h.month}</span>
                <span className="text-xs font-bold font-mono text-white">{h.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Image Link Detail */}
        <div className="bg-app border border-line p-3.5 rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono font-bold text-accent uppercase block mb-0.5">
              LINK DIRETO DA FOTO DO PERFIL
            </span>
            <p className="text-xs font-mono text-muted truncate">
              {member.avatarUrl}
            </p>
          </div>
          {onOpenImageModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImageModal(member);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-accent hover:text-accent-ink text-xs font-bold text-white border border-line transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Alterar URL
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-line pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:text-white cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectForEvaluation(member);
            }}
            className="px-5 py-2 rounded-xl bg-accent text-accent-ink font-extrabold text-xs hover:bg-accent-hover transition-all cursor-pointer shadow-md"
          >
            Iniciar Avaliação
          </button>
        </div>
      </div>
    </div>
  );
};
