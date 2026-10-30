import type { PdiGoal } from '../types';
import type { CriteriaCategory } from './criteria';

export const MAX_COMMENT_LENGTH = 5000;
const MAX_GOAL_TITLE = 200;
const MAX_GOAL_DEADLINE = 100;
const MAX_GOALS = 5;
const DEFAULT_DEADLINE = 'Próximo Ciclo';

/** O que vai para a IA: cargo, perguntas e notas. Sem nome, e-mail ou ids do colaborador. */
export interface DraftRequest {
  jobTitle: string;
  categories: Array<{ name: string; items: Array<{ text: string; score: number }> }>;
}

export interface DraftGoal {
  title: string;
  deadline: string;
}

export interface EvaluationDraft {
  comment: string;
  goals: DraftGoal[];
}

export function buildDraftRequest(input: {
  jobTitle: string;
  categories: readonly CriteriaCategory[];
  scores: Record<string, number | undefined>;
}): DraftRequest {
  return {
    jobTitle: input.jobTitle,
    categories: input.categories.map((category) => ({
      name: category.name,
      items: category.items.map((item) => {
        const score = input.scores[item.id];
        if (score === undefined) throw new Error('Preencha todas as notas antes de pedir o rascunho.');
        return { text: item.text, score };
      }),
    })),
  };
}

/** Valida a resposta da função: texto dentro dos limites do sistema e no máximo 5 metas. */
export function parseDraftResponse(data: unknown): EvaluationDraft {
  if (typeof data !== 'object' || data === null) throw new Error('Resposta inválida da IA.');
  const { comment, goals } = data as { comment?: unknown; goals?: unknown };
  if (typeof comment !== 'string' || !comment.trim()) throw new Error('A IA não devolveu um comentário.');

  const parsedGoals: DraftGoal[] = [];
  if (Array.isArray(goals)) {
    for (const goal of goals) {
      if (typeof goal !== 'object' || goal === null) continue;
      const { title, deadline } = goal as { title?: unknown; deadline?: unknown };
      if (typeof title !== 'string' || !title.trim()) continue;
      const cleanDeadline = typeof deadline === 'string' && deadline.trim() ? deadline.trim() : DEFAULT_DEADLINE;
      parsedGoals.push({
        title: title.trim().slice(0, MAX_GOAL_TITLE),
        deadline: cleanDeadline.slice(0, MAX_GOAL_DEADLINE),
      });
      if (parsedGoals.length === MAX_GOALS) break;
    }
  }

  return { comment: comment.trim().slice(0, MAX_COMMENT_LENGTH), goals: parsedGoals };
}

export function goalsToPdi(goals: readonly DraftGoal[]): PdiGoal[] {
  return goals.map((goal) => ({
    id: `pdi_${crypto.randomUUID()}`,
    title: goal.title,
    deadline: goal.deadline,
    status: 'pending',
  }));
}
