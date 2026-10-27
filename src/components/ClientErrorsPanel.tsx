import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { listOpenClientErrors, resolveClientError } from '../lib/backend';
import type { ClientErrorItem } from '../lib/backend';

interface ClientErrorsPanelProps {
  /** Avisa quem mostra a contagem (o menu) que a lista mudou. */
  onChange: () => void;
}

const SOURCE_LABEL: Record<ClientErrorItem['source'], string> = {
  window: 'Erro na tela',
  promise: 'Falha em segundo plano',
  boundary: 'Tela quebrou',
  save: 'Falha ao salvar',
};

/** Erros que aconteceram no navegador de quem usa o sistema, para o admin acompanhar. */
export const ClientErrorsPanel: React.FC<ClientErrorsPanelProps> = ({ onChange }) => {
  const [items, setItems] = useState<ClientErrorItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const load = useCallback(() => {
    listOpenClientErrors(50)
      .then((list) => {
        setItems(list);
        setLoadError(null);
      })
      .catch(() => setLoadError('Não foi possível carregar os erros do sistema.'));
  }, []);

  useEffect(load, [load]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveClientError(id);
      setItems((current) => (current ?? []).filter((item) => item.id !== id));
      onChange();
    } catch {
      setLoadError('Não foi possível marcar como resolvido. Tente de novo.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <section className="bg-surface rounded-3xl p-5 mb-6 space-y-3" aria-labelledby="client-errors-title">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-danger" aria-hidden="true" />
        <h2 id="client-errors-title" className="font-display text-lg font-semibold text-ink">Erros do sistema</h2>
      </div>
      <p className="text-xs text-muted">
        Problemas que apareceram no navegador de quem usa o sistema. A mesma mensagem não se repete no mesmo minuto.
      </p>

      {loadError && <p className="text-xs text-danger" role="alert">{loadError}</p>}
      {items === null && !loadError && <p className="text-xs text-muted" role="status">Carregando...</p>}

      {items !== null && items.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-success" role="status">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Nenhum erro aberto.
        </p>
      )}

      <ul className="space-y-3">
        {(items ?? []).map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-app p-3 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
              <span>
                {new Date(item.createdAt).toLocaleString('pt-BR')} · {SOURCE_LABEL[item.source]} · {item.userName}
              </span>
              <button
                type="button"
                disabled={resolvingId === item.id}
                onClick={() => handleResolve(item.id)}
                className="rounded-brand bg-surface-2 border border-line px-3 py-1 text-[11px] font-semibold text-ink hover:border-accent disabled:opacity-50 cursor-pointer"
              >
                Marcar como resolvido
              </button>
            </div>
            <p className="text-sm font-semibold text-ink break-words">{item.message}</p>
            {item.url && <p className="text-[11px] text-faint break-all">{item.url}</p>}
            {item.stack && (
              <details className="text-[11px] text-muted">
                <summary className="cursor-pointer">Detalhes técnicos</summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words">{item.stack}</pre>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
