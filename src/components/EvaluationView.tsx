import React, { useState, useEffect, useRef } from 'react';
import { TeamMember, PdiGoal } from '../types';
import type { EvaluationPayload } from '../lib/firebaseLoader';
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
import { ConfirmModal } from './ConfirmModal';
import {
  getDefaultEvaluationCycle,
  getEvaluationCycles,
  hasCompleteCriteriaScores,
  isPdiGoalOverdue,
  normalizeCriteriaScores,
} from '../lib/evaluation';
import {
  clearDraft,
  isEmptyDraft,
  loadDraft,
  saveDraft,
} from '../lib/draftUtils';
import { Skeleton } from './Skeleton';

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
    pdiGoals?: PdiGoal[],
    expectedRevision?: number,
  ) => Promise<number>;
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
  const [cycle, setCycle] = useState<string>(() => getDefaultEvaluationCycle());
  const availableEvaluationCycles = getEvaluationCycles();
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
  const [newGoalDueDate, setNewGoalDueDate] = useState('');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [evaluationRevision, setEvaluationRevision] = useState(0);
  const [pendingDiscardAction, setPendingDiscardAction] = useState<(() => void) | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const restoredDraftKeys = useRef<Set<string>>(new Set());

  const runOrConfirmDiscard = (action: () => void) => {
    if (isDirty) {
      setPendingDiscardAction(() => action);
      return;
    }
    action();
  };

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
    setEvaluationRevision(0);
    setDraftSavedAt(null);

    onLoadEvaluation(memberId, cycle)
      .then((evaluation) => {
        if (!active) return;
        const key = `${memberId}::${cycle}`;
        if (!restoredDraftKeys.current.has(key)) {
          restoredDraftKeys.current.add(key);
          const draft = loadDraft(memberId, cycle);
          if (draft) {
            setScores(draft.scores);
            setLeaderComments(draft.leaderComments);
            setPdiGoals(draft.pdiGoals);
            setIsDirty(true);
            setDraftSavedAt(draft.updatedAt);
            toast.info('Rascunho local restaurado.');
            return;
          }
        }
        setScores(normalizeCriteriaScores(evaluation?.criteriaScores));
        setLeaderComments(evaluation?.comments || '');
        setPdiGoals(evaluation?.pdiGoals || memberPdiGoals || []);
        setEvaluationRevision(evaluation?.revision ?? 0);
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
  }, [cycle, memberId, onLoadEvaluation, reloadToken]);

  // Autosave draft (debounced) to localStorage whenever the form changes.
  useEffect(() => {
    if (isLoadingEvaluation) return;
    if (isEmptyDraft({ scores, leaderComments, pdiGoals })) return;

    const timer = window.setTimeout(() => {
      const saved = saveDraft(memberId, cycle, { scores, leaderComments, pdiGoals });
      if (saved) setDraftSavedAt(saved.updatedAt);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [scores, leaderComments, pdiGoals, cycle, memberId, isLoadingEvaluation]);

  const reloadEvaluation = () => {
    setReloadToken((token) => token + 1);
  };


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

  const sectionsProgress = [
    { id: 'eval-criterios', label: 'Critérios (1–6)', done: hasAllScores },
    { id: 'eval-pdi', label: 'PDI', done: pdiGoals.length > 0 },
    { id: 'eval-parecer', label: 'Parecer da liderança', done: leaderComments.trim().length > 0 },
  ];
  const completedSections = sectionsProgress.filter((section) => section.done).length;

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
    if (newGoalDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(newGoalDueDate)) {
      toast.error('Informe a data de vencimento no formato correto.');
      return;
    }

    const newGoal: PdiGoal = {
      id: `pdi_${crypto.randomUUID()}`,
      title: newGoalTitle.trim(),
      deadline: newGoalDeadline || 'Próximo Ciclo',
      status: 'pending',
      ...(newGoalDueDate ? { dueDate: newGoalDueDate } : {}),
    };

    setIsDirty(true);
    setPdiGoals((prev) => [...prev, newGoal]);
    setNewGoalTitle('');
    setNewGoalDeadline('');
    setNewGoalDueDate('');
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
      const savedRevision = await onSaveEvaluation(
        selectedMember.id,
        grandTotal,
        Object.fromEntries(scoreKeys.map((key) => [key, scores[key] as number])),
        leaderComments.trim(),
        cycle,
        pdiGoals,
        evaluationRevision,
      );
      setEvaluationRevision(savedRevision);
      setIsDirty(false);
      clearDraft(selectedMember.id, cycle);
      setDraftSavedAt(null);
      toast.success(
        `Avaliação de ${selectedMember.name} salva com sucesso! Pontuação: ${grandTotal}/155`,
        'Avaliação Concluída'
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'evaluation-conflict') {
        toast.info('Conflito detectado. Carregando a versão mais recente da avaliação...');
        reloadEvaluation();
        return;
      }
      // The parent reports persistence errors and keeps the draft in memory.
    }
  };

  return (
    <>
      <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      {/* Header Bar */}
      <div className="bg-surface border border-line p-6 rounded-2xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="font-mono text-xs text-accent uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Lançamento Oficial de Avaliação
          </div>
          <h2 className="font-display font-bold text-2xl text-white">Avaliação da Liderança & PDI</h2>
          <p className="text-xs text-muted mt-0.5">
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
            className="bg-surface-2 hover:bg-line border border-line text-accent font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Exportar Relatório PDF
          </button>
        </div>
      </div>

      {/* Selectors Bar: Filtro por Time, Colaborador & Ciclo */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-surface border border-line p-4 rounded-xl mb-6 shadow-lg">
        {/* Team Filter */}
        <div className="md:col-span-3">
          <label className="block text-xs font-mono font-semibold text-muted mb-2 uppercase flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-accent" />
            Filtrar Time
          </label>
          <select
            value={teamFilter}
            onChange={(e) => {
              const newFilter = e.target.value;
              runOrConfirmDiscard(() => {
                setTeamFilter(newFilter);
                const filtered = newFilter === 'all'
                  ? members
                  : members.filter((m) => m.team.toLowerCase() === newFilter.toLowerCase());
                if (filtered.length > 0 && !filtered.some((m) => m.id === selectedMember.id)) {
                  onSelectMember(filtered[0]);
                }
              });
            }}
            className="w-full bg-surface-2 border border-line text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-accent"
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
          <label className="block text-xs font-mono font-semibold text-muted mb-2 uppercase">
            Colaborador Avaliado
          </label>
          <div className="flex gap-2">
            <select
              value={selectedMember.id}
              onChange={(e) => {
                const m = members.find((x) => x.id === e.target.value);
                if (m) runOrConfirmDiscard(() => onSelectMember(m));
              }}
              className="flex-1 bg-surface-2 border border-line text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-accent"
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
                className="bg-surface-2 hover:border-accent text-xs font-bold text-ink border border-line px-3.5 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                title="Alterar foto do perfil"
              >
                <ImageIcon className="w-3.5 h-3.5 text-accent" />
              </button>
            )}
          </div>
        </div>

        {/* Cycle */}
        <div className="md:col-span-4">
          <label className="block text-xs font-mono font-semibold text-muted mb-2 uppercase">
            Ciclo de Avaliação
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <select
              value={cycle}
              onChange={(e) => {
                const nextCycle = e.target.value;
                runOrConfirmDiscard(() => setCycle(nextCycle));
              }}
              className="w-full bg-surface-2 border border-line text-white font-sans text-sm pl-9 pr-3 py-3 rounded-xl focus:outline-none focus:border-accent"
            >
              {availableEvaluationCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section Progress */}
      <div className="bg-surface border border-line p-4 rounded-xl mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-mono font-semibold text-muted uppercase flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-accent" />
            Progresso da Avaliação
          </span>
          <span className="font-mono text-xs text-faint">
            {completedSections} de {sectionsProgress.length} etapas
          </span>
        </div>
        <div className="flex gap-1.5">
          {sectionsProgress.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wide transition-colors cursor-pointer text-left truncate ${
                section.done
                  ? 'bg-success-soft border-success/40 text-success'
                  : 'bg-app border-line text-muted hover:border-accent/50'
              }`}
            >
              {section.done ? '✓ ' : '○ '}{section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Radar Chart Summary Section */}
      <div className="bg-surface border border-line p-5 rounded-2xl mb-6 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent" />
            <h3 className="font-display font-bold text-sm text-white">
              Teia de Competências da Liderança
            </h3>
          </div>
           <span className="font-mono text-xs text-muted">
             {isLoadingEvaluation ? 'Carregando avaliação...' : 'Aderência por Categoria (%)'}
           </span>
        </div>

        <div className="h-64 w-full">
          {isLoadingEvaluation ? (
            <div className="h-full w-full flex items-center justify-center" aria-busy="true">
              <Skeleton className="h-52 w-52 rounded-full" />
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Criteria Categories Cards */}
      <div id="eval-criterios" className="space-y-3 scroll-mt-4">
        {CRITERIA_CATEGORIES.map((cat) => {
          const isOpen = !!openCategories[cat.id];
          const catSum = getCategorySum(cat.id);
          const catMax = cat.items.length * 5;

          return (
            <div key={cat.id} className="bg-surface border border-line rounded-xl overflow-hidden transition-all shadow-md">
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-2/50 transition-colors"
              >
                <div className="font-display font-semibold text-sm text-ink flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-surface-2 text-accent font-mono text-xs flex items-center justify-center font-bold">
                    {cat.id}
                  </span>
                  {cat.name}
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-accent font-bold">
                    {catSum} / {catMax}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-faint" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-faint" />
                  )}
                </div>
              </div>

              {/* Items Body */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-line divide-y divide-line">
                  {cat.items.map((label, idx) => {
                    const key = `${cat.id}-${idx}`;
                    const score = scores[key];

                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 py-3">
                        <div className="text-xs text-muted leading-normal flex-1">
                          {label}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateScore(key, -1)}
                            className="w-7 h-7 rounded-lg border border-line bg-app hover:border-accent text-white font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
                          >
                            −
                          </button>
                          <span className="font-mono font-bold text-sm text-ink w-5 text-center">
                            {score ?? '—'}
                          </span>
                          <button
                            onClick={() => updateScore(key, 1)}
                            className="w-7 h-7 rounded-lg border border-line bg-app hover:border-accent text-white font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
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
      <div id="eval-pdi" className="bg-surface border border-line p-5 rounded-xl mt-6 shadow-xl scroll-mt-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-success" />
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                PDI • Plano de Desenvolvimento Individual
              </h3>
              <p className="text-[11px] text-muted">Metas e compromissos alinhados para o próximo ciclo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="bg-surface-2 hover:bg-primary-hover text-success font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-success/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Meta
          </button>
        </div>

        {showAddGoal && (
          <form onSubmit={handleAddGoal} className="bg-surface-2 p-3 rounded-xl border border-line mb-4 space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Ex: Realizar certificação IXC Avançado e reduzir tempo de resposta"
                  maxLength={200}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-success"
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
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-success"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={newGoalDueDate}
                  onChange={(e) => setNewGoalDueDate(e.target.value)}
                  title="Data de vencimento"
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-success"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="px-3 py-1 rounded-lg text-xs text-muted bg-surface"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs font-bold text-success-ink bg-success hover:bg-success-hover"
              >
                Salvar Meta
              </button>
            </div>
          </form>
        )}

        {/* Goals list */}
        {pdiGoals.length === 0 ? (
          <div className="text-xs text-faint py-3 text-center bg-app rounded-xl border border-line/50">
            Nenhuma meta de PDI cadastrada ainda para este colaborador.
          </div>
        ) : (
          <div className="space-y-2">
            {pdiGoals.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-3 rounded-xl bg-app border border-line text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleGoalStatus(g.id)}
                    className="cursor-pointer text-faint hover:text-success transition-colors"
                  >
                    {g.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <Clock className="w-4 h-4 text-accent" />
                    )}
                  </button>
                  <span
                    className={`truncate ${
                      g.status === 'completed' ? 'line-through text-faint' : 'text-ink font-medium'
                    }`}
                  >
                    {g.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isPdiGoalOverdue(g) && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-danger-ink bg-danger-soft border border-danger/40 px-2 py-0.5 rounded">
                      Vencida
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-muted bg-surface-2 px-2 py-0.5 rounded border border-line">
                    {g.deadline}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(g.id)}
                    className="text-faint hover:text-danger p-1 transition-colors cursor-pointer"
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
      <div id="eval-parecer" className="bg-surface border border-line p-4 rounded-xl mt-6 space-y-2 shadow-xl scroll-mt-4">
        <label className="text-xs font-mono font-bold text-accent uppercase tracking-wider block">
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
          className="w-full bg-app border border-line rounded-xl p-3 text-xs text-white focus:outline-none focus:border-accent resize-none"
        />
      </div>

      {/* Sticky Bottom Total Bar */}
      <div className="sticky bottom-4 mt-6 bg-surface/95 backdrop-blur-md border border-line rounded-xl p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xl z-30">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-mono text-faint">Pontuação Final ({cycle})</div>
            <div className="font-mono font-bold text-2xl text-accent">
              {grandTotal} <span className="text-xs text-faint font-normal">/ 155</span>
            </div>
          </div>
          {draftSavedAt && (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted bg-surface-2 border border-line rounded-lg px-2 py-1"
              title="Seus dados são salvos localmente a cada edição e restaurados se você sair sem salvar"
            >
              <Check className="w-3 h-3 text-success" />
              Rascunho salvo às {new Date(draftSavedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isLoadingEvaluation || !hasAllScores || !leaderComments.trim()}
          className="bg-accent hover:bg-accent-hover text-accent-ink font-bold font-sans text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Avaliação
        </button>
      </div>
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingDiscardAction)}
        title="Descartar alterações?"
        message="Você possui alterações não salvas nesta avaliação. Deseja descartá-las?"
        confirmLabel="Descartar"
        onClose={() => setPendingDiscardAction(null)}
        onConfirm={() => {
          const action = pendingDiscardAction;
          setPendingDiscardAction(null);
          setIsDirty(false);
          action?.();
        }}
      />
    </>
  );
};
