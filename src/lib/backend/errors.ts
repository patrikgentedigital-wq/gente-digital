import type { ErrorReport, ErrorSource } from '../errorReporting';
import { getSupabase } from './client';

export interface ClientErrorItem {
  id: number;
  createdAt: string;
  userName: string;
  source: ErrorSource;
  message: string;
  stack: string;
  url: string;
  userAgent: string;
}

interface ClientErrorRow {
  id: number;
  created_at: string;
  user_id: string | null;
  source: ErrorSource;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
}

/** Envia um erro do navegador. O servidor ignora contas sem perfil e limita o volume por pessoa. */
export async function reportError(report: ErrorReport): Promise<void> {
  const { error } = await getSupabase().rpc('report_client_error', {
    p_source: report.source,
    p_message: report.message,
    p_stack: report.stack ?? null,
    p_url: report.url,
    p_user_agent: report.userAgent,
  });
  if (error) throw error;
}

/** Erros ainda não resolvidos, do mais novo para o mais antigo (só o admin consegue ler). */
export async function listOpenClientErrors(limit = 50): Promise<ClientErrorItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('client_errors')
    .select('id, created_at, user_id, source, message, stack, url, user_agent')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data as ClientErrorRow[];

  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];
  const names: Record<string, string> = {};
  if (userIds.length > 0) {
    const profiles = await supabase.from('profiles').select('user_id, name').in('user_id', userIds);
    if (profiles.error) throw profiles.error;
    for (const profile of profiles.data as Array<{ user_id: string; name: string }>) names[profile.user_id] = profile.name;
  }

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    userName: (row.user_id && names[row.user_id]) || 'Conta removida',
    source: row.source,
    message: row.message,
    stack: row.stack ?? '',
    url: row.url ?? '',
    userAgent: row.user_agent ?? '',
  }));
}

/** Quantos erros estão abertos; se a consulta falhar, devolve 0 para o menu não quebrar. */
export async function countOpenClientErrors(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('client_errors')
    .select('id', { count: 'exact', head: true })
    .is('resolved_at', null);
  return error ? 0 : (count ?? 0);
}

export async function resolveClientError(id: number): Promise<void> {
  const { error } = await getSupabase()
    .from('client_errors')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
