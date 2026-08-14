import React, { useState } from 'react';
import { TeamMember, Badge, PdiGoal } from '../types';
import { getMemberBadges } from '../utils/badgeUtils';
import { CRITERIA_CATEGORIES } from '../data/initialData';
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
  onOpenImageModal: (member: TeamMember) => void;
  onSelectForEvaluation: (member: TeamMember) => void;
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
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#0F1E38] border border-[#22365C] p-3 rounded-xl shadow-xl font-sans">
        <p className="text-[11px] font-mono font-semibold text-[#A9B7CE] uppercase mb-1">
          Mês: {label}
        </p>
        <p className="text-sm font-mono font-bold text-[#E3A73B] flex items-center gap-1">
          <span>{data.value}</span>
          <span className="text-[11px] text-[#6C7C99] font-normal">/ 155 pts</span>
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
}) => {
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!member) return null;

  const historyData =
    member.history && member.history.length > 0
      ? member.history
      : [
          { month: 'Mai', score: Math.max(100, member.score - 12) },
          { month: 'Jun', score: Math.max(100, member.score - 8) },
          { month: 'Jul', score: Math.max(100, member.score - 3) },
          { month: 'Ago', score: member.score },
        ];

  const badges = getMemberBadges(member, allMembers);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const filteredBadges = badges.filter((b) => {
    if (badgeFilter === 'unlocked') return b.unlocked;
    if (badgeFilter === 'locked') return !b.unlocked;
    return true;
  });

  // Radar competencies data
  const basePct = Math.round((member.score / member.maxScore) * 100);
  const radarData = CRITERIA_CATEGORIES.map((cat, idx) => ({
    category: cat.name.split(' ')[0],
    fullName: cat.name,
    score: Math.min(100, Math.max(40, basePct + (idx % 2 === 0 ? 4 : -3))),
  }));

  const pdiGoals = member.pdiGoals || [];
  const completedGoalsCount = pdiGoals.filter((g) => g.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050912]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F1E38] border border-[#22365C] w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 text-[#F2F5FA] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#22365C] pb-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img
                src={member.avatarUrl}
                alt={member.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#E3A73B] bg-[#0A1424]"
              />
              <button
                onClick={() => {
                  onClose();
                  onOpenImageModal(member);
                }}
                className="absolute -bottom-1 -right-1 bg-[#E3A73B] text-[#1a1200] p-1.5 rounded-full shadow-lg hover:scale-110 transition-all font-bold cursor-pointer"
                title="Editar Link Direto da Imagem"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-display font-bold text-white">{member.name}</h3>
              <p className="text-xs text-[#A9B7CE]">{member.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-[#E3A73B] bg-[#3A2E14] px-2 py-0.5 rounded border border-[#E3A73B]/30 font-bold">
                  Time {member.team}
                </span>
                <span className="text-[10px] font-mono text-[#6C7C99]">
                  Rank #{member.rank}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#6C7C99] hover:text-white p-1 rounded-lg hover:bg-[#14294A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0A1424] border border-[#22365C] p-3.5 rounded-xl text-center">
            <span className="text-[10px] font-mono text-[#6C7C99] uppercase block mb-1">PONTUAÇÃO ATUAL</span>
            <span className="text-2xl font-bold text-[#E3A73B] font-mono">{member.score}</span>
            <span className="text-xs text-[#6C7C99] font-mono"> / {member.maxScore}</span>
          </div>

          <div className="bg-[#0A1424] border border-[#22365C] p-3.5 rounded-xl text-center">
            <span className="text-[10px] font-mono text-[#6C7C99] uppercase block mb-1">APROVEITAMENTO</span>
            <span className="text-2xl font-bold text-white font-mono">
              {Math.round((member.score / member.maxScore) * 100)}%
            </span>
          </div>

          <div className="bg-[#0A1424] border border-[#22365C] p-3.5 rounded-xl text-center flex flex-col justify-center items-center">
            <span className="text-[10px] font-mono text-[#6C7C99] uppercase block mb-1">STATUS</span>
            <span className="text-xs font-mono font-bold text-[#E3A73B]">
              {member.status}
            </span>
          </div>
        </div>

        {/* Competencies Radar Chart */}
        <div className="bg-[#0A1424] border border-[#22365C] p-4.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#E3A73B] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Teia de Competências & Dimensões
            </span>
            <span className="text-[10px] font-mono text-[#6C7C99]">Aderência (%)</span>
          </div>

          <div className="w-full h-52">
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
          </div>
        </div>

        {/* PDI / Plano de Desenvolvimento Individual */}
        <div className="bg-[#0A1424] border border-[#22365C] p-4.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F3356] pb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#4fb579]" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Plano de Desenvolvimento Individual (PDI)
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#A9B7CE] bg-[#14294A] px-2 py-0.5 rounded border border-[#22365C]">
              {completedGoalsCount} de {pdiGoals.length} Metas Concluídas
            </span>
          </div>

          {pdiGoals.length === 0 ? (
            <div className="text-xs text-[#6C7C99] py-2 text-center">
              Nenhuma meta cadastrada no ciclo atual.
            </div>
          ) : (
            <div className="space-y-2">
              {pdiGoals.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F1E38] border border-[#22365C] text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {g.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#4fb579] shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#E3A73B] shrink-0" />
                    )}
                    <span
                      className={`truncate ${
                        g.status === 'completed' ? 'line-through text-[#6C7C99]' : 'text-white'
                      }`}
                    >
                      {g.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#6C7C99] shrink-0">{g.deadline}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges & Achievements Section */}
        <div className="bg-[#0A1424] border border-[#22365C] p-4.5 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F3356] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E3A73B]" />
              <span className="text-xs font-mono font-bold text-[#F2F5FA] uppercase tracking-wider">
                Badges & Conquistas
              </span>
              <span className="text-[10px] font-mono font-bold text-[#E3A73B] bg-[#3A2E14] px-2 py-0.5 rounded border border-[#E3A73B]/40">
                {unlockedCount} / {badges.length} Concluídas
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0F1E38] p-1 rounded-lg border border-[#22365C] self-start sm:self-auto">
              <button
                onClick={() => setBadgeFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-colors cursor-pointer ${
                  badgeFilter === 'all'
                    ? 'bg-[#E3A73B] text-[#1a1200]'
                    : 'text-[#A9B7CE] hover:text-white'
                }`}
              >
                Todas ({badges.length})
              </button>
              <button
                onClick={() => setBadgeFilter('unlocked')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-colors cursor-pointer ${
                  badgeFilter === 'unlocked'
                    ? 'bg-[#E3A73B] text-[#1a1200]'
                    : 'text-[#A9B7CE] hover:text-white'
                }`}
              >
                Desbloqueadas ({unlockedCount})
              </button>
              <button
                onClick={() => setBadgeFilter('locked')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md transition-colors cursor-pointer ${
                  badgeFilter === 'locked'
                    ? 'bg-[#E3A73B] text-[#1a1200]'
                    : 'text-[#A9B7CE] hover:text-white'
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
                ? 'bg-[#0F1E38] border-[#22365C] hover:border-[#E3A73B]/60'
                : 'bg-[#080E1A] border-[#18263E] opacity-60';

              let iconRing = 'border-[#22365C] bg-[#0A1424] text-[#6C7C99]';
              if (isUnlocked) {
                if (badge.rarity === 'diamond') {
                  iconRing =
                    'border-[#38bdf8] bg-[#0369a1]/20 text-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.3)]';
                } else if (badge.rarity === 'gold') {
                  iconRing =
                    'border-[#E3A73B] bg-[#3A2E14] text-[#E3A73B] shadow-[0_0_12px_rgba(227,167,59,0.2)]';
                } else if (badge.rarity === 'silver') {
                  iconRing = 'border-[#94a3b8] bg-[#334155]/30 text-[#e2e8f0]';
                } else {
                  iconRing = 'border-[#d97706] bg-[#78350f]/20 text-[#fbbf24]';
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
                          isUnlocked ? 'text-white' : 'text-[#8293B0]'
                        }`}
                      >
                        {badge.name}
                      </span>
                      {isUnlocked ? (
                        <span className="text-[10px] font-mono font-bold text-[#4fb579] bg-[#132a1c] px-1.5 py-0.5 rounded border border-[#4fb579]/30 flex items-center gap-1 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Conquistado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#6C7C99] flex items-center gap-1 shrink-0">
                          <Lock className="w-2.5 h-2.5" /> Em breve
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#A9B7CE] leading-snug">
                      {badge.description}
                    </p>

                    {!isUnlocked && badge.progress && (
                      <div className="pt-1.5 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-[#6C7C99]">
                          <span>Progresso</span>
                          <span>
                            {badge.progress.current} / {badge.progress.max} pts
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#0A1424] rounded-full overflow-hidden border border-[#18263E]">
                          <div
                            className="h-full bg-[#E3A73B]/70 rounded-full"
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
                      <p className="text-[10px] font-mono text-[#E3A73B] pt-0.5">
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
        <div className="bg-[#0A1424] border border-[#22365C] p-4.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#E3A73B] uppercase tracking-wider flex items-center gap-1.5">
              <ChartIcon className="w-3.5 h-3.5" />
              Histórico de Desempenho ao Longo do Tempo
            </span>
            <span className="text-[10px] font-mono text-[#6C7C99]">Meta: 140 pts</span>
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
                  domain={[100, 155]}
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
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1F3356]">
            {historyData.map((h, idx) => (
              <div key={idx} className="bg-[#0F1E38] border border-[#22365C] p-2 rounded-lg text-center">
                <span className="text-[10px] font-mono text-[#6C7C99] block">{h.month}</span>
                <span className="text-xs font-bold font-mono text-white">{h.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Image Link Detail */}
        <div className="bg-[#0A1424] border border-[#22365C] p-3.5 rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono font-bold text-[#E3A73B] uppercase block mb-0.5">
              LINK DIRETO DA FOTO DO PERFIL
            </span>
            <p className="text-xs font-mono text-[#A9B7CE] truncate">
              {member.avatarUrl}
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenImageModal(member);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#14294A] hover:bg-[#E3A73B] hover:text-[#1a1200] text-xs font-bold text-white border border-[#22365C] transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Alterar URL
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-[#22365C] pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#22365C] text-xs font-bold text-[#A9B7CE] hover:text-white cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectForEvaluation(member);
            }}
            className="px-5 py-2 rounded-xl bg-[#E3A73B] text-[#1a1200] font-extrabold text-xs hover:bg-[#eeb64f] transition-all cursor-pointer shadow-md"
          >
            Iniciar Avaliação
          </button>
        </div>
      </div>
    </div>
  );
};
