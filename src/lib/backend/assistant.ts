import { parseAssistantResponse, type AssistantReply } from '../assistant';
import { getSupabase } from './client';

const ERROR_MESSAGES: Record<string, string> = {
  ia_nao_configurada: 'A IA ainda não foi configurada no servidor.',
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
  sem_permissao: 'Só o administrador pode usar o assistente.',
  dados_indisponiveis: 'Não foi possível ler os dados agora. Tente de novo.',
  ia_indisponivel: 'A IA está indisponível agora. Tente de novo em instantes.',
  ia_sem_resposta: 'O assistente não conseguiu responder. Tente reformular a pergunta.',
};

/** Envia a conversa (só texto) para a função do servidor e devolve a resposta com gráfico opcional. */
export async function askAssistant(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<AssistantReply> {
  const { data, error } = await getSupabase().functions.invoke('assistente-admin', { body: { messages } });
  if (error) {
    const response = (error as { context?: Response }).context;
    const code = response ? await response.json().then((body: { error?: string }) => body.error).catch(() => undefined) : undefined;
    throw new Error((code && ERROR_MESSAGES[code]) || 'Não foi possível consultar o assistente agora.');
  }
  return parseAssistantResponse(data);
}
