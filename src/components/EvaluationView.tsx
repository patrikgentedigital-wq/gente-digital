import React, { useState, useEffect } from 'react';
import { TeamMember, PdiGoal } from '../types';
import { EvaluationPayload } from '../lib/firebase';
import { CRITERIA_CATEGORIES, TEAMS } from '../data/catalogData';
import {
  FileText,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  Target,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import { toast } from '../utils/toastUtils';
import {
  AVAILABLE_EVALUATION_CYCLES,
  DEFAULT_EVALUATION_CYCLE,
  hasCompleteCriteriaScores,
  normalizeCriteriaScores,
} from '../lib/evaluation';

interface EvaluationViewProps {
  members: TeamMember[];
  selectedMember: TeamMember;
  onSelectMember: (member: TeamMember) => void;
  onSaveEvaluation: (
    memberId: string,
    newTotalScore: number,
    criteriaScores: Record<string, number>,
    comments: string,
    cycle?: string,
    pdiGoals?: PdiGoal[]
  ) => Promise<void>;
  onOpenImageModal?: (member: TeamMember) => void;
  onOpenReportModal: (
    member: TeamMember,
    context?: { criteriaScores?: Record<string, number>; leaderComments?: string; cycle?: string },
  ) => void | Promise<void>;
  onLoadEvaluation: (memberId: string, cycle: string) => Promise<EvaluationPayload | null | undefined>;
  currentLeader?: string | null;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  members,
  selectedMember,
  onSelectMember,
  onSaveEvaluation,
  onOpenImageModal,
  onOpenReportModal,
  onLoadEvaluation,
  currentLeader,
}) => {
  const [cycle, setCycle] = useState<string>(DEFAULT_EVALUATION_CYCLE);
  const [teamFilter, setTeamFilter] = useState<string>(() => {
    if (currentLeader && TEAMS.some((t) => t.leader.toLowerCase() === currentLeader.toLowerCase())) {
      return currentLeader;
    }
    return 'all';
  });

  // Initialize scores (0..5 for each category item)
  const [scores, setScores] = useState<Record<string, number | undefined>>({});

  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
  });

  const [leaderComments, setLeaderComments] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // PDI Goals state
  const [pdiGoals, setPdiGoals] = useState<PdiGoal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);

  // Warn if closing window with unsaved draft
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load the persisted evaluation whenever the member or cycle changes.
  // Note: we intentionally depend only on selectedMember.id (not the object/array
  // identities) so Firestore snapshots do not wipe in-progress drafts.
  const memberId = selectedMember.id;
  const memberPdiGoals = selectedMember.pdiGoals;
  useEffect(() => {
    let active = true;
    setScores({});
    setLeaderComments('');
    setPdiGoals([]);
    setIsDirty(false);
    setIsLoadingEvaluation(true);

    onLoadEvaluation(memberId, cycle)
      .then((evaluation) => {
        if (!active) return;
        setScores(normalizeCriteriaScores(evaluation?.criteriaScores));
        setLeaderComments(evaluation?.comments || '');
        setPdiGoals(evaluation?.pdiGoals || memberPdiGoals || []);
      })
      .catch((error) => {
        console.error('Unable to load evaluation:', error);
        if (active) toast.error('Não foi possível carregar a avaliação salva.');
      })
      .finally(() => {
        if (active) setIsLoadingEvaluation(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, memberId, onLoadEvaluation]);


  const toggleCategory = (catId: number) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const updateScore = (key: string, delta: number) => {
    setIsDirty(true);
    setScores((prev) => {
      const current = prev[key] ?? 0;
      const next = Math.max(0, Math.min(5, current + delta));
      return { ...prev, [key]: next };
    });
  };

  // Calculate category sum & grand total
  const getCategorySum = (catId: number) => {
    const cat = CRITERIA_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return 0;
    return cat.items.reduce((acc, _, idx) => acc + (scores[`${catId}-${idx}`] ?? 0), 0);
  };

  const scoreKeys = CRITERIA_CATEGORIES.flatMap((cat) => cat.items.map((_, idx) => `${cat.id}-${idx}`));
  const hasAllScores = hasCompleteCriteriaScores(scores);
  const grandTotal = scoreKeys.reduce((total, key) => total + (scores[key] ?? 0), 0);

  // Radar chart data comparing category percentages
  const radarData = CRITERIA_CATEGORIES.map((cat) => {
    const catSum = getCategorySum(cat.id);
    const catMax = cat.items.length * 5;
    const leaderPct = Math.round((catSum / catMax) * 100);
    return {
      category: cat.name.split(' ')[0], // Short category name for radar axis
      fullName: cat.name,
      lider: leaderPct,
    };
  });

  // PDI Actions
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    if (pdiGoals.length >= 50) {
      toast.error('O limite de 50 metas de PDI foi atingido.');
      return;
    }
    if (newGoalTitle.trim().length > 200 || newGoalDeadline.trim().length > 100) {
      toast.error('Reduza o tamanho do título ou prazo da meta.');
      return;
    }

    const newGoal: PdiGoal = {
      id: `pdi_${crypto.randomUUID()}`,
      title: newGoalTitle.trim(),
      deadline: newGoalDeadline || 'Próximo Ciclo',
      status: 'pending',
    };

    setIsDirty(true);
    setPdiGoals((prev) => [...prev, newGoal]);
    setNewGoalTitle('');
    setNewGoalDeadline('');
    setShowAddGoal(false);
    toast.info('Meta do PDI adicionada.');
  };

  const toggleGoalStatus = (goalId: string) => {
    setIsDirty(true);
    setPdiGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, status: g.status === 'completed' ? 'pending' : 'completed' }
          : g
      )
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    setIsDirty(true);
    setPdiGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleSave = async () => {
    if (!hasAllScores) {
      toast.error('Preencha todos os critérios antes de salvar.');
      return;
    }
    if (!leaderComments.trim()) {
      toast.error('Informe o parecer da liderança antes de salvar.');
      return;
    }

    try {
      await onSaveEvaluation(
        selectedMember.id,
        grandTotal,
        Object.fromEntries(scoreKeys.map((key) => [key, scores[key] as number])),
        leaderComments.trim(),
        cycle,
        pdiGoals,
      );
      setIsDirty(false);
      toast.success(
        `Avaliação de ${selectedMember.name} salva com sucesso! Pontuação: ${grandTotal}/155`,
        'Avaliação Concluída'
      );
    } catch {
      // The parent reports persistence errors and keeps the draft in memory.
    }
  };

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      {/* Header Bar */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-6 rounded-2xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="font-mono text-xs text-[#E3A73B] uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Lançamento Oficial de Avaliação
          </div>
          <h2 className="font-display font-bold text-2xl text-white">Avaliação da Liderança & PDI</h2>
          <p className="text-xs text-[#A9B7CE] mt-0.5">
            Lance as notas validadas, plano de desenvolvimento e acompanhe a teia de competências.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
             onClick={() => onOpenReportModal(selectedMember, {
               criteriaScores: Object.fromEntries(
                 Object.entries(scores).filter(([, score]) => typeof score === 'number'),
               ) as Record<string, number>,
               leaderComments: leaderComments.trim(),
               cycle,
             })}
            className="bg-[#14294A] hover:bg-[#22365C] border border-[#22365C] text-[#E3A73B] font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Exportar Relatório PDF
          </button>
        </div>
      </div>

      {/* Selectors Bar: Filtro por Time, Colaborador & Ciclo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#0F1E38] border border-[#22365C] p-4 rounded-xl mb-6 shadow-lg">
        {/* Team Filter */}
        <div className="md:col-span-3">
          <label className="block text-xs font-mono font-semibold text-[#A9B7CE] mb-2 uppercase flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#E3A73B]" />
            Filtrar Time
          </label>
          <select
            value={teamFilter}
            onChange={(e) => {
              if (isDirty && !window.confirm('Você possui alterações não salvas nesta avaliação. Deseja descartá-las?')) {
                return;
              }
              const newFilter = e.target.value;
              setTeamFilter(newFilter);
              const filtered = newFilter === 'all'
                ? members
                : members.filter((m) => m.team.toLowerCase() === newFilter.toLowerCase());
              if (filtered.length > 0 && !filtered.some((m) => m.id === selectedMember.id)) {
                onSelectMember(filtered[0]);
              }
            }}
            className="w-full bg-[#14294A] border border-[#22365C] text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-[#E3A73B]"
          >
            <option value="all">Todos os Times ({members.length})</option>
            {TEAMS.map((t) => {
              const count = members.filter((m) => m.team.toLowerCase() === t.leader.toLowerCase()).length;
              return (
                <option key={t.leader} value={t.leader}>
                  Time {t.leader} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Selected Member */}
        <div className="md:col-span-5">
          <label className="block text-xs font-mono font-semibold text-[#A9B7CE] mb-2 uppercase">
            Colaborador Avaliado
          </label>
          <div className="flex gap-2">
            <select
              value={selectedMember.id}
              onChange={(e) => {
                if (isDirty && !window.confirm('Você possui alterações não salvas nesta avaliação. Deseja descartá-las?')) {
                  return;
                }
                const m = members.find((x) => x.id === e.target.value);
                if (m) onSelectMember(m);
              }}
              className="flex-1 bg-[#14294A] border border-[#22365C] text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-[#E3A73B]"
            >
              {(teamFilter === 'all'
                ? members
                : members.filter((m) => m.team.toLowerCase() === teamFilter.toLowerCase())
              ).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role} • Time {m.team})
                </option>
              ))}
            </select>
            {onOpenImageModal && (
              <button
                type="button"
                onClick={() => onOpenImageModal(selectedMember)}
                className="bg-[#14294A] hover:border-[#E3A73B] text-xs font-bold text-[#F2F5FA] border border-[#22365C] px-3.5 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                title="Alterar foto do perfil"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#E3A73B]" />
              </button>
            )}
          </div>
        </div>

        {/* Cycle */}
        <div className="md:col-span-4">
          <label className="block text-xs font-mono font-semibold text-[#A9B7CE] mb-2 uppercase">
            Ciclo de Avaliação
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7C99]" />
            <select
              value={cycle}
              onChange={(e) => {
                if (isDirty && !window.confirm('Você possui alterações não salvas nesta avaliação. Deseja descartá-las?')) {
                  return;
                }
                setCycle(e.target.value);
              }}
              className="w-full bg-[#14294A] border border-[#22365C] text-white font-sans text-sm pl-9 pr-3 py-3 rounded-xl focus:outline-none focus:border-[#E3A73B]"
            >
              {AVAILABLE_EVALUATION_CYCLES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Radar Chart Summary Section */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-5 rounded-2xl mb-6 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#E3A73B]" />
            <h3 className="font-display font-bold text-sm text-white">
              Teia de Competências da Liderança
            </h3>
          </div>
           <span className="font-mono text-xs text-[#A9B7CE]">
             {isLoadingEvaluation ? 'Carregando avaliação...' : 'Aderência por Categoria (%)'}
           </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="#22365C" />
              <PolarAngleAxis dataKey="category" stroke="#A9B7CE" tick={{ fill: '#A9B7CE', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#22365C" tick={{ fill: '#6C7C99', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F1E38',
                  borderColor: '#22365C',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Radar name="Avaliação do Líder" dataKey="lider" stroke="#E3A73B" fill="#E3A73B" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Criteria Categories Cards */}
      <div className="space-y-3">
        {CRITERIA_CATEGORIES.map((cat) => {
          const isOpen = !!openCategories[cat.id];
          const catSum = getCategorySum(cat.id);
          const catMax = cat.items.length * 5;

          return (
            <div key={cat.id} className="bg-[#0F1E38] border border-[#22365C] rounded-xl overflow-hidden transition-all shadow-md">
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#14294A]/50 transition-colors"
              >
                <div className="font-display font-semibold text-sm text-[#F2F5FA] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#14294A] text-[#E3A73B] font-mono text-xs flex items-center justify-center font-bold">
                    {cat.id}
                  </span>
                  {cat.name}
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-[#E3A73B] font-bold">
                    {catSum} / {catMax}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#6C7C99]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6C7C99]" />
                  )}
                </div>
              </div>

              {/* Items Body */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-[#22365C] divide-y divide-[#22365C]">
                  {cat.items.map((label, idx) => {
                    const key = `${cat.id}-${idx}`;
                    const score = scores[key];

                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 py-3">
                        <div className="text-xs text-[#A9B7CE] leading-normal flex-1">
                          {label}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateScore(key, -1)}
                            className="w-7 h-7 rounded-lg border border-[#22365C] bg-[#0A1424] hover:border-[#E3A73B] text-white font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
                          >
                            −
                          </button>
                          <span className="font-mono font-bold text-sm text-[#F2F5FA] w-5 text-center">
                            {score ?? '—'}
                          </span>
                          <button
                            onClick={() => updateScore(key, 1)}
                            className="w-7 h-7 rounded-lg border border-[#22365C] bg-[#0A1424] hover:border-[#E3A73B] text-white font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PDI (Plano de Desenvolvimento Individual) Section */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-5 rounded-xl mt-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#4fb579]" />
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                PDI • Plano de Desenvolvimento Individual
              </h3>
              <p className="text-[11px] text-[#A9B7CE]">Metas e compromissos alinhados para o próximo ciclo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="bg-[#14294A] hover:bg-[#1c3966] text-[#4fb579] font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-[#4fb579]/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Meta
          </button>
        </div>

        {showAddGoal && (
          <form onSubmit={handleAddGoal} className="bg-[#14294A] p-3 rounded-xl border border-[#22365C] mb-4 space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Ex: Realizar certificação IXC Avançado e reduzir tempo de resposta"
                  maxLength={200}
                  className="w-full bg-[#0F1E38] border border-[#22365C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4fb579]"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newGoalDeadline}
                  onChange={(e) => setNewGoalDeadline(e.target.value)}
                  placeholder="Prazo (Ex: 30 dias)"
                  maxLength={100}
                  className="w-full bg-[#0F1E38] border border-[#22365C] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4fb579]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="px-3 py-1 rounded-lg text-xs text-[#A9B7CE] bg-[#0F1E38]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs font-bold text-[#062412] bg-[#4fb579] hover:bg-[#5fc78a]"
              >
                Salvar Meta
              </button>
            </div>
          </form>
        )}

        {/* Goals list */}
        {pdiGoals.length === 0 ? (
          <div className="text-xs text-[#6C7C99] py-3 text-center bg-[#0A1424] rounded-xl border border-[#22365C]/50">
            Nenhuma meta de PDI cadastrada ainda para este colaborador.
          </div>
        ) : (
          <div className="space-y-2">
            {pdiGoals.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0A1424] border border-[#22365C] text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleGoalStatus(g.id)}
                    className="cursor-pointer text-[#6C7C99] hover:text-[#4fb579] transition-colors"
                  >
                    {g.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#4fb579]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#E3A73B]" />
                    )}
                  </button>
                  <span
                    className={`truncate ${
                      g.status === 'completed' ? 'line-through text-[#6C7C99]' : 'text-[#F2F5FA] font-medium'
                    }`}
                  >
                    {g.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-[#A9B7CE] bg-[#14294A] px-2 py-0.5 rounded border border-[#22365C]">
                    {g.deadline}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(g.id)}
                    className="text-[#6C7C99] hover:text-[#e2687a] p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leader Comments Box */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-4 rounded-xl mt-6 space-y-2 shadow-xl">
        <label className="text-xs font-mono font-bold text-[#E3A73B] uppercase tracking-wider block">
          Comentários e Parecer da Liderança
        </label>
        <textarea
          value={leaderComments}
          onChange={(e) => {
            setIsDirty(true);
            setLeaderComments(e.target.value);
          }}
          maxLength={5000}
          rows={3}
          placeholder="Insira as principais considerações do feedback..."
          className="w-full bg-[#0A1424] border border-[#22365C] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#E3A73B] resize-none"
        />
      </div>

      {/* Sticky Bottom Total Bar */}
      <div className="sticky bottom-4 mt-6 bg-[#0F1E38]/95 backdrop-blur-md border border-[#22365C] rounded-xl p-4 px-6 flex items-center justify-between shadow-2xl z-30">
        <div>
          <div className="text-[11px] font-mono text-[#6C7C99]">Pontuação Final ({cycle})</div>
          <div className="font-mono font-bold text-2xl text-[#E3A73B]">
            {grandTotal} <span className="text-xs text-[#6C7C99] font-normal">/ 155</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isLoadingEvaluation || !hasAllScores || !leaderComments.trim()}
          className="bg-[#E3A73B] hover:bg-[#eeb64f] text-[#1a1200] font-bold font-sans text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Avaliação
        </button>
      </div>
    </div>
  );
};
