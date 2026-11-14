import React, { useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, Rocket } from 'lucide-react';
import type { CriteriaCategory } from '../lib/criteria';
import { MAX_SCORE_PER_ITEM } from '../lib/criteria';
import { buildLevelPlan, projectScore } from '../lib/levelPlan';
import { statusForScore } from '../lib/scoring';

interface LevelSimulatorProps {
  criteria: CriteriaCategory[];
  /** Notas da última avaliação, por id de pergunta. */
  scores: Record<string, number>;
}

const MAX_SUGGESTIONS = 6;

/** Mostra quanto falta para a próxima faixa e deixa mexer nas notas das perguntas que mais rendem para ver a faixa mudar. */
export const LevelSimulator: React.FC<LevelSimulatorProps> = ({ criteria, scores }) => {
  const plan = useMemo(() => buildLevelPlan(criteria, scores), [criteria, scores]);
  const [changes, setChanges] = useState<Record<string, number>>({});

  const projected = useMemo(() => projectScore(criteria, { ...scores, ...changes }), [criteria, scores, changes]);
  const projectedStatus = statusForScore(projected, plan.maxScore);
  const pathIds = new Set(plan.path.map((question) => question.id));
  const suggestions = plan.candidates.slice(0, MAX_SUGGESTIONS);
  const delta = projected - plan.score;
  const reached = plan.next !== null && projected >= plan.next.target;

  const setNote = (id: string, current: number, value: number) => {
    const clamped = Math.min(MAX_SCORE_PER_ITEM, Math.max(0, value));
    setChanges((previous) => {
      const next = { ...previous };
      if (clamped === current) delete next[id];
      else next[id] = clamped;
      return next;
    });
  };

  return (
    <div className="bg-app border border-line p-4.5 rounded-xl space-y-3" aria-label="Simulador de nota">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-bold text-accent-text flex items-center gap-1.5">
          <Rocket className="w-3.5 h-3.5" />
          Caminho para o próximo nível
        </span>
        {Object.keys(changes).length > 0 && (
          <button
            type="button"
            onClick={() => setChanges({})}
            className="text-[11px] font-bold text-muted hover:text-ink flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Limpar simulação
          </button>
        )}
      </div>

      {plan.next === null ? (
        <p className="text-xs text-muted">
          {plan.status === 'Voando'
            ? 'Já está na faixa mais alta (Voando). Nada a subir; o foco é manter.'
            : 'Não há como calcular a próxima faixa para este conjunto de perguntas.'}
        </p>
      ) : (
        <>
          <p className="text-xs text-ink">
            Faltam <strong>{plan.next.missing} {plan.next.missing === 1 ? 'ponto' : 'pontos'}</strong> para{' '}
            <strong>{plan.next.status}</strong> (a faixa começa em {plan.next.target} de {plan.maxScore}). As perguntas
            abaixo são as que mais rendem; as marcadas já bastam, juntas, para chegar lá.
          </p>

          <ul className="space-y-1.5">
            {suggestions.map((question) => {
              const value = changes[question.id] ?? question.current;
              return (
                <li key={question.id} className="flex items-center gap-3 border border-line-soft rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink">{question.text}</p>
                    <p className="text-[10px] text-faint">
                      {question.category} · nota atual {question.current}
                      {pathIds.has(question.id) && <span className="ml-1 font-bold text-accent-text">· no caminho mais curto</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label={`Diminuir nota de: ${question.text}`}
                      disabled={value <= 0}
                      onClick={() => setNote(question.id, question.current, value - 1)}
                      className="p-1 rounded-md border border-line disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-mono font-bold" aria-live="polite">{value}</span>
                    <button
                      type="button"
                      aria-label={`Aumentar nota de: ${question.text}`}
                      disabled={value >= MAX_SCORE_PER_ITEM}
                      onClick={() => setNote(question.id, question.current, value + 1)}
                      className="p-1 rounded-md border border-line disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2 text-xs" role="status">
            <span className="text-muted">
              Projeção: <strong className="text-ink font-mono">{projected} / {plan.maxScore}</strong>
              {delta !== 0 && <span className="ml-1 font-mono">({delta > 0 ? '+' : ''}{delta})</span>}
            </span>
            <span className={`font-bold ${reached ? 'text-success' : 'text-ink'}`}>
              {reached ? `Chegaria em ${projectedStatus}` : `Continuaria em ${projectedStatus}`}
            </span>
          </div>
          <p className="text-[10px] text-faint">Simulação só na tela: nada é salvo e a avaliação real não muda.</p>
        </>
      )}
    </div>
  );
};
