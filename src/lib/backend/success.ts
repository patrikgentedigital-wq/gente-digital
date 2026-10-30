import { parseRatingRows, type RatingRow } from '../successDashboard';
import { getSupabase } from './client';

const ERROR_MESSAGES: Record<string, string> = {
  painel_nao_configurado: 'O painel ainda não foi configurado no servidor (falta o segredo N8N_PAINEL_TOKEN no Supabase).',
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
  sem_permissao: 'Só o administrador pode ver este painel.',
  fonte_indisponivel: 'Não foi possível ler as notas agora. Tente de novo em instantes.',
};

/** Notas da pesquisa pós-OS por técnico, vindas do n8n pela função do Supabase (só admin). */
export async function getTechnicianRatings(): Promise<RatingRow[]> {
  const { data, error } = await getSupabase().functions.invoke('sucesso-tecnicos', { body: {} });
  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response ? ((await response.json().catch(() => undefined)) as { error?: string } | undefined) : undefined;
    throw new Error((payload?.error && ERROR_MESSAGES[payload.error]) || 'Não foi possível carregar o painel agora.');
  }
  return parseRatingRows(data);
}
