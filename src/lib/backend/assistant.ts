import { parseAssistantResponse, type AssistantAction, type AssistantReply } from '../assistant';
import { getSupabase } from './client';

const ERROR_MESSAGES: Record<string, string> = {
  ia_nao_configurada: 'A IA ainda não foi configurada no servidor.',
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
  sem_permissao: 'Só o administrador pode usar o assistente.',
  dados_indisponiveis: 'Não foi possível ler os dados agora. Tente de novo.',
  ia_indisponivel: 'A IA está indisponível agora. Tente de novo em instantes.',
  ia_sem_resposta: 'O assistente não conseguiu responder. Tente reformular a pergunta.',
  acao_falhou: 'A ação não pôde ser concluída. Nada foi alterado; tente de novo.',
};

/** Envia a conversa (só texto) para a função do servidor e devolve a resposta com gráfico opcional. */
export async function askAssistant(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<AssistantReply> {
  return invoke({ messages });
}

/** O admin clicou em "Confirmar": o servidor revalida a ação com os dados de agora e a executa com o login dele. */
export async function confirmAssistantAction(action: AssistantAction): Promise<AssistantReply> {
  const { type, memberId, teamId, errorId } = action;
  return invoke({ confirm: { type, memberId, teamId, errorId } });
}

async function invoke(body: Record<string, unknown>): Promise<AssistantReply> {
  const { data, error } = await getSupabase().functions.invoke('assistente-admin', { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response ? await response.json().catch(() => undefined) as { error?: string; message?: string } | undefined : undefined;
    // A recusa de uma ação traz o motivo em português (ex.: "Este colaborador já está arquivado.").
    const message = payload?.error === 'acao_recusada' && payload.message ? payload.message : payload?.error ? ERROR_MESSAGES[payload.error] : undefined;
    throw new Error(message || 'Não foi possível consultar o assistente agora.');
  }
  return parseAssistantResponse(data);
}
