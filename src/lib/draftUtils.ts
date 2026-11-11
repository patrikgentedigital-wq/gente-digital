import type { PdiGoal } from '../types';

/** 2: o rascunho passou a guardar de quais perguntas ele é; os da versão 1 são descartados. */
export const DRAFT_VERSION = 2;

export interface EvaluationDraft {
  version: typeof DRAFT_VERSION;
  memberId: string;
  cycle: string;
  scores: Record<string, number | undefined>;
  leaderComments: string;
  pdiGoals: PdiGoal[];
  /** Identifica as perguntas usadas (criteriaFingerprint); vazio quando não se sabe. */
  criteriaKey: string;
  updatedAt: string;
}

export type EvaluationDraftInput = Omit<EvaluationDraft, 'version' | 'memberId' | 'cycle' | 'updatedAt' | 'criteriaKey'> & {
  criteriaKey?: string;
};

const KEY_PREFIX = 'gd-evaluation-draft:';

export function draftKey(memberId: string, cycle: string): string {
  return `${KEY_PREFIX}${memberId}::${cycle}`;
}

export function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Devolve o rascunho só se ele foi feito com as mesmas perguntas (`criteriaKey`). */
export function loadDraft(memberId: string, cycle: string, criteriaKey = ''): EvaluationDraft | null {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(draftKey(memberId, cycle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EvaluationDraft>;
    if (
      parsed.version !== DRAFT_VERSION ||
      parsed.memberId !== memberId ||
      parsed.cycle !== cycle ||
      parsed.criteriaKey !== criteriaKey ||
      typeof parsed.scores !== 'object' ||
      parsed.scores === null ||
      typeof parsed.leaderComments !== 'string' ||
      !Array.isArray(parsed.pdiGoals) ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return null;
    }
    return parsed as EvaluationDraft;
  } catch {
    return null;
  }
}

/**
 * Apaga o rascunho guardado deste membro e ciclo quando ele não vale mais (feito com outras perguntas, de uma
 * versão antiga ou ilegível). Devolve true se apagou algo.
 */
export function discardStaleDraft(memberId: string, cycle: string, criteriaKey = ''): boolean {
  if (!hasLocalStorage()) return false;
  try {
    const raw = window.localStorage.getItem(draftKey(memberId, cycle));
    if (!raw) return false;
    if (loadDraft(memberId, cycle, criteriaKey)) return false;
    window.localStorage.removeItem(draftKey(memberId, cycle));
    return true;
  } catch {
    return false;
  }
}

export function saveDraft(
  memberId: string,
  cycle: string,
  input: EvaluationDraftInput,
): EvaluationDraft | null {
  if (!hasLocalStorage()) return null;
  const draft: EvaluationDraft = {
    version: DRAFT_VERSION,
    memberId,
    cycle,
    scores: input.scores,
    leaderComments: input.leaderComments,
    pdiGoals: input.pdiGoals,
    criteriaKey: input.criteriaKey ?? '',
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(draftKey(memberId, cycle), JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(memberId: string, cycle: string): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(draftKey(memberId, cycle));
  } catch {
    // ignore storage errors
  }
}

export function isEmptyDraft(input: EvaluationDraftInput): boolean {
  const hasAnyScore = Object.values(input.scores).some((value) => typeof value === 'number' && value > 0);
  return !hasAnyScore && !input.leaderComments.trim() && input.pdiGoals.length === 0;
}