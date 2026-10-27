import type { EvaluationAuditLog, TeamMember, TeamStructure } from '../../types';
import { getSupabase } from './client';
import {
  rowToAuditLog,
  rowToTeam,
  rowToTeamMember,
  type AuditRow,
  type MemberRow,
  type TeamRow,
} from './mappers';

const ARCHIVED_COLUMNS =
  'id, name, job_title, team_id, avatar_url, email, evaluation_status, score, max_score, status, current_rating, history, pdi_goals, deleted_at, teams(color)';

async function fetchRankedMembers(): Promise<TeamMember[]> {
  const { data, error } = await getSupabase().from('members_ranked').select('*').order('rank');
  if (error) throw error;
  return (data as MemberRow[]).map(rowToTeamMember);
}

/** Lista os membros ativos já ordenados por percentual e recarrega quando algo muda (Realtime). */
export function subscribeToMembers(
  onData: (members: TeamMember[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const supabase = getSupabase();
  let disposed = false;
  const load = () =>
    fetchRankedMembers()
      .then((members) => {
        if (!disposed) onData(members);
      })
      .catch((error) => {
        if (!disposed) onError?.(error);
      });

  void load();
  const channel = supabase
    .channel(`members-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => void load())
    .subscribe();

  return () => {
    disposed = true;
    void supabase.removeChannel(channel);
  };
}

export async function addMemberToFirestore(newMember: TeamMember): Promise<void> {
  const { error } = await getSupabase().from('members').insert({
    id: newMember.id,
    name: newMember.name,
    job_title: newMember.role,
    team_id: newMember.team,
    avatar_url: newMember.avatarUrl,
    email: newMember.email,
  });
  if (error) throw error;
}

export async function updateMemberInFirestore(updatedMember: TeamMember): Promise<void> {
  const { data, error } = await getSupabase()
    .from('members')
    .update({
      name: updatedMember.name,
      job_title: updatedMember.role,
      team_id: updatedMember.team,
      avatar_url: updatedMember.avatarUrl,
      email: updatedMember.email,
    })
    .eq('id', updatedMember.id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Não foi possível salvar: o membro não existe ou você não tem permissão.');
  }
}

export async function deleteMemberFromFirestore(memberId: string): Promise<void> {
  const { error } = await getSupabase().rpc('archive_member', { p_member_id: memberId });
  if (error) throw error;
}

export async function restoreMemberFromFirestore(memberId: string): Promise<void> {
  const { error } = await getSupabase().rpc('restore_member', { p_member_id: memberId });
  if (error) throw error;
}

export async function getArchivedMembersFromFirestore(): Promise<TeamMember[]> {
  const { data, error } = await getSupabase()
    .from('members')
    .select(ARCHIVED_COLUMNS)
    .not('deleted_at', 'is', null);
  if (error) throw error;
  return (data as unknown as MemberRow[]).map(rowToTeamMember);
}

export async function listTeams(): Promise<TeamStructure[]> {
  const { data, error } = await getSupabase()
    .from('teams')
    .select('id, name, color, active')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return (data as TeamRow[]).map(rowToTeam);
}

async function fetchAuditLogs(maxResults: number): Promise<EvaluationAuditLog[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'evaluation_saved')
    .order('created_at', { ascending: false })
    .limit(maxResults);
  if (error) throw error;
  const rows = data as AuditRow[];

  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const actorNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const profiles = await supabase.from('profiles').select('user_id, name').in('user_id', actorIds);
    if (profiles.error) throw profiles.error;
    for (const profile of profiles.data as Array<{ user_id: string; name: string }>) {
      actorNames[profile.user_id] = profile.name;
    }
  }
  return rows.map((row) => rowToAuditLog(row, actorNames));
}

export function subscribeToAuditLogs(
  onData: (logs: EvaluationAuditLog[]) => void,
  onError?: (error: unknown) => void,
  maxResults = 200,
): () => void {
  const supabase = getSupabase();
  let disposed = false;
  const load = () =>
    fetchAuditLogs(maxResults)
      .then((logs) => {
        if (!disposed) onData(logs);
      })
      .catch((error) => {
        if (!disposed) onError?.(error);
      });

  void load();
  const channel = supabase
    .channel(`audit-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => void load())
    .subscribe();

  return () => {
    disposed = true;
    void supabase.removeChannel(channel);
  };
}
