import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { askAssistant } from '../lib/backend';
import { toHistory, type AssistantChart, type ChatMessage } from '../lib/assistant';

const SUGGESTIONS = [
  'Qual equipe está melhor no último ciclo?',
  'Quais categorias de perguntas têm as piores notas?',
  'Quem teve queda de um ciclo para o outro?',
];

const MAX_QUESTION_LENGTH = 500;

const ChartBlock: React.FC<{ chart: AssistantChart }> = ({ chart }) => {
  const data = chart.labels.map((label, index) => ({ label, value: chart.values[index] }));
  const axis = { fontSize: 11, fill: 'var(--color-muted)' };
  return (
    <figure className="mt-3 rounded-2xl border border-line bg-app p-3">
      <figcaption className="mb-2 text-[11px] font-mono font-bold text-accent-text">{chart.title}</figcaption>
      <div className="h-56 w-full" role="img" aria-label={chart.title}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'linha' ? (
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
              <XAxis dataKey="label" tick={axis} />
              <YAxis tick={axis} unit={chart.unit} />
              <Tooltip formatter={(value) => `${value}${chart.unit}`} />
              <Line type="monotone" dataKey="value" stroke="var(--color-ink)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
              <XAxis dataKey="label" tick={axis} />
              <YAxis tick={axis} unit={chart.unit} />
              <Tooltip formatter={(value) => `${value}${chart.unit}`} />
              <Bar dataKey="value" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth={1} radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
};

/** Chat do admin com os dados do quadro. A IA consulta o servidor; aqui só se mostra a conversa. */
export const AssistantView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, loading]);

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', text, chart: null }];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const reply = await askAssistant(toHistory(next));
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', ...reply }]);
    } catch (e) {
      // A pergunta que falhou volta ao campo (e sai da conversa) para ser reenviada sem digitar de novo.
      setMessages(messages);
      setInput(text);
      setError(e instanceof Error ? e.message : 'Não foi possível consultar o assistente agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-[760px] mx-auto px-6 pb-16 space-y-4" aria-label="Assistente de dados">
      <p className="flex items-start gap-2 text-xs text-muted">
        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Pergunte sobre equipes, categorias e evolução. A IA lê só dados já avaliados e não recebe nomes: eles ficam no servidor
          e voltam apenas na resposta. Confira números importantes antes de decidir.
        </span>
      </p>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="rounded-brand bg-surface border border-line px-3 py-2 text-left text-xs font-medium text-ink hover:border-accent cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-3" aria-live="polite">
        {messages.map((message) => (
          <li key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                message.role === 'user' ? 'bg-accent text-accent-ink font-medium' : 'bg-surface text-ink border border-line'
              }`}
            >
              {message.text}
              {message.chart && <ChartBlock chart={message.chart} />}
            </div>
          </li>
        ))}
        {loading && (
          <li className="text-xs text-muted" role="status">Consultando os dados...</li>
        )}
      </ul>

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      <div ref={endRef} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="sticky bottom-4 flex items-end gap-2 rounded-2xl border border-line bg-surface/95 p-2 backdrop-blur-md"
      >
        <textarea
          aria-label="Pergunte sobre os dados"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          maxLength={MAX_QUESTION_LENGTH}
          rows={1}
          placeholder="Ex.: qual equipe piorou mais em relação ao ciclo anterior?"
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 rounded-brand bg-accent px-4 py-2 text-xs font-bold text-accent-ink disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          Perguntar
        </button>
      </form>
    </section>
  );
};
