import { parseDraftResponse, type DraftRequest, type EvaluationDraft } from '../aiDraft';
import { getSupabase } from './client';

const ERROR_MESSAGES: Record<string, string> = {
  ia_nao_configurada: 'A IA ainda não foi configurada. Peça ao admin para cadastrar a chave.',
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
  sem_permissao: 'Sua conta não tem permissão para usar o rascunho.',
  ia_indisponivel: 'A IA está indisponível agora. Tente de novo em instantes.',
  ia_sem_resposta: 'A IA não conseguiu montar o rascunho. Tente de novo.',
};

/** Pede à função do servidor um rascunho de parecer e metas; lança Error com mensagem em português. */
export async function requestEvaluationDraft(request: DraftRequest): Promise<EvaluationDraft> {
  const { data, error } = await getSupabase().functions.invoke('rascunho-avaliacao', { body: request });
  if (error) {
    // Respostas de erro da função trazem { error: 'codigo' } no corpo.
    const response = (error as { context?: Response }).context;
    const code = response ? await response.json().then((body: { error?: string }) => body.error).catch(() => undefined) : undefined;
    throw new Error((code && ERROR_MESSAGES[code]) || 'Não foi possível gerar o rascunho agora.');
  }
  return parseDraftResponse(data);
}
