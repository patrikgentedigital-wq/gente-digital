export interface AssistantChart {
  type: 'barras' | 'linha';
  title: string;
  labels: string[];
  values: number[];
  unit: string;
}

export type AssistantActionType = 'arquivar_membro' | 'restaurar_membro' | 'mover_membro' | 'resolver_erro';

/** Ação que a IA propôs. Só vira realidade quando o admin confirma na tela; o resumo é escrito pelo servidor. */
export interface AssistantAction {
  type: AssistantActionType;
  memberId?: string;
  teamId?: string;
  errorId?: number;
  summary: string;
}

export interface AssistantReply {
  text: string;
  chart: AssistantChart | null;
  actions: AssistantAction[];
}

export interface ChatMessage extends AssistantReply {
  id: string;
  role: 'user' | 'assistant';
}

const MAX_HISTORY = 6;

/** Valida a resposta da função. Gráfico malformado é descartado; o texto basta. */
export function parseAssistantResponse(data: unknown): AssistantReply {
  if (typeof data !== 'object' || data === null) throw new Error('Resposta inválida do assistente.');
  const { text, chart, actions } = data as { text?: unknown; chart?: unknown; actions?: unknown };
  if (typeof text !== 'string' || !text.trim()) throw new Error('O assistente não devolveu resposta.');

  let parsedChart: AssistantChart | null = null;
  if (typeof chart === 'object' && chart !== null) {
    const { type, title, labels, values, unit } = chart as Record<string, unknown>;
    if (
      (type === 'barras' || type === 'linha') &&
      typeof title === 'string' &&
      Array.isArray(labels) && labels.every((label) => typeof label === 'string') &&
      Array.isArray(values) && values.every((value) => typeof value === 'number') &&
      labels.length === values.length && labels.length > 0
    ) {
      parsedChart = { type, title, labels, values, unit: typeof unit === 'string' ? unit : '' };
    }
  }
  return { text: text.trim(), chart: parsedChart, actions: parseActions(actions) };
}

const ACTION_TYPES: AssistantActionType[] = ['arquivar_membro', 'restaurar_membro', 'mover_membro', 'resolver_erro'];

function parseActions(value: unknown): AssistantAction[] {
  if (!Array.isArray(value)) return [];
  const actions: AssistantAction[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const { type, memberId, teamId, errorId, summary } = item as Record<string, unknown>;
    if (typeof type !== 'string' || !ACTION_TYPES.includes(type as AssistantActionType)) continue;
    if (typeof summary !== 'string' || !summary.trim()) continue;
    const hasMember = typeof memberId === 'string' && memberId.length > 0;
    const hasTeam = typeof teamId === 'string' && teamId.length > 0;
    const hasError = typeof errorId === 'number' && Number.isInteger(errorId);
    if ((type === 'arquivar_membro' || type === 'restaurar_membro') && !hasMember) continue;
    if (type === 'mover_membro' && !(hasMember && hasTeam)) continue;
    if (type === 'resolver_erro' && !hasError) continue;
    actions.push({
      type: type as AssistantActionType,
      ...(hasMember ? { memberId: memberId as string } : {}),
      ...(hasTeam && type === 'mover_membro' ? { teamId: teamId as string } : {}),
      ...(hasError && type === 'resolver_erro' ? { errorId: errorId as number } : {}),
      summary: summary.trim(),
    });
  }
  return actions;
}

/** O que volta para a função: só o texto das últimas mensagens, sem gráficos. */
export function toHistory(messages: readonly ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.slice(-MAX_HISTORY).map((message) => ({ role: message.role, content: message.text }));
}
