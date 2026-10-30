import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getTechnicianRatings } from '../lib/backend';
import { LOW_RATING_BELOW, summarize, type RatingRow, type SuccessSummary } from '../lib/successDashboard';

const formatNumber = (value: number | null, suffix = '') =>
  value === null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${suffix}`;

const formatDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

const Kpi: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-surface p-4">
    <p className="text-[11px] font-mono text-faint">{label}</p>
    <p className="mt-1 font-display text-3xl font-semibold text-ink">{value}</p>
  </div>
);

/** Aba "Sucesso do Cliente": nota da pesquisa pós-OS por técnico. Só admin. */
export const SuccessView: React.FC = () => {
  const [rows, setRows] = useState<RatingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getTechnicianRatings()
      .then((list) => {
        setRows(list);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar o painel agora.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const summary: SuccessSummary | null = rows ? summarize(rows) : null;
  const chartData = (summary?.tecnicos ?? []).filter((t) => t.media !== null).map((t) => ({ nome: t.nome, media: t.media }));
  const axis = { fontSize: 11, fill: 'var(--color-muted)' };

  return (
    <section className="max-w-[1040px] mx-auto px-6 pb-16 space-y-6" aria-label="Sucesso do Cliente">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted max-w-[60ch]">
          Nota que o cliente dá na pesquisa depois da ordem de serviço, por técnico. Vale só para pesquisas enviadas a partir de
          30/10/2026. Nota abaixo de {LOW_RATING_BELOW} conta como baixa.
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-brand bg-surface border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      {rows === null && !error && <p className="text-xs text-muted" role="status">Carregando...</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Pesquisas enviadas" value={String(summary.totals.enviadas)} />
            <Kpi label="Respondidas" value={String(summary.totals.respondidas)} />
            <Kpi label="Taxa de resposta" value={formatNumber(summary.totals.taxaResposta, '%')} />
            <Kpi label="Nota média" value={formatNumber(summary.totals.media)} />
          </div>

          {summary.totals.respondidas === 0 && (
            <p className="rounded-2xl bg-surface p-4 text-sm text-muted" role="status">
              Ainda não há notas respondidas. {summary.totals.aguardando} aguardando resposta, {summary.totals.semResposta} sem resposta
              {summary.totals.naoEntendidas > 0 ? `, ${summary.totals.naoEntendidas} com resposta que não pareceu nota` : ''}. As
              notas aparecem aqui assim que os clientes responderem.
            </p>
          )}

          {summary.tecnicos.length > 0 && (
            <div className="rounded-2xl bg-surface p-4 overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="sr-only">Notas por técnico</caption>
                <thead>
                  <tr className="text-left text-faint font-mono">
                    <th className="py-2 pr-4 font-normal">Técnico</th>
                    <th className="py-2 pr-4 font-normal">Enviadas</th>
                    <th className="py-2 pr-4 font-normal">Respondidas</th>
                    <th className="py-2 pr-4 font-normal">Nota média</th>
                    <th className="py-2 font-normal">Notas baixas</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.tecnicos.map((t) => (
                    <tr key={t.idTecnico} className="border-t border-line-soft text-ink">
                      <td className="py-2 pr-4 font-semibold">{t.nome}</td>
                      <td className="py-2 pr-4">{t.enviadas}</td>
                      <td className="py-2 pr-4">{t.respondidas}</td>
                      <td className="py-2 pr-4">{formatNumber(t.media)}</td>
                      <td className="py-2">{t.pctBaixas === null ? '—' : `${t.baixas} (${t.pctBaixas}%)`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {chartData.length > 0 && (
            <figure className="rounded-2xl bg-surface p-4">
              <figcaption className="mb-2 text-[11px] font-mono font-bold text-accent-text">Nota média por técnico</figcaption>
              <div className="h-60 w-full" role="img" aria-label="Nota média por técnico">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                    <XAxis dataKey="nome" tick={axis} />
                    <YAxis domain={[0, 5]} tick={axis} />
                    <Tooltip />
                    <Bar dataKey="media" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth={1} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </figure>
          )}

          {summary.baixas.length > 0 && (
            <div className="rounded-2xl bg-surface p-4 space-y-2">
              <h2 className="text-sm font-semibold text-ink">Notas baixas recentes</h2>
              <ul className="space-y-1.5 text-xs text-ink">
                {summary.baixas.map((b) => (
                  <li key={b.idOs} className="flex flex-wrap items-center gap-x-3">
                    <span className="font-mono font-bold text-danger">{b.nota}</span>
                    <span>OS {b.idOs}</span>
                    <span className="text-muted">{b.tecnico}</span>
                    <span className="text-faint">{formatDate(b.respondidaEm)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};
