import type { PdiGoal, PerformanceStatus, TeamMember } from '../../types';
import { getSupabase } from './client';

export interface EvaluationPayload {
  id: string;
  memberId: string;
  memberName: string;
  leaderName: string;
  score: number;
  status: PerformanceStatus;
  cycle: string;
  comments: string;
  pdiGoals: PdiGoal[];
  criteriaScores: Record<string, number>;
  revision?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** O que o servidor calculou ao salvar: nota, máximo e status vêm dele, não do navegador. */
export interface SavedEvaluation {
  revision: number;
  score: number;
  maxScore: number;
  status: PerformanceStatus;
}

export class EvaluationConflictError extends Error {
  constructor() {
    super('conflito_de_revisao');
    this.name = 'EvaluationConflictError';
  }
}

export class EvaluationCriteriaOutdatedError extends Error {
  constructor() {
    super('perguntas_desatualizadas');
    this.name = 'EvaluationCriteriaOutdatedError';
  }
}

export function isEvaluationConflictError(error: unknown): boolean {
  return error instanceof EvaluationConflictError;
}

export function isEvaluationCriteriaOutdatedError(error: unknown): boolean {
  return error instanceof EvaluationCriteriaOutdatedError;
}

const KNOWN_ERRORS: Array<[string, string]> = [
  ['perguntas_desatualizadas', 'As perguntas da equipe mudaram. Recarregue a avaliação.'],
  ['sem_permissao', 'Você não tem permissão para avaliar este membro.'],
  ['membro_indisponivel', 'Este membro não está disponível para avaliação.'],
  ['equipe_sem_perguntas', 'Esta equipe ainda não tem perguntas.'],
  ['nota_invalida', 'Há uma nota inválida. Use números inteiros de 0 a 5.'],
  ['ciclo_invalido', 'O ciclo da avaliação é inválido.'],
  ['metas_invalidas', 'As metas de desenvolvimento são inválidas.'],
];

/** Mensagem em português para um erro conhecido do servidor; null quando não reconhecemos. */
export function describeEvaluationError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : '';
  return KNOWN_ERRORS.find(([code]) => message.includes(code))?.[1] ?? null;
}

interface EvaluationRow {
  id: string;
  member_id: string;
  cycle: string;
  scores: Record<string, number>;
  score: number;
  status: PerformanceStatus;
  comments: string;
  pdi_goals: PdiGoal[];
  leader_id: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
  members?: { name: string } | null;
}

export async function getEvaluationFromFirestore(evaluationId: string): Promise<EvaluationPayload | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('evaluations')
    .select('id, member_id, cycle, scores, score, status, comments, pdi_goals, leader_id, revision, created_at, updated_at, members(name)')
    .eq('id', evaluationId)
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as EvaluationRow | null;
  if (!row) return null;

  // O nome do líder é só informativo: quem não puder ler o perfil recebe o campo vazio.
  let leaderName = '';
  if (row.leader_id) {
    const profile = await supabase.from('profiles').select('name').eq('user_id', row.leader_id).maybeSingle();
    leaderName = (profile.data as { name?: string } | null)?.name ?? '';
  }

  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.members?.name ?? '',
    leaderName,
    score: row.score,
    status: row.status,
    cycle: row.cycle,
    comments: row.comments,
    pdiGoals: Array.isArray(row.pdi_goals) ? row.pdi_goals : [],
    criteriaScores: row.scores,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveEvaluationAndMemberInFirestore({
  member,
  evaluation,
  expectedRevision = 0,
}: {
  member: TeamMember;
  evaluation: Pick<EvaluationPayload, 'cycle' | 'comments' | 'pdiGoals' | 'criteriaScores'>;
  expectedRevision?: number;
}): Promise<SavedEvaluation> {
  const { data, error } = await getSupabase().rpc('save_evaluation', {
    p_member_id: member.id,
    p_cycle: evaluation.cycle,
    p_scores: evaluation.criteriaScores,
    p_comments: evaluation.comments,
    p_pdi_goals: evaluation.pdiGoals ?? [],
    p_expected_revision: expectedRevision,
  });
  if (error) {
    if (error.message.includes('conflito_de_revisao')) throw new EvaluationConflictError();
    if (error.message.includes('perguntas_desatualizadas')) throw new EvaluationCriteriaOutdatedError();
    throw new Error(error.message);
  }
  const saved = data as { revision: number; score: number; max_score: number; status: PerformanceStatus };
  return { revision: saved.revision, score: saved.score, maxScore: saved.max_score, status: saved.status };
}
