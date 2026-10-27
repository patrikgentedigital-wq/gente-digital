import { maxScoreFor, validateCriteriaCategories, type CriteriaCategory } from '../criteria';
import { getSupabase } from './client';

export interface CriteriaSet {
  teamId: string;
  version: number;
  categories: CriteriaCategory[];
  maxScore: number;
}

interface CriteriaSetRow {
  team_id: string;
  version: number;
  categories: CriteriaCategory[];
  max_score: number;
}

/** Perguntas vigentes da equipe (a versão de maior número), ou null se ainda não há. */
export async function getCriteriaSet(teamId: string): Promise<CriteriaSet | null> {
  const { data, error } = await getSupabase()
    .from('criteria_sets')
    .select('team_id, version, categories, max_score')
    .eq('team_id', teamId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const row = data as CriteriaSetRow | null;
  return row ? { teamId: row.team_id, version: row.version, categories: row.categories, maxScore: row.max_score } : null;
}

function describeServerError(message: string): string {
  if (message.includes('sem_permissao')) return 'Você não tem permissão para editar as perguntas desta equipe.';
  if (message.includes('equipe_inexistente')) return 'Equipe não encontrada.';
  const invalid = /perguntas_invalidas: (.*)/.exec(message);
  if (invalid) return `As perguntas não passaram na validação: ${invalid[1]}.`;
  return message;
}

/** Valida no navegador e grava uma versão nova no servidor (que valida de novo e checa a permissão). */
export async function saveCriteriaSet(teamId: string, categories: CriteriaCategory[]): Promise<CriteriaSet> {
  const problems = validateCriteriaCategories(categories);
  if (problems.length > 0) throw new Error(problems.join(' '));

  const { data, error } = await getSupabase().rpc('save_criteria_set', { p_team_id: teamId, p_categories: categories });
  if (error) throw new Error(describeServerError(error.message));
  const saved = data as { team_id: string; version: number; max_score: number };
  return { teamId: saved.team_id, version: saved.version, categories, maxScore: saved.max_score ?? maxScoreFor(categories) };
}
