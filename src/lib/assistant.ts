export interface AssistantChart {
  type: 'barras' | 'linha';
  title: string;
  labels: string[];
  values: number[];
  unit: string;
}

export interface AssistantReply {
  text: string;
  chart: AssistantChart | null;
}

export interface ChatMessage extends AssistantReply {
  id: string;
  role: 'user' | 'assistant';
}

const MAX_HISTORY = 6;

/** Valida a resposta da função. Gráfico malformado é descartado; o texto basta. */
export function parseAssistantResponse(data: unknown): AssistantReply {
  if (typeof data !== 'object' || data === null) throw new Error('Resposta inválida do assistente.');
  const { text, chart } = data as { text?: unknown; chart?: unknown };
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
  return { text: text.trim(), chart: parsedChart };
}

/** O que volta para a função: só o texto das últimas mensagens, sem gráficos. */
export function toHistory(messages: readonly ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.slice(-MAX_HISTORY).map((message) => ({ role: message.role, content: message.text }));
}
