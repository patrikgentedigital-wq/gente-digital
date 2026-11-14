import { parseBriefingResponse, type BriefingAiPayload, type BriefingText } from '../briefing';
import { getSupabase } from './client';

const ERROR_MESSAGES: Record<string, string> = {
  ia_nao_configurada: 'A IA ainda não foi configurada. Peça ao admin para cadastrar a chave.',
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
  sem_permissao: 'Sua conta não tem permissão para gerar o briefing.',
  ia_indisponivel: 'A IA está indisponível agora. Tente de novo em instantes.',
  ia_sem_resposta: 'A IA não conseguiu montar o briefing. Tente de novo.',
  pedido_invalido: 'Não foi possível montar o pedido do briefing. Confira o ciclo e a equipe.',
  muitas_chamadas: 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.',
};

/** Pede à função do servidor o texto do briefing; lança Error com mensagem em português. */
export async function requestCycleBriefing(payload: BriefingAiPayload): Promise<BriefingText> {
  const { data, error } = await getSupabase().functions.invoke('briefing-ciclo', { body: payload });
  if (error) {
    const response = (error as { context?: Response }).context;
    const code = response ? await response.json().then((body: { error?: string }) => body.error).catch(() => undefined) : undefined;
    throw new Error((code && ERROR_MESSAGES[code]) || 'Não foi possível gerar o briefing agora.');
  }
  return parseBriefingResponse(data);
}
