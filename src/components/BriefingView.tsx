import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import type { TeamMember } from '../types';
import { requestCycleBriefing } from '../lib/backend';
import {
  buildBriefingFacts,
  formatBriefing,
  revealNames,
  toAiPayload,
  type BriefingPerson,
  type BriefingText,
} from '../lib/briefing';
import { cyclesFromMembers } from '../lib/cycleView';
import { toast } from '../utils/toastUtils';

interface BriefingViewProps {
  members: TeamMember[];
}

const selectClass = 'rounded-md border-2 border-block-edge bg-surface px-2 py-1.5 text-xs font-bold text-ink';

const deltaLabel = (delta: number | null) => (delta === null ? '—' : delta > 0 ? `+${delta} pp` : delta < 0 ? `${delta} pp` : 'igual');

const PersonRow: React.FC<{ person: BriefingPerson }> = ({ person }) => (
  <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-line-soft rounded-lg px-3 py-2 text-xs">
    <span className="font-bold text-ink min-w-[8rem]">{person.name}</span>
    {person.evaluated ? (
      <>
        <span className="font-mono text-ink">{person.percent}%</span>
        <span className="font-mono text-muted">{deltaLabel(person.delta)}</span>
        <span className="text-muted">
          {person.statusChange === 'subiu' || person.statusChange === 'caiu'
            ? `${person.statusChange} de ${person.previousStatus} para ${person.status}`
            : person.status}
        </span>
      </>
    ) : (
      <span className="text-muted">Sem avaliação no ciclo</span>
    )}
    {person.overduePdi > 0 && <span className="font-bold text-danger">{person.overduePdi} meta(s) de PDI atrasada(s)</span>}
  </li>
);

/** Briefing do ciclo de uma equipe: números calculados pelo app e, sob pedido, o texto da IA com a pauta de 1:1. */
export const BriefingView: React.FC<BriefingViewProps> = ({ members }) => {
  const teams = useMemo(
    () => [...new Set(members.filter((member) => !member.deleted).map((member) => member.team))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [members],
  );
  const [team, setTeam] = useState('');
  const [cycle, setCycle] = useState('');
  const [text, setText] = useState<BriefingText | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTeam = team && teams.includes(team) ? team : teams[0] ?? '';
  const teamMembers = useMemo(() => members.filter((member) => member.team === activeTeam), [members, activeTeam]);
  const cycles = useMemo(() => cyclesFromMembers(teamMembers), [teamMembers]);
  const activeCycle = cycle && cycles.includes(cycle) ? cycle : cycles[0] ?? '';

  // Trocar de equipe ou de ciclo descarta o texto da IA, que seria de outro briefing.
  useEffect(() => {
    setText(null);
    setError(null);
  }, [activeTeam, activeCycle]);

  const facts = useMemo(() => (activeTeam && activeCycle ? buildBriefingFacts(members, activeTeam, activeCycle) : null), [members, activeTeam, activeCycle]);

  if (teams.length === 0 || !facts) {
    return (
      <div className="blk p-8 text-center text-sm text-muted" role="status">
        Ainda não há avaliações para montar um briefing.
      </div>
    );
  }

  const { summary } = facts;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      setText(await requestCycleBriefing(toAiPayload(facts)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o briefing agora.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatBriefing(facts, text));
      toast.success('Briefing copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  const reveal = (value: string) => revealNames(value, facts.people);

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans space-y-4">
      <div className="blk p-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-bold">
          Equipe
          <select className={selectClass} value={activeTeam} onChange={(event) => setTeam(event.target.value)}>
            {teams.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-bold">
          Ciclo
          <select className={selectClass} value={activeCycle} onChange={(event) => setCycle(event.target.value)} disabled={cycles.length === 0}>
            {cycles.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={copy}
          className="ml-auto flex items-center gap-1.5 rounded-brand border border-line px-3 py-1.5 text-xs font-semibold text-ink cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copiar briefing
        </button>
      </div>

      <section className="blk p-5 space-y-3" aria-label="Números do ciclo">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>Avaliados: <strong>{summary.evaluated} de {summary.total}</strong></span>
          <span>
            Média da equipe: <strong>{summary.average === null ? 'sem avaliados' : `${summary.average}%`}</strong>
            {summary.averageDelta !== null && facts.previousCycle && (
              <span className="text-muted"> ({deltaLabel(summary.averageDelta)} contra {facts.previousCycle})</span>
            )}
          </span>
          {facts.highlights.biggestRise && (
            <span>Maior subida: <strong>{facts.highlights.biggestRise.name}</strong> ({deltaLabel(facts.highlights.biggestRise.delta)})</span>
          )}
          {facts.highlights.biggestDrop && (
            <span>Maior queda: <strong>{facts.highlights.biggestDrop.name}</strong> ({deltaLabel(facts.highlights.biggestDrop.delta)})</span>
          )}
        </div>
        <ul className="space-y-1.5">
          {facts.people.map((person) => (
            <PersonRow key={person.code} person={person} />
          ))}
        </ul>
      </section>

      <section className="blk p-5 space-y-3" aria-label="Texto do briefing">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={loading || summary.evaluated === 0}
            title={summary.evaluated === 0 ? 'Ninguém foi avaliado neste ciclo' : undefined}
            className="flex items-center gap-1.5 rounded-brand bg-surface-2 border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {loading ? 'Gerando briefing...' : text ? 'Gerar de novo' : 'Gerar texto com IA'}
          </button>
          <span className="text-[11px] text-faint">
            A IA recebe só os números acima, com códigos no lugar dos nomes e sem o nome da equipe. Revise antes de usar.
          </span>
        </div>

        {error && <p className="text-xs text-danger" role="alert">{error}</p>}

        {text && (
          <div className="space-y-3 text-xs text-ink">
            <p className="text-sm font-bold">{reveal(text.headline)}</p>
            {([
              ['Destaques', text.highlights],
              ['Pontos de atenção', text.attention],
            ] as const).map(([title, items]) =>
              items.length > 0 ? (
                <div key={title}>
                  <p className="text-[11px] font-mono font-bold text-accent-text mb-1">{title}</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {items.map((item) => (
                      <li key={item}>{reveal(item)}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
            {text.talkingPoints.length > 0 && (
              <div>
                <p className="text-[11px] font-mono font-bold text-accent-text mb-1">Pauta para conversas 1:1</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {text.talkingPoints.map((entry) => (
                    <li key={`${entry.code}-${entry.point}`}>
                      {entry.code && <strong>{reveal(entry.code)}: </strong>}
                      {reveal(entry.point)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {text.nextSteps.length > 0 && (
              <div>
                <p className="text-[11px] font-mono font-bold text-accent-text mb-1">Próximos passos</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {text.nextSteps.map((item) => (
                    <li key={item}>{reveal(item)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
