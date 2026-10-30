import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { requestEvaluationDraft } from '../lib/backend';
import { buildDraftRequest, type DraftGoal, type EvaluationDraft } from '../lib/aiDraft';
import type { CriteriaCategory } from '../lib/criteria';

interface AiDraftPanelProps {
  jobTitle: string;
  categories: readonly CriteriaCategory[];
  scores: Record<string, number | undefined>;
  onUseComment: (comment: string) => void;
  onAddGoals: (goals: DraftGoal[]) => void;
}

/** Pede à IA um rascunho de parecer e metas. Nada é aplicado sem o líder clicar. */
export const AiDraftPanel: React.FC<AiDraftPanelProps> = ({ jobTitle, categories, scores, onUseComment, onAddGoals }) => {
  const [draft, setDraft] = useState<EvaluationDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allScored = categories.length > 0 && categories.every((c) => c.items.every((item) => scores[item.id] !== undefined));

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      setDraft(await requestEvaluationDraft(buildDraftRequest({ jobTitle, categories, scores })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o rascunho agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRequest}
          disabled={!allScored || loading}
          title={allScored ? undefined : 'Preencha todas as notas para pedir o rascunho'}
          className="flex items-center gap-1.5 rounded-brand bg-surface-2 border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          {loading ? 'Gerando rascunho...' : 'Sugerir rascunho com IA'}
        </button>
        <span className="text-[11px] text-faint">Só as notas e o cargo são enviados, sem o nome da pessoa. Você revisa tudo.</span>
      </div>

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}

      {draft && (
        <div className="rounded-xl border border-line bg-app p-3 space-y-3">
          <p className="text-[11px] font-mono font-bold text-accent-text">Sugestão da IA (rascunho)</p>
          <p className="text-xs text-ink whitespace-pre-wrap">{draft.comment}</p>
          {draft.goals.length > 0 && (
            <ul className="list-disc pl-4 text-xs text-ink space-y-0.5">
              {draft.goals.map((goal) => (
                <li key={`${goal.title}-${goal.deadline}`}>
                  <span>{goal.title}</span> <span className="text-faint">({goal.deadline})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onUseComment(draft.comment)} className="rounded-brand bg-accent px-3 py-1 text-xs font-bold text-accent-ink cursor-pointer">
              Usar como parecer
            </button>
            {draft.goals.length > 0 && (
              <button type="button" onClick={() => onAddGoals(draft.goals)} className="rounded-brand bg-surface-2 border border-line px-3 py-1 text-xs font-semibold text-ink cursor-pointer">
                Adicionar metas ao PDI
              </button>
            )}
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-1 text-xs text-muted cursor-pointer">
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
