import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { getCurrentProfile, listTeams, saveCriteriaSet } from '../lib/backend';
import type { TeamStructure } from '../types';
import { useCriteriaSet } from '../hooks/useCriteriaSet';
import { maxScoreFor, validateCriteriaCategories, type CriteriaCategory } from '../lib/criteria';
import {
  addCategory,
  addItem,
  moveCategory,
  moveItem,
  removeCategory,
  removeItem,
  renameCategory,
  updateItemText,
} from '../lib/criteriaEditing';
import { toast } from '../utils/toastUtils';

interface CriteriaEditorViewProps {
  role: 'leader' | 'admin';
}

const inputClass =
  'w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent';
const iconButton =
  'p-1.5 rounded-lg border border-line bg-app text-muted hover:text-ink hover:border-accent disabled:opacity-40 cursor-pointer';

/** Aba Perguntas: o admin edita as perguntas de qualquer equipe; o líder, só as da própria. */
export const CriteriaEditorView: React.FC<CriteriaEditorViewProps> = ({ role }) => {
  const [teams, setTeams] = useState<TeamStructure[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(role === 'admin');
  const [draft, setDraft] = useState<CriteriaCategory[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { set, loading, error, reload } = useCriteriaSet(teamId);

  useEffect(() => {
    if (role === 'admin') {
      listTeams()
        .then(setTeams)
        .catch(() => setSaveError('Não foi possível carregar as equipes.'));
      return undefined;
    }
    let active = true;
    getCurrentProfile()
      .then((profile) => {
        if (!active) return;
        setTeamId(profile?.teamId ?? null);
        setProfileReady(true);
      })
      .catch(() => {
        if (active) setProfileReady(true);
      });
    return () => {
      active = false;
    };
  }, [role]);

  // Quando a equipe muda ou chega uma versão nova do servidor, o rascunho volta a refletir o que está salvo.
  useEffect(() => {
    setDraft(set?.categories ?? []);
    setErrors([]);
  }, [set]);

  const total = maxScoreFor(draft);
  const questionCount = draft.reduce((count, category) => count + category.items.length, 0);

  const edit = (next: CriteriaCategory[]) => {
    setDraft(next);
    setErrors([]);
    setSavedVersion(null);
  };

  const handleSave = async () => {
    if (!teamId) return;
    const problems = validateCriteriaCategories(draft);
    setErrors(problems);
    if (problems.length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveCriteriaSet(teamId, draft);
      setSavedVersion(saved.version);
      toast.success(`Perguntas salvas como versão ${saved.version}.`, 'Perguntas');
      reload();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'As perguntas não foram salvas.');
    } finally {
      setSaving(false);
    }
  };

  const teamName = teams.find((team) => team.leader === teamId)?.leader ?? teamId;

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans space-y-6">
      <header className="bg-surface p-6 rounded-3xl">
        <h2 className="font-display text-2xl font-semibold text-ink">Perguntas da avaliação</h2>
        <p className="mt-1 text-sm text-muted">
          Cada equipe tem as suas perguntas. A pontuação máxima é o número de perguntas vezes 5.
        </p>
      </header>

      {role === 'admin' && (
        <div className="bg-surface p-4 rounded-2xl">
          <label htmlFor="criteria-team" className="block text-xs font-semibold text-muted mb-1.5">Equipe</label>
          <select
            id="criteria-team"
            value={teamId ?? ''}
            onChange={(event) => {
              setTeamId(event.target.value || null);
              setSavedVersion(null);
              setSaveError(null);
            }}
            className={inputClass}
          >
            <option value="">Escolha uma equipe</option>
            {teams.map((team) => (
              <option key={team.leader} value={team.leader}>Time {team.leader}</option>
            ))}
          </select>
          {teams.length === 0 && (
            <p className="mt-2 text-xs text-muted">Nenhuma equipe cadastrada ainda.</p>
          )}
        </div>
      )}

      {role === 'leader' && profileReady && !teamId && (
        <div className="bg-surface p-6 rounded-2xl text-sm text-muted" role="status">
          Sua conta não está ligada a uma equipe. Peça ao admin para ligar a sua conta à equipe.
        </div>
      )}

      {teamId && loading && <p className="text-sm text-muted" role="status">Carregando perguntas...</p>}
      {teamId && error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {teamId && !loading && !error && (
        <>
          <div className="bg-surface p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-ink">
              <span className="font-semibold">Time {teamName}</span>
              <span className="text-muted"> · {questionCount} perguntas · máximo de {total} pontos</span>
            </div>
            <button
              type="button"
              onClick={() => edit(addCategory(draft, 'Nova categoria'))}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold bg-surface-2 border border-line text-ink hover:border-accent cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova categoria
            </button>
          </div>

          {draft.length === 0 && (
            <div className="bg-surface p-6 rounded-2xl text-sm text-muted" role="status">
              Esta equipe ainda não tem perguntas. Adicione uma categoria para começar.
            </div>
          )}

          <div className="space-y-4">
            {draft.map((category, catIndex) => (
              <section key={category.id} className="bg-surface p-4 rounded-2xl space-y-3" aria-label={`Categoria ${catIndex + 1}`}>
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`Nome da categoria ${catIndex + 1}`}
                    value={category.name}
                    onChange={(event) => edit(renameCategory(draft, catIndex, event.target.value))}
                    className={`${inputClass} font-semibold`}
                  />
                  <button type="button" aria-label="Mover categoria para cima" className={iconButton}
                    disabled={catIndex === 0} onClick={() => edit(moveCategory(draft, catIndex, -1))}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Mover categoria para baixo" className={iconButton}
                    disabled={catIndex === draft.length - 1} onClick={() => edit(moveCategory(draft, catIndex, 1))}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Remover categoria" className={iconButton}
                    onClick={() => edit(removeCategory(draft, catIndex))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <input
                        aria-label={`Pergunta ${catIndex + 1}.${itemIndex + 1}`}
                        value={item.text}
                        onChange={(event) => edit(updateItemText(draft, catIndex, itemIndex, event.target.value))}
                        className={inputClass}
                      />
                      <button type="button" aria-label="Mover pergunta para cima" className={iconButton}
                        disabled={itemIndex === 0} onClick={() => edit(moveItem(draft, catIndex, itemIndex, -1))}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" aria-label="Mover pergunta para baixo" className={iconButton}
                        disabled={itemIndex === category.items.length - 1}
                        onClick={() => edit(moveItem(draft, catIndex, itemIndex, 1))}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" aria-label="Remover pergunta" className={iconButton}
                        onClick={() => edit(removeItem(draft, catIndex, itemIndex))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => edit(addItem(draft, catIndex, ''))}
                  className="flex items-center gap-1.5 text-xs font-semibold text-accent-text hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar pergunta
                </button>
              </section>
            ))}
          </div>

          {errors.length > 0 && (
            <div className="bg-danger-soft border border-danger/40 text-danger-ink text-xs p-3 rounded-xl space-y-1" role="alert">
              {errors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
          {saveError && (
            <div className="bg-danger-soft border border-danger/40 text-danger-ink text-xs p-3 rounded-xl" role="alert">
              {saveError}
            </div>
          )}
          {savedVersion !== null && (
            <div className="bg-success-soft border border-success/40 text-success text-xs p-3 rounded-xl" role="status">
              Perguntas salvas como versão {savedVersion}. Avaliações já feitas mantêm as perguntas antigas.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar perguntas'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
