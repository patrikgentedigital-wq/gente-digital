import type { EvaluationAuditLog, PerformanceStatus, TeamMember, TeamStructure } from '../../types';

const NEUTRAL_TEAM_COLOR = '#86868b';
const STATUSES: readonly PerformanceStatus[] = ['Voando', 'Caminho Certo', 'Atenção', 'Alarme'];

export interface MemberRow {
  id: string;
  name: string;
  job_title: string;
  team_id: string;
  team_color?: string | null;
  teams?: { color: string } | null;
  avatar_url: string;
  email: string;
  evaluation_status: TeamMember['evaluationStatus'];
  score: number;
  max_score: number;
  status: PerformanceStatus;
  current_rating: number | null;
  history: unknown;
  pdi_goals: unknown;
  rank?: number | null;
  deleted_at?: string | null;
}

export interface TeamRow {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export interface AuditRow {
  id: number;
  action: string;
  evaluation_id: string | null;
  member_id: string | null;
  member_name: string | null;
  cycle: string | null;
  revision: number | null;
  score: number | null;
  max_score: number | null;
  status: string | null;
  previous_score: number | null;
  previous_status: string | null;
  actor_id: string | null;
  created_at: string;
}

function isStatus(value: unknown): value is PerformanceStatus {
  return STATUSES.includes(value as PerformanceStatus);
}

export function rowToTeamMember(row: MemberRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.job_title,
    team: row.team_id,
    teamColor: row.team_color ?? row.teams?.color ?? NEUTRAL_TEAM_COLOR,
    rank: Number(row.rank ?? 0),
    score: row.score,
    maxScore: row.max_score,
    status: row.status,
    avatarUrl: row.avatar_url,
    evaluationStatus: row.evaluation_status,
    email: row.email,
    currentRating: row.current_rating ?? undefined,
    history: Array.isArray(row.history) ? (row.history as TeamMember['history']) : [],
    pdiGoals: Array.isArray(row.pdi_goals) ? (row.pdi_goals as TeamMember['pdiGoals']) : [],
    evaluationHistory: [],
    deleted: Boolean(row.deleted_at),
  };
}

export function rowToTeam(row: TeamRow): TeamStructure {
  return { leader: row.id, color: row.color, members: [] };
}

export function rowToAuditLog(row: AuditRow, actorNames: Record<string, string>): EvaluationAuditLog {
  return {
    id: String(row.id),
    action: 'evaluation_saved',
    evaluationId: row.evaluation_id ?? '',
    memberId: row.member_id ?? '',
    memberName: row.member_name ?? '',
    cycle: row.cycle ?? '',
    revision: row.revision ?? 0,
    score: row.score ?? 0,
    status: isStatus(row.status) ? row.status : 'Atenção',
    previousScore: row.previous_score ?? undefined,
    previousStatus: isStatus(row.previous_status) ? row.previous_status : undefined,
    actorId: row.actor_id ?? '',
    actorEmail: '',
    actorName: (row.actor_id && actorNames[row.actor_id]) || '',
    createdAt: row.created_at,
  };
}
