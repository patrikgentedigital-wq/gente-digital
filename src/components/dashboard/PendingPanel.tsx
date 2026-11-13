import React, { useMemo } from 'react';
import type { TeamMember } from '../../types';
import { pendingByTeam } from '../../lib/pending';

interface PendingPanelProps {
  members: TeamMember[];
  /** Ciclo em avaliação, como "Novembro/2026". */
  cycle: string;
  /** Com login, o nome da pessoa vira botão que abre a avaliação dela. */
  onEvaluateMember?: (memberId: string) => void;
}

/** Quem ainda não foi avaliado no ciclo, por equipe. */
export const PendingPanel: React.FC<PendingPanelProps> = ({ members, cycle, onEvaluateMember }) => {
  const summary = useMemo(() => pendingByTeam(members, cycle), [members, cycle]);
  const cycleLabel = cycle.replace('/', ' / ');

  if (summary.total === 0) return null;

  return (
    <section aria-label="Quem falta avaliar" className="blk p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-extrabold text-base text-ink">
          {summary.pending === 0 ? `Todos foram avaliados em ${cycleLabel}` : `Faltam avaliar em ${cycleLabel}`}
        </h3>
        {summary.pending > 0 && (
          <span className="font-display font-extrabold text-xl text-ink">{summary.pending} de {summary.total}</span>
        )}
      </div>

      {summary.teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.teams.map((team) => (
            <div key={team.team} role="group" aria-label={`Equipe ${team.team}`} className="rounded-xl border border-line bg-surface-2 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-bold text-ink">Time {team.team}</span>
                <span className="text-xs text-muted">{team.pending} de {team.total}</span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {team.members.map((person) => (
                  <li key={person.id}>
                    {onEvaluateMember ? (
                      <button
                        type="button"
                        aria-label={`Avaliar ${person.name}`}
                        onClick={() => onEvaluateMember(person.id)}
                        className="rounded-lg border border-line bg-app px-2 py-1 text-xs font-semibold text-ink hover:border-accent cursor-pointer"
                      >
                        {person.name}
                      </button>
                    ) : (
                      <span className="rounded-lg border border-line bg-app px-2 py-1 text-xs text-muted">{person.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
