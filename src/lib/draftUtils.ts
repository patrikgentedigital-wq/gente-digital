import type { PdiGoal } from '../types';

export const DRAFT_VERSION = 1;

export interface EvaluationDraft {
  version: typeof DRAFT_VERSION;
  memberId: string;
  cycle: string;
  scores: Record<string, number | undefined>;
  leaderComments: string;
  pdiGoals: PdiGoal[];
  updatedAt: string;
}

export type EvaluationDraftInput = Omit<EvaluationDraft, 'version' | 'memberId' | 'cycle' | 'updatedAt'>;

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

export function loadDraft(memberId: string, cycle: string): EvaluationDraft | null {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(draftKey(memberId, cycle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EvaluationDraft>;
    if (
      parsed.version !== DRAFT_VERSION ||
      parsed.memberId !== memberId ||
      parsed.cycle !== cycle ||
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